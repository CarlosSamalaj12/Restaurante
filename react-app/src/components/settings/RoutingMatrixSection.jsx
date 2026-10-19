/**
 * RoutingMatrixSection.jsx
 *
 * Centro de Control de Enrutamiento de Comandas (KDS e Impresión Térmica)
 * Diseño intuitivo por Tarjetas de Categoría con Estación Principal y Excepciones por Área.
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
  ArrowRight,
  Printer,
  Utensils,
  Store,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  Info,
  Search,
  Wine,
  Coffee,
  Beer,
  CupSoda,
  Cake,
  Salad,
  Pizza,
  Beef,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../ConfirmDialog';

// Selector dinámico de íconos según el nombre de la categoría
function getCategoryIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('cafe') || n.includes('café') || n.includes('caliente')) return Coffee;
  if (n.includes('trago') || n.includes('vino') || n.includes('coctel') || n.includes('bar')) return Wine;
  if (n.includes('cerveza') || n.includes('beer')) return Beer;
  if (n.includes('bebida') || n.includes('fria') || n.includes('fría') || n.includes('refresco') || n.includes('jugo')) return CupSoda;
  if (n.includes('postre') || n.includes('dulce') || n.includes('pastel') || n.includes('panader')) return Cake;
  if (n.includes('ensalada') || n.includes('vegetal') || n.includes('verde')) return Salad;
  if (n.includes('pizza')) return Pizza;
  if (n.includes('carne') || n.includes('parrilla') || n.includes('steak') || n.includes('lomito')) return Beef;
  if (n.includes('fuerte') || n.includes('caliente') || n.includes('cocina')) return Flame;
  return Utensils;
}

export function RoutingMatrixSection({
  areas = [],
  productionCenters = [],
  printCategories = [],
  routingMatrix = [],
  products = [],
  onReload,
}) {
  const toast = useToast();

  // Diálogo de confirmación moderno con diseño
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    itemDetail: '',
    confirmText: 'Eliminar Categoría',
    variant: 'danger',
    loading: false,
    onConfirm: () => {},
  });

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
  };

  // Estados de interfaz
  const [searchTerm, setSearchTerm] = useState('');
  const [savingCatId, setSavingCatId] = useState(null);

  // Modales
  const [modalNewCat, setModalNewCat] = useState(false);
  const [newCatForm, setNewCatForm] = useState({
    nombre: '',
    descripcion: '',
    defaultCenterId: productionCenters[0]?.id ? String(productionCenters[0].id) : '',
  });

  const [editingCat, setEditingCat] = useState(null);
  const [addingExceptionCat, setAddingExceptionCat] = useState(null); // Category object
  const [exceptionForm, setExceptionForm] = useState({
    areaId: '',
    centerId: '',
  });

  // Simulador de Enrutamiento en Vivo
  const [simAreaId, setSimAreaId] = useState(areas[0]?.id || '');
  const [simProductId, setSimProductId] = useState(products[0]?.id || '');

  // Conteo de productos por categoría
  const productCountByCat = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const catId = p.categoria_impresion_id || p.category_id;
      if (catId) {
        map.set(catId, (map.get(catId) || 0) + 1);
      }
    }
    return map;
  }, [products]);

  // Lookup de reglas de matriz: `${areaId}_${categoriaId}` -> centroProduccionId
  const matrixLookup = useMemo(() => {
    const map = new Map();
    for (const r of routingMatrix) {
      map.set(`${r.area_trabajo_id}_${r.categoria_impresion_id}`, Number(r.centro_produccion_id));
    }
    return map;
  }, [routingMatrix]);

  // Análisis por categoría: Determinar estación principal y excepciones por área
  const categoryRoutingAnalysis = useMemo(() => {
    return printCategories.map((cat) => {
      const areaAssignments = areas.map((area) => {
        const centerId = matrixLookup.get(`${area.id}_${cat.id}`) || null;
        return {
          area,
          centerId,
          center: productionCenters.find((pc) => pc.id === centerId) || null,
        };
      });

      // Contar frecuencias para detectar el centro mayoritario / principal
      const freq = new Map();
      for (const a of areaAssignments) {
        if (a.centerId) {
          freq.set(a.centerId, (freq.get(a.centerId) || 0) + 1);
        }
      }

      let mainCenterId = null;
      let maxCount = -1;
      for (const [cId, count] of freq.entries()) {
        if (count > maxCount) {
          maxCount = count;
          mainCenterId = cId;
        }
      }

      // Si no hay ninguno configurado, sugerir el primer centro disponible
      if (!mainCenterId && areaAssignments.length > 0 && areaAssignments[0].centerId) {
        mainCenterId = areaAssignments[0].centerId;
      }

      const mainCenter = productionCenters.find((pc) => pc.id === mainCenterId) || null;

      // Excepciones: áreas cuyo centro difiere del principal
      const exceptions = areaAssignments.filter(
        (a) => a.centerId && mainCenterId && a.centerId !== mainCenterId
      );

      // Áreas disponibles para agregar como excepción
      const availableAreasForException = areas.filter(
        (a) => !exceptions.some((e) => e.area.id === a.id)
      );

      return {
        cat,
        productCount: productCountByCat.get(cat.id) || 0,
        mainCenterId,
        mainCenter,
        exceptions,
        availableAreasForException,
        allConfigured: areaAssignments.every((a) => a.centerId !== null),
      };
    });
  }, [printCategories, areas, productionCenters, matrixLookup, productCountByCat]);

  // Filtrado por buscador
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categoryRoutingAnalysis;
    const q = searchTerm.toLowerCase();
    return categoryRoutingAnalysis.filter(
      (c) =>
        c.cat.nombre.toLowerCase().includes(q) ||
        (c.cat.descripcion && c.cat.descripcion.toLowerCase().includes(q)) ||
        (c.mainCenter && c.mainCenter.name.toLowerCase().includes(q))
    );
  }, [categoryRoutingAnalysis, searchTerm]);

  // ── MANEJADORES DE ACCIONES ──

  // 1. Cambiar Estación Principal de una Categoría (Aplica a todas las áreas)
  const handleSetMainCenter = async (catId, newCenterId) => {
    if (!newCenterId) return;
    setSavingCatId(catId);
    try {
      // Guardar regla para todas las áreas activas
      await Promise.all(
        areas.map((a) =>
          api.settings.saveRoutingRule({
            areaTrabajoId: a.id,
            categoriaImpresionId: catId,
            centroProduccionId: Number(newCenterId),
          })
        )
      );
      const targetCenter = productionCenters.find((pc) => pc.id === Number(newCenterId));
      toast.success(`Destino principal actualizado a "${targetCenter?.name || 'Centro'}"`);
      if (onReload) await onReload();
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al guardar destino');
    } finally {
      setSavingCatId(null);
    }
  };

  // 2. Abrir modal para agregar excepción
  const openAddExceptionModal = (catItem) => {
    const defaultArea = catItem.availableAreasForException[0]?.id || '';
    const otherCenter = productionCenters.find((pc) => pc.id !== catItem.mainCenterId) || productionCenters[0];
    setExceptionForm({
      areaId: defaultArea ? String(defaultArea) : '',
      centerId: otherCenter?.id ? String(otherCenter.id) : '',
    });
    setAddingExceptionCat(catItem);
  };

  // 3. Guardar Excepción por Área
  const handleSaveException = async (e) => {
    e?.preventDefault();
    if (!addingExceptionCat || !exceptionForm.areaId || !exceptionForm.centerId) return;
    setSavingCatId(addingExceptionCat.cat.id);
    try {
      await api.settings.saveRoutingRule({
        areaTrabajoId: Number(exceptionForm.areaId),
        categoriaImpresionId: addingExceptionCat.cat.id,
        centroProduccionId: Number(exceptionForm.centerId),
      });
      const areaObj = areas.find((a) => a.id === Number(exceptionForm.areaId));
      const centerObj = productionCenters.find((c) => c.id === Number(exceptionForm.centerId));
      toast.success(`Excepción agregada: ${areaObj?.name || 'Área'} ➔ ${centerObj?.name || 'Centro'}`);
      setAddingExceptionCat(null);
      if (onReload) await onReload();
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al guardar excepción');
    } finally {
      setSavingCatId(null);
    }
  };

  // 4. Modificar el centro de una excepción existente
  const handleUpdateExceptionCenter = async (catId, areaId, newCenterId) => {
    setSavingCatId(catId);
    try {
      await api.settings.saveRoutingRule({
        areaTrabajoId: Number(areaId),
        categoriaImpresionId: catId,
        centroProduccionId: Number(newCenterId),
      });
      toast.success('Excepción de área actualizada');
      if (onReload) await onReload();
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al actualizar excepción');
    } finally {
      setSavingCatId(null);
    }
  };

  // 5. Eliminar una Excepción (Vuelve a usar el destino principal)
  const handleRemoveException = async (catId, areaId, mainCenterId) => {
    setSavingCatId(catId);
    try {
      if (mainCenterId) {
        await api.settings.saveRoutingRule({
          areaTrabajoId: Number(areaId),
          categoriaImpresionId: catId,
          centroProduccionId: Number(mainCenterId),
        });
      } else {
        await api.settings.deleteRoutingRule({
          areaTrabajoId: Number(areaId),
          categoriaImpresionId: catId,
        });
      }
      toast.info('Excepción eliminada (restablecida al destino principal)');
      if (onReload) await onReload();
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al eliminar excepción');
    } finally {
      setSavingCatId(null);
    }
  };

  // 6. Crear Categoría de Impresión
  const handleCreateCategory = async (e) => {
    e?.preventDefault();
    if (!newCatForm.nombre.trim()) return;
    try {
      const newId = await api.settings.createPrintCategory({
        nombre: newCatForm.nombre.trim(),
        descripcion: newCatForm.descripcion.trim() || null,
      });

      // Si seleccionó una estación inicial, aplicarla automáticamente a todas las áreas
      if (newCatForm.defaultCenterId && areas.length > 0) {
        await Promise.all(
          areas.map((a) =>
            api.settings.saveRoutingRule({
              areaTrabajoId: a.id,
              categoriaImpresionId: newId,
              centroProduccionId: Number(newCatForm.defaultCenterId),
            })
          )
        );
      }

      toast.success(`Categoría "${newCatForm.nombre.trim()}" creada con éxito`);
      setNewCatForm({
        nombre: '',
        descripcion: '',
        defaultCenterId: productionCenters[0]?.id ? String(productionCenters[0].id) : '',
      });
      setModalNewCat(false);
      if (onReload) await onReload();
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al crear categoría');
    }
  };

  // 7. Actualizar Categoría
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
      toast.error(err?.data?.error || err?.message || 'Error al actualizar');
    }
  };

  // 8. Eliminar Categoría
  const handleDeleteCategory = (catId, catName) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar categoría de comanda?',
      message: 'Se eliminarán sus rutas de cocina asociadas y los productos quedarán sin categoría de impresión.',
      itemName: catName,
      itemDetail: 'Esta acción no puede revertirse automáticamente.',
      variant: 'danger',
      confirmText: 'Eliminar Categoría',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          await api.settings.deletePrintCategory(catId);
          toast.success(`Categoría "${catName}" eliminada`);
          if (onReload) await onReload();
          closeConfirm();
        } catch (err) {
          toast.error(err?.data?.error || err?.message || 'Error al eliminar categoría');
          closeConfirm();
        }
      },
    });
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
        printer: center?.printer_name || (center?.printer_ip ? `${center.printer_ip}:${center.printer_port || 9100}` : 'Impresora Local / KDS'),
        explicacion: `Este platillo tiene estación exclusiva configurada y se prepara siempre en ${center?.name || 'su centro asignado'} sin importar desde qué mesa se ordene.`,
      };
    }

    // 2. Resolver por Matriz
    const catId = prod.categoria_impresion_id || prod.category_id;
    const centerId = matrixLookup.get(`${area.id}_${catId}`);

    if (centerId) {
      const center = productionCenters.find((c) => c.id === Number(centerId));
      return {
        tipo: 'AUTOMÁTICO',
        centro: center?.name || 'Centro #' + centerId,
        printer: center?.printer_name || (center?.printer_ip ? `${center.printer_ip}:${center.printer_port || 9100}` : 'Pantalla KDS / Impresora Térmica'),
        explicacion: `Al pedir en "${area.name}", la categoría "${prod.categoria_impresion_nombre || 'General'}" se envía a "${center?.name}".`,
      };
    }

    return {
      tipo: 'SIN RUTA ASIGNADA',
      centro: 'Centro por Defecto (Cocina1)',
      printer: 'No configurado',
      explicacion: `No existe ruta para el área "${area.name}" con la categoría "${prod.categoria_impresion_nombre || 'General'}". Se usará la estación principal.`,
    };
  }, [simAreaId, simProductId, products, areas, productionCenters, matrixLookup]);

  // Lista de productos con centro exclusivo
  const exclusiveProducts = useMemo(() => {
    return products.filter((p) => p.centro_produccion_exclusivo_id !== null && p.centro_produccion_exclusivo_id !== undefined);
  }, [products]);

  return (
    <div className="space-y-6">
      {/* ── HERO BANNER: EXPLICACIÓN CLARA Y MODERNA ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 text-slate-800 shadow-2xs border border-slate-200/90 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-6 opacity-[0.06] pointer-events-none">
          <Network className="w-36 h-36 text-slate-900" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200/80 rounded-full px-3 py-1 text-xs text-indigo-700 font-bold mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" /> Enrutamiento Inteligente de Comandas
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
            Enrutamiento de Cocina y Bar
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Configura de forma fácil a qué cocina o bar se envían tus platillos y bebidas.
            Solo elige la <strong className="text-slate-900 font-bold">Estación Principal</strong> de cada categoría, y si alguna zona (como la <strong className="text-amber-700 font-bold">Terraza</strong>) usa un bar o cocina diferente, agrega una <strong className="text-emerald-700 font-bold">excepción</strong> con un solo clic.
          </p>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y ACCIONES RÁPIDAS ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Estadísticas rápidas */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>{printCategories.length} Categorías</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span>{areas.length} Áreas de Salón</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
            <Utensils className="w-3.5 h-3.5 text-amber-600" />
            <span>{productionCenters.length} Estaciones (Cocina/Bar)</span>
          </div>
        </div>

        {/* Buscador y Botón Nueva Categoría */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
            />
          </div>

          <button
            onClick={() => setModalNewCat(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Categoría</span>
          </button>

          <button
            onClick={() => onReload && onReload()}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
            title="Recargar rutas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── CUADRÍCULA DE TARJETAS INTUITIVAS POR CATEGORÍA ── */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No se encontraron categorías de impresión</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm ? 'Prueba con otro término de búsqueda.' : 'Crea tu primera categoría para comenzar a enrutar platillos.'}
          </p>
          <button
            onClick={() => setModalNewCat(true)}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Crear Primera Categoría
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCategories.map(({ cat, productCount, mainCenterId, mainCenter, exceptions, availableAreasForException }) => {
            const IconComponent = getCategoryIcon(cat.nombre);
            const isSaving = savingCatId === cat.id;

            return (
              <div
                key={cat.id}
                className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between relative group"
              >
                {/* Indicador de guardado flotante */}
                {isSaving && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs rounded-3xl z-20 flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
                    <span className="text-xs font-bold text-indigo-900">Guardando ruta...</span>
                  </div>
                )}

                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate" title={cat.nombre}>
                          {cat.nombre}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {productCount} platillo{productCount === 1 ? '' : 's'} asignado{productCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    {/* Botones de Editar y Eliminar Categoría */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingCat(cat)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Editar nombre"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.nombre)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Destino Principal (Todo el restaurante) */}
                  <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/70 mb-4">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      ¿A qué estación se envía principalmente?
                    </label>
                    <select
                      value={mainCenterId || ''}
                      onChange={(e) => handleSetMainCenter(cat.id, e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 shadow-2xs outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">Selecciona estación de destino...</option>
                      {productionCenters.map((pc) => (
                        <option key={pc.id} value={pc.id}>
                          ➔ {pc.name} {pc.printer_name ? `(${pc.printer_name})` : ''}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>
                        {mainCenter
                          ? `Por defecto va a ${mainCenter.name} para todas las áreas.`
                          : 'Selecciona una cocina o bar predeterminado.'}
                      </span>
                    </div>
                  </div>

                  {/* Sección de Excepciones por Área */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        Excepciones por Área
                      </span>
                      {exceptions.length > 0 && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          {exceptions.length} activa{exceptions.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>

                    {/* Lista de excepciones activas */}
                    {exceptions.length > 0 ? (
                      <div className="space-y-1.5">
                        {exceptions.map(({ area, centerId }) => (
                          <div
                            key={area.id}
                            className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 block truncate">{area.name}</span>
                              <span className="text-[10px] text-amber-800">Se prepara en:</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <select
                                value={centerId || ''}
                                onChange={(e) => handleUpdateExceptionCenter(cat.id, area.id, e.target.value)}
                                className="text-xs font-semibold px-2 py-1 bg-white border border-amber-300 rounded-lg text-slate-800 outline-none"
                              >
                                {productionCenters.map((pc) => (
                                  <option key={pc.id} value={pc.id}>
                                    {pc.name}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => handleRemoveException(cat.id, area.id, mainCenterId)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                title="Quitar excepción (usar estación principal)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic bg-slate-50/50 p-2 rounded-xl">
                        Sin excepciones. Todas las áreas usan la estación principal.
                      </p>
                    )}
                  </div>
                </div>

                {/* Pie de la tarjeta: Botón para agregar excepción */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  {availableAreasForException.length > 0 ? (
                    <button
                      onClick={() => openAddExceptionModal({ cat, mainCenterId, availableAreasForException })}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar excepción por área</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Todas las áreas tienen ruta
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SIMULADOR DE ENRUTAMIENTO EN VIVO & PRODUCTOS EXCLUSIVOS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Simulador Interactivo */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Simulador de Comanda en Vivo</h3>
                <p className="text-xs text-slate-500">Prueba al instante a qué cocina o bar se enviará cualquier platillo</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
              Verificador en Tiempo Real
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
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-indigo-500 cursor-pointer"
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
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-indigo-500 cursor-pointer"
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
                  Destino Calculado
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    simulationResult.tipo === 'EXCLUSIVO'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : simulationResult.tipo === 'AUTOMÁTICO'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
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
                <span>
                  Dispositivo de salida:{' '}
                  <strong className="font-mono text-slate-800">{simulationResult.printer}</strong>
                </span>
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
              Platillos o bebidas con estación fija (ej: Horno de Leña, Parrilla especial) que se preparan siempre en el mismo lugar sin importar el área.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {exclusiveProducts.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
                  No hay productos con centro exclusivo fijado. Todos se resuelven dinámicamente por la categoría.
                </p>
              ) : (
                exclusiveProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between"
                  >
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
            Puedes configurar exclusividad al editar un platillo en la sección de Productos.
          </div>
        </div>
      </div>

      {/* ── MODAL AGREGAR EXCEPCIÓN POR ÁREA ── */}
      {addingExceptionCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Agregar Excepción de Área</h3>
                <p className="text-xs text-slate-500">
                  Para categoría: <strong>{addingExceptionCat.cat.nombre}</strong>
                </p>
              </div>
              <button onClick={() => setAddingExceptionCat(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveException} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. ¿En qué Área del restaurante?
                </label>
                <select
                  required
                  value={exceptionForm.areaId}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, areaId: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none cursor-pointer"
                >
                  <option value="">Selecciona el área...</option>
                  {addingExceptionCat.availableAreasForException.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. ¿A qué Estación se debe enviar en esta área?
                </label>
                <select
                  required
                  value={exceptionForm.centerId}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, centerId: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none cursor-pointer"
                >
                  <option value="">Selecciona cocina o bar...</option>
                  {productionCenters.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      ➔ {pc.name} {pc.printer_name ? `(${pc.printer_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingExceptionCat(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!exceptionForm.areaId || !exceptionForm.centerId}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                >
                  Guardar Excepción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  value={newCatForm.nombre}
                  onChange={(e) => setNewCatForm({ ...newCatForm, nombre: e.target.value })}
                  placeholder="Ej: Bebidas, Cocina Caliente, Postres, Entradas"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estación Inicial de Destino (Cocina o Bar)
                </label>
                <select
                  value={newCatForm.defaultCenterId}
                  onChange={(e) => setNewCatForm({ ...newCatForm, defaultCenterId: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none cursor-pointer"
                >
                  {productionCenters.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      ➔ {pc.name} {pc.printer_name ? `(${pc.printer_name})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Se configurará automáticamente para todas las áreas del restaurante.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción (Opcional)</label>
                <input
                  type="text"
                  value={newCatForm.descripcion}
                  onChange={(e) => setNewCatForm({ ...newCatForm, descripcion: e.target.value })}
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
                  disabled={!newCatForm.nombre.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                >
                  Crear y Enrutar
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

      {/* Modal de confirmación estilizado */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        itemDetail={confirmDialog.itemDetail}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        loading={confirmDialog.loading}
      />
    </div>
  );
}

export default RoutingMatrixSection;
