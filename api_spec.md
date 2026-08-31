# API Specification

Base URL: `http://localhost:8000/api`

## Projects

- `GET /projects` -> `{"projects": [...]}`
- `POST /projects` (body: `{"nombre": "...", "tipo": "..."}`) -> `{"status": "success", "project": {...}}`
- `PUT /projects/{id}` (body: `{"nombre": "...", "tipo": "..."}`) -> `{"status": "success", "project": {...}}`
- `DELETE /projects/{id}` -> `{"status": "success"}`

## Materials (per project)

- `GET /materials/{project_id}` -> `{"materials": [...], "totals": {...}}`
- `POST /materials/{project_id}/update` (body: `{"codigo": "...", "qty_recibido": 0.0, "qty_usado": 0.0}`) -> `{"status": "success", "material": {...}}`
- `POST /materials/{project_id}/manual` (body: `{"fecha": "...", "codigo_sap": "...", "codigo_ax": "...", "descripcion": "...", "unidad": "...", "cantidad": 0.0, "sitio_origen": "...", "sitio_destino": "...", "almacen_origen": "...", "almacen_destino": "...", "ubicacion": "..."}`) -> `{"status": "success"}`

## Files (per project)

- `GET /files/{project_id}` -> `{"files": [...]}`
- `POST /upload/{project_id}` (multipart form-data: `files: List[UploadFile]`) -> `{"message": "..."}`

## Catalogs (Global)

- `GET /catalogo/materiales` -> `{"materiales": [...]}`
- `POST /catalogo/materiales` (body: `{"codigo_sap": "...", "codigo_ax": "...", "descripcion": "...", "unidad": "..."}`) -> `{"status": "success", "material": {...}}`
- `GET /catalogo/servicios` -> `{"servicios": [...]}`
- `POST /catalogo/servicios` (body: `{"codigo": "...", "descripcion": "...", "unidad": "...", "precio": 0.0}`) -> `{"status": "success", "servicio": {...}}`

## Inventory (Global)

- `GET /inventario` -> `{"inventario": [...]}` (Returns aggregated quantities across all projects/almacenes)
