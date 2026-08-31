import { useState, useEffect } from 'react';
import api from '../api';

export default function CatalogsMaterials() {
  const [materiales, setMateriales] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ codigo_sap: '', codigo_ax: '', descripcion: '', unidad: '' });

  const loadMateriales = async () => {
    try {
      const response = await api.get('/catalogo/materiales');
      setMateriales(response.data.materiales || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMateriales();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/catalogo/materiales', formData);
      setIsModalOpen(false);
      setFormData({ codigo_sap: '', codigo_ax: '', descripcion: '', unidad: '' });
      loadMateriales();
    } catch (err) {
      alert('Error guardando material en catálogo');
    }
  };

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-3xl font-bold text-gray-800">Catálogo de Materiales</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          + Nuevo Material
        </button>
      </header>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Código AX</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Código SAP</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Unidad</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materiales.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{item.codigo_ax}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.codigo_sap}</td>
                  <td className="px-4 py-3">{item.descripcion}</td>
                  <td className="px-4 py-3">{item.unidad}</td>
                </tr>
              ))}
              {materiales.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">No hay materiales en el catálogo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Nuevo Material</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Código AX</label>
                <input type="text" value={formData.codigo_ax} onChange={e => setFormData({...formData, codigo_ax: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Código SAP</label>
                <input required type="text" value={formData.codigo_sap} onChange={e => setFormData({...formData, codigo_sap: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input required type="text" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <input required type="text" value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium transition-colors">Cancelar</button>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
