import pandas as pd
import PyPDF2
import os
import re
from backend import models

def extract_from_xlsx(file_path):
    materials = {}
    try:
        xl = pd.ExcelFile(file_path)
        for sheet in xl.sheet_names:
            df = xl.parse(sheet, skiprows=9)
            for index, row in df.iterrows():
                try:
                    codigo_ax = str(row.iloc[0]).strip()
                    if codigo_ax == 'nan':
                        codigo_ax = ""
                    
                    codigo = str(row.iloc[1]).strip()
                    if codigo == 'nan' or not codigo.isdigit():
                        continue
                    
                    descripcion = str(row.iloc[3]).strip()
                    unidad = str(row.iloc[4]).strip()
                    cantidad = float(row.iloc[5]) if not pd.isna(row.iloc[5]) else 0.0
                    
                    if cantidad > 0:
                        materials[codigo] = {
                            "codigo_ax": codigo_ax,
                            "codigo_sap": codigo,
                            "descripcion": descripcion,
                            "unidad": unidad if unidad != 'nan' else 'N/A',
                            "qty_recalculo": cantidad
                        }
                except Exception as e:
                    pass
    except Exception as e:
        print(f"Error reading XLSX: {e}")
    return materials

def extract_from_pdf(file_path):
    materials = {}
    totals = {}
    try:
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for i in range(len(reader.pages)):
                text = reader.pages[i].extract_text()
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    match_mat = re.search(r'^(\d{8})\s+(.+?)\s+([A-Za-z]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)', line)
                    if match_mat:
                        codigo = match_mat.group(1)
                        descripcion = match_mat.group(2).strip()
                        unidad = match_mat.group(3).strip()
                        cantidad = float(match_mat.group(4))
                        
                        if cantidad > 0:
                            materials[codigo] = {
                                "codigo_ax": "", 
                                "codigo_sap": codigo,
                                "descripcion": descripcion,
                                "unidad": unidad,
                                "qty_costeo": cantidad
                            }
                    
                    match_total = re.search(r'^(TOTAL.+?|INDICADOR COSTO FO)\s+([\d\.]+)', line)
                    if match_total:
                        name = match_total.group(1).strip()
                        val = float(match_total.group(2))
                        totals[name] = val
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return materials, totals

def get_or_create_unit(db, name):
    if not name:
        return None
    unit = db.query(models.Unit).filter(models.Unit.name == name).first()
    if not unit:
        unit = models.Unit(name=name)
        db.add(unit)
        db.commit()
        db.refresh(unit)
    return unit

def process_and_insert_data(project_id, archivos_dir, db):
    if not os.path.exists(archivos_dir):
        return
        
    for filename in os.listdir(archivos_dir):
        file_path = os.path.join(archivos_dir, filename)
        if filename.endswith(".xlsx") and not filename.startswith("~"):
            xlsx_data = extract_from_xlsx(file_path)
            for cod, data in xlsx_data.items():
                unit = get_or_create_unit(db, data["unidad"])
                
                material = db.query(models.CatalogMaterial).filter(models.CatalogMaterial.codigo_sap == cod).first()
                if not material:
                    material = models.CatalogMaterial(
                        codigo_sap=cod,
                        codigo_ax=data["codigo_ax"],
                        descripcion=data["descripcion"],
                        unit_id=unit.id if unit else None
                    )
                    db.add(material)
                    db.commit()
                    db.refresh(material)
                
                req = db.query(models.ProjectRequirement).filter(
                    models.ProjectRequirement.project_id == project_id,
                    models.ProjectRequirement.material_id == material.id,
                    models.ProjectRequirement.source == 'RECALCULO'
                ).first()
                if req:
                    req.quantity += data["qty_recalculo"]
                else:
                    db.add(models.ProjectRequirement(
                        project_id=project_id,
                        material_id=material.id,
                        source='RECALCULO',
                        quantity=data["qty_recalculo"]
                    ))
                db.commit()
                
        elif filename.endswith(".pdf"):
            pdf_data, pdf_totals = extract_from_pdf(file_path)
            for name, val in pdf_totals.items():
                pt = db.query(models.ProjectTotal).filter(
                    models.ProjectTotal.project_id == project_id,
                    models.ProjectTotal.name == name
                ).first()
                if pt:
                    pt.value += val
                else:
                    db.add(models.ProjectTotal(
                        project_id=project_id,
                        name=name,
                        value=val
                    ))
            db.commit()
            
            for cod, data in pdf_data.items():
                unit = get_or_create_unit(db, data["unidad"])
                material = db.query(models.CatalogMaterial).filter(models.CatalogMaterial.codigo_sap == cod).first()
                if not material:
                    material = models.CatalogMaterial(
                        codigo_sap=cod,
                        codigo_ax=data["codigo_ax"],
                        descripcion=data["descripcion"],
                        unit_id=unit.id if unit else None
                    )
                    db.add(material)
                    db.commit()
                    db.refresh(material)
                    
                req = db.query(models.ProjectRequirement).filter(
                    models.ProjectRequirement.project_id == project_id,
                    models.ProjectRequirement.material_id == material.id,
                    models.ProjectRequirement.source == 'COSTEO'
                ).first()
                if req:
                    req.quantity += data["qty_costeo"]
                else:
                    db.add(models.ProjectRequirement(
                        project_id=project_id,
                        material_id=material.id,
                        source='COSTEO',
                        quantity=data["qty_costeo"]
                    ))
                db.commit()
