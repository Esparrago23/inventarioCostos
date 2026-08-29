import pandas as pd
import PyPDF2
import json
import re
import os

def extract_from_xlsx(file_path):
    print(f"Extracting from XLSX: {file_path}")
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
                    
                    # Assuming UC might be in column 2 (Operacion Grafo), though it often is NaN in materials
                    uc = str(row.iloc[2]).strip()
                    if uc == 'nan':
                        uc = ""
                        
                    descripcion = str(row.iloc[3]).strip()
                    unidad = str(row.iloc[4]).strip()
                    cantidad = float(row.iloc[5]) if not pd.isna(row.iloc[5]) else 0.0
                    
                    if cantidad > 0:
                        materials[codigo] = {
                            "codigo_ax": codigo_ax,
                            "codigo": codigo,
                            "uc": uc,
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
    print(f"Extracting from PDF: {file_path}")
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
                    # Match materials: 01034256 DIV.1:8 FOSC  B6-P-F CIER.FOSC PZA 3.00 580.00 1740.00
                    match_mat = re.search(r'^(\d{8})\s+(.+?)\s+([A-Za-z]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)', line)
                    if match_mat:
                        codigo = match_mat.group(1)
                        descripcion = match_mat.group(2).strip()
                        unidad = match_mat.group(3).strip()
                        cantidad = float(match_mat.group(4))
                        
                        if cantidad > 0:
                            materials[codigo] = {
                                "codigo_ax": "", # PDF usually doesn't have AX code for materials
                                "codigo": codigo,
                                "uc": "", # PDF materials summary doesn't show UC
                                "descripcion": descripcion,
                                "unidad": unidad,
                                "qty_costeo": cantidad
                            }
                    
                    # Match totals like: TOTAL POSTES DE MADERA 9106.51 or INDICADOR COSTO FO
                    match_total = re.search(r'^(TOTAL.+?|INDICADOR COSTO FO)\s+([\d\.]+)', line)
                    if match_total:
                        name = match_total.group(1).strip()
                        val = float(match_total.group(2))
                        totals[name] = val
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return materials, totals

def generate_materials_data(archivos_dir):
    materials_db = {}
    extracted_totals = {}
    
    if not os.path.exists(archivos_dir):
        os.makedirs(archivos_dir)
        
    for filename in os.listdir(archivos_dir):
        file_path = os.path.join(archivos_dir, filename)
        if filename.endswith(".xlsx") and not filename.startswith("~"):
            xlsx_data = extract_from_xlsx(file_path)
            for cod, data in xlsx_data.items():
                if cod not in materials_db:
                    materials_db[cod] = {
                        "codigo_ax": data["codigo_ax"], 
                        "codigo": cod, 
                        "uc": data["uc"],
                        "descripcion": data["descripcion"], 
                        "unidad": data["unidad"], 
                        "qty_costeo": 0, 
                        "qty_recalculo": 0, 
                        "qty_recibido": 0, 
                        "qty_usado": 0
                    }
                else:
                    if not materials_db[cod]["codigo_ax"] and data["codigo_ax"]:
                        materials_db[cod]["codigo_ax"] = data["codigo_ax"]
                    if not materials_db[cod]["uc"] and data["uc"]:
                        materials_db[cod]["uc"] = data["uc"]
                materials_db[cod]["qty_recalculo"] += data["qty_recalculo"]
                
        elif filename.endswith(".pdf"):
            pdf_data, pdf_totals = extract_from_pdf(file_path)
            # Merge totals
            for k, v in pdf_totals.items():
                if k not in extracted_totals:
                    extracted_totals[k] = 0
                extracted_totals[k] += v
                
            for cod, data in pdf_data.items():
                if cod not in materials_db:
                    materials_db[cod] = {
                        "codigo_ax": data["codigo_ax"], 
                        "codigo": cod, 
                        "uc": data["uc"],
                        "descripcion": data["descripcion"], 
                        "unidad": data["unidad"], 
                        "qty_costeo": 0, 
                        "qty_recalculo": 0, 
                        "qty_recibido": 0, 
                        "qty_usado": 0
                    }
                materials_db[cod]["qty_costeo"] += data["qty_costeo"]
                
    return {"materials": materials_db, "totals": extracted_totals}

if __name__ == '__main__':
    # Test extraction
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    archivos_dir = os.path.join(base_dir, "archivos")
    data = generate_materials_data(archivos_dir)
    print(json.dumps(data, indent=2))
