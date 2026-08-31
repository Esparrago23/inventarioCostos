import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const projectName = location.state?.nombre || 'Proyecto';

  const [materials, setMaterials] = useState([]);
  const [totals, setTotals] = useState({});
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [pdfStatus, setPdfStatus] = useState('');
  const [xlsxStatus, setXlsxStatus] = useState('');
  
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    fecha: '', codigo_sap: '', descripcion: '', codigo_ax: '', unidad: '', cantidad: '',
    sitio_origen: '', sitio_destino: '', almacen_origen: '', almacen_destino: '', ubicacion: ''
  });

  const [editingRecibido, setEditingRecibido] = useState(null);
  const [recibidoValue, setRecibidoValue] = useState('');
  
  const [usadoValues, setUsadoValues] = useState({});
  const [almacenViews, setAlmacenViews] = useState({});

  useEffect(() => {
    loadMaterials();
    loadFiles();
  }, [id]);

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

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...manualForm, cantidad: parseFloat(manualForm.cantidad) || 0 };
    try {
      await api.post(`/materials/${id}/manual`, payload);
      alert('Entrada manual registrada con éxito');
      setIsManualModalOpen(false);
      setManualForm({
        fecha: '', codigo_sap: '', descripcion: '', codigo_ax: '', unidad: '', cantidad: '',
        sitio_origen: '', sitio_destino: '', almacen_origen: '', almacen_destino: '', ubicacion: ''
      });
      loadMaterials();
    } catch (err) {
      alert('Error al registrar la entrada');
    }
  };

  const handleSapChange = (e) => {
    const val = e.target.value.trim();
    setManualForm({ ...manualForm, codigo_sap: val });
    const found = materials.find(m => m.codigo === val);
    if (found) {
      setManualForm(prev => ({
        ...prev,
        descripcion: found.descripcion || '',
        codigo_ax: found.codigo_ax || '',
        unidad: found.unidad || ''
      }));
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
      <header className="flex flex-wrap justify-between items-center mb-8 pb-4 border-b gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md transition-colors">
            &larr; Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Registro de Materiales - {projectName}</h1>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
          />
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
          >
            Registrar Entrada Manual
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Subir Archivos PDF (Costeo)</h3>
          <form onSubmit={(e) => handleFileUpload(e, 'pdf')} className="flex flex-col gap-3">
            <input type="file" name="files" accept=".pdf" multiple required className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors self-start">Subir PDFs</button>
          </form>
          {pdfStatus && <div className={`mt-2 text-sm ${pdfStatus.type === 'error' ? 'text-red-600' : pdfStatus.type === 'success' ? 'text-green-600' : 'text-gray-600'}`}>{pdfStatus.msg}</div>}
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Subir Archivos XLSX (Recálculo)</h3>
          <form onSubmit={(e) => handleFileUpload(e, 'xlsx')} className="flex flex-col gap-3">
            <input type="file" name="files" accept=".xlsx" multiple required className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors self-start">Subir XLSXs</button>
          </form>
          {xlsxStatus && <div className={`mt-2 text-sm ${xlsxStatus.type === 'error' ? 'text-red-600' : xlsxStatus.type === 'success' ? 'text-green-600' : 'text-gray-600'}`}>{xlsxStatus.msg}</div>}
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 h-48 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Archivos Procesados</h3>
          <ul className="text-sm text-gray-600 list-disc pl-5">
            {files.length > 0 ? files.map((f, i) => <li key={i}>{f}</li>) : <li>No hay archivos subidos aún.</li>}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Código AX</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Código SAP / UC</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Unidad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Cant. Costeo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Cant. Recálculo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Almacén</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase min-w-[150px]">Producto Recibido</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase min-w-[150px]">Usado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaterials.map(mat => {
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
                    <td className="px-4 py-3">{mat.codigo_ax || '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{mat.codigo}</td>
                    <td className="px-4 py-3">{mat.descripcion}</td>
                    <td className="px-4 py-3">{mat.unidad}</td>
                    <td className="px-4 py-3">{qtyCosteo}</td>
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
                      ) : '-'}
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
              
              {['TOTAL COSTO MANO DE OBRA', 'TOTAL COSTO MATERIALES', 'TOTAL COSTO', 'INDICADOR COSTO FO'].map(key => {
                if (totals[key] !== undefined) {
                  return (
                    <tr key={key} className="bg-gray-100">
                      <td colSpan="7" className="px-4 py-3 text-right font-bold text-gray-700">{key}</td>
                      <td colSpan="4" className="px-4 py-3 font-bold text-gray-800">
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Registrar Entrada de Material</h2>
              <button onClick={() => setIsManualModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleManualSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input type="date" required value={manualForm.fecha} onChange={e => setManualForm({...manualForm, fecha: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código Articulo (AX)</label>
                    <input type="text" value={manualForm.codigo_ax} onChange={e => setManualForm({...manualForm, codigo_ax: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código SAP/Telmex</label>
                    <input type="text" required value={manualForm.codigo_sap} onChange={handleSapChange} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto</label>
                    <input type="text" required value={manualForm.descripcion} onChange={e => setManualForm({...manualForm, descripcion: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                    <input type="text" required value={manualForm.unidad} onChange={e => setManualForm({...manualForm, unidad: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input type="number" step="any" required value={manualForm.cantidad} onChange={e => setManualForm({...manualForm, cantidad: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Origen</label>
                    <input type="text" value={manualForm.sitio_origen} onChange={e => setManualForm({...manualForm, sitio_origen: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Destino</label>
                    <input type="text" value={manualForm.sitio_destino} onChange={e => setManualForm({...manualForm, sitio_destino: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Almacén Origen</label>
                    <input type="text" value={manualForm.almacen_origen} onChange={e => setManualForm({...manualForm, almacen_origen: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Almacén Destino</label>
                    <input type="text" value={manualForm.almacen_destino} onChange={e => setManualForm({...manualForm, almacen_destino: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                    <input type="text" value={manualForm.ubicacion} onChange={e => setManualForm({...manualForm, ubicacion: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setIsManualModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium transition-colors">Cancelar</button>
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors">Guardar Entrada</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
