import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Package,
  LayoutGrid,
  Users,
  CreditCard,
  Settings,
  Save,
  Monitor,
  List
} from 'lucide-react';

const TABS = [
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'categories', label: 'Categorías', icon: LayoutGrid },
  { id: 'centers', label: 'Centros', icon: LayoutGrid },
  { id: 'production', label: 'Producción', icon: LayoutGrid },
  { id: 'tables', label: 'Mesas', icon: LayoutGrid },
  { id: 'terminals', label: 'Terminales', icon: Monitor },
  { id: 'modifiers', label: 'Modificadores', icon: List },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'payments', label: 'Pagos', icon: CreditCard },
  { id: 'system', label: 'Sistema', icon: Settings },
];

export function SettingsPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    categories: [],
    products: [],
    centers: [],
    productionCenters: [],
    tables: [],
    areas: [],
    terminals: [],
    modifierGroups: [],
    modifierOptions: [],
    productModifierGroups: [],
    paymentMethods: [],
    restaurantName: '',
    tipPercent: 0,
    logoUrl: '',
    loginBgUrl: ''
  });
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const configData = await api.getConfigData();
      const bootstrapData = await api.bootstrap();

      setData({
        categories: configData.categories || [],
        products: configData.products || [],
        centers: configData.centers || [],
        productionCenters: configData.productionCenters || [],
        tables: configData.tables || [],
        areas: configData.areas || [],
        terminals: bootstrapData.terminals || [],
        modifierGroups: configData.groups || [],
        modifierOptions: configData.options || [],
        productProductionCenters: configData.productProductionCenters || [],
        productModifierGroups: configData.productModifierGroups || [],
        paymentMethods: bootstrapData.paymentMethods || [],
        staffUsers: [],
        restaurantName: bootstrapData.restaurantName || 'Mi Restaurante',
        tipPercent: 0,
        logoUrl: bootstrapData.logoUrl || '',
        loginBgUrl: bootstrapData.loginBgUrl || ''
      });
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Configuración</h1>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'products' && (
          <ProductsSection
            products={data.products}
            categories={data.categories}
            productionCenters={data.productionCenters}
            productProductionCenters={data.productProductionCenters}
            modifierGroups={data.modifierGroups}
            productModifierGroups={data.productModifierGroups}
            onReload={loadData}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesSection categories={data.categories} />
        )}
        {activeTab === 'centers' && (
          <CentersSection centers={data.centers} onReload={loadData} />
        )}
        {activeTab === 'production' && (
          <ProductionCentersSection productionCenters={data.productionCenters} />
        )}
        {activeTab === 'tables' && (
          <TablesSection tables={data.tables} centers={data.centers} onReload={loadData} />
        )}
        {activeTab === 'terminals' && (
          <TerminalsSection terminals={data.terminals} centers={data.centers} onReload={loadData} />
        )}
        {activeTab === 'modifiers' && (
          <ModifiersSection groups={data.modifierGroups} options={data.modifierOptions} onReload={loadData} />
        )}
        {activeTab === 'users' && (
          <UsersSection centers={data.centers} />
        )}
        {activeTab === 'payments' && (
          <PaymentsSection methods={data.paymentMethods} />
        )}
        {activeTab === 'system' && (
          <SystemSection
            restaurantName={data.restaurantName}
            tipPercent={data.tipPercent}
            logoUrl={data.logoUrl}
            loginBgUrl={data.loginBgUrl}
            onSaved={(updates) => {
              if (updates.restaurantName) setData(d => ({ ...d, restaurantName: updates.restaurantName }));
              if (updates.logoUrl !== undefined) setData(d => ({ ...d, logoUrl: updates.logoUrl }));
              if (updates.loginBgUrl !== undefined) setData(d => ({ ...d, loginBgUrl: updates.loginBgUrl }));
            }}
          />
        )}
      </div>
    </div>
  );
}

