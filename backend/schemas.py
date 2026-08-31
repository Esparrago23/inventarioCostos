from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ProjectBase(BaseModel):
    nombre: str
    tipo: str

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str

    class Config:
        from_attributes = True

class MaterialBase(BaseModel):
    codigo_ax: str = ""
    codigo: str
    uc: str = ""
    descripcion: str = ""
    unidad: str = ""
    qty_costeo: float = 0.0
    qty_recalculo: float = 0.0
    qty_recibido: float = 0.0
    qty_usado: float = 0.0
    almacen: str = ""
    almacenes_detalle: Dict[str, Any] = {}

class Material(MaterialBase):
    id: int
    project_id: str

    class Config:
        from_attributes = True

class UpdateItem(BaseModel):
    codigo: str
    qty_recibido: Optional[float] = None
    qty_usado: Optional[float] = None

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

class CatalogoMaterialBase(BaseModel):
    codigo_sap: str
    codigo_ax: str
    descripcion: str
    unidad: str

class CatalogoMaterial(CatalogoMaterialBase):
    id: int

    class Config:
        from_attributes = True

class CatalogoServicioBase(BaseModel):
    codigo: str
    descripcion: str
    unidad: str
    precio: float

class CatalogoServicio(CatalogoServicioBase):
    id: int

    class Config:
        from_attributes = True
