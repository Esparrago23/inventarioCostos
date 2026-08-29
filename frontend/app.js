let allMaterials = [];
let globalTotals = {};

document.addEventListener('DOMContentLoaded', () => {
    loadMaterials();
    loadFiles();

    document.getElementById('search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allMaterials.filter(mat => 
            mat.descripcion.toLowerCase().includes(searchTerm) || 
            mat.codigo.toLowerCase().includes(searchTerm) ||
            (mat.codigo_ax && mat.codigo_ax.toLowerCase().includes(searchTerm))
        );
        renderTable(filtered);
    });

    // Auto-fill form on SAP code change
    document.getElementById('m-sap').addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const found = allMaterials.find(m => m.codigo === val);
        if (found) {
            document.getElementById('m-desc').value = found.descripcion || '';
            document.getElementById('m-ax').value = found.codigo_ax || '';
            document.getElementById('m-unidad').value = found.unidad || '';
        }
    });

    // File uploads
    setupUploadForm('upload-pdf-form', 'pdf-input', 'upload-pdf-status');
    setupUploadForm('upload-xlsx-form', 'xlsx-input', 'upload-xlsx-status');

    // Modal logic
    const modal = document.getElementById('manual-modal');
    const btnManual = document.getElementById('btn-manual');
    const spanClose = document.getElementsByClassName('close-btn')[0];

    btnManual.onclick = () => modal.style.display = 'block';
    spanClose.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // Manual Entry Form
    document.getElementById('manual-entry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            fecha: document.getElementById('m-fecha').value,
            codigo_ax: document.getElementById('m-ax').value,
            descripcion: document.getElementById('m-desc').value,
            codigo_sap: document.getElementById('m-sap').value,
            sitio_origen: document.getElementById('m-sitio-o').value,
            sitio_destino: document.getElementById('m-sitio-d').value,
            almacen_origen: document.getElementById('m-alm-o').value,
            almacen_destino: document.getElementById('m-alm-d').value,
            ubicacion: document.getElementById('m-ubi').value,
            cantidad: parseFloat(document.getElementById('m-cant').value),
            unidad: document.getElementById('m-unidad').value
        };

        try {
            const response = await fetch('/api/materials/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Entrada manual registrada con éxito');
                modal.style.display = 'none';
                e.target.reset(); // clear form
                loadMaterials();
            } else {
                alert('Error al registrar la entrada');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Error de conexión');
        }
    });
});

async function loadFiles() {
    try {
        const response = await fetch('/api/files');
        const data = await response.json();
        const list = document.getElementById('uploaded-files-list');
        list.innerHTML = '';
        if (data.files && data.files.length > 0) {
            data.files.forEach(file => {
                const li = document.createElement('li');
                li.textContent = file;
                list.appendChild(li);
            });
        } else {
            list.innerHTML = '<li>No hay archivos subidos aún.</li>';
        }
    } catch (err) {
        console.error('Error fetching files:', err);
    }
}

function setupUploadForm(formId, inputId, statusId) {
    document.getElementById(formId).addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById(inputId);
        const files = fileInput.files;
        if (files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        const statusDiv = document.getElementById(statusId);
        statusDiv.textContent = 'Subiendo y procesando...';
        statusDiv.style.color = '#333';

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                statusDiv.textContent = 'Archivos procesados con éxito.';
                statusDiv.style.color = '#27ae60';
                fileInput.value = '';
                loadMaterials();
                loadFiles();
                setTimeout(() => statusDiv.textContent = '', 3000);
            } else {
                const errData = await response.json();
                alert('Error al subir: ' + (errData.detail || 'Archivo ya existe o error en servidor'));
                statusDiv.textContent = 'Error al subir los archivos.';
                statusDiv.style.color = 'red';
            }
        } catch (err) {
            console.error('Error:', err);
            statusDiv.textContent = 'Error de conexión.';
            statusDiv.style.color = 'red';
        }
    });
}

async function loadMaterials() {
    try {
        const response = await fetch('/api/materials');
        const data = await response.json();
        allMaterials = data.materials || [];
        globalTotals = data.totals || {};
        renderTable(allMaterials);
    } catch (err) {
        console.error('Error fetching materials:', err);
    }
}