// Products Section
function ProductsSection({ products, categories, productionCenters, productProductionCenters, modifierGroups, productModifierGroups, onReload }) {
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {products.length} productos
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-2">
        {products.map(product => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 flex items-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: getCategoryColor(product.category_id) + '20' }}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: getCategoryColor(product.category_id) }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{product.name}</p>
              <p className="text-xs text-gray-500">{product.category_name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-gray-900">Q {Number(product.base_price).toFixed(2)}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingProduct(product);
                  setShowWizard(true);
                }}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setConfirmDelete({ id: product.id, name: product.name })}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
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
          onClose={() => {
            setShowWizard(false);
            setEditingProduct(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
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
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Product Creation Wizard
function ProductWizardModal({ categories, editingProduct, productionCenters, productProductionCenters, modifierGroups, productModifierGroups, onClose, onCreated }) {
  const existingProductionCenters = editingProduct
    ? (productProductionCenters?.filter(ppc => Number(ppc.product_id) === Number(editingProduct.id)).map(ppc => Number(ppc.center_id)) || [])
    : [];
  const existingModifierGroupIds = editingProduct
    ? (productModifierGroups?.filter(pmg => Number(pmg.product_id) === Number(editingProduct.id)).map(pmg => Number(pmg.group_id)) || [])
    : [];

  const [step, setStep] = useState(editingProduct ? 6 : 1);
  const [form, setForm] = useState({
    name: editingProduct?.name || '',
    categoryId: editingProduct?.category_id || '',
    basePrice: editingProduct?.base_price ?? 0,
    allowDiscount: editingProduct?.allow_discount ?? true,
    productionCenterIds: existingProductionCenters,
    modifierGroupIds: existingModifierGroupIds
  });
  const [loading, setLoading] = useState(false);
  const [modifierSearch, setModifierSearch] = useState('');
  const toast = useToast();

  const isEditing = !!editingProduct;

  const steps = [
    { num: 1, label: 'Nombre' },
    { num: 2, label: 'Categoría' },
    { num: 3, label: 'Precio' },
    { num: 4, label: 'Producción' },
    { num: 5, label: 'Modificadores' },
    { num: 6, label: 'Confirmar' }
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
      if (isEditing) {
        await api.settings.updateProduct(editingProduct.id, form);
      } else {
        const result = await api.settings.createProduct(form);
        productId = result.productId;
      }
      await api.updateProductProductionCenters(productId, form.productionCenterIds);
      if (isEditing) {
        await api.settings.clearProductModifierGroups(productId);
      }
      for (let i = 0; i < form.modifierGroupIds.length; i++) {
        await api.settings.setProductSteps(productId, form.modifierGroupIds[i], i + 1);
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
      const ids = prev.productionCenterIds.includes(centerId)
        ? prev.productionCenterIds.filter(id => id !== centerId)
        : [...prev.productionCenterIds, centerId];
      return { ...prev, productionCenterIds: ids };
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
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-lg lg:max-w-xl sm:rounded-2xl rounded-t-3xl max-h-[95vh] overflow-hidden"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          {/* Step Indicator */}
          {!isEditing && (
            <div className="flex items-center justify-between mt-3">
              {steps.map(s => (
                <div key={s.num} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${step >= s.num ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}
                  `}>
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`ml-2 text-xs font-medium ${step >= s.num ? 'text-primary-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cómo se llama el producto?</p>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Ej: Hamburguesa clasica"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿A qué categoría pertenece?</p>
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
                    <div
                      className="w-4 h-4 rounded-full mb-2"
                      style={{ backgroundColor: cat.color || '#6366f1' }}
                    />
                    <p className="font-medium text-gray-900">{cat.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuál es el precio?</p>
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
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-2xl font-bold focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
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
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Dónde se elabora?</p>
              <p className="text-xs text-gray-400">Selecciona los centros de producción donde se prepara este producto</p>
              {!productionCenters?.length ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay centros de producción configurados.</p>
                  <p className="text-xs mt-1">Crea centros en la pestaña "Producción"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {productionCenters.map(center => (
                    <button
                      key={center.id}
                      onClick={() => toggleProductionCenter(center.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                        form.productionCenterIds.includes(center.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        form.productionCenterIds.includes(center.id)
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                      }`}>
                        {form.productionCenterIds.includes(center.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{center.name}</p>
                        {center.printer_name && (
                          <p className="text-xs text-gray-500">{center.printer_name}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Qué modificadores necesita?</p>
              <p className="text-xs text-gray-400">Selecciona los grupos de opciones que estarán disponibles para este producto</p>
              {modifierGroups?.length > 5 && (
                <input
                  type="text"
                  value={modifierSearch}
                  onChange={(e) => setModifierSearch(e.target.value)}
                  placeholder="Buscar modificador..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
              {!modifierGroups?.length ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay modificadores configurados.</p>
                  <p className="text-xs mt-1">Crea modificadores en la pestaña "Modificadores"</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
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

          {step === 6 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">Confirma los datos</p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Producto</span>
                  <span className="font-bold text-gray-900">{form.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Categoría</span>
                  <span className="font-medium text-gray-900">
                    {categories.find(c => c.id === form.categoryId)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Precio</span>
                  <span className="font-bold text-primary-600">Q {Number(form.basePrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Elaboración</span>
                  <span className="font-medium text-gray-900">
                    {form.productionCenterIds.length > 0
                      ? form.productionCenterIds.map(id => productionCenters.find(c => c.id === id)?.name).join(', ')
                      : 'Ninguno'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Modificadores</span>
                  <span className="font-medium text-gray-900">
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
        <div className="p-5 border-t border-gray-100 flex gap-3">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl"
            >
              Atrás
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl"
            >
              Cancelar
            </button>
          )}
          {step < 6 ? (
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isEditing ? 'Actualizar' : 'Crear Producto'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Categories Section
function CategoriesSection({ categories }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', color: '#6366f1' });
  const toast = useToast();

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Nombre es requerido');
      return;
    }
    // TODO: Connect to API
    toast.success('Categoría creada');
    setShowForm(false);
    setForm({ name: '', color: '#6366f1' });
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6'];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {categories.length} categorías
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      <div className="space-y-2">
        {categories.map(cat => (
          <div
            key={cat.id}
            className="bg-white rounded-xl p-4 flex items-center gap-4"
          >
            <div
              className="w-4 h-10 rounded-full"
              style={{ backgroundColor: cat.color || '#6366f1' }}
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{cat.name}</p>
              <p className="text-sm text-gray-500">
                {cat.is_active ? 'Activa' : 'Inactiva'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Category Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Nueva Categoría</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  placeholder="Ej: Bebidas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`
                        w-8 h-8 rounded-full
                        ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}
                      `}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 text-gray-600 font-medium rounded-xl border border-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Centers Section
function CentersSection({ centers, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingCenter(null);
    if (onReload) onReload();
  };

  const handleDeleteCenter = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteCenter(confirmDelete.id);
      toast.success('Centro eliminado');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {centers.length} centros de consumo
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      <div className="space-y-2">
        {centers.map(center => (
          <motion.div
            key={center.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white/30" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{center.name}</p>
              <p className="text-xs text-gray-500">{center.is_active !== false ? 'Activo' : 'Inactivo'}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingCenter(center);
                  setShowWizard(true);
                }}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setConfirmDelete({ id: center.id, name: center.name })}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {showWizard && (
        <CenterWizardModal
          editingCenter={editingCenter}
          onClose={() => {
            setShowWizard(false);
            setEditingCenter(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar centro</h3>
              <p className="text-gray-500 mb-6">
                ¿Estás seguro de eliminar el centro <strong>{confirmDelete.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteCenter}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Production Centers Section
function ProductionCentersSection({ productionCenters }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingCenter(null);
    window.location.reload();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {productionCenters.length} centros de producción
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      <div className="space-y-2">
        {productionCenters.map(center => (
          <motion.div
            key={center.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white/30" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{center.name}</p>
              <p className="text-xs text-gray-500">
                {center.printer_name ? `Impresora: ${center.printer_name}` : 'Sin impresora asignada'}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingCenter(center);
                  setShowWizard(true);
                }}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {showWizard && (
        <ProductionCenterWizardModal
          editingCenter={editingCenter}
          onClose={() => {
            setShowWizard(false);
            setEditingCenter(null);
          }}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

// Production Center Wizard Modal
function ProductionCenterWizardModal({ onClose, onCreated, editingCenter }) {
  const [form, setForm] = useState({
    name: editingCenter?.name || '',
    printerName: editingCenter?.printer_name || '',
    isActive: editingCenter?.is_active !== false
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    setLoading(true);
    try {
      if (editingCenter) {
        await api.updateProductionCenter(editingCenter.id, form);
        toast.success('Centro actualizado');
      } else {
        await api.createProductionCenter(form);
        toast.success('Centro de producción creado');
      }
      onCreated();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingCenter ? 'Editar' : 'Nuevo'} Centro de Producción
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: Cocina Flor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Impresora</label>
              <input
                type="text"
                value={form.printerName}
                onChange={e => setForm({ ...form, printerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: TM-FLOR-01"
              />
              <p className="text-xs text-gray-500 mt-1">Nombre de la impresora de comandos (ticketera)</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Terminals Section
function TerminalsSection({ terminals, centers, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingTerminal(null);
    if (onReload) onReload();
  };

  const handleDeleteTerminal = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteTerminal(confirmDelete.id);
      toast.success('Terminal eliminada');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
      setConfirmDelete(null);
    }
  };

  const grouped = terminals.reduce((acc, t) => {
    const centerName = centers.find(c => c.id === t.operation_center_id)?.name || 'Sin centro';
    if (!acc[centerName]) acc[centerName] = [];
    acc[centerName].push(t);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {terminals.length} terminales configuradas
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([centerName, termList]) => (
          <div key={centerName}>
            <h3 className="text-sm font-medium text-gray-500 mb-2">{centerName}</h3>
            <div className="space-y-2">
              {termList.map(term => (
                <motion.div
                  key={term.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{term.name}</p>
                    <p className="text-xs text-gray-500">
                      {term.printer_ip ? `${term.printer_ip}:${term.printer_port}` : 'Sin IP configurada'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingTerminal(term);
                        setShowWizard(true);
                      }}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: term.id, label: term.label || term.ip_address })}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showWizard && (
        <TerminalWizardModal
          editingTerminal={editingTerminal}
          centers={centers}
          onClose={() => {
            setShowWizard(false);
            setEditingTerminal(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar terminal</h3>
              <p className="text-gray-500 mb-6">
                ¿Estás seguro de eliminar la terminal <strong>{confirmDelete.label}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteTerminal}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Modifiers Section
function ModifiersSection({ groups, options, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingGroup(null);
    if (onReload) onReload();
  };

  const handleDeleteGroup = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteModifierGroup(confirmDelete.id);
      toast.success('Grupo eliminado');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
      setConfirmDelete(null);
    }
  };

  const getGroupOptions = (groupId) => options.filter(o => o.group_id === groupId);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {groups.length} grupos de modificadores
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Grupo
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
        <p className="text-yellow-800 text-sm">
          Los modificadores permiten personalizar productos. Ej: "Salsas", "Guarniciones", "Término de carne".
        </p>
      </div>

      <div className="space-y-4">
        {groups.map(group => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{group.name}</p>
                <p className="text-xs text-gray-500">
                  {group.group_type === 'single' ? 'Selección única' : 'Selección múltiple'} •
                  Min: {group.min_select} • Max: {group.max_select} •
                  {group.is_mandatory ? ' Obligatorio' : ' Opcional'}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingGroup(group);
                    setShowWizard(true);
                  }}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDelete({ id: group.id, name: group.name })}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {getGroupOptions(group.id).map(opt => (
                <span
                  key={opt.id}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                >
                  {opt.name}
                  {opt.price_delta > 0 && <span className="text-primary-600 ml-1">+Q{opt.price_delta}</span>}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {showWizard && (
        <ModifierGroupWizard
          editingGroup={editingGroup}
          options={options}
          onClose={() => {
            setShowWizard(false);
            setEditingGroup(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar grupo</h3>
              <p className="text-gray-500 mb-6">
                ¿Estás seguro de eliminar el grupo <strong>{confirmDelete.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteGroup}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Modifier Group Wizard Modal
function ModifierGroupWizard({ editingGroup, options, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: editingGroup?.name || '',
    groupType: editingGroup?.group_type || 'multiple',
    minSelect: editingGroup?.min_select ?? 1,
    maxSelect: editingGroup?.max_select ?? 3,
    isMandatory: editingGroup?.is_mandatory || false,
    options: editingGroup ? options.filter(o => o.group_id === editingGroup.id) : []
  });
  const [loading, setLoading] = useState(false);
  const [newOption, setNewOption] = useState('');
  const toast = useToast();

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (form.options.length === 0) {
      toast.error('Agrega al menos una opción');
      return;
    }
    setLoading(true);
    try {
      let groupId = editingGroup?.id;
      if (editingGroup) {
        await api.settings.updateModifierGroup(editingGroup.id, {
          name: form.name,
          groupType: form.groupType,
          minSelect: form.minSelect,
          maxSelect: form.maxSelect,
          isMandatory: form.isMandatory
        });
      } else {
        const result = await api.settings.createModifierGroup({
          name: form.name,
          groupType: form.groupType,
          minSelect: form.minSelect,
          maxSelect: form.maxSelect,
          isMandatory: form.isMandatory
        });
        groupId = result.groupId;
      }
      const existingOptions = editingGroup ? options.filter(o => o.group_id === editingGroup.id) : [];
      const existingIds = new Set(existingOptions.map(o => o.id));
      const formIds = new Set(form.options.filter(o => o.id).map(o => o.id));
      for (const opt of form.options) {
        if (opt.id) {
          if (existingIds.has(opt.id)) {
            await api.settings.updateModifierOption(opt.id, { name: opt.name, priceDelta: opt.price_delta });
          }
        } else {
          await api.settings.addModifierOption(groupId, { name: opt.name, priceDelta: opt.price_delta });
        }
      }
      for (const oldOpt of existingOptions) {
        if (!formIds.has(oldOpt.id)) {
          await api.settings.deleteModifierOption(oldOpt.id);
        }
      }
      toast.success(editingGroup ? 'Grupo actualizado' : 'Grupo creado');
      onCreated();
    } catch (error) {
      console.error('Error al guardar modificador:', error);
      toast.error(error?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setForm(prev => ({
      ...prev,
      options: [...prev.options, { id: null, name: newOption.trim(), price_delta: 0 }]
    }));
    setNewOption('');
  };

  const updateOptionPrice = (index, price) => {
    setForm(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], price_delta: price };
      return { ...prev, options: newOptions };
    });
  };

  const removeOption = (index) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">
            {editingGroup ? 'Editar' : 'Nuevo'} Grupo de Modificadores
          </h3>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del grupo</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Ej: Salsas"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.groupType}
                onChange={e => setForm({ ...form, groupType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              >
                <option value="multiple">Múltiple</option>
                <option value="single">Único</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Obligatorio</label>
              <select
                value={form.isMandatory ? '1' : '0'}
                onChange={e => setForm({ ...form, isMandatory: e.target.value === '1' })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mín. selección</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.minSelect}
                onFocus={e => e.target.select()}
                onChange={e => setForm({ ...form, minSelect: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máx. selección</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.maxSelect}
                onFocus={e => e.target.select()}
                onChange={e => setForm({ ...form, maxSelect: e.target.value === '' ? 1 : Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opciones</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newOption}
                onChange={e => setNewOption(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Nueva opción"
              />
              <button
                onClick={addOption}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <span className="flex-1 text-sm">{opt.name}</span>
                  <span className="text-sm text-gray-500">Q</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={opt.price_delta}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                        updateOptionPrice(i, val === '' ? 0 : Number(val));
                      }
                    }}
                    className="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                    placeholder="0.00"
                  />
                  <button
                    onClick={() => removeOption(i)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Terminal Wizard Modal
function TerminalWizardModal({ editingTerminal, centers, onClose, onCreated }) {
  const [form, setForm] = useState({
    operationCenterId: editingTerminal?.operation_center_id || '',
    name: editingTerminal?.name || '',
    printerName: editingTerminal?.printer_name || '',
    printerIp: editingTerminal?.printer_ip || '',
    printerPort: editingTerminal?.printer_port || 9100,
    isActive: editingTerminal?.is_active !== false
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!form.operationCenterId || !form.name.trim()) {
      toast.error('Selecciona un centro y nombre');
      return;
    }
    setLoading(true);
    try {
      if (editingTerminal) {
        await api.updateTerminal(editingTerminal.id, form);
        toast.success('Terminal actualizada');
      } else {
        await api.settings.createTerminal(form);
        toast.success('Terminal creada');
      }
      onCreated();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingTerminal ? 'Editar' : 'Nueva'} Terminal
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Centro</label>
              <select
                value={form.operationCenterId}
                onChange={e => setForm({ ...form, operationCenterId: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Seleccionar centro...</option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: T1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Impresora (opcional)</label>
              <input
                type="text"
                value={form.printerName}
                onChange={e => setForm({ ...form, printerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: Ticketera Mostrador"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Impresora</label>
                <input
                  type="text"
                  value={form.printerIp}
                  onChange={e => setForm({ ...form, printerIp: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.printerPort}
                  onFocus={e => e.target.select()}
                  onChange={e => setForm({ ...form, printerPort: e.target.value === '' ? 9100 : Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="9100"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">IP y puerto de la impresora de tickets</p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Center Wizard Modal
function CenterWizardModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.settings.createOperationCenter({ name: form.name });
      toast.success('¡Centro de consumo creado!');
      onCreated();
    } catch (error) {
      toast.error(error.message || 'Error al crear centro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">Nuevo Centro de Consumo</h3>
          <div className="flex items-center gap-2 mt-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
          </div>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cómo se llama el centro de consumo?</p>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Ej: Terraza"
                autoFocus
              />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">Confirma el nombre</p>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl text-white font-bold">{form.name.charAt(0)}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{form.name}</p>
                <p className="text-sm text-gray-500 mt-1">Centro de consumo</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
              Atrás
            </button>
          ) : (
            <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
              Cancelar
            </button>
          )}
          {step < 2 ? (
            <button
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error('Ingresa el nombre');
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Tables Section
function TablesSection({ tables, centers, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingTable(null);
    if (onReload) onReload();
  };

  const handleDeleteTable = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteTable(confirmDelete.id);
      toast.success('Mesa eliminada');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {tables.length} mesas configuradas
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      <div className="space-y-2">
        {tables.map(table => (
          <motion.div
            key={table.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <div className="w-6 h-4 rounded bg-white/30" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">Mesa {table.code}</p>
              <p className="text-xs text-gray-500">{table.area_name} • {table.seats} asientos</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingTable(table);
                  setShowWizard(true);
                }}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setConfirmDelete({ id: table.id, code: table.code })}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {showWizard && (
        <TableWizardModal
          centers={centers}
          editingTable={editingTable}
          onClose={() => {
            setShowWizard(false);
            setEditingTable(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar mesa</h3>
              <p className="text-gray-500 mb-6">
                ¿Estás seguro de eliminar la mesa <strong>{confirmDelete.code}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteTable}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Table Wizard Modal
function TableWizardModal({ centers, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ prefix: '', seats: 4, quantity: 1, centerId: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      for (let i = 1; i <= form.quantity; i++) {
        const code = `${form.prefix}-${i}`;
        await api.settings.createTable({
          code,
          seats: Number(form.seats),
          centerId: Number(form.centerId),
        });
      }
      toast.success(`¡${form.quantity} mesa${form.quantity > 1 ? 's' : ''} creada${form.quantity > 1 ? 's' : ''}!`);
      onCreated();
    } catch (error) {
      toast.error(error.message || 'Error al crear mesa');
    } finally {
      setLoading(false);
    }
  };

  const previews = [];
  for (let i = 1; i <= Math.min(form.quantity, 10); i++) {
    previews.push(`${form.prefix}-${i}`);
  }
  if (form.quantity > 10) {
    previews.push(`... y ${form.quantity - 10} más`);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">Crear Mesas</h3>
          <div className="flex items-center justify-center gap-1 mt-3">
            {['1', '2', '3', '4', '5'].map((num, i) => (
              <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-primary-600 text-white' : step === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > i + 1 ? <Check className="w-3 h-3" /> : num}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuál es el prefijo de las mesas?</p>
              <input
                type="text"
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-2xl font-bold text-center uppercase tracking-wider focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="VAQ"
                autoFocus
                maxLength={10}
              />
              <p className="text-xs text-gray-400 text-center">Ejemplo: VAQ genera códigos VAQ-1, VAQ-2, etc.</p>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuántos asientos tiene cada mesa?</p>
              <div className="flex justify-center gap-3">
                {[2, 4, 6, 8].map(num => (
                  <button
                    key={num}
                    onClick={() => setForm({ ...form, seats: num })}
                    className={`w-16 h-16 rounded-xl text-lg font-bold transition-all ${
                      form.seats === num
                        ? 'bg-primary-600 text-white scale-110'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={form.seats}
                onFocus={e => e.target.select()}
                onChange={(e) => setForm({ ...form, seats: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Otro número..."
              />
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuántas mesas quieres crear?</p>
              <div className="flex justify-center gap-3">
                {[3, 5, 10, 15].map(num => (
                  <button
                    key={num}
                    onClick={() => setForm({ ...form, quantity: num })}
                    className={`w-16 h-16 rounded-xl text-lg font-bold transition-all ${
                      form.quantity === num
                        ? 'bg-primary-600 text-white scale-110'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={form.quantity}
                onFocus={e => e.target.select()}
                onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Otra cantidad..."
              />
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿A qué centro pertenece?</p>
              <div className="grid grid-cols-2 gap-3">
                {centers.length > 0 ? centers.map(center => (
                  <button
                    key={center.id}
                    onClick={() => setForm({ ...form, centerId: center.id })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.centerId === center.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{center.name}</p>
                  </button>
                )) : (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <p>No hay centros creados</p>
                    <p className="text-sm">Crea un centro primero</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">Confirma los datos</p>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500 mb-2">Se crearán:</p>
                <div className="flex flex-wrap justify-center gap-2 mb-3">
                  {previews.map((code, i) => (
                    <span key={i} className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-gray-700 border">
                      {code}
                    </span>
                  ))}
                </div>
                <div className="border-t pt-2 space-y-1">
                  <p className="text-sm"><span className="text-gray-500">Asientos:</span> <span className="font-medium">{form.seats}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Centro:</span> <span className="font-medium">{centers.find(c => c.id === form.centerId)?.name}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Total:</span> <span className="font-bold text-primary-600">{form.quantity} mesa{form.quantity > 1 ? 's' : ''}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
              Atrás
            </button>
          ) : (
            <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
              Cancelar
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={() => {
                if (step === 1 && !form.prefix.trim()) {
                  toast.error('Ingresa el prefijo');
                  return;
                }
                if (step === 2 && (!form.seats || Number(form.seats) < 1)) {
                  toast.error('Ingresa los asientos');
                  return;
                }
                if (step === 3 && (!form.quantity || Number(form.quantity) < 1)) {
                  toast.error('Ingresa la cantidad');
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Crear ${form.quantity} Mesa${form.quantity > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Users Section
function UsersSection({ centers }) {
  const [showWizard, setShowWizard] = useState(false);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Usuarios del Sistema
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
        <p className="text-yellow-800 text-sm">
          Usa el PIN de acceso para identificarte en el sistema.
        </p>
      </div>

      {showWizard && (
        <UserWizardModal
          centers={centers}
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

// User Wizard Modal
function UserWizardModal({ centers, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', pin: '', role: 'waiter', operationCenterId: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const ROLES = [
    { id: 'waiter', label: 'Mesero', icon: '🍽️', color: 'from-amber-400 to-orange-500' },
    { id: 'cashier', label: 'Cajero', icon: '💰', color: 'from-emerald-400 to-green-500' },
    { id: 'admin', label: 'Administrador', icon: '👑', color: 'from-purple-400 to-indigo-500' },
  ];

  const handleSave = async () => {
    if (!form.operationCenterId) {
      toast.error('Selecciona un centro de trabajo');
      return;
    }
    setLoading(true);
    try {
      await api.createStaffUser({
        fullName: form.name,
        pinCode: form.pin,
        role: form.role,
        operationCenterId: form.operationCenterId
      });
      toast.success('¡Usuario creado!');
      onCreated();
    } catch (error) {
      toast.error('Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">Nuevo Usuario</h3>
          <div className="flex items-center justify-between mt-3">
            {['Nombre', 'PIN', 'Rol', 'Centro', 'Confirmar'].map((label, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-primary-600 text-white' : step === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                {i < 4 && <div className={`w-5 h-0.5 mx-1 ${step > i + 1 ? 'bg-primary-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuál es el nombre del usuario?</p>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Ej: Juan Perez"
                autoFocus
              />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuál es el PIN de acceso?</p>
              <input
                type="password"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-2xl font-bold text-center tracking-widest focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="••••"
                maxLength={6}
                autoFocus
              />
              <p className="text-center text-xs text-gray-400">Mínimo 4 dígitos numéricos</p>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuál es su rol?</p>
              <div className="space-y-3">
                {ROLES.map(role => (
                  <motion.button
                    key={role.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setForm({ ...form, role: role.id });
                      setStep(4);
                    }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                      form.role === role.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${role.color} rounded-xl flex items-center justify-center text-2xl`}>
                      {role.icon}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{role.label}</p>
                      <p className="text-xs text-gray-500">
                        {role.id === 'waiter' && 'Puede tomar órdenes'}
                        {role.id === 'cashier' && 'Puede cobrar'}
                        {role.id === 'admin' && 'Acceso total'}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿En qué centro trabaja?</p>
              <div className="space-y-2">
                {centers.map(center => (
                  <motion.button
                    key={center.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setForm({ ...form, operationCenterId: center.id });
                      setStep(5);
                    }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                      form.operationCenterId === center.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-white/30" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{center.name}</p>
                      <p className="text-xs text-gray-500">Centro de consumo</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">Confirma los datos</p>
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${ROLES.find(r => r.id === form.role)?.color} rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl`}>
                  {ROLES.find(r => r.id === form.role)?.icon}
                </div>
                <p className="text-xl font-bold text-gray-900">{form.name}</p>
                <p className="text-sm text-gray-500">PIN: •••••{form.pin.slice(-2)}</p>
                <p className="text-sm font-medium text-primary-600 mt-1">{ROLES.find(r => r.id === form.role)?.label}</p>
                <p className="text-sm font-medium text-blue-600 mt-1">
                  Centro: {centers.find(c => c.id === form.operationCenterId)?.name}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
              Atrás
            </button>
          ) : (
            <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
              Cancelar
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={() => {
                if (step === 1 && !form.name.trim()) {
                  toast.error('Ingresa el nombre');
                  return;
                }
                if (step === 2 && form.pin.length < 4) {
                  toast.error('PIN debe tener al menos 4 dígitos');
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Usuario'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Payments Section
function PaymentsSection({ methods }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Formas de Pago
      </h2>
      <div className="space-y-2">
        {methods.map(method => (
          <div
            key={method.code}
            className="bg-white rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{method.label}</p>
              <p className="text-sm text-gray-500">{method.code}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              method.is_active !== false
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {method.is_active !== false ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// System Section
function resizeImage(dataUrl, maxW, maxH, quality = 0.8, format = 'image/jpeg') {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL(format, quality));
    };
    img.src = dataUrl;
  });
}

function SystemSection({ restaurantName, tipPercent, logoUrl, loginBgUrl, onSaved }) {
  const [name, setName] = useState(restaurantName);
  const [tip, setTip] = useState(tipPercent);
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [logoBase64, setLogoBase64] = useState(null);
  const [bgPreview, setBgPreview] = useState(loginBgUrl);
  const [bgBase64, setBgBase64] = useState(null);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    setName(restaurantName);
    setTip(tipPercent);
  }, [restaurantName, tipPercent]);

  useEffect(() => {
    setLogoPreview(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    setBgPreview(loginBgUrl);
  }, [loginBgUrl]);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const resized = await resizeImage(dataUrl, 300, 300, 0.85, 'image/webp');
      setLogoBase64(resized);
      setLogoPreview(resized);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoBase64(null);
    setLogoPreview('');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleBgChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 10 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const resized = await resizeImage(dataUrl, 1920, 1080, 0.8, 'image/jpeg');
      setBgBase64(resized);
      setBgPreview(resized);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBg = () => {
    setBgBase64(null);
    setBgPreview('');
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (name.trim()) {
        await api.settings.updateBranding(name.trim());
      }
      if (logoBase64) {
        const result = await api.settings.uploadLogo(logoBase64);
        if (onSaved && result.logoUrl) {
          onSaved({ logoUrl: result.logoUrl });
        }
        setLogoBase64(null);
      }
      if (bgBase64) {
        const result = await api.settings.uploadLoginBg(bgBase64);
        if (onSaved && result.loginBgUrl) {
          onSaved({ loginBgUrl: result.loginBgUrl });
        }
        setBgBase64(null);
      }
      if (Number(tip) !== Number(tipPercent)) {
        await api.settings.updateTipConfig(Number(tip));
      }
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error(error.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Configuración General
        </h2>
        <div className="bg-white rounded-xl p-4 space-y-6">
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo del Restaurante
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {logoPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Quitar logo
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <span className="text-xs text-gray-400">Se redimensiona a 300px máx. Formato WebP</span>
              </div>
            </div>
          </div>

          {/* Background image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fondo de pantalla de inicio de sesión
            </label>
            <div className="flex items-center gap-4">
              <div className="w-32 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                {bgPreview ? (
                  <img
                    src={bgPreview}
                    alt="Fondo login"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => bgInputRef.current?.click()}
                  className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {bgPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </button>
                {bgPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveBg}
                    className="text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Quitar fondo
                  </button>
                )}
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBgChange}
                  className="hidden"
                />
                <span className="text-xs text-gray-400">Se redimensiona a 1920px máx. Recomendado 16:9</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Restaurante
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi Restaurante"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Porcentaje de Propina (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={tip}
              onFocus={e => e.target.select()}
              onChange={(e) => setTip(e.target.value === '' ? 0 : Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-500 hover:to-blue-400 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Acerca de
        </h2>
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">SamaPos</p>
              <p className="text-xs text-gray-500">Versión 1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Sistema de punto de venta para restaurantes
          </p>
        </div>
      </div>
    </div>
  );
}
