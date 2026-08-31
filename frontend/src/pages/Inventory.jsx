import { useState, useEffect } from 'react';
import api from '../api';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const response = await api.get('/inventario');
      setInventory(response.data.inventario || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <header className="mb-8 pb-4 border-b">
        <h1 className="text-3xl font-bold text-gray-800">Inventario Global</h1>
      </header>
      <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold mb-2 text-gray-700">Resumen de Materiales en Almacenes</h3>
        <p className="text-gray-600">
          Esta vista proporciona un resumen general del stock (cantidades recibidas y usadas) en todos los proyectos y almacenes. Útil para reasignaciones.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Código SAP</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Unidad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Cant. Total Recibida</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Cant. Total Usada</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Stock Disponible</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.codigo_sap}</td>
                  <td className="px-4 py-3">{item.descripcion}</td>
                  <td className="px-4 py-3">{item.unidad}</td>
                  <td className="px-4 py-3">{item.total_recibido}</td>
                  <td className="px-4 py-3">{item.total_usado}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">{item.total_recibido - item.total_usado}</td>
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No hay inventario disponible.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