function renderTable(materials) {
    const tbody = document.getElementById('materials-tbody');
    tbody.innerHTML = '';

    materials.forEach(mat => {
        const tr = document.createElement('tr');
        
        const qtyCosteo = mat.qty_costeo || 0;
        const qtyRecalculo = mat.qty_recalculo || 0;
        const totalPedido = qtyCosteo + qtyRecalculo;
        
        let almacenSelect = '-';
        let detailData = mat.almacenes_detalle || {};
        let almacenKeys = Object.keys(detailData);
        if (almacenKeys.length > 0) {
            let options = `<option value="ALL">Total (Todos los almacenes)</option>`;
            almacenKeys.forEach(k => {
                options += `<option value="${k}">${k}</option>`;
            });
            almacenSelect = `<select onchange="updateAlmacenView('${mat.codigo}', this.value)" style="max-width:140px;">${options}</select>`;
        }
        
        tr.innerHTML = `
            <td>${mat.codigo_ax || '-'}</td>
            <td>${mat.codigo}</td>
            <td>${mat.descripcion}</td>
            <td>${mat.unidad}</td>
            <td>${qtyCosteo}</td>
            <td>${qtyRecalculo}</td>
            <td>${almacenSelect}</td>
            <td><strong>${totalPedido}</strong></td>
            <td>
                <div id="view-recibido-${mat.codigo}" style="display:flex; align-items:center; gap:5px;">
                    <span id="val-recibido-${mat.codigo}">${mat.qty_recibido || 0}</span>
                    <button class="btn btn-secondary" style="padding:2px 6px;" onclick="toggleEditRecibido('${mat.codigo}', true)">✎</button>
                </div>
                <div id="edit-recibido-${mat.codigo}" style="display:none; align-items:center; gap:5px;">
                    <input type="number" id="recibido-${mat.codigo}" value="${mat.qty_recibido || 0}" min="0" step="any" style="width:60px;">
                    <button class="btn btn-primary" style="padding:2px 6px;" onclick="updateQty('${mat.codigo}', 'recibido')">Guardar</button>
                    <button class="btn btn-secondary" style="padding:2px 6px;" onclick="toggleEditRecibido('${mat.codigo}', false)">❌</button>
                </div>
            </td>
            <td>
                <div class="qty-control">
                    <input type="number" id="usado-${mat.codigo}" value="${mat.qty_usado || 0}" min="0" step="any" style="width:60px;">
                    <button class="btn btn-success" onclick="updateQty('${mat.codigo}', 'usado')">Guardar</button>
                </div>
            </td>
            <td>
                <span style="font-size: 11px;">Faltan: <strong style="color: #e74c3c;">${totalPedido - (mat.qty_recibido || 0)}</strong></span><br>
                <span style="font-size: 11px;">Quedan: <strong style="color: #2980b9;">${(mat.qty_recibido || 0) - (mat.qty_usado || 0)}</strong></span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const totalsToDisplay = [
        'TOTAL COSTO MANO DE OBRA',
        'TOTAL COSTO MATERIALES',
        'TOTAL COSTO',
        'INDICADOR COSTO FO'
    ];

    totalsToDisplay.forEach(key => {
        if (globalTotals[key] !== undefined) {
            const tr = document.createElement('tr');
            tr.style.backgroundColor = '#ecf0f1';
            tr.innerHTML = `
                <td colspan="7" style="text-align: right; font-weight: bold; color: #2c3e50;">${key}</td>
                <td colspan="4" style="font-weight: bold; color: #2c3e50;">$${globalTotals[key].toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            `;
            tbody.appendChild(tr);
        }
    });
}

window.updateAlmacenView = (codigo, almacenName) => {
    const mat = allMaterials.find(m => m.codigo === codigo);
    const valSpan = document.getElementById(`val-recibido-${codigo}`);
    if (almacenName === 'ALL') {
        valSpan.textContent = mat.qty_recibido || 0;
    } else {
        valSpan.textContent = (mat.almacenes_detalle && mat.almacenes_detalle[almacenName]) || 0;
    }
};

window.toggleEditRecibido = (codigo, showEdit) => {
    document.getElementById(`view-recibido-${codigo}`).style.display = showEdit ? 'none' : 'flex';
    document.getElementById(`edit-recibido-${codigo}`).style.display = showEdit ? 'flex' : 'none';
};

async function updateQty(codigo, type) {
    const inputId = `${type}-${codigo}`;
    const value = parseFloat(document.getElementById(inputId).value);
    
    if (isNaN(value) || value < 0) {
        alert('Valor inválido');
        return;
    }

    const payload = { codigo: codigo };
    if (type === 'recibido') {
        payload.qty_recibido = value;
    } else if (type === 'usado') {
        payload.qty_usado = value;
    }

    try {
        const response = await fetch('/api/materials/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            loadMaterials();
        } else {
            alert('Error al guardar');
        }
    } catch (err) {
        console.error('Error updating material:', err);
        alert('Error conectando con el servidor');
    }
}
