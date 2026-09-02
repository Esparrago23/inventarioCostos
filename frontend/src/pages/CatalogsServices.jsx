import { useState, useEffect } from 'react';
import api from '../api';

export default function CatalogsServices() {
  const [servicios, setServicios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ codigo: '', descripcion: '', unidad: '', precio: '' });

  const loadServicios = async () => {
    try {
      const response = await api.get('/catalogo/servicios');
      setServicios(response.data.servicios || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadServicios();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put('/catalogo/servicios/' + editId, { ...formData, precio: parseFloat(formData.precio) || 0 });
      } else {
        await api.post('/catalogo/servicios', { ...formData, precio: parseFloat(formData.precio) || 0 });
      }
      setIsModalOpen(false);
      setFormData({ codigo: '', descripcion: '', unidad: '', precio: '' });
      setEditId(null);
      loadServicios();
    } catch (err) {
      alert('Error guardando servicio en catálogo');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar?')) {
      try {
        await api.delete('/catalogo/servicios/' + id);
        loadServicios();
      } catch (err) {
        alert('Error eliminando servicio');
      }
    }
  };

  
  const filteredServicios = servicios.filter(s => {
    const term = searchTerm.toLowerCase();
    const cod = (s.codigo || '').toLowerCase();
    const desc = (s.descripcion || '').toLowerCase();
    return cod.includes(term) || desc.includes(term);
  });

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-3xl font-bold text-gray-800">Catálogo de Servicios</h1>
        <button
          onClick={() => {
            setEditId(null);
            setFormData({ codigo: '', descripcion: '', unidad: '', precio: '' });
            setIsModalOpen(true);
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          + Nuevo Servicio
        </button>
      </header>

      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Buscar servicio por UC o descripción..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/2 border border-gray-300 rounded-md px-4 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Unidad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Precio</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServicios.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.codigo}</td>
                  <td className="px-4 py-3">{item.descripcion}</td>
                  <td className="px-4 py-3">{item.unidad}</td>
                  <td className="px-4 py-3">${item.precio}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditId(item.id);
                        setFormData({ codigo: item.codigo || '', descripcion: item.descripcion || '', unidad: item.unidad || '', precio: item.precio || '' });
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filteredServicios.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">No hay servicios en el catálogo.</td>
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
              <h2 className="text-xl font-bold text-gray-800">{editId ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditId(null); setFormData({ codigo: '', descripcion: '', unidad: '', precio: '' }); }} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input required type="text" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input required type="text" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <input required type="text" value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                <input required type="number" step="any" value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditId(null); setFormData({ codigo: '', descripcion: '', unidad: '', precio: '' }); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium transition-colors">Cancelar</button>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
