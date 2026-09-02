import re
import os
import PyPDF2
import pandas as pd
from backend import models

def extract_from_xlsx(file_path):
    # keeping it same
    materials = {}
    try:
        with pd.ExcelFile(file_path) as xl:
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
                            if codigo in materials:
                                materials[codigo]["qty_recalculo"] += cantidad
                            else:
                                materials[codigo] = {
                                    "codigo_ax": codigo_ax,
                                    "codigo_sap": codigo,
                                    "descripcion": descripcion,
                                    "unidad": unidad if unidad != 'nan' else 'N/A',
                                    "qty_recalculo": cantidad
                                }
                    except Exception:
                        pass
    except Exception as e:
        print(f"Error reading XLSX: {e}")
    return materials

def extract_from_pdf(file_path):
    materials = {}
    services = []
    totals = {}
    try:
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for i in range(len(reader.pages)):
                text = reader.pages[i].extract_text()
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    
                    # 1. Check if it's a material
                    # Format: 01034256 DIV.1:8 FOSC B6-P-F CIER.FOSC PZA 3.00 580.00 1740.00
                    match_mat = re.search(r'^(\d{7,8})\s+(.+?)\s+([A-Za-z]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)', line)
                    if match_mat:
                        codigo = match_mat.group(1).zfill(8)
                        descripcion = match_mat.group(2).strip()
                        unidad = match_mat.group(3).strip()
                        cantidad = float(match_mat.group(4).replace(',', ''))
                        precio = float(match_mat.group(5).replace(',', ''))
                        
                        if cantidad > 0:
                            if codigo in materials:
                                materials[codigo]["qty_costeo"] += cantidad
                                materials[codigo]["precio"] = precio
                            else:
                                materials[codigo] = {
                                    "codigo_ax": "", 
                                    "codigo_sap": codigo,
                                    "descripcion": descripcion,
                                    "unidad": unidad,
                                    "qty_costeo": cantidad,
                                    "precio": precio
                                }
                        continue
                        
                    # 2. Check if it's a service (Mano de Obra)
                    # Format: CARGA SAIRPE EXPEDIENTE DIGITAL SIN MATERIAL OBT 1.00 18.48 18.48 FAEDSA
                    # OR: CIERRE EMPALME FO AEREO1E/3S (FTTH) PAQ.CIERFOSC450-BS C/PLACA 670 PZA 1.00 426.65 426.65 FCCA43
                    # Ends with: {Unidad} {Cantidad} {Precio} {Total} {UC}
                    match_srv = re.search(r'^(.+?)\s+([A-Za-z]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([A-Z0-9]+)$', line)
                    if match_srv and not line.startswith('TOTAL') and not line.startswith('INDICADOR'):
                        desc_full = match_srv.group(1).strip()
                        unidad = match_srv.group(2).strip()
                        cantidad = float(match_srv.group(3).replace(',', ''))
                        precio = float(match_srv.group(4).replace(',', ''))
                        uc = match_srv.group(6).strip()
                        
                        uc_desc = desc_full
                        material_desc = ""
                        
                        # Heuristics to split the description
                        if 'SIN MATERIAL' in desc_full:
                            idx = desc_full.rindex('SIN MATERIAL')
                            uc_desc = desc_full[:idx].strip()
                            material_desc = 'SIN MATERIAL'
                        elif 'SIN  MATERIAL' in desc_full:
                            idx = desc_full.rindex('SIN  MATERIAL')
                            uc_desc = desc_full[:idx].strip()
                            material_desc = 'SIN MATERIAL'
                        elif 'SINMATERIAL' in desc_full:
                            idx = desc_full.rindex('SINMATERIAL')
                            uc_desc = desc_full[:idx].strip()
                            material_desc = 'SIN MATERIAL'
                        elif '(FTTH)' in desc_full and not desc_full.endswith('(FTTH)'):
                            idx = desc_full.rindex('(FTTH)') + 6
                            uc_desc = desc_full[:idx].strip()
                            material_desc = desc_full[idx:].strip()
                        else:
                            prefixes = [' PAQ.', ' CAB.', ' CABLE', ' PLACA', ' POSTE', ' ETIQ.', ' DIV.', ' C.TERMINAL']
                            # For ETIQ we want the first occurrence from right, wait, actually we can just find the earliest prefix that is in the last 60% of the string?
                            # Or just find the first prefix that occurs after a space, scanning backwards
                            # Let's just find the last occurrence of any prefix.
                            best_idx = -1
                            best_prefix = ''
                            for p in prefixes:
                                idx = desc_full.rfind(p)
                                if idx > best_idx:
                                    best_idx = idx
                                    best_prefix = p
                            if best_idx != -1:
                                uc_desc = desc_full[:best_idx].strip()
                                material_desc = desc_full[best_idx:].strip()
                                
                        if not material_desc:
                            material_desc = "SIN MATERIAL"
                        
                        if cantidad > 0:
                            services.append({
                                "uc": uc,
                                "uc_desc": uc_desc,
                                "material_desc": material_desc,
                                "unidad": unidad,
                                "cantidad": cantidad,
                                "precio": precio
                            })
                        continue
                    
                    # 3. Check for totals
                    match_total = re.search(r'^(TOTAL.+?|INDICADOR COSTO FO)\s+([0-9][\d\.,]*)', line)
                    if match_total:
                        name = match_total.group(1).strip()
                        val = float(match_total.group(2).replace(',', ''))
                        totals[name] = val
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return materials, services, totals

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
        
    db.query(models.ProjectRequirement).filter(models.ProjectRequirement.project_id == project_id).delete()
    db.query(models.ProjectTotal).filter(models.ProjectTotal.project_id == project_id).delete()
    db.commit()
    
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    is_n24 = project and project.tipo == 'N24'
        
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
                
                db.add(models.ProjectRequirement(
                    project_id=project_id,
                    material_id=material.id,
                    source='RECALCULO',
                    quantity=data["qty_recalculo"]
                ))
                db.commit()
                
        elif filename.endswith(".pdf"):
            pdf_data, pdf_services, pdf_totals = extract_from_pdf(file_path)
            
            for name, val in pdf_totals.items():
                db.add(models.ProjectTotal(
                    project_id=project_id,
                    name=name,
                    value=val
                ))
            db.commit()
            
            pdf_source = 'RECALCULO' if is_n24 else 'COSTEO'
            
            # Insert Materials
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
                    
                db.add(models.ProjectRequirement(
                    project_id=project_id,
                    material_id=material.id,
                    source=pdf_source,
                    quantity=data["qty_costeo"],
                    price=data.get("precio", 0.0)
                ))
            
            # Insert Services
            for srv in pdf_services:
                db.add(models.ProjectRequirement(
                    project_id=project_id,
                    material_id=None,
                    source=pdf_source,
                    quantity=srv["cantidad"],
                    uc=srv["uc"],
                    uc_desc=srv["uc_desc"],
                    material_desc_override=srv["material_desc"],
                    price=srv["precio"],
                    unit_override=srv["unidad"],
                    is_service=1
                ))
                
            db.commit()
