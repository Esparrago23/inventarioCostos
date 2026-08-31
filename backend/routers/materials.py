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
    # Query CatalogMaterial joining with ProjectRequirement and InventoryTransaction
    materials = db.query(models.CatalogMaterial).all()
    
    # Pre-fetch requirements for this project
    reqs = db.query(
        models.ProjectRequirement.material_id,
        models.ProjectRequirement.source,
        func.sum(models.ProjectRequirement.quantity).label('qty')
    ).filter(
        models.ProjectRequirement.project_id == project_id
    ).group_by(
        models.ProjectRequirement.material_id,
        models.ProjectRequirement.source
    ).all()
    
    # Pre-fetch transactions for this project
    txs = db.query(
        models.InventoryTransaction.material_id,
        models.InventoryTransaction.type,
        models.Warehouse.name,
        func.sum(models.InventoryTransaction.quantity).label('qty')
    ).outerjoin(models.Warehouse).filter(
        models.InventoryTransaction.project_id == project_id
    ).group_by(
        models.InventoryTransaction.material_id,
        models.InventoryTransaction.type,
        models.Warehouse.name
    ).all()
    
    req_map = {}
    for r in reqs:
        if r.material_id not in req_map:
            req_map[r.material_id] = {'COSTEO': 0.0, 'RECALCULO': 0.0}
        if r.source == 'COSTEO':
            req_map[r.material_id]['COSTEO'] += r.qty
        elif r.source == 'RECALCULO':
            req_map[r.material_id]['RECALCULO'] += r.qty
            
    tx_map = {}
    for t in txs:
        if t.material_id not in tx_map:
            tx_map[t.material_id] = {'IN': 0.0, 'OUT': 0.0, 'almacenes': {}}
        
        if t.type == 'IN':
            tx_map[t.material_id]['IN'] += t.qty
            if t.name:
                tx_map[t.material_id]['almacenes'][t.name] = tx_map[t.material_id]['almacenes'].get(t.name, 0.0) + t.qty
        elif t.type == 'OUT':
            tx_map[t.material_id]['OUT'] += t.qty
            
    materials_out = []
    
    # Return all materials that have requirements or transactions in this project
    for m in materials:
        if m.id not in req_map and m.id not in tx_map:
            continue
            
        r_data = req_map.get(m.id, {'COSTEO': 0.0, 'RECALCULO': 0.0})
        t_data = tx_map.get(m.id, {'IN': 0.0, 'OUT': 0.0, 'almacenes': {}})
        
        # Get primary warehouse
        almacenes = t_data['almacenes']
        primary_almacen = max(almacenes.items(), key=lambda x: x[1])[0] if almacenes else ""
        
        m_dict = {
            "codigo_ax": m.codigo_ax,
            "codigo": m.codigo_sap,
            "uc": "", # No longer exist in normalized schema, could be stored as text somewhere
            "descripcion": m.descripcion,
            "unidad": m.unit.name if m.unit else "",
            "qty_costeo": r_data['COSTEO'],
            "qty_recalculo": r_data['RECALCULO'],
            "qty_recibido": t_data['IN'],
            "qty_usado": t_data['OUT'],
            "almacen": primary_almacen,
            "almacenes_detalle": almacenes
        }
        materials_out.append(m_dict)
        
    totals = db.query(models.ProjectTotal).filter(models.ProjectTotal.project_id == project_id).all()
    totals_out = {t.name: t.value for t in totals}
    
    return {"materials": materials_out, "totals": totals_out}

@router.post("/{project_id}/update")
def update_material(project_id: str, item: schemas.UpdateItem, db: Session = Depends(get_db)):
    # To support quick update in frontend, we would generate InventoryTransactions
    # However the frontend sends total qty_recibido or qty_usado, not deltas.
    # We should calculate delta.
    
    material = db.query(models.CatalogMaterial).filter(models.CatalogMaterial.codigo_sap == item.codigo).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
        
    txs = db.query(
        models.InventoryTransaction.type,
        func.sum(models.InventoryTransaction.quantity).label('qty')
    ).filter(
        models.InventoryTransaction.project_id == project_id,
        models.InventoryTransaction.material_id == material.id
    ).group_by(models.InventoryTransaction.type).all()
    
    current_in = sum([t.qty for t in txs if t.type == 'IN'])
    current_out = sum([t.qty for t in txs if t.type == 'OUT'])
    
    if item.qty_recibido is not None:
        diff_in = item.qty_recibido - current_in
        if diff_in != 0:
            db.add(models.InventoryTransaction(
                project_id=project_id,
                material_id=material.id,
                type='IN',
                quantity=diff_in,
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
                date=datetime.datetime.utcnow()
            ))
            current_out = item.qty_usado
            
    db.commit()
    
    # Fetch requirements to build the return dict
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
    cod = entry.codigo_sap
    if not cod:
        cod = "MANUAL-" + entry.codigo_ax
        
    material = db.query(models.CatalogMaterial).filter(models.CatalogMaterial.codigo_sap == cod).first()
    if not material:
        # Create unit if not exist
        unit = db.query(models.Unit).filter(models.Unit.name == entry.unidad).first()
        if not unit:
            unit = models.Unit(name=entry.unidad)
            db.add(unit)
            db.commit()
            db.refresh(unit)
            
        material = models.CatalogMaterial(
            codigo_sap=cod,
            codigo_ax=entry.codigo_ax,
            descripcion=entry.descripcion,
            unit_id=unit.id
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        
    warehouse_name = entry.almacen_destino.strip()
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
        quantity=entry.cantidad,
        sitio_origen=entry.sitio_origen,
        sitio_destino=entry.sitio_destino,
        ubicacion=entry.ubicacion,
        date=datetime.datetime.utcnow() # we can also parse entry.fecha
    )
    db.add(tx)
    db.commit()
    
    return {"status": "success"}
