/**
 * RoutingMatrixSection.jsx
 *
 * Centro de Control de la Matriz de Enrutamiento de Comandas (KDS e Impresión)
 * Permite definir qué centro de producción (Cocina, Bar A, Bar B, etc.) recibe
 * cada categoría de productos según el área física de donde se comanda.
 */

import { useState, useMemo } from 'react';
import {
  Network,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Monitor,
  Printer,
  Utensils,
  Layers,
  Store,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  Info
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

export function RoutingMatrixSection({
  areas = [],
  productionCenters = [],
  printCategories = [],
  routingMatrix = [],
  products = [],
  onReload,
}) {
  const toast = useToast();
  const [savingCell, setSavingCell] = useState(null); // 'areaId-catId'

  // Modales
  const [modalNewCat, setModalNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCat, setEditingCat] = useState(null);

  // Simulador de Enrutamiento en Vivo
  const [simAreaId, setSimAreaId] = useState(areas[0]?.id || '');
  const [simProductId, setSimProductId] = useState(products[0]?.id || '');

  // Matriz mapeada en lookup: `${areaId}_${categoriaId}` -> centroProduccionId
  const matrixLookup = useMemo(() => {
    const map = new Map();
    for (const r of routingMatrix) {
      map.set(`${r.area_trabajo_id}_${r.categoria_impresion_id}`, Number(r.centro_produccion_id));
    }
    return map;
  }, [routingMatrix]);

  // Manejador de cambio de celda en la matriz
  const handleCellChange = async (areaId, catId, newCenterId) => {
    const key = `${areaId}-${catId}`;
    setSavingCell(key);
    try {
      if (!newCenterId) {
        // Eliminar regla
        await api.settings.deleteRoutingRule({ areaTrabajoId: areaId, categoriaImpresionId: catId });
        toast.info('Ruta eliminada');
      } else {
        // Guardar regla
        await api.settings.saveRoutingRule({
          areaTrabajoId: areaId,
          categoriaImpresionId: catId,
          centroProduccionId: newCenterId,
        });
        toast.success('Ruta actualizada correctamente');
      }
      if (onReload) await onReload();
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al guardar ruta');
    } finally {
      setSavingCell(null);
    }
  };

  // Guardar nueva categoría de impresión
  const handleCreateCategory = async (e) => {
    e?.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.settings.createPrintCategory({
        nombre: newCatName.trim(),
        descripcion: newCatDesc.trim() || null,
      });
      toast.success('Categoría de impresión creada');
      setNewCatName('');
      setNewCatDesc('');
      setModalNewCat(false);
      if (onReload) await onReload();
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al crear categoría');
    }
  };

  // Editar categoría de impresión
  const handleUpdateCategory = async (e) => {
    e?.preventDefault();
    if (!editingCat || !editingCat.nombre.trim()) return;
    try {
      await api.settings.updatePrintCategory(editingCat.id, {
        nombre: editingCat.nombre.trim(),
        descripcion: editingCat.descripcion?.trim() || null,
      });
      toast.success('Categoría actualizada');
      setEditingCat(null);
      if (onReload) await onReload();
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al actualizar categoría');
    }
  };

  // Eliminar categoría de impresión
  const handleDeleteCategory = async (catId, catName) => {
    if (!window.confirm(`¿Eliminar la categoría de impresión "${catName}"? Se borrarán sus reglas en la matriz.`)) return;
    try {
      await api.settings.deletePrintCategory(catId);
      toast.success('Categoría eliminada');
      if (onReload) await onReload();
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al eliminar');
    }
  };

  // Cálculo del Simulador en Vivo
  const simulationResult = useMemo(() => {
    if (!simAreaId || !simProductId) return null;
    const prod = products.find((p) => p.id === Number(simProductId));
    const area = areas.find((a) => a.id === Number(simAreaId));
    if (!prod || !area) return null;

    // 1. ¿Tiene centro exclusivo?
    if (prod.centro_produccion_exclusivo_id) {
      const center = productionCenters.find((c) => c.id === Number(prod.centro_produccion_exclusivo_id));
      return {
        tipo: 'EXCLUSIVO',
        centro: center?.name || 'Centro Exclusivo #' + prod.centro_produccion_exclusivo_id,
        printer: center?.printer_name || center?.printer_ip ? `${center?.printer_ip}:${center?.printer_port || 9100}` : 'Sin impresora configurada',
        explicacion: `Este producto está fijado como exclusivo y se prepara en ${center?.name || 'su centro asignado'} sin importar desde dónde se pida.`,
      };
    }

    // 2. Resolver por Matriz
    const catId = prod.categoria_impresion_id || prod.category_id;
    const centerId = matrixLookup.get(`${area.id}_${catId}`);

    if (centerId) {
      const center = productionCenters.find((c) => c.id === Number(centerId));
      return {
        tipo: 'DINÁMICO (MATRIZ)',
        centro: center?.name || 'Centro #' + centerId,
        printer: center?.printer_name || center?.printer_ip ? `${center?.printer_ip}:${center?.printer_port || 9100}` : 'Sin impresora configurada',
        explicacion: `Regla resuelta: Área [${area.name}] + Categoría [${prod.categoria_impresion_nombre || 'Bebidas'}] ➔ ${center?.name}.`,
      };
    }

    return {
      tipo: 'SIN RUTA ASIGNADA',
      centro: 'Ninguno (Alerta de Comanda)',
      printer: 'No configurado',
      explicacion: `No existe una celda configurada en la matriz para el área "${area.name}" con la categoría "${prod.categoria_impresion_nombre || prod.category_name}". Se usará el centro por defecto.`,
    };
  }, [simAreaId, simProductId, products, areas, productionCenters, matrixLookup]);

  // Lista de productos con centro exclusivo
  const exclusiveProducts = useMemo(() => {
    return products.filter((p) => p.centro_produccion_exclusivo_id !== null && p.centro_produccion_exclusivo_id !== undefined);
  }, [products]);

  return (
    <div className="space-y-6">
      {/* ── ENCABEZADO Y EXPLICACIÓN ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-6 opacity-10 pointer-events-none">
          <Network className="w-36 h-36 text-indigo-400" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-3 py-1 text-xs text-indigo-300 font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Enrutamiento Inteligente de Comandas
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
            Matriz de Enrutamiento (KDS e Impresión)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Resuelve automáticamente el destino de cada orden:{' '}
            <strong className="text-white">Área de Trabajo</strong> (Piscina, Restaurante, Terraza) +{' '}
            <strong className="text-white">Categoría de Impresión</strong> (Bebidas, Cocina Caliente, etc.){' '}
            = <strong className="text-emerald-400">Centro de Producción Destino</strong>.
          </p>
        </div>
      </div>

      {/* ── CUADRÍCULA DE LA MATRIZ DE ENRUTAMIENTO ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
              Cuadrícula de Enrutamiento Local
            </h3>
            <p className="text-xs text-slate-500">
              Selecciona el centro de producción para cada combinación de Área y Categoría
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalNewCat(true)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Nueva Categoría de Impresión
            </button>
            <button
              onClick={() => onReload && onReload()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              title="Recargar matriz"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabla Grid interactiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="px-5 py-4 min-w-[180px] uppercase text-[10px] tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  Área de Consumo / Terminal
                </th>
                {printCategories.map((cat) => (
                  <th key={cat.id} className="px-4 py-4 min-w-[200px] text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-bold text-slate-800 text-xs">{cat.nombre}</span>
                      <button
                        onClick={() => setEditingCat(cat)}
                        className="text-slate-400 hover:text-indigo-600 p-0.5 rounded"
                        title="Editar nombre de categoría"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.nombre)}
                        className="text-slate-400 hover:text-red-600 p-0.5 rounded"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {cat.descripcion && (
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5 truncate max-w-[180px]">
                        {cat.descripcion}
                      </p>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {areas.map((area) => (
                <tr key={area.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Nombre del Área */}
                  <td className="px-5 py-4 font-bold text-slate-900 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm">{area.name}</span>
                    </div>
                  </td>

                  {/* Celdas con selector de centro de producción */}
                  {printCategories.map((cat) => {
                    const currentCenterId = matrixLookup.get(`${area.id}_${cat.id}`);
                    const cellKey = `${area.id}-${cat.id}`;
                    const isSaving = savingCell === cellKey;

                    return (
                      <td key={cat.id} className="px-4 py-3.5 text-center">
                        <div className="relative inline-block w-full">
                          <select
                            value={currentCenterId || ''}
                            disabled={isSaving}
                            onChange={(e) => handleCellChange(area.id, cat.id, e.target.value)}
                            className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border transition outline-none cursor-pointer ${
                              currentCenterId
                                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 focus:border-indigo-500'
                                : 'bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:border-slate-400'
                            }`}
                          >
                            <option value="">(Sin asignar / Default)</option>
                            {productionCenters.map((pc) => (
                              <option key={pc.id} value={pc.id}>
                                ➔ {pc.name} {pc.printer_name ? `(${pc.printer_name})` : ''}
                              </option>
                            ))}
                          </select>
                          {isSaving && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2">
                              <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SIMULADOR DE ENRUTAMIENTO EN VIVO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulador Interactivo */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Simulador de Comanda en Vivo</h3>
                <p className="text-xs text-slate-500">Verifica cómo resolverá el sistema antes del servicio</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              Prueba Instantánea
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. ¿Desde qué Área se pide?
              </label>
              <select
                value={simAreaId}
                onChange={(e) => setSimAreaId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-indigo-500"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                2. ¿Qué Producto se comanda?
              </label>
              <select
                value={simProductId}
                onChange={(e) => setSimProductId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-indigo-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.centro_produccion_exclusivo_id ? '★ (Exclusivo)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {simulationResult && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Resultado del Enrutamiento
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  simulationResult.tipo === 'EXCLUSIVO'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : simulationResult.tipo.includes('DINÁMICO')
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {simulationResult.tipo}
                </span>
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-indigo-600" />
                  <span>{simulationResult.centro}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Impresora de red: <strong className="font-mono text-slate-800">{simulationResult.printer}</strong></span>
              </div>
              <p className="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 mt-2">
                {simulationResult.explicacion}
              </p>
            </div>
          )}
        </div>

        {/* Productos Exclusivos */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-bold text-slate-900">Productos Exclusivos</h4>
              </div>
              <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                {exclusiveProducts.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Platillos o bebidas con estación fija (ej: Coctelería de autor, Horno de Leña o Pastelería) que se preparan siempre en el mismo lugar sin importar el área.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {exclusiveProducts.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
                  No hay productos con centro exclusivo fijado. Todos se resuelven dinámicamente por la matriz.
                </p>
              ) : (
                exclusiveProducts.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-purple-700 font-medium">
                        ➔ {p.centro_exclusivo_nombre || 'Centro #' + p.centro_produccion_exclusivo_id}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Puedes configurar exclusividad al editar cualquier producto en el apartado de Productos.
          </div>
        </div>
      </div>

      {/* ── MODAL NUEVA CATEGORÍA DE IMPRESIÓN ── */}
      {modalNewCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Nueva Categoría de Impresión</h3>
              <button onClick={() => setModalNewCat(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ej: Bebidas, Cocina Caliente, Postres"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción (Opcional)</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Ej: Tragos directos, cerveza y refrescos"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNewCat(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                >
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR CATEGORÍA DE IMPRESIÓN ── */}
      {editingCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Editar Categoría de Impresión</h3>
              <button onClick={() => setEditingCat(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editingCat.nombre}
                  onChange={(e) => setEditingCat({ ...editingCat, nombre: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={editingCat.descripcion || ''}
                  onChange={(e) => setEditingCat({ ...editingCat, descripcion: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!editingCat.nombre.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
