import React, { useState, useEffect } from 'react';
import api from '../api';
import { Search } from 'lucide-react';

function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [filterPertenece, setFilterPertenece] = useState('');
  const [filterAlmacen, setFilterAlmacen] = useState('');
  const [filterProyecto, setFilterProyecto] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/inventario');
      setInventory(response.data.inventory || response.data.inventario || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueAlmacenes = Array.from(new Set(inventory.flatMap(m => (m.lotes || []).map(l => l.almacen)))).filter(a => a && a !== '-');

  const filteredInventory = inventory.map(item => {
    if (!item.lotes) return { ...item, lotes_filtrados: [] };
    
    const lotes_filtrados = item.lotes.filter(lote => {
      if (filterPertenece && lote.pertenece !== filterPertenece) return false;
      if (filterAlmacen && lote.almacen !== filterAlmacen) return false;
      if (filterProyecto) {
        const matchesPedido = lote.pedido_por.toLowerCase().includes(filterProyecto.toLowerCase());
        const matchesUsado = Object.keys(lote.usado_en).some(p => p.toLowerCase().includes(filterProyecto.toLowerCase()));
        if (!matchesPedido && !matchesUsado) return false;
      }
      return true;
    });
    
    return { ...item, lotes_filtrados };
  }).filter(item => item.lotes_filtrados.length > 0);

  return (
    <div className="max-w-7xl mx-auto py-4 sm:px-4 lg:px-6">
      <header className="mb-4 pb-2 border-b">
        <h1 className="text-3xl font-bold text-gray-800">Inventario Global</h1>
      </header>

      {/* FILTERS */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Pertenece a</label>
          <select value={filterPertenece} onChange={e => setFilterPertenece(e.target.value)} className="w-full border-gray-300 rounded-md text-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
            <option value="">Todos (N24 y Distrito)</option>
            <option value="N24">Solo N24</option>
            <option value="DISTRITO">Solo Distrito</option>
          </select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Almacén</label>
          <select value={filterAlmacen} onChange={e => setFilterAlmacen(e.target.value)} className="w-full border-gray-300 rounded-md text-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
            <option value="">Todos los almacenes</option>
            {uniqueAlmacenes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px] relative">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Buscar Proyecto</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Nombre del proyecto..." 
              value={filterProyecto}
              onChange={e => setFilterProyecto(e.target.value)}
              className="w-full pl-10 border-gray-300 rounded-md text-sm p-2 border focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase w-1/3">Material</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Disponible</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase min-w-[250px]">Desglose (Origen y Almacén)</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Usado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">Cargando inventario...</td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">No hay material que coincida con los filtros.</td>
                </tr>
              ) : (
                filteredInventory.map((item, idx) => {
                  // Compute visible totals for the filtered lots
                  const totalDisp = item.lotes_filtrados.reduce((acc, l) => acc + l.disponible, 0);
                  const totalUsado = item.lotes_filtrados.reduce((acc, l) => acc + Object.values(l.usado_en).reduce((sum, val) => sum + val, 0), 0);
                  
                  // Consolidate used breakdown for the tooltip
                  const usedMap = {};
                  item.lotes_filtrados.forEach(l => {
                    Object.entries(l.usado_en).forEach(([proj, qty]) => {
                      usedMap[proj] = (usedMap[proj] || 0) + qty;
                    });
                  });
                  const usedEntries = Object.entries(usedMap);

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 align-top">
                        <div className="font-bold text-gray-900 text-base">{item.codigo}</div>
                        <div className="text-gray-600 text-xs mt-1 font-medium">{item.descripcion}</div>
                        {item.unidad && <div className="text-gray-400 text-xs mt-1">Unidad: {item.unidad}</div>}
                      </td>
                      
                      <td className="px-3 py-2 align-top">
                        <span className="font-bold text-gray-600 text-lg">{totalDisp}</span>
                      </td>
                      
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col gap-1">
                          {item.lotes_filtrados.filter(l => l.disponible > 0).length === 0 ? (
                            <span className="text-gray-400 italic text-xs">Sin stock disponible</span>
                          ) : (
                            item.lotes_filtrados.filter(l => l.disponible > 0).map((lote, lidx) => (
                              <div key={lidx} className="flex justify-between items-center text-xs bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                <div>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 ${lote.pertenece === 'N24' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                    {lote.pertenece}
                                  </span>
                                  <span className="font-semibold text-gray-700">{lote.pedido_por}</span>
                                  <span className="text-gray-500 ml-1">- {lote.almacen} {lote.ubicacion !== '-' ? `(${lote.ubicacion})` : ''}</span>
                                </div>
                                <span className="font-bold text-black-600 ml-3">{lote.disponible}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      
                      <td className="px-3 py-2 align-top relative group">
                        <span className={`font-bold text-lg ${totalUsado > 0 ? 'text-orange-600 cursor-help border-b border-dashed border-orange-300' : 'text-gray-400'}`}>
                          {totalUsado}
                        </span>
                        
                        {/* Tooltip for Usado En */}
                        {usedEntries.length > 0 && (
                          <div className="absolute left-0 mt-1 w-64 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none p-2">
                            <div className="font-semibold mb-1 text-gray-300 border-b border-gray-600 pb-1">Desglose de uso:</div>
                            <ul className="space-y-1">
                              {usedEntries.map(([proj, qty]) => (
                                <li key={proj} className="flex justify-between">
                                  <span className="truncate pr-2">{proj}</span>
                                  <span className="font-bold text-orange-300">{qty}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Inventory;
