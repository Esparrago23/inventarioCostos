import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ 
    tipo: 'Distrito',
    operacion: '',
    oei: '',
    oe: '',
    pep: '',
    central: '',
    ruta: '',
    dis: '',
    lugar: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.pep) {
        alert("El PEP es requerido");
        return;
    }
    try {
      await api.post('/projects', newProject);
      setIsModalOpen(false);
      setNewProject({ tipo: 'Distrito', operacion: '', oei: '', oe: '', pep: '', central: '', ruta: '', dis: '', lugar: '' });
      loadProjects();
    } catch (err) {
      console.error(err);
      alert('Error al crear el proyecto');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de eliminar este proyecto y todos sus datos?')) {
      try {
        await api.delete(`/projects/${id}`);
        loadProjects();
      } catch (err) {
        console.error(err);
        alert('Error al eliminar');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Proyectos</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors">
          + Nuevo Proyecto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(proj => (
          <div key={proj.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
              <div className="flex justify-between items-start">
                <Link to={`/projects/${proj.id}`} className="text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors uppercase">
                  {proj.lugar || proj.nombre}
                </Link>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{proj.tipo}</span>
              </div>
              
              <div className="mt-2 text-sm font-medium text-gray-700">
                {proj.pep || ''} {proj.operacion || ''} {proj.oei || ''} {proj.oe || ''}
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <Link to={`/projects/${proj.id}`} className="flex-1 bg-gray-50 text-gray-700 text-center py-2 rounded border hover:bg-gray-100 transition-colors">
                Editar
              </Link>
              <button onClick={() => handleDelete(proj.id)} className="flex-1 bg-red-50 text-red-600 text-center py-2 rounded border border-red-100 hover:bg-red-100 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Nuevo Proyecto</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Principales */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PEP *</label>
                  <input type="text" required value={newProject.pep} onChange={e => setNewProject({...newProject, pep: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operación</label>
                  <input type="text" value={newProject.operacion} onChange={e => setNewProject({...newProject, operacion: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OEI</label>
                  <input type="text" value={newProject.oei} onChange={e => setNewProject({...newProject, oei: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OE</label>
                  <input type="text" value={newProject.oe} onChange={e => setNewProject({...newProject, oe: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>
              </div>

              <hr className="my-4" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Extras */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Central</label>
                  <input type="text" value={newProject.central} onChange={e => setNewProject({...newProject, central: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruta</label>
                  <input type="text" value={newProject.ruta} onChange={e => setNewProject({...newProject, ruta: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DIS</label>
                  <input type="text" value={newProject.dis} onChange={e => setNewProject({...newProject, dis: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                  <input type="text" value={newProject.lugar} onChange={e => setNewProject({...newProject, lugar: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>
              </div>

              <div className="mt-4 w-full md:w-1/4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={newProject.tipo} onChange={e => setNewProject({...newProject, tipo: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                  <option value="Distrito">Distrito</option>
                  <option value="N24">N24</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow-sm font-medium transition-colors">Guardar Proyecto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
