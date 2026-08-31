from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from backend import models, schemas
from backend.database import get_db

router = APIRouter(
    prefix="/projects",
    tags=["projects"]
)

@router.get("")
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(models.Project).all()
    # The API spec says `{"projects": [...]}`
    return {"projects": projects}

@router.post("")
def create_project(proj: schemas.ProjectCreate, db: Session = Depends(get_db)):
    new_proj = models.Project(
        id=str(uuid.uuid4()),
        nombre=proj.nombre,
        tipo=proj.tipo
    )
    db.add(new_proj)
    db.commit()
    db.refresh(new_proj)
    return {"status": "success", "project": new_proj}

@router.put("/{project_id}")
def update_project(project_id: str, proj: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_proj.nombre = proj.nombre
    db_proj.tipo = proj.tipo
    db.commit()
    db.refresh(db_proj)
    return {"status": "success", "project": db_proj}

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    db_proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(db_proj)
    db.commit()
    
    import os, shutil
    from backend.routers.files import get_project_archivos_dir
    d = get_project_archivos_dir(project_id)
    if os.path.exists(d):
        shutil.rmtree(d)
        
    return {"status": "success"}
