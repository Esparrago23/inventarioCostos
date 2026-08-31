from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from backend import models, schemas
from backend.database import get_db

router = APIRouter(
    prefix="/catalogo",
    tags=["catalogs"]
)

@router.get("/materiales")
def get_catalogo_materiales(db: Session = Depends(get_db)):
    materiales = db.query(models.CatalogMaterial).all()
    res = []
    for m in materiales:
        res.append({
            "id": m.id,
            "codigo_sap": m.codigo_sap,
            "codigo_ax": m.codigo_ax,
            "descripcion": m.descripcion,
            "unidad": m.unit.name if m.unit else ""
        })
    return {"materiales": res}

@router.post("/materiales")
def create_catalogo_material(mat: schemas.CatalogoMaterialBase, db: Session = Depends(get_db)):
    unit = db.query(models.Unit).filter(models.Unit.name == mat.unidad).first()
    if not unit and mat.unidad:
        unit = models.Unit(name=mat.unidad)
        db.add(unit)
        db.commit()
        db.refresh(unit)
        
    db_mat = models.CatalogMaterial(
        codigo_sap=mat.codigo_sap,
        codigo_ax=mat.codigo_ax,
        descripcion=mat.descripcion,
        unit_id=unit.id if unit else None
    )
    db.add(db_mat)
    db.commit()
    db.refresh(db_mat)
    
    return {"status": "success", "material": {
        "id": db_mat.id,
        "codigo_sap": db_mat.codigo_sap,
        "codigo_ax": db_mat.codigo_ax,
        "descripcion": db_mat.descripcion,
        "unidad": mat.unidad
    }}

@router.get("/servicios")
def get_catalogo_servicios(db: Session = Depends(get_db)):
    servicios = db.query(models.CatalogService).all()
    res = []
    for s in servicios:
        res.append({
            "id": s.id,
            "codigo": s.codigo,
            "descripcion": s.descripcion,
            "unidad": s.unit.name if s.unit else "",
            "precio": s.precio
        })
    return {"servicios": res}

@router.post("/servicios")
def create_catalogo_servicio(srv: schemas.CatalogoServicioBase, db: Session = Depends(get_db)):
    unit = db.query(models.Unit).filter(models.Unit.name == srv.unidad).first()
    if not unit and srv.unidad:
        unit = models.Unit(name=srv.unidad)
        db.add(unit)
        db.commit()
        db.refresh(unit)
        
    db_srv = models.CatalogService(
        codigo=srv.codigo,
        descripcion=srv.descripcion,
        unit_id=unit.id if unit else None,
        precio=srv.precio
    )
    db.add(db_srv)
    db.commit()
    db.refresh(db_srv)
    return {"status": "success", "servicio": {
        "id": db_srv.id,
        "codigo": db_srv.codigo,
        "descripcion": db_srv.descripcion,
        "unidad": srv.unidad,
        "precio": db_srv.precio
    }}
