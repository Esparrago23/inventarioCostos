from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend import models
from backend.database import get_db

router = APIRouter(
    prefix="/inventario",
    tags=["inventory"]
)

@router.get("")
def get_inventory(db: Session = Depends(get_db)):
    materials = db.query(models.CatalogMaterial).all()
    projects = db.query(models.Project).all()
    project_map = {p.id: p for p in projects}
    
    # Get all transactions ordered by ID (proxy for time)
    txs = db.query(models.InventoryTransaction).order_by(models.InventoryTransaction.id).all()
    
    inventario = []
    
    for m in materials:
        m_txs = [t for t in txs if t.material_id == m.id]
        if not m_txs:
            continue
            
        lots = []
        
        # Process transactions to build lots
        for t in m_txs:
            if t.type == 'IN':
                proj_name = project_map[t.project_id].nombre if t.project_id in project_map else t.project_id
                lots.append({
                    "id": t.id,
                    "pertenece": "N24" if t.owner_id == 'N24_POOL' else "DISTRITO",
                    "owner_id": t.owner_id,
                    "pedido_por": proj_name,
                    "almacen": t.almacen_destino or "-",
                    "ubicacion": t.ubicacion or "-",
                    "cantidad_original": t.quantity,
                    "disponible": t.quantity,
                    "usado_en": {}
                })
            elif t.type == 'OUT':
                qty_to_consume = t.quantity
                proj = project_map.get(t.project_id)
                # Determine what pool we can pull from
                target_owner = 'N24_POOL' if (proj and proj.tipo == 'N24') else t.project_id
                
                # Consume from oldest available lots that match the owner constraint
                for lot in lots:
                    if qty_to_consume <= 0:
                        break
                    if lot['owner_id'] == target_owner and lot['disponible'] > 0:
                        take = min(lot['disponible'], qty_to_consume)
                        lot['disponible'] -= take
                        qty_to_consume -= take
                        
                        proj_name = proj.nombre if proj else t.project_id
                        lot['usado_en'][proj_name] = lot['usado_en'].get(proj_name, 0.0) + take
                        
        # Now format the response for the frontend
        # The frontend will display each lot
        
        # calculate totals just in case
        total_in = sum(lot['cantidad_original'] for lot in lots)
        total_available = sum(lot['disponible'] for lot in lots)
        
        inventario.append({
            "codigo": m.codigo_sap,
            "descripcion": m.descripcion,
            "unidad": m.unit.name if m.unit else "",
            "total_recibido": total_in,
            "total_usado": total_in - total_available,
            "total_disponible": total_available,
            "lotes": lots  # The frontend will map over these
        })
        
    return {"inventario": inventario}
