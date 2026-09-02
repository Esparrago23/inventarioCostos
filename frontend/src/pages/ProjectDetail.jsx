import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [proj, setProj] = useState(location.state || {});
  const projectTipo = proj.tipo || 'Distrito';
  const isN24 = projectTipo === 'N24';

  const [materials, setMaterials] = useState([]);
  const [totals, setTotals] = useState({});
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [pdfStatus, setPdfStatus] = useState('');
  const [xlsxStatus, setXlsxStatus] = useState('');
  
  // Bulk Entry State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [bulkHeader, setBulkHeader] = useState({
    fecha: '', ticket_reference: '', almacen_origen: '', almacen_destino: '', 
    sitio_origen: '', sitio_destino: '', ubicacion: ''
  });
  const [bulkRows, setBulkRows] = useState([
    { codigo_sap: '', descripcion: '', codigo_ax: '', unidad: '', cantidad: '' }
  ]);

  const [editingRecibido, setEditingRecibido] = useState(null);
  const [recibidoValue, setRecibidoValue] = useState('');
  const [usadoValues, setUsadoValues] = useState({});
  const [almacenViews, setAlmacenViews] = useState({});

  useEffect(() => {
    loadProject();
    loadMaterials();
    loadFiles();
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProj(response.data.project);
    } catch (err) {
      console.error("Error loading project", err);
    }
  };

  const loadMaterials = async () => {
    try {
      const response = await api.get(`/materials/${id}`);
      setMaterials(response.data.materials || []);
      setTotals(response.data.totals || {});
      
      const initialUsado = {};
      (response.data.materials || []).forEach(m => {
        initialUsado[m.codigo] = m.qty_usado || 0;
      });
      setUsadoValues(initialUsado);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFiles = async () => {
    try {
      const response = await api.get(`/files/${id}`);
      setFiles(response.data.files || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e, type) => {
    e.preventDefault();
    const input = e.target.elements.files;
    if (!input.files.length) return;

    const setStatus = type === 'pdf' ? setPdfStatus : setXlsxStatus;
    setStatus({ msg: 'Subiendo y procesando...', type: 'info' });

    const formData = new FormData();
    for (let i = 0; i < input.files.length; i++) {
      formData.append('files', input.files[i]);
    }

    try {
      await api.post(`/upload/${id}`, formData);
      setStatus({ msg: 'Archivos procesados con éxito.', type: 'success' });
      input.value = '';
      loadMaterials();
      loadFiles();
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus({ msg: 'Error al subir los archivos.', type: 'error' });
    }
  };

  const handleDeleteFile = async (filename) => {
    if (confirm(`¿Estás seguro de eliminar el archivo ${filename}?`)) {
      try {
        await api.delete(`/files/${id}/${filename}`);
        loadFiles();
        loadMaterials();
      } catch (err) {
        alert('Error al eliminar el archivo');
        console.error(err);
      }
    }
  };

  // Bulk Form Handlers
  const addBulkRow = () => {
    setBulkRows([...bulkRows, { codigo_sap: '', descripcion: '', codigo_ax: '', unidad: '', cantidad: '', ubicacion: '' }]);
  };

  const removeBulkRow = (index) => {
    if (bulkRows.length > 1) {
      setBulkRows(bulkRows.filter((_, i) => i !== index));
    }
  };

  const handleBulkRowChange = (index, field, value) => {
    const updatedRows = [...bulkRows];
    updatedRows[index][field] = value;
    
    // Auto-fill from loaded materials if SAP code matches
    if (field === 'codigo_sap') {
      const found = materials.find(m => m.codigo === value.trim());
      if (found) {
        updatedRows[index].descripcion = found.descripcion || '';
        updatedRows[index].codigo_ax = found.codigo_ax || '';
        updatedRows[index].unidad = found.unidad || '';
      }
    }
    
    setBulkRows(updatedRows);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    
    // Construct payload
    const items = bulkRows.filter(r => r.codigo_sap && r.cantidad).map(r => ({
      codigo_sap: r.codigo_sap,
      codigo_ax: r.codigo_ax,
      descripcion: r.descripcion,
      unidad: r.unidad,
      quantity: parseFloat(r.cantidad) || 0,
      ubicacion: r.ubicacion || ""
    }));

    if (items.length === 0) {
      alert("Agregue al menos un material válido con cantidad.");
      return;
    }

    const payload = {
      ...bulkHeader,
      items
    };

    try {
      await api.post(`/materials/${id}/vale_bulk`, payload);
      alert('Entrada manual registrada con éxito');
      setIsManualModalOpen(false);
      
      // Reset form
      setBulkHeader({
        fecha: '', ticket_reference: '', almacen_origen: '', almacen_destino: '', 
        sitio_origen: '', sitio_destino: '', ubicacion: ''
      });
      setBulkRows([{ codigo_sap: '', descripcion: '', codigo_ax: '', unidad: '', cantidad: '', ubicacion: '' }]);
      
      loadMaterials();
    } catch (err) {
      alert('Error al registrar la entrada');
    }
  };

  const updateQty = async (codigo, type, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      alert('Valor inválido');
      return;
    }

    const payload = { codigo };
    if (type === 'recibido') payload.qty_recibido = numValue;
    else if (type === 'usado') payload.qty_usado = numValue;

    try {
      await api.post(`/materials/${id}/update`, payload);
      if (type === 'recibido') setEditingRecibido(null);
      loadMaterials();
    } catch (err) {
      alert('Error al guardar');
    }
  };

  const filteredMaterials = materials.filter(mat => 
    (mat.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (mat.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mat.codigo_ax || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
            <header className="mb-8 pb-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => window.history.back()} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md transition-colors">
            &larr; Volver
          </button>
          
        </div>
        
        <div className="bg-white px-4 py-2 rounded border border-gray-200 shadow-sm text-sm">
          <div className="grid grid-cols-4 gap-2 text-center mb-1 font-semibold text-gray-500 uppercase bg-gray-50 p-1 rounded text-xs">
            <div>PEP</div>
            <div>OPERACION</div>
            <div>OEI</div>
            <div>OE</div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center font-bold text-gray-900 mb-2">
            <div>{proj.pep || '---'}</div>
            <div>{proj.operacion || '---'}</div>
            <div>{proj.oei || '---'}</div>
            <div>{proj.oe || '---'}</div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs text-gray-600 border-t pt-1">
            <div><span className="font-semibold text-gray-800">Central:</span> {proj.central || '---'}</div>
            <div><span className="font-semibold text-gray-800">Ruta:</span> {proj.ruta || '---'}</div>
            <div><span className="font-semibold text-gray-800">DIS:</span> {proj.dis || '---'}</div>
            <div><span className="font-semibold text-gray-800">Área:</span> {proj.lugar || '---'}</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {!isN24 && (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Subir Archivos PDF (Costeo)</h3>
            <form onSubmit={(e) => handleFileUpload(e, 'pdf')} className="flex flex-col gap-3">
              <input type="file" name="files" accept=".pdf" multiple required className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors self-start">Subir PDFs</button>
            </form>
            {pdfStatus && <div className={`mt-2 text-sm ${pdfStatus.type === 'error' ? 'text-red-600' : pdfStatus.type === 'success' ? 'text-green-600' : 'text-gray-600'}`}>{pdfStatus.msg}</div>}
          </div>
        )}

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">{isN24 ? 'Subir Solicitud de Material' : 'Subir Recálculo'}</h3>
          <form onSubmit={(e) => handleFileUpload(e, 'xlsx')}>
            <input type="file" multiple name="files" accept=".xlsx,.pdf" required className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4" />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors text-sm">
              Procesar {isN24 ? 'Solicitud' : 'Recálculo'}
            </button>
          </form>
          {xlsxStatus && <div className={`mt-2 text-sm ${xlsxStatus.type === 'error' ? 'text-red-600' : xlsxStatus.type === 'success' ? 'text-green-600' : 'text-gray-600'}`}>{xlsxStatus.msg}</div>}
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 h-32 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2 text-gray-700 border-b pb-1">Archivos Procesados</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            {files.length > 0 ? files.map((f, i) => (
              <li key={i} className="flex justify-between items-center hover:bg-gray-50 px-2 py-1 rounded transition-colors group">
                <a href={`http://localhost:8000/api/files/${id}/${encodeURIComponent(f)}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate mr-2" title={f}>
                  {f}
                </a>
                <button onClick={() => handleDeleteFile(f)} className="text-red-400 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar archivo">
                  ❌
                </button>
              </li>
            )) : <li className="text-gray-400 italic">No hay archivos subidos aún.</li>}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        
        <div className="mb-4 flex justify-end">
          <input
            type="text"
            placeholder="Buscar AX, SAP, o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-1/3 border border-gray-300 rounded-md shadow-sm px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="overflow-x-auto">
          <h3 className="text-lg font-semibold bg-gray-100 px-4 py-2 text-gray-700">Servicios (Mano de Obra)</h3>
          <table className="min-w-full divide-y divide-gray-200 text-sm mb-8">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">UC</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Material</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Uni</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Precio</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaterials.filter(m => m.is_service === true).map(mat => {
                const cantidad = mat.qty_costeo > 0 ? mat.qty_costeo : (mat.qty_recalculo || 0);
                return (
                  <tr key={mat.codigo || Math.random()} className="hover:bg-gray-50">
                    <td className="px-2 py-3">{mat.uc || ''}</td>
                    <td className="px-2 py-3">{mat.uc_desc || ''}</td>
                    <td className="px-2 py-3 min-w-[200px]">{mat.descripcion}</td>
                    <td className="px-2 py-3">{mat.unidad}</td>
                    <td className="px-4 py-3">{cantidad}</td>
                    <td className="px-4 py-3">{mat.precio !== undefined ? `$${mat.precio}` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3 className="text-lg font-semibold bg-gray-100 px-4 py-2 text-gray-700">Materiales</h3>
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Código AX</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Código SAP</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Material</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Uni</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Precio</th>
                {!isN24 && <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Cant. Costeo</th>}
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Cant. Recálculo</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Almacén</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Total</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase min-w-[150px]">Producto Recibido</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase min-w-[150px]">Usado</th>
                <th className="px-2 py-3 text-left font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaterials.filter(m => m.is_service === false).map(mat => {
                const qtyCosteo = mat.qty_costeo || 0;
                const qtyRecalculo = mat.qty_recalculo || 0;
                const totalPedido = qtyCosteo + qtyRecalculo;
                const detailData = mat.almacenes_detalle || {};
                const almacenKeys = Object.keys(detailData);
                const currentAlmacenView = almacenViews[mat.codigo] || 'ALL';
                
                let displayRecibido = mat.qty_recibido || 0;
                if (currentAlmacenView !== 'ALL') {
                  displayRecibido = detailData[currentAlmacenView] || 0;
                }

                return (
                  <tr key={mat.codigo} className="hover:bg-gray-50">
                    <td className="px-2 py-3 whitespace-nowrap">{mat.codigo_ax || '-'}</td>
                    <td className="px-2 py-3 whitespace-nowrap font-medium text-gray-900">{mat.codigo}</td>
                    <td className="px-2 py-3 min-w-[200px]">{mat.descripcion}</td>
                    <td className="px-2 py-3">{mat.unidad}</td>
                    <td className="px-2 py-3">{mat.precio !== undefined ? `$${mat.precio}` : '-'}</td>
                    {!isN24 && <td className="px-4 py-3">{qtyCosteo}</td>}
                    <td className="px-4 py-3">{qtyRecalculo}</td>
                    <td className="px-4 py-3">
                      {almacenKeys.length > 0 ? (
                        <select 
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                          value={currentAlmacenView}
                          onChange={(e) => setAlmacenViews({...almacenViews, [mat.codigo]: e.target.value})}
                        >
                          <option value="ALL">Total (Todos)</option>
                          {almacenKeys.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      ) : (mat.almacen || '-')}
                    </td>
                    <td className="px-4 py-3 font-bold">{totalPedido}</td>
                    <td className="px-4 py-3">
                      {editingRecibido === mat.codigo ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
                            value={recibidoValue}
                            onChange={(e) => setRecibidoValue(e.target.value)}
                            min="0" step="any"
                          />
                          <button onClick={() => updateQty(mat.codigo, 'recibido', recibidoValue)} className="text-white bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 text-xs">Guardar</button>
                          <button onClick={() => setEditingRecibido(null)} className="text-gray-600 bg-gray-200 hover:bg-gray-300 rounded px-2 py-1 text-xs">❌</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{displayRecibido}</span>
                          {currentAlmacenView === 'ALL' && (
                            <button 
                              onClick={() => { setEditingRecibido(mat.codigo); setRecibidoValue(mat.qty_recibido || 0); }}
                              className="text-gray-600 bg-gray-200 hover:bg-gray-300 rounded px-2 py-1 text-xs"
                            >
                              ✎
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
                          value={usadoValues[mat.codigo] !== undefined ? usadoValues[mat.codigo] : (mat.qty_usado || 0)}
                          onChange={(e) => setUsadoValues({...usadoValues, [mat.codigo]: e.target.value})}
                          min="0" step="any"
                        />
                        <button onClick={() => updateQty(mat.codigo, 'usado', usadoValues[mat.codigo])} className="text-white bg-green-600 hover:bg-green-700 rounded px-2 py-1 text-xs">Guardar</button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <div>Faltan: <strong className="text-red-500">{totalPedido - (mat.qty_recibido || 0)}</strong></div>
                      <div>Quedan: <strong className="text-blue-500">{(mat.qty_recibido || 0) - (mat.qty_usado || 0)}</strong></div>
                    </td>
                  </tr>
                );
              })}
              
              {!isN24 && ['TOTAL COSTO MANO DE OBRA', 'TOTAL COSTO MATERIALES', 'TOTAL COSTO', 'INDICADOR COSTO FO'].map(key => {
                if (totals[key] !== undefined) {
                  return (
                    <tr key={key} className="bg-gray-100">
                      <td colSpan={isN24 ? 8 : 9} className="px-4 py-3 text-right font-bold text-gray-700">{key}</td>
                      <td colSpan="3" className="px-4 py-3 font-bold text-gray-800">
                        ${totals[key].toLocaleString('en-US', {minimumFractionDigits: 2})}
                      </td>
                    </tr>
                  )
                }
                return null;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Registrar Entrada de Material (Multilinea)</h2>
              <button onClick={() => setIsManualModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="bulk-entry-form" onSubmit={handleBulkSubmit}>
                
                <h3 className="text-md font-semibold text-gray-700 mb-3 border-b pb-1">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                <input type="date" required value={bulkHeader.fecha || ''} onChange={e => setBulkHeader({...bulkHeader, fecha: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folio Entrada (Ticket) *</label>
                <input type="text" required value={bulkHeader.ticket_reference || ''} onChange={e => setBulkHeader({...bulkHeader, ticket_reference: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Origen</label>
                <input type="text" value={bulkHeader.sitio_origen || ''} onChange={e => setBulkHeader({...bulkHeader, sitio_origen: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Destino</label>
                <input type="text" value={bulkHeader.sitio_destino || ''} onChange={e => setBulkHeader({...bulkHeader, sitio_destino: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Almacén Origen</label>
                <input type="text" value={bulkHeader.almacen_origen || ''} onChange={e => setBulkHeader({...bulkHeader, almacen_origen: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Almacén Destino</label>
                <input type="text" value={bulkHeader.almacen_destino || ''} onChange={e => setBulkHeader({...bulkHeader, almacen_destino: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex justify-between items-end mb-3 border-b pb-1">
                  <h3 className="text-md font-semibold text-gray-700">Materiales</h3>
                  <button type="button" onClick={addBulkRow} className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded font-medium transition-colors">
                    + Agregar Material
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  {bulkRows.map((row, index) => (
                    <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-end p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="w-full md:w-[15%]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Código SAP *</label>
                        <input type="text" required value={row.codigo_sap} onChange={e => handleBulkRowChange(index, 'codigo_sap', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="SAP" />
                      </div>
                      <div className="w-full md:w-[20%]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                        <input type="text" value={row.descripcion} onChange={e => handleBulkRowChange(index, 'descripcion', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white" placeholder="Autocompletado si existe" />
                      </div>
                      <div className="w-full md:w-[15%]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Código AX</label>
                        <input type="text" value={row.codigo_ax} onChange={e => handleBulkRowChange(index, 'codigo_ax', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white" placeholder="AX" />
                      </div>
                      <div className="w-full md:w-[15%]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
                        <input type="text" value={row.unidad} onChange={e => handleBulkRowChange(index, 'unidad', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white" placeholder="Pza/Mts" />
                      </div>
                      <div className="w-full md:w-[15%]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad *</label>
                        <input type="number" step="any" required value={row.cantidad} onChange={e => handleBulkRowChange(index, 'cantidad', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="0" />
                      </div>
                      <div className="w-full md:w-[15%]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ubicación</label>
                        <input type="text" value={row.ubicacion || ''} onChange={e => handleBulkRowChange(index, 'ubicacion', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white" placeholder="Opcional" />
                      </div>
                      <div className="w-full md:w-auto">
                        <button type="button" onClick={() => removeBulkRow(index)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded" title="Eliminar fila" disabled={bulkRows.length === 1}>
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </form>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
              <button type="button" onClick={() => setIsManualModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md font-medium transition-colors">Cancelar</button>
              <button type="submit" form="bulk-entry-form" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors">Guardar Entrada Múltiple</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
