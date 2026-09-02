from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from typing import Optional, List, Dict

class ProjectBase(BaseModel):
    nombre: Optional[str] = None
    tipo: str
    operacion: Optional[str] = None
    oei: Optional[str] = None
    oe: Optional[str] = None
    pep: Optional[str] = None
    central: Optional[str] = None
    ruta: Optional[str] = None
    dis: Optional[str] = None
    lugar: Optional[str] = None

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

class ManualEntryItem(BaseModel):
    codigo_ax: str = ""
    descripcion: str = ""
    codigo_sap: str
    cantidad: float
    unidad: str = ""
    almacen_destino: str = ""
    sitio_origen: str = ""
    sitio_destino: str = ""

class ManualEntry(BaseModel):
    fecha: str
    ticket_reference: str = ""
    ubicacion: str = ""
    materials: List[ManualEntryItem]

class ValeBulkItem(BaseModel):
    codigo_sap: str
    quantity: float
    ubicacion: str = ""

class ValeBulkEntry(BaseModel):
    fecha: str
    ticket_reference: str = ""
    sitio_origen: str = ""
    sitio_destino: str = ""
    almacen_origen: str = ""
    almacen_destino: str = ""
    items: List[ValeBulkItem]

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
