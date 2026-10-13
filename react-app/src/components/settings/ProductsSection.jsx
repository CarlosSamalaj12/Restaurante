import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Printer,
  Sparkles,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { ProductIconBadge } from '../../utils/productIcons';

// Products Section
export function ProductsSection({ products, categories, productionCenters, productProductionCenters, modifierGroups, productModifierGroups, centers, printCategories = [], printers = [], onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingProduct(null);
    if (onReload) onReload();
  };

  const handleDeleteProduct = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteProduct(confirmDelete.id);
      toast.success('Producto eliminado');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
      setConfirmDelete(null);
    }
  };

  const getCategoryColor = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.color || '#6366f1';
  };

  const getProductCenters = (productId) => {
    const centerIds = productProductionCenters
      ?.filter(ppc => Number(ppc.product_id) === Number(productId))
      .map(ppc => Number(ppc.center_id)) || [];
    return productionCenters.filter(c => centerIds.includes(c.id));
  };

  const getCenterBadgeColor = (centerName) => {
    const name = (centerName || '').toLowerCase();
    if (name.includes('cocina')) return 'bg-orange-100 text-orange-700';
    if (name.includes('bar')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {products.length} productos
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="group bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          Nuevo Producto
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-2">
        {products.map(product => {
          const centers = getProductCenters(product.id);
          return (
            <m.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <ProductIconBadge
                  productName={product.name}
                  categoryName={product.category_name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    {product.categoria_impresion_nombre && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50/80 text-indigo-700 border border-indigo-200/60 shrink-0">
                        <Printer className="w-3 h-3 text-indigo-500" />
                        {product.categoria_impresion_nombre}
                      </span>
                    )}
                    {product.centro_exclusivo_nombre && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50/80 text-purple-700 border border-purple-200/60 shrink-0">
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        Exclusivo: {product.centro_exclusivo_nombre}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{product.category_name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">Q {Number(product.base_price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setShowWizard(true);
                    }}
                    className="p-2.5 rounded-xl transition-all duration-200 bg-blue-50/70 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                    title="Editar producto"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: product.id, name: product.name })}
                    className="p-2.5 rounded-xl transition-all duration-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Centers badges */}
              {centers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                  <span className="text-xs text-gray-400 font-medium">Va a:</span>
                  {centers.map(center => (
                    <span 
                      key={center.id}
                      className={`text-xs font-medium px-2 py-1 rounded-lg ${getCenterBadgeColor(center.name)}`}
                    >
                      {center.name}
                    </span>
                  ))}
                </div>
              )}
              {centers.length === 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400 italic">Sin centro de producción asignado</span>
                </div>
              )}
            </m.div>
          );
        })}
      </div>

      {/* Product Wizard Modal */}
      {showWizard && (
        <ProductWizardModal
          categories={categories}
          editingProduct={editingProduct}
          productionCenters={productionCenters}
          productProductionCenters={productProductionCenters}
          modifierGroups={modifierGroups}
          productModifierGroups={productModifierGroups}
          centers={centers}
          printCategories={printCategories}
          printers={printers}
          onClose={() => {
            setShowWizard(false);
            setEditingProduct(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar producto</h3>
              <p className="text-gray-500 mb-6">
                ¿Estás seguro de eliminar <strong>{confirmDelete.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </m.div>
        </div>
      )}
    </div>
  );
}

// Product Creation Wizard
function ProductWizardModal({ categories, editingProduct, productionCenters, productProductionCenters, modifierGroups, productModifierGroups, centers, printCategories = [], printers = [], onClose, onCreated }) {
  const existingProductionCenters = editingProduct
    ? (productProductionCenters?.filter(ppc => Number(ppc.product_id) === Number(editingProduct.id)).map(ppc => Number(ppc.center_id)) || [])
    : [];
  const existingModifierGroupIds = editingProduct
    ? (productModifierGroups?.filter(pmg => Number(pmg.product_id) === Number(editingProduct.id)).map(pmg => Number(pmg.group_id)) || [])
    : [];

  // Get the operation center for existing production centers (for edit mode)
  const getExistingCenterId = () => {
    if (editingProduct && existingProductionCenters.length > 0) {
      const prodCenter = productionCenters?.find(pc => pc.id === existingProductionCenters[0]);
      return prodCenter?.operation_center_id || '';
    }
    return '';
  };

  const [step, setStep] = useState(editingProduct ? 8 : 1);
  const [showAdvancedRouting, setShowAdvancedRouting] = useState(false);
  const [form, setForm] = useState({
    name: editingProduct?.name || '',
    categoryId: editingProduct?.category_id || '',
    categoriaImpresionId: editingProduct?.categoria_impresion_id || '',
    centroProduccionExclusivoId: editingProduct?.centro_produccion_exclusivo_id || '',
    basePrice: editingProduct?.base_price ?? 0,
    allowDiscount: editingProduct?.allow_discount ?? true,
    trackInventory: editingProduct?.track_inventory ?? false,
    productionCenterIds: existingProductionCenters,
    modifierGroupIds: existingModifierGroupIds,
    recipe: [],
    operationCenterId: editingProduct?.operation_center_id || getExistingCenterId() || ''
  });
  const [loading, setLoading] = useState(false);
  const [modifierSearch, setModifierSearch] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const toast = useToast();

  const isEditing = !!editingProduct;

  // Filter production centers by selected operation center
  const filteredProductionCenters = form.operationCenterId
    ? productionCenters?.filter(pc => Number(pc.operation_center_id) === Number(form.operationCenterId)) || []
    : productionCenters || [];

  const getCenterPrinterInfo = (center) => {
    return printers?.find(p => p.id === center.printer_id) 
      || (center.printer_ip ? { name: center.printer_name, ip: center.printer_ip, port: center.printer_port } : null);
  };

  useEffect(() => {
    if (editingProduct && editingProduct.track_inventory) {
      loadRecipe();
    }
    loadInventoryItems();
  }, []);

  const loadRecipe = async () => {
    try {
      const data = await api.inventory.getRecipe(editingProduct.id);
      setForm(prev => ({ ...prev, recipe: data.map(r => ({ inventoryItemId: r.inventory_item_id, quantity: r.quantity })) }));
    } catch {}
  };

  const loadInventoryItems = async () => {
    try {
      const data = await api.inventory.list();
      setInventoryItems(data);
    } catch {}
  };

  const steps = [
    { num: 1, label: 'Nombre' },
    { num: 2, label: 'Categoría' },
    { num: 3, label: 'Precio' },
    { num: 4, label: 'Centro' },
    { num: 5, label: 'Producción' },
    { num: 6, label: 'Receta' },
    { num: 7, label: 'Modificadores' },
    { num: 8, label: 'Confirmar' }
  ];

  const handleNext = () => {
    if (step === 1 && !form.name.trim()) {
      toast.error('Ingresa el nombre del producto');
      return;
    }
    if (step === 2 && !form.categoryId) {
      toast.error('Selecciona una categoría');
      return;
    }
    if (step === 3 && (!form.basePrice || Number(form.basePrice) <= 0)) {
      toast.error('Ingresa un precio válido');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let productId = editingProduct?.id;
      const payload = { 
        ...form, 
        isActive: 1,
        centerId: form.operationCenterId || null,
        categoriaImpresionId: form.categoriaImpresionId ? Number(form.categoriaImpresionId) : null,
        centroProduccionExclusivoId: form.centroProduccionExclusivoId ? Number(form.centroProduccionExclusivoId) : null,
      };
      if (isEditing) {
        await api.settings.updateProduct(editingProduct.id, payload);
      } else {
        const result = await api.settings.createProduct(payload);
        productId = result.productId;
      }
      await api.updateProductProductionCenters(productId, form.productionCenterIds);
      if (isEditing) {
        await api.settings.clearProductModifierGroups(productId);
      }
      for (let i = 0; i < form.modifierGroupIds.length; i++) {
        await api.settings.setProductSteps(productId, form.modifierGroupIds[i], i + 1);
      }
      if (form.trackInventory) {
        await api.inventory.saveRecipe(productId, { ingredients: form.recipe });
      } else {
        await api.inventory.saveRecipe(productId, { ingredients: [] });
      }
      toast.success(isEditing ? '¡Producto actualizado!' : '¡Producto creado!');
      onCreated();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast.error(error?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductionCenter = (centerId) => {
    setForm(prev => {
      const isSelected = prev.productionCenterIds.includes(centerId);
      const newIds = isSelected
        ? prev.productionCenterIds.filter(id => id !== centerId)
        : [...prev.productionCenterIds, centerId];

      let exclusive = prev.centroProduccionExclusivoId;
      if (!isSelected && (!exclusive || newIds.length === 1)) {
        exclusive = centerId;
      } else if (isSelected && exclusive === centerId) {
        exclusive = newIds.length > 0 ? newIds[0] : '';
      }

      return {
        ...prev,
        productionCenterIds: newIds,
        centroProduccionExclusivoId: exclusive
      };
    });
  };

  const toggleModifierGroup = (groupId) => {
    setForm(prev => {
      const ids = prev.modifierGroupIds.includes(groupId)
        ? prev.modifierGroupIds.filter(id => id !== groupId)
        : [...prev.modifierGroupIds, groupId];
      return { ...prev, modifierGroupIds: ids };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <m.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-lg lg:max-w-xl sm:rounded-2xl rounded-t-3xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-lg">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          {/* Compact Step Indicator */}
          {!isEditing && (
            <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
              {steps.slice(0, -1).map((s, idx) => (
                <div key={s.num} className="flex items-center flex-shrink-0">
                  <div className={`
                    min-w-[28px] h-7 rounded-full flex items-center justify-center text-xs font-bold px-2
                    ${step > s.num ? 'bg-emerald-500 text-white' : step === s.num ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}
                  `}>
                    {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  {idx < steps.slice(0, -1).length - 1 && (
                    <div className={`w-4 h-0.5 mx-0.5 ${step > s.num ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">Paso {step} de {steps.length - 1}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-500 text-sm mb-1">Paso 1 de 7</p>
                <h4 className="text-lg font-semibold text-gray-900">¿Cómo se llama el producto?</h4>
              </div>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Ej: Hamburguesa clasica"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-500 text-sm mb-1">Paso 2 de 7</p>
                <h4 className="text-lg font-semibold text-gray-900">¿A qué categoría pertenece?</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setForm({ ...form, categoryId: cat.id });
                      setStep(3);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.categoryId === cat.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <ProductIconBadge
                      categoryName={cat.name}
                      size="sm"
                      className="mb-2"
                    />
                    <p className="font-medium text-gray-900">{cat.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-500 text-sm mb-1">Paso 3 de 7</p>
                <h4 className="text-lg font-semibold text-gray-900">¿Cuál es el precio?</h4>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">Q</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.basePrice}
                  onFocus={e => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                      setForm({ ...form, basePrice: val });
                    }
                  }}
                  className="w-full pl-10 pr-4 py-4 border-2 border-gray-200 rounded-xl text-2xl font-bold focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={form.allowDiscount}
                  onChange={(e) => setForm({ ...form, allowDiscount: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Permite descuento</span>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-500 text-sm mb-1">Paso 4 de 7</p>
                <h4 className="text-lg font-semibold text-gray-900">¿A qué centro pertenece?</h4>
                <p className="text-xs text-gray-400 mt-1">Selecciona el local/restaurant donde estará disponible este producto</p>
              </div>
              {!centers?.length ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                  <p>No hay centros configurados.</p>
                  <p className="text-xs mt-1">Crea centros en la pestaña "Centros"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {centers.map(center => (
                    <button
                      key={center.id}
                      onClick={() => {
                        setForm({ ...form, operationCenterId: center.id, productionCenterIds: [] });
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                        form.operationCenterId === center.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        form.operationCenterId === center.id
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                      }`}>
                        {form.operationCenterId === center.id && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{center.name}</p>
                        <p className="text-xs text-gray-500">Centro de consumo</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 text-center">Los centros de producción se mostrarán en el siguiente paso según el centro seleccionado</p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-500 text-sm mb-1">Paso 5 de 7</p>
                <h4 className="text-lg font-semibold text-gray-900">¿Dónde se prepara / elabora este producto?</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona la cocina, barra o estación responsable. La comanda se imprimirá automáticamente en su ticketera asignada.
                </p>
              </div>

              {/* Selector directo de estaciones */}
              <div className="space-y-2.5">
                {!filteredProductionCenters.length ? (
                  <div className="text-center py-6 px-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-amber-800">No hay estaciones de producción registradas</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Crea tus centros de producción (ej. Cocina, Bar) en la pestaña correspondiente antes de continuar.
                    </p>
                  </div>
                ) : (
                  filteredProductionCenters.map(center => {
                    const printer = getCenterPrinterInfo(center);
                    const isSelected = form.productionCenterIds.includes(center.id);
                    return (
                      <button
                        key={center.id}
                        type="button"
                        onClick={() => toggleProductionCenter(center.id)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/40 shadow-sm ring-1 ring-primary-500/50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <ChefHat className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-semibold text-sm ${isSelected ? 'text-primary-950' : 'text-gray-900'}`}>
                                {center.name}
                              </p>
                              {form.centroProduccionExclusivoId === center.id && (
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                  Principal
                                </span>
                              )}
                            </div>
                            
                            {/* Printer connection info */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {printer ? (
                                <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-lg">
                                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{printer.name || center.printer_name}</span>
                                  <span className="text-emerald-600 text-[11px]">({printer.ip}:{printer.port || 9100})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-lg">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Sin ticketera (Solo pantalla KDS)</span>
                                </span>
                              )}
                            </div>

                            {isSelected && (
                              <p className="text-[11px] text-primary-700 font-medium mt-1.5 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                                <span>Los tickets se enviarán a esta estación</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                          isSelected ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Opciones avanzadas de enrutamiento */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedRouting(!showAdvancedRouting)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-700">
                      Opciones Avanzadas (Enrutamiento por Matriz Salón/Barra)
                    </span>
                  </div>
                  {showAdvancedRouting ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showAdvancedRouting && (
                  <div className="p-4 bg-white border-t border-slate-200 space-y-4">
                    {/* Categoría de Impresión (Enrutamiento dinámico) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Categoría de Impresión (Matriz Dinámica)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Permite que el producto cambie de impresora según el área o salón donde se ordene (ej. Bar Piscina vs Bar Principal).
                      </p>
                      <select
                        value={form.categoriaImpresionId}
                        onChange={e => setForm({ ...form, categoriaImpresionId: e.target.value ? Number(e.target.value) : '' })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 font-medium"
                      >
                        <option value="">Heredar de categoría del menú ({categories.find(c => c.id === form.categoryId)?.name || 'General'})...</option>
                        {printCategories.map(pc => (
                          <option key={pc.id} value={pc.id}>🖨️ {pc.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Override centro exclusivo */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <label className="block text-xs font-bold text-purple-900">
                        Forzar Estación Exclusiva (Override)
                      </label>
                      <p className="text-[11px] text-purple-700/80">
                        Garantiza que siempre saldrá en esta estación fija sin importar el salón de la orden.
                      </p>
                      <select
                        value={form.centroProduccionExclusivoId}
                        onChange={e => setForm({ ...form, centroProduccionExclusivoId: e.target.value ? Number(e.target.value) : '' })}
                        className="w-full px-3.5 py-2 bg-purple-50/50 border border-purple-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 font-medium"
                      >
                        <option value="">Automático (Según estación seleccionada)</option>
                        {productionCenters.map(center => (
                          <option key={center.id} value={center.id}>
                            {center.name} {center.printer_name ? `(${center.printer_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-500 text-sm mb-1">Paso 6 de 7</p>
                <h4 className="text-lg font-semibold text-gray-900">¿Controlar inventario?</h4>
              </div>
              <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={form.trackInventory}
                  onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Descontar del inventario al vender</span>
              </label>

              {form.trackInventory && (
                <>
                  <p className="text-xs text-gray-400">Agrega los insumos que consume este producto</p>
                  {inventoryItems.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-xl">No hay insumos registrados. Crea insumos en Reportes &gt; Inventario</p>
                  ) : (
                    <div className="space-y-3">
                      {form.recipe.map((ing, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                          <select
                            value={ing.inventoryItemId}
                            onChange={e => {
                              const recipe = [...form.recipe];
                              recipe[idx] = { ...recipe[idx], inventoryItemId: Number(e.target.value) };
                              setForm({ ...form, recipe });
                            }}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="">Seleccionar...</option>
                            {inventoryItems.map(item => (
                              <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ing.quantity}
                            onChange={e => {
                              const recipe = [...form.recipe];
                              recipe[idx] = { ...recipe[idx], quantity: Number(e.target.value) };
                              setForm({ ...form, recipe });
                            }}
                            className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            placeholder="0"
                          />
                          <button
                            onClick={() => setForm({ ...form, recipe: form.recipe.filter((_, i) => i !== idx) })}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setForm({ ...form, recipe: [...form.recipe, { inventoryItemId: '', quantity: 0 }] })}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                      >
                        + Agregar insumo
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-500 text-sm mb-1">Paso 7 de 7</p>
                <h4 className="text-lg font-semibold text-gray-900">¿Qué modificadores necesita?</h4>
                <p className="text-xs text-gray-400 mt-1">Selecciona los grupos de opciones disponibles para este producto</p>
              </div>
              {modifierGroups?.length > 5 && (
                <input
                  type="text"
                  value={modifierSearch}
                  onChange={(e) => setModifierSearch(e.target.value)}
                  placeholder="Buscar modificador..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
              {!modifierGroups?.length ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                  <p>No hay modificadores configurados.</p>
                  <p className="text-xs mt-1">Crea modificadores en la pestaña "Modificadores"</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {modifierGroups?.filter(g => g.name.toLowerCase().includes(modifierSearch.toLowerCase())).map(group => (
                    <button
                      key={group.id}
                      onClick={() => toggleModifierGroup(group.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                        form.modifierGroupIds.includes(group.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        form.modifierGroupIds.includes(group.id)
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                      }`}>
                        {form.modifierGroupIds.includes(group.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{group.name}</p>
                        <p className="text-xs text-gray-500">
                          {group.is_mandatory ? 'Obligatorio' : 'Opcional'} • Min: {group.min_select} / Max: {group.max_select}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 8 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Confirma los datos</h4>
              </div>
              <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Producto</span>
                  <span className="font-bold text-gray-900">{form.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Centro</span>
                  <span className="font-medium text-gray-900">
                    {centers?.find(c => c.id === form.operationCenterId)?.name || 'No asignado'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Categoría</span>
                  <span className="font-medium text-gray-900">
                    {categories.find(c => c.id === form.categoryId)?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Precio</span>
                  <span className="font-bold text-primary-600">Q {Number(form.basePrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-start py-1">
                  <span className="text-gray-500 text-sm">Estación y Ticketera</span>
                  <div className="text-right">
                    {form.productionCenterIds.length > 0 ? (
                      form.productionCenterIds.map(id => {
                        const c = productionCenters.find(pc => pc.id === id);
                        const p = getCenterPrinterInfo(c || {});
                        return (
                          <div key={id} className="text-sm font-medium text-gray-900 flex items-center justify-end gap-1.5 mb-0.5">
                            <span>{c?.name}</span>
                            {p ? (
                              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded font-mono">
                                🖨️ {p.name || 'Ticketera'} ({p.ip})
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                📺 KDS
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        ⚠️ Sin estación asignada
                      </span>
                    )}
                  </div>
                </div>
                {form.categoriaImpresionId && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500 text-sm">Cat. Impresión</span>
                    <span className="font-medium text-gray-900 text-right text-sm">
                      {printCategories.find(pc => pc.id === form.categoriaImpresionId)?.nombre}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Inventario</span>
                  <span className="font-medium text-gray-900">{form.trackInventory ? `Sí (${form.recipe.length} insumos)` : 'No'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Modificadores</span>
                  <span className="font-medium text-gray-900 text-right text-sm">
                    {form.modifierGroupIds.length > 0
                      ? form.modifierGroupIds.map(id => modifierGroups?.find(g => g.id === id)?.name).join(', ')
                      : 'Ninguno'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3 flex-shrink-0">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex-1 py-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Atrás
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          )}
          {step < 8 ? (
            <button
              onClick={handleNext}
              className="flex-1 py-4 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-4 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isEditing ? 'Actualizar' : 'Crear Producto'}
            </button>
          )}
        </div>
      </m.div>
    </div>
  );
}

// Categories Section
