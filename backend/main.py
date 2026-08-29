from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
import json
import os
import shutil
import uvicorn
from backend.extract import generate_materials_data

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
ARCHIVOS_DIR = os.path.join(BASE_DIR, "archivos")
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")

if not os.path.exists(FRONTEND_DIR):
    os.makedirs(FRONTEND_DIR)
if not os.path.exists(ARCHIVOS_DIR):
    os.makedirs(ARCHIVOS_DIR)

class UpdateItem(BaseModel):
    codigo: str
    qty_recibido: float = None
    qty_usado: float = None

class ManualEntry(BaseModel):
    fecha: str
    codigo_ax: str
    descripcion: str
    codigo_sap: str
    sitio_origen: str
    sitio_destino: str
    almacen_origen: str
    almacen_destino: str
    ubicacion: str
    cantidad: float
    unidad: str

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        data = generate_materials_data(ARCHIVOS_DIR)
        save_data(data)
        return data

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

@app.get("/api/materials")
def get_materials():
    data = load_data()
    return {
        "materials": list(data.get("materials", {}).values()),
        "totals": data.get("totals", {})
    }

@app.post("/api/materials/update")
def update_material(item: UpdateItem):
    data = load_data()
    materials_db = data.get("materials", {})
    
    if item.codigo not in materials_db:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if item.qty_recibido is not None:
        materials_db[item.codigo]["qty_recibido"] = item.qty_recibido
    if item.qty_usado is not None:
        materials_db[item.codigo]["qty_usado"] = item.qty_usado
        
    data["materials"] = materials_db
    save_data(data)
    return {"status": "success", "material": materials_db[item.codigo]}

@app.post("/api/materials/manual")
def add_manual_entry(entry: ManualEntry):
    data = load_data()
    materials_db = data.get("materials", {})
    
    cod = entry.codigo_sap
    if not cod:
        cod = "MANUAL-" + entry.codigo_ax
        
    if cod not in materials_db:
        materials_db[cod] = {
            "codigo_ax": entry.codigo_ax,
            "codigo": cod,
            "uc": cod,
            "descripcion": entry.descripcion,
            "unidad": entry.unidad,
            "qty_costeo": 0,
            "qty_recalculo": 0,
            "qty_recibido": 0,
            "qty_usado": 0,
            "almacen": "",
            "almacenes_detalle": {}
        }
    
    if "almacenes_detalle" not in materials_db[cod]:
        materials_db[cod]["almacenes_detalle"] = {}
        
    almacen_dest = entry.almacen_destino.strip()
    if almacen_dest:
        if almacen_dest not in materials_db[cod]["almacenes_detalle"]:
            materials_db[cod]["almacenes_detalle"][almacen_dest] = 0
        materials_db[cod]["almacenes_detalle"][almacen_dest] += entry.cantidad

    # Update properties
    materials_db[cod]["almacen"] = almacen_dest
    materials_db[cod]["qty_recibido"] += entry.cantidad
    
    data["materials"] = materials_db
    save_data(data)
    
    return {"status": "success"}

@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    # First verify no files exist
    for file in files:
        file_path = os.path.join(ARCHIVOS_DIR, file.filename)
        if os.path.exists(file_path):
            raise HTTPException(status_code=400, detail=f"El archivo '{file.filename}' ya existe. Solo puedes subir archivos nuevos.")
            
    uploaded_any = False
    for file in files:
        file_path = os.path.join(ARCHIVOS_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded_any = True
    
    if uploaded_any:
        old_data = load_data()
        new_data = generate_materials_data(ARCHIVOS_DIR)
        
        # Safely merge new data into old data without wiping custom rows/state
        for cod, new_mat in new_data["materials"].items():
            if cod in old_data["materials"]:
                old_data["materials"][cod]["qty_costeo"] = new_mat["qty_costeo"]
                old_data["materials"][cod]["qty_recalculo"] = new_mat["qty_recalculo"]
                if not old_data["materials"][cod].get("almacen"):
                    old_data["materials"][cod]["almacen"] = new_mat.get("almacen", "")
            else:
                old_data["materials"][cod] = new_mat
                
        old_data["totals"] = new_data["totals"]
        save_data(old_data)
        
    return JSONResponse(content={"message": f"{len(files)} files uploaded and data merged"})

@app.get("/api/files")
def get_files():
    files = []
    if os.path.exists(ARCHIVOS_DIR):
        files = [f for f in os.listdir(ARCHIVOS_DIR) if f.endswith('.pdf') or f.endswith('.xlsx')]
    return {"files": files}

# Mount the frontend directory at root path
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
