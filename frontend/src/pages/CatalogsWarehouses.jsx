import { useState, useEffect } from 'react';
import api from '../api';

export default function CatalogsWarehouses() {
  const [almacenes, setAlmacenes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newItem, setNewItem] = useState({ name: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/catalogo/almacenes');
      setAlmacenes(res.data.almacenes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put('/catalogo/almacenes/' + editId, newItem);
      } else {
        await api.post('/catalogo/almacenes', newItem);
      }
      setIsModalOpen(false);
      setNewItem({ name: '' });
      setEditId(null);
      loadData();
    } catch (err) {
      alert('Error guardando almacén');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar?')) {
      try {
        await api.delete('/catalogo/almacenes/' + id);
        loadData();
      } catch (err) {
        alert('Error eliminando almacén');
      }
    }
  };
  
  const filteredAlmacenes = almacenes.filter(a => 
      (a.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Catálogo de Almacenes</h1>
        <button onClick={() => {
          setEditId(null);
          setNewItem({ name: '' });
          setIsModalOpen(true);
        }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm">
          + Nuevo Almacén
        </button>
      </div>
      
      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Buscar almacén por nombre..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/2 px-4 py-2 border rounded shadow-sm"
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre del Almacén</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAlmacenes.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => {
                      setEditId(item.id);
                      setNewItem({ name: item.name || '' });
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
            {filteredAlmacenes.length === 0 && (
              <tr>
                <td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500">No hay almacenes registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">{editId ? 'Editar Almacén' : 'Nuevo Almacén'}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditId(null); setNewItem({ name: '' }); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
