from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend import models
from backend.database import get_db

router = APIRouter(
    prefix="/inventario",
    tags=["inventory"]
)

@router.get("")
def get_inventory(db: Session = Depends(get_db)):
    # Aggregate quantities across all projects/almacenes
    materials = db.query(models.CatalogMaterial).all()
    
    reqs = db.query(
        models.ProjectRequirement.material_id,
        models.ProjectRequirement.source,
        func.sum(models.ProjectRequirement.quantity).label('qty')
    ).group_by(
        models.ProjectRequirement.material_id,
        models.ProjectRequirement.source
    ).all()
    
    txs = db.query(
        models.InventoryTransaction.material_id,
        models.InventoryTransaction.type,
        func.sum(models.InventoryTransaction.quantity).label('qty')
    ).group_by(
        models.InventoryTransaction.material_id,
        models.InventoryTransaction.type
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
            tx_map[t.material_id] = {'IN': 0.0, 'OUT': 0.0}
        if t.type == 'IN':
            tx_map[t.material_id]['IN'] += t.qty
        elif t.type == 'OUT':
            tx_map[t.material_id]['OUT'] += t.qty
    
    inventario = []
    for m in materials:
        if m.id not in req_map and m.id not in tx_map:
            continue
            
        r_data = req_map.get(m.id, {'COSTEO': 0.0, 'RECALCULO': 0.0})
        t_data = tx_map.get(m.id, {'IN': 0.0, 'OUT': 0.0})
        
        inventario.append({
            "codigo": m.codigo_sap,
            "descripcion": m.descripcion,
            "unidad": m.unit.name if m.unit else "",
            "qty_recibido": float(t_data['IN']),
            "qty_usado": float(t_data['OUT']),
            "qty_costeo": float(r_data['COSTEO']),
            "qty_recalculo": float(r_data['RECALCULO'])
        })
        
    return {"inventario": inventario}
