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


@router.get("/almacenes")
def get_catalogo_almacenes(db: Session = Depends(get_db)):
    almacenes = db.query(models.Warehouse).all()
    res = []
    for a in almacenes:
        res.append({
            "id": a.id,
            "name": a.name
        })
    return {"almacenes": res}

@router.post("/almacenes")
def create_catalogo_almacen(almacen: dict, db: Session = Depends(get_db)):
    import uuid
    db_al = models.Warehouse(
        id=str(uuid.uuid4()),
        name=almacen["name"]
    )
    db.add(db_al)
    db.commit()
    db.refresh(db_al)
    return {"status": "success", "almacen": {
        "id": db_al.id,
        "name": db_al.name
    }}

from fastapi import HTTPException

@router.put("/materiales/{id}")
def update_catalogo_material(id: int, mat: schemas.CatalogoMaterialBase, db: Session = Depends(get_db)):
    db_mat = db.query(models.CatalogMaterial).filter(models.CatalogMaterial.id == id).first()
    if not db_mat:
        raise HTTPException(status_code=404, detail="Material not found")
        
    unit = db.query(models.Unit).filter(models.Unit.name == mat.unidad).first()
    if not unit and mat.unidad:
        unit = models.Unit(name=mat.unidad)
        db.add(unit)
        db.commit()
        db.refresh(unit)
        
    db_mat.codigo_sap = mat.codigo_sap
    db_mat.codigo_ax = mat.codigo_ax
    db_mat.descripcion = mat.descripcion
    db_mat.unit_id = unit.id if unit else None
    
    db.commit()
    db.refresh(db_mat)
    
    return {"status": "success", "material": {
        "id": db_mat.id,
        "codigo_sap": db_mat.codigo_sap,
        "codigo_ax": db_mat.codigo_ax,
        "descripcion": db_mat.descripcion,
        "unidad": mat.unidad
    }}

@router.delete("/materiales/{id}")
def delete_catalogo_material(id: int, db: Session = Depends(get_db)):
    db_mat = db.query(models.CatalogMaterial).filter(models.CatalogMaterial.id == id).first()
    if not db_mat:
        raise HTTPException(status_code=404, detail="Material not found")
        
    db.delete(db_mat)
    db.commit()
    return {"status": "success"}

@router.put("/servicios/{id}")
def update_catalogo_servicio(id: int, srv: schemas.CatalogoServicioBase, db: Session = Depends(get_db)):
    db_srv = db.query(models.CatalogService).filter(models.CatalogService.id == id).first()
    if not db_srv:
        raise HTTPException(status_code=404, detail="Servicio not found")
        
    unit = db.query(models.Unit).filter(models.Unit.name == srv.unidad).first()
    if not unit and srv.unidad:
        unit = models.Unit(name=srv.unidad)
        db.add(unit)
        db.commit()
        db.refresh(unit)
        
    db_srv.codigo = srv.codigo
    db_srv.descripcion = srv.descripcion
    db_srv.unit_id = unit.id if unit else None
    db_srv.precio = srv.precio
    
    db.commit()
    db.refresh(db_srv)
    
    return {"status": "success", "servicio": {
        "id": db_srv.id,
        "codigo": db_srv.codigo,
        "descripcion": db_srv.descripcion,
        "unidad": srv.unidad,
        "precio": db_srv.precio
    }}

@router.delete("/servicios/{id}")
def delete_catalogo_servicio(id: int, db: Session = Depends(get_db)):
    db_srv = db.query(models.CatalogService).filter(models.CatalogService.id == id).first()
    if not db_srv:
        raise HTTPException(status_code=404, detail="Servicio not found")
        
    db.delete(db_srv)
    db.commit()
    return {"status": "success"}

@router.put("/almacenes/{id}")
def update_catalogo_almacen(id: str, almacen: dict, db: Session = Depends(get_db)):
    db_al = db.query(models.Warehouse).filter(models.Warehouse.id == id).first()
    if not db_al:
        raise HTTPException(status_code=404, detail="Almacen not found")
        
    db_al.name = almacen.get("name", db_al.name)
    
    db.commit()
    db.refresh(db_al)
    
    return {"status": "success", "almacen": {
        "id": db_al.id,
        "name": db_al.name
    }}

@router.delete("/almacenes/{id}")
def delete_catalogo_almacen(id: str, db: Session = Depends(get_db)):
    db_al = db.query(models.Warehouse).filter(models.Warehouse.id == id).first()
    if not db_al:
        raise HTTPException(status_code=404, detail="Almacen not found")
        
    db.delete(db_al)
    db.commit()
    return {"status": "success"}
