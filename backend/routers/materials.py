from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import json
import datetime

from backend import models, schemas
from backend.database import get_db

router = APIRouter(
    prefix="/materials",
    tags=["materials"]
)

@router.get("/{project_id}")
def get_materials(project_id: str, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    materials = db.query(models.CatalogMaterial).all()
    
    # 1. Fetch Materials
    reqs = db.query(
        models.ProjectRequirement.material_id,
        models.ProjectRequirement.source,
        func.sum(models.ProjectRequirement.quantity).label('qty'),
        func.max(models.ProjectRequirement.price).label('price')
    ).filter(
        models.ProjectRequirement.project_id == project_id,
        models.ProjectRequirement.is_service == 0
    ).group_by(
        models.ProjectRequirement.material_id,
        models.ProjectRequirement.source
    ).all()
    
    req_map = {}
    for r in reqs:
        mat_id = r.material_id
        if mat_id not in req_map:
            req_map[mat_id] = {'COSTEO': 0.0, 'RECALCULO': 0.0, 'price': 0.0}
        req_map[mat_id][r.source] = r.qty
        req_map[mat_id]['price'] = max(req_map[mat_id]['price'], r.price or 0.0)
        
    owner_id_for_in = 'N24_POOL' if project.tipo == 'N24' else project.id

    txs_in = db.query(
        models.InventoryTransaction.material_id,
        models.Warehouse.name.label('wh_name'),
        func.sum(models.InventoryTransaction.quantity).label('qty')
    ).outerjoin(models.Warehouse, models.InventoryTransaction.warehouse_id == models.Warehouse.id).filter(
        models.InventoryTransaction.type == 'IN',
        models.InventoryTransaction.owner_id == owner_id_for_in
    ).group_by(models.InventoryTransaction.material_id, models.Warehouse.name).all()
    
    txs_out = db.query(
        models.InventoryTransaction.material_id,
        func.sum(models.InventoryTransaction.quantity).label('qty')
    ).filter(
        models.InventoryTransaction.type == 'OUT',
        models.InventoryTransaction.project_id == project_id
    ).group_by(models.InventoryTransaction.material_id).all()
    
    in_map = {}
    for t in txs_in:
        mat_id = t.material_id
        if mat_id not in in_map:
            in_map[mat_id] = {'total': 0.0, 'almacenes': {}}
        in_map[mat_id]['total'] += t.qty or 0.0
        wh = t.wh_name or 'N/A'
        in_map[mat_id]['almacenes'][wh] = in_map[mat_id]['almacenes'].get(wh, 0.0) + (t.qty or 0.0)
        
    out_map = {t.material_id: t.qty for t in txs_out}
    
    materials_out = []
    
    for m in materials:
        if m.id not in req_map and m.id not in in_map and m.id not in out_map:
            continue
            
        r_data = req_map.get(m.id, {'COSTEO': 0.0, 'RECALCULO': 0.0})
        t_data_in = in_map.get(m.id, {'total': 0.0, 'almacenes': {}})
        t_out = out_map.get(m.id, 0.0)
        
        almacenes = t_data_in['almacenes']
        primary_almacen = max(almacenes.items(), key=lambda x: x[1])[0] if almacenes else ""
        
        m_dict = {
            "codigo_ax": m.codigo_ax,
            "codigo": m.codigo_sap,
            "uc": "", 
            "uc_desc": "",
            "descripcion": m.descripcion,
            "unidad": m.unit.name if m.unit else "",
            "qty_costeo": r_data['COSTEO'],
            "qty_recalculo": r_data['RECALCULO'],
            "qty_recibido": t_data_in['total'],
            "qty_usado": t_out,
            "almacen": primary_almacen,
            "almacenes_detalle": almacenes,
            "is_service": False,
            "precio": req_map.get(m.id, {}).get('price', 0.0)
        }
        materials_out.append(m_dict)
        
    # 2. Fetch Services
    services = db.query(models.ProjectRequirement).filter(
        models.ProjectRequirement.project_id == project_id,
        models.ProjectRequirement.is_service == 1
    ).all()
    
    for srv in services:
        materials_out.append({
            "codigo_ax": "",
            "codigo": f"SRV-{srv.id}", # Dummy ID for React key
            "uc": srv.uc or "",
            "uc_desc": srv.uc_desc or "",
            "descripcion": srv.material_desc_override or "SIN MATERIAL",
            "unidad": srv.unit_override or "",
            "qty_costeo": srv.quantity if srv.source == 'COSTEO' else 0.0,
            "qty_recalculo": srv.quantity if srv.source == 'RECALCULO' else 0.0,
            "qty_recibido": 0.0,
            "qty_usado": 0.0,
            "almacen": "",
            "almacenes_detalle": {},
            "is_service": True,
            "precio": getattr(srv, 'price', 0.0)
        })
        
    totals = db.query(models.ProjectTotal).filter(models.ProjectTotal.project_id == project_id).all()
    totals_out = {t.name: t.value for t in totals}
    
    return {"materials": materials_out, "totals": totals_out}

@router.post("/{project_id}/update")
def update_material(project_id: str, item: schemas.UpdateItem, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    material = db.query(models.CatalogMaterial).filter(models.CatalogMaterial.codigo_sap == item.codigo).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
        
    owner_id_for_in = 'N24_POOL' if project.tipo == 'N24' else project.id

    txs_in = db.query(func.sum(models.InventoryTransaction.quantity).label('qty')).filter(
        models.InventoryTransaction.type == 'IN',
        models.InventoryTransaction.owner_id == owner_id_for_in,
        models.InventoryTransaction.material_id == material.id
    ).first()
    
    txs_out = db.query(func.sum(models.InventoryTransaction.quantity).label('qty')).filter(
        models.InventoryTransaction.type == 'OUT',
        models.InventoryTransaction.project_id == project_id,
        models.InventoryTransaction.material_id == material.id
    ).first()
    
    current_in = txs_in.qty or 0.0
    current_out = txs_out.qty or 0.0
    
    if item.qty_recibido is not None:
        diff_in = item.qty_recibido - current_in
        if diff_in != 0:
            db.add(models.InventoryTransaction(
                project_id=project_id,
                material_id=material.id,
                type='IN',
                quantity=diff_in,
                owner_id=owner_id_for_in,
                date=datetime.datetime.utcnow()
            ))
            current_in = item.qty_recibido
            
    if item.qty_usado is not None:
        diff_out = item.qty_usado - current_out
        if diff_out != 0:
            db.add(models.InventoryTransaction(
                project_id=project_id,
                material_id=material.id,
                type='OUT',
                quantity=diff_out,
                owner_id=project.id,
                date=datetime.datetime.utcnow()
            ))
            current_out = item.qty_usado
            
    db.commit()
    
    reqs = db.query(
        models.ProjectRequirement.source,
        func.sum(models.ProjectRequirement.quantity).label('qty')
    ).filter(
        models.ProjectRequirement.project_id == project_id,
        models.ProjectRequirement.material_id == material.id
    ).group_by(models.ProjectRequirement.source).all()
    
    qty_costeo = sum([r.qty for r in reqs if r.source == 'COSTEO'])
    qty_recalculo = sum([r.qty for r in reqs if r.source == 'RECALCULO'])
    
    m_dict = {
        "codigo_ax": material.codigo_ax,
        "codigo": material.codigo_sap,
        "uc": "",
        "descripcion": material.descripcion,
        "unidad": material.unit.name if material.unit else "",
        "qty_costeo": qty_costeo,
        "qty_recalculo": qty_recalculo,
        "qty_recibido": current_in,
        "qty_usado": current_out,
        "almacen": "",
        "almacenes_detalle": {}
    }
    return {"status": "success", "material": m_dict}

@router.post("/{project_id}/manual")
def add_manual_entry(project_id: str, entry: schemas.ManualEntry, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    owner_id_for_in = 'N24_POOL' if project.tipo == 'N24' else project.id

    for mat_item in entry.materials:
        cod = mat_item.codigo_sap
        if not cod:
            cod = "MANUAL-" + mat_item.codigo_ax
            
        material = db.query(models.CatalogMaterial).filter(models.CatalogMaterial.codigo_sap == cod).first()
        if not material:
            unit = None
            if mat_item.unidad:
                unit = db.query(models.Unit).filter(models.Unit.name == mat_item.unidad).first()
                if not unit:
                    unit = models.Unit(name=mat_item.unidad)
                    db.add(unit)
                    db.commit()
                    db.refresh(unit)
                
            material = models.CatalogMaterial(
                codigo_sap=cod,
                codigo_ax=mat_item.codigo_ax,
                descripcion=mat_item.descripcion,
                unit_id=unit.id if unit else None
            )
            db.add(material)
            db.commit()
            db.refresh(material)
            
        warehouse_name = mat_item.almacen_destino.strip()
        warehouse_id = None
        if warehouse_name:
            wh = db.query(models.Warehouse).filter(models.Warehouse.name == warehouse_name).first()
            if not wh:
                wh = models.Warehouse(name=warehouse_name)
                db.add(wh)
                db.commit()
                db.refresh(wh)
            warehouse_id = wh.id
            
        tx = models.InventoryTransaction(
            project_id=project_id,
            material_id=material.id,
            warehouse_id=warehouse_id,
            type='IN',
            quantity=mat_item.cantidad,
            sitio_origen=mat_item.sitio_origen,
            sitio_destino=mat_item.sitio_destino,
            ubicacion=entry.ubicacion,
            owner_id=owner_id_for_in,
            ticket_reference=entry.ticket_reference,
            date=datetime.datetime.utcnow()
        )
        db.add(tx)
        
    db.commit()
    return {"status": "success"}

@router.post("/{project_id}/vale_bulk")
def add_vale_bulk_entry(project_id: str, entry: schemas.ValeBulkEntry, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    owner_id_for_in = 'N24_POOL' if project.tipo == 'N24' else project.id
    
    for item in entry.items:
        material = db.query(models.CatalogMaterial).filter(models.CatalogMaterial.codigo_sap == item.codigo_sap).first()
        if not material:
            material = models.CatalogMaterial(
                codigo_sap=item.codigo_sap,
                descripcion="AUTO-GENERATED BULK",
                codigo_ax=""
            )
            db.add(material)
            db.commit()
            db.refresh(material)
            
        tx = models.InventoryTransaction(
            project_id=project_id,
            material_id=material.id,
            type='IN',
            quantity=item.quantity,
            ubicacion=item.ubicacion,
            sitio_origen=entry.sitio_origen,
            sitio_destino=entry.sitio_destino,
            almacen_origen=entry.almacen_origen,
            almacen_destino=entry.almacen_destino,
            owner_id=owner_id_for_in,
            ticket_reference=entry.ticket_reference,
            date=datetime.datetime.utcnow()
        )
        db.add(tx)
        
    db.commit()
    return {"status": "success"}
