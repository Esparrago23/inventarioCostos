import { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Inventory from './pages/Inventory';
import CatalogsMaterials from './pages/CatalogsMaterials';
import CatalogsServices from './pages/CatalogsServices';

function App() {
  const location = useLocation();
  const isCatalogActive = location.pathname.startsWith('/catalogs');
  const [catalogsOpen, setCatalogsOpen] = useState(isCatalogActive);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-gray-100 text-gray-800 flex flex-col border-r border-gray-300">
        <div className="p-4 bg-gray-200 border-b border-gray-300">
          <h2 className="text-xl font-bold tracking-wider text-center text-gray-800">sie</h2>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          <NavLink
            to="/inventory"
            className={({ isActive }) =>
              `block px-4 py-3 text-sm font-medium transition-colors border-l-4 ${
                isActive ? 'bg-gray-200 text-black border-blue-500' : 'text-gray-600 border-transparent hover:bg-gray-200 hover:text-black'
              }`
            }
          >
            Inventario Global
          </NavLink>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `block px-4 py-3 text-sm font-medium transition-colors border-l-4 ${
                isActive ? 'bg-gray-200 text-black border-blue-500' : 'text-gray-600 border-transparent hover:bg-gray-200 hover:text-black'
              }`
            }
          >
            Proyectos
          </NavLink>
          
          <div>
            <button
              onClick={() => setCatalogsOpen(!catalogsOpen)}
              className={`w-full text-left block px-4 py-3 text-sm font-medium transition-colors border-l-4 ${
                isCatalogActive ? 'bg-gray-200 text-black border-blue-500' : 'text-gray-600 border-transparent hover:bg-gray-200 hover:text-black'
              } flex justify-between items-center`}
            >
              <span>Catálogos</span>
              <span className={`transform transition-transform ${catalogsOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {catalogsOpen && (
              <div className="pl-4 mt-1 space-y-1">
                <NavLink
                  to="/catalogs/services"
                  className={({ isActive }) =>
                    `block px-4 py-2 text-sm font-medium transition-colors border-l-4 ${
                      isActive ? 'bg-gray-200 text-black border-blue-500' : 'text-gray-500 border-transparent hover:bg-gray-200 hover:text-black'
                    }`
                  }
                >
                  Servicios
                </NavLink>
                <NavLink
                  to="/catalogs/materials"
                  className={({ isActive }) =>
                    `block px-4 py-2 text-sm font-medium transition-colors border-l-4 ${
                      isActive ? 'bg-gray-200 text-black border-blue-500' : 'text-gray-500 border-transparent hover:bg-gray-200 hover:text-black'
                    }`
                  }
                >
                  Materiales
                </NavLink>
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <Routes>
          <Route path="/" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/catalogs/services" element={<CatalogsServices />} />
          <Route path="/catalogs/materials" element={<CatalogsMaterials />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
