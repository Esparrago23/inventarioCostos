from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
import enum
import datetime
from backend.database import Base

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String)
    tipo = Column(String)
    
    requirements = relationship("ProjectRequirement", back_populates="project", cascade="all, delete-orphan")
    transactions = relationship("InventoryTransaction", back_populates="project", cascade="all, delete-orphan")
    totals = relationship("ProjectTotal", back_populates="project", cascade="all, delete-orphan")

class Unit(Base):
    __tablename__ = "units"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class CatalogMaterial(Base):
    __tablename__ = "catalogo_materiales"
    id = Column(Integer, primary_key=True, index=True)
    codigo_sap = Column(String, unique=True, index=True)
    codigo_ax = Column(String, default="")
    descripcion = Column(String, default="")
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    
    unit = relationship("Unit")

class CatalogService(Base):
    __tablename__ = "catalogo_servicios"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    descripcion = Column(String, default="")
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    precio = Column(Float, default=0.0)
    
    unit = relationship("Unit")

class RequirementSource(str, enum.Enum):
    COSTEO = "COSTEO"
    RECALCULO = "RECALCULO"

class ProjectRequirement(Base):
    __tablename__ = "project_requirements"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"))
    material_id = Column(Integer, ForeignKey("catalogo_materiales.id"))
    source = Column(String) # COSTEO or RECALCULO
    quantity = Column(Float, default=0.0)
    
    project = relationship("Project", back_populates="requirements")
    material = relationship("CatalogMaterial")

class TransactionType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"))
    material_id = Column(Integer, ForeignKey("catalogo_materiales.id"))
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    type = Column(String) # IN or OUT
    quantity = Column(Float, default=0.0)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    # Extra fields for manual entry
    sitio_origen = Column(String, default="")
    sitio_destino = Column(String, default="")
    ubicacion = Column(String, default="")
    
    project = relationship("Project", back_populates="transactions")
    material = relationship("CatalogMaterial")
    warehouse = relationship("Warehouse")

class ProjectTotal(Base):
    __tablename__ = "project_totals"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"))
    name = Column(String)
    value = Column(Float)

    project = relationship("Project", back_populates="totals")
