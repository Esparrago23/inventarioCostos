import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', tipo: 'Distrito' });
  const navigate = useNavigate();

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openModal = (project = null) => {
    if (project) {
      setEditingId(project.id);
      setFormData({ nombre: project.nombre, tipo: project.tipo });
    } else {
      setEditingId(null);
      setFormData({ nombre: '', tipo: 'Distrito' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/projects/${editingId}`, formData);
      } else {
        await api.post('/projects', formData);
      }
      closeModal();
      loadProjects();
    } catch (err) {
      alert('Error guardando el proyecto');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar este proyecto y todos sus archivos?')) {
      try {
        await api.delete(`/projects/${id}`);
        loadProjects();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-3xl font-bold text-gray-800">Proyectos Activos</h1>
        <button
          onClick={() => openModal()}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          + Nuevo Proyecto
        </button>
      </header>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2 text-gray-700">Gestión de Proyectos</h3>
        <p className="text-gray-600">
          Selecciona un proyecto para gestionar sus archivos y materiales. Cada proyecto funciona de manera independiente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/projects/${p.id}`, { state: { nombre: p.nombre } })}
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-100 flex flex-col justify-between"
          >
            <div className="mb-4">
              <h4 className="text-xl font-semibold text-gray-800 mb-1">{p.nombre}</h4>
              <p className="text-gray-500 text-sm">Tipo: {p.tipo}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(p);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded text-sm font-medium transition-colors"
              >
                Editar
              </button>
              <button
                onClick={(e) => handleDelete(p.id, e)}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-1.5 rounded text-sm font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Proyecto</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Distrito">Distrito</option>
                  <option value="N24">N24</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
                  Guardar Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
