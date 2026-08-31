from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
import os
import shutil

from backend import models, schemas
from backend.database import get_db
from backend.extract import process_and_insert_data

router = APIRouter(
    tags=["files"]
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_project_archivos_dir(project_id: str):
    d = os.path.join(BASE_DIR, f"archivos_{project_id}")
    if not os.path.exists(d):
        os.makedirs(d)
    return d

@router.get("/files/{project_id}")
def get_files(project_id: str):
    archivos_dir = get_project_archivos_dir(project_id)
    files = []
    if os.path.exists(archivos_dir):
        files = [f for f in os.listdir(archivos_dir) if f.endswith('.pdf') or f.endswith('.xlsx')]
    return {"files": files}

@router.post("/upload/{project_id}")
async def upload_files(project_id: str, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    archivos_dir = get_project_archivos_dir(project_id)
    
    # First verify no files exist
    for file in files:
        file_path = os.path.join(archivos_dir, file.filename)
        if os.path.exists(file_path):
            raise HTTPException(status_code=400, detail=f"El archivo '{file.filename}' ya existe en este proyecto. Solo puedes subir archivos nuevos.")
            
    uploaded_any = False
    for file in files:
        file_path = os.path.join(archivos_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded_any = True
    
    if uploaded_any:
        process_and_insert_data(project_id, archivos_dir, db)
        
    return JSONResponse(content={"message": f"{len(files)} files uploaded and data merged"})
