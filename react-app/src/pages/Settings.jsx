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
  List,
  Shield,
  Store
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
  { id: 'roles', label: 'Roles', icon: Shield },
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
    roles: [],
    permissions: [],
    permByRole: {},
    rolesByUser: {},
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
        staffUsers: configData.staffUsers || [],
        roles: configData.roles || [],
        permissions: configData.permissions || [],
        permByRole: configData.permByRole || {},
        rolesByUser: configData.rolesByUser || {},
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
            centers={data.centers}
            onReload={loadData}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesSection categories={data.categories} centers={data.centers} onReload={loadData} />
        )}
        {activeTab === 'centers' && (
          <CentersSection centers={data.centers} onReload={loadData} />
        )}
        {activeTab === 'production' && (
          <ProductionCentersSection productionCenters={data.productionCenters} centers={data.centers} onReload={loadData} />
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
          <UsersSection centers={data.centers} roles={data.roles} staffUsers={data.staffUsers} onReload={loadData} />
        )}
        {activeTab === 'roles' && (
          <RolesSection
            roles={data.roles}
            permissions={data.permissions}
            permByRole={data.permByRole}
            rolesByUser={data.rolesByUser}
            staffUsers={data.staffUsers}
            onReload={loadData}
          />
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
            paymentMethods={data.paymentMethods}
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
function ProductsSection({ products, categories, productionCenters, productProductionCenters, modifierGroups, productModifierGroups, centers, onReload }) {
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
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-2">
        {products.map(product => {
          const centers = getProductCenters(product.id);
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
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
            </motion.div>
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
function ProductWizardModal({ categories, editingProduct, productionCenters, productProductionCenters, modifierGroups, productModifierGroups, centers, onClose, onCreated }) {
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
  const [form, setForm] = useState({
    name: editingProduct?.name || '',
    categoryId: editingProduct?.category_id || '',
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
        centerId: form.operationCenterId || null 
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
                <h4 className="text-lg font-semibold text-gray-900">¿Dónde se elabora?</h4>
                <p className="text-xs text-gray-400 mt-1">
                  {form.operationCenterId 
                    ? `Centros de producción disponibles en ${centers?.find(c => c.id === form.operationCenterId)?.name || 'este centro'}`
                    : 'Selecciona primero un centro en el paso anterior'
                  }
                </p>
              </div>
              {!form.operationCenterId ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                  <p>Selecciona un centro primero</p>
                  <p className="text-xs mt-1">Ve al paso anterior para elegir el centro</p>
                </div>
              ) : !filteredProductionCenters.length ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                  <p>No hay centros de producción en este centro.</p>
                  <p className="text-xs mt-1">Crea centros de producción asociados a este centro en "Producción"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProductionCenters.map(center => (
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
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Elaboración</span>
                  <span className="font-medium text-gray-900 text-right text-sm">
                    {form.productionCenterIds.length > 0
                      ? form.productionCenterIds.map(id => productionCenters.find(c => c.id === id)?.name).join(', ')
                      : 'Ninguno'}
                  </span>
                </div>
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
      </motion.div>
    </div>
  );
}

// Categories Section
function CategoriesSection({ categories, onReload, centers }) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1', centerId: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const handleOpenForm = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setForm({
        name: category.name || '',
        color: category.color || '#6366f1',
        centerId: category.operation_center_id || '',
        isActive: category.is_active !== false
      });
    } else {
      setEditingCategory(null);
      setForm({ name: '', color: '#6366f1', centerId: '', isActive: true });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Nombre es requerido');
      return;
    }
    setSaving(true);
    try {
      if (editingCategory) {
        await api.settings.updateCategory(editingCategory.id, { 
          name: form.name, 
          color: form.color, 
          centerId: form.centerId || null,
          isActive: form.isActive ? 1 : 0 
        });
        toast.success('Categoría actualizada');
      } else {
        await api.settings.createCategory({ name: form.name, color: form.color, centerId: form.centerId || null });
        toast.success('Categoría creada');
      }
      setShowForm(false);
      setEditingCategory(null);
      setForm({ name: '', color: '#6366f1', centerId: '', isActive: true });
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteCategory(confirmDelete.id);
      toast.success('Categoría eliminada');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar');
      setConfirmDelete(null);
    }
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">
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

      <div className="space-y-3">
        {categories.map(cat => {
          const catCenter = centers?.find(c => c.id === cat.operation_center_id);
          return (
            <div
              key={cat.id}
              className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm"
            >
              <div
                className="w-5 h-12 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color || '#6366f1' }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{cat.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {cat.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  {catCenter && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {catCenter.name}
                    </span>
                  )}
                  {!catCenter && cat.operation_center_id && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      Centro #{cat.operation_center_id}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleOpenForm(cat)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDelete({ id: cat.id, name: cat.name })}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar categoría?</h3>
              <p className="text-gray-500 mb-6">
                Estás por eliminar <strong>"{confirmDelete.name}"</strong>. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Category Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button onClick={() => { setShowForm(false); setEditingCategory(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la categoría
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="Ej: Bebidas"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Centro (opcional)
                </label>
                <select
                  value={form.centerId}
                  onChange={(e) => setForm({ ...form, centerId: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors bg-white"
                >
                  <option value="">Todos los centros</option>
                  {centers && centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Deja vacío para que esté disponible en todos los centros</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de identificación
                </label>
                <div className="flex gap-3">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`
                        w-10 h-10 rounded-full transition-all
                        ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}
                      `}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              {editingCategory && (
                <div>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Categoría activa</span>
                  </label>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowForm(false); setEditingCategory(null); }}
                className="flex-1 py-3.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingCategory ? 'Actualizar' : 'Crear Categoría'}
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
function ProductionCentersSection({ productionCenters, centers, onReload }) {
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
      await api.settings.deleteProductionCenter(confirmDelete.id);
      toast.success('Centro eliminado');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar');
      setConfirmDelete(null);
    }
  };

  const getCenterColor = (centerName) => {
    const name = (centerName || '').toLowerCase();
    if (name.includes('cocina')) return 'from-orange-500 to-red-600';
    if (name.includes('bar')) return 'from-blue-500 to-indigo-600';
    return 'from-emerald-500 to-teal-600';
  };

  const getOperationCenterName = (centerId) => {
    if (!centerId) return null;
    const center = centers?.find(c => c.id === centerId);
    return center?.name;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Centros de Producción
          </h2>
          <p className="text-sm text-gray-500">
            Define dónde se preparan los productos (cocina, bar, etc.)
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Centro
        </button>
      </div>

      <div className="space-y-3">
        {productionCenters.map(center => (
          <motion.div
            key={center.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-200"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCenterColor(center.name)} flex items-center justify-center shadow-sm`}>
              <div className="w-5 h-5 rounded-full bg-white/30" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{center.name}</p>
                {!center.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inactivo</span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {center.printer_name ? `Impresora: ${center.printer_name}` : 'Sin impresora'}
              </p>
              {getOperationCenterName(center.operation_center_id) && (
                <p className="text-xs text-blue-600 mt-1">
                  Centro: {getOperationCenterName(center.operation_center_id)}
                </p>
              )}
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
        
        {productionCenters.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-500">No hay centros de producción</p>
            <p className="text-sm text-gray-400 mt-1">Crea uno para empezar</p>
          </div>
        )}
      </div>

      {showWizard && (
        <ProductionCenterWizardModal
          editingCenter={editingCenter}
          centers={centers}
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
                ¿Eliminar <strong>{confirmDelete.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteCenter}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
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

// Production Center Wizard Modal
function ProductionCenterWizardModal({ onClose, onCreated, editingCenter, centers }) {
  const [form, setForm] = useState({
    name: editingCenter?.name || '',
    printerName: editingCenter?.printer_name || '',
    isActive: editingCenter?.is_active !== false,
    operationCenterId: editingCenter?.operation_center_id || ''
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
      const payload = {
        name: form.name,
        printerName: form.printerName,
        isActive: form.isActive ? 1 : 0,
        operationCenterId: form.operationCenterId || null
      };
      if (editingCenter) {
        await api.updateProductionCenter(editingCenter.id, payload);
        toast.success('Centro actualizado');
      } else {
        await api.createProductionCenter(payload);
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
                placeholder="Ej: Cocina Principal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Centro (opcional)</label>
              <select
                value={form.operationCenterId}
                onChange={e => setForm({ ...form, operationCenterId: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="">Sin centro específico</option>
                {centers && centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Deja vacío si es común a todos los centros</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Impresora</label>
              <input
                type="text"
                value={form.printerName}
                onChange={e => setForm({ ...form, printerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: TM-COCINA-01"
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
          {step === 4 && (
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
function UsersSection({ centers, roles, staffUsers, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    onReload();
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Eliminar usuario "${user.full_name}"?`)) return;
    try {
      await api.settings.deleteStaffUser(user.id);
      toast.success('Usuario eliminado');
      onReload();
    } catch (e) {
      toast.error(e.message || 'Error al eliminar usuario');
    }
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

      {/* User list */}
      <div className="space-y-2 mb-6">
        {staffUsers.map(user => (
          <div key={user.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role_names || user.role}</p>
            </div>
            <span className="text-xs text-gray-400 font-mono shrink-0">PIN: {user.pin_code || '---'}</span>
            <button
              onClick={() => setEditingUser(user)}
              className="p-2 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(user)}
              className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {showWizard && (
        <UserWizardModal
          centers={centers}
          roles={roles}
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          centers={centers}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onSaved={onReload}
        />
      )}
    </div>
  );
}

// Roles Section
function RolesSection({ roles, permissions, permByRole, rolesByUser, staffUsers, onReload }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showUserAssign, setShowUserAssign] = useState(false);
  const toast = useToast();

  const permsByModule = {};
  for (const p of permissions) {
    const mod = p.module_code || 'general';
    if (!permsByModule[mod]) permsByModule[mod] = [];
    permsByModule[mod].push(p);
  }

  const handleTogglePermission = async (roleId, permissionId, enabled) => {
    const current = permByRole[roleId] || [];
    const updated = enabled
      ? [...current, permissionId]
      : current.filter(id => id !== permissionId);
    try {
      await api.roles.setPermissions(roleId, updated);
      await api.refreshSession();
      toast.success('Permiso actualizado');
      onReload();
    } catch (e) {
      toast.error('Error al actualizar permiso');
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    try {
      await api.roles.delete(role.id);
      toast.success('Rol eliminado');
      setSelectedRole(null);
      onReload();
    } catch (e) {
      toast.error(e.message || 'Error al eliminar rol');
    }
  };

  if (showCreate) {
    return (
      <CreateRoleModal
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); onReload(); }}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Roles y Permisos</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Rol
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de roles */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Roles</h3>
          <div className="space-y-2">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  selectedRole?.id === role.id
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{role.name}</p>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      role.is_system ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {role.is_system ? 'Sistema' : 'Personalizado'}
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(permByRole[role.id] || []).length > 0 && (
                    <span className="text-xs text-gray-400">
                      {(permByRole[role.id] || []).length} permisos
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detalle del rol seleccionado */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 border border-gray-100">
          {selectedRole ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedRole.name}</h3>
                  <p className="text-sm text-gray-500">{selectedRole.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowUserAssign(true)}
                    className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                  >
                    Asignar Usuarios
                  </button>
                  {!selectedRole.is_system && (
                    <button
                      onClick={() => handleDeleteRole(selectedRole)}
                      className="text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {showUserAssign && (
                <AssignUsersModal
                  role={selectedRole}
                  staffUsers={staffUsers}
                  rolesByUser={rolesByUser}
                  roles={roles}
                  onClose={() => setShowUserAssign(false)}
                  onAssigned={onReload}
                />
              )}

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {Object.entries(permsByModule).map(([module, perms]) => (
                  <div key={module}>
                    <h4 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                      {module === 'restaurant' ? 'Restaurante' :
                       module === 'erp' ? 'Inventario/ERP' :
                       module === 'crm' ? 'CRM' :
                       module === 'pms' ? 'PMS' : 'General'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map(p => {
                        const enabled = (permByRole[selectedRole.id] || []).includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              enabled
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => handleTogglePermission(selectedRole.id, p.id, e.target.checked)}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Selecciona un rol para ver y editar sus permisos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateRoleModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Nombre y slug son requeridos');
      return;
    }
    setLoading(true);
    try {
      await api.roles.create({ name: name.trim(), slug: slug.trim(), description: description.trim() });
      toast.success('Rol creado');
      onCreated();
    } catch (e) {
      toast.error(e.message || 'Error al crear rol');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Nuevo Rol</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')); }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              placeholder="Ej: Capturista"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (identificador)</label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none bg-gray-50 text-gray-500"
              placeholder="capturista"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              placeholder="Descripción opcional"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Rol'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignUsersModal({ role, staffUsers, rolesByUser, roles, onClose, onAssigned }) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const userIds = [];
    for (const [uid, rids] of Object.entries(rolesByUser)) {
      if (rids.includes(role.id)) userIds.push(Number(uid));
    }
    setSelectedUserIds(userIds);
  }, [role, rolesByUser]);

  const toggleUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    try {
      for (const user of staffUsers) {
        const previousRoles = rolesByUser[user.id] || [];
        const hadRole = previousRoles.includes(role.id);
        const wantsRole = selectedUserIds.includes(user.id);
        if (hadRole === wantsRole) continue;
        const updatedRoles = wantsRole
          ? [...previousRoles, role.id]
          : previousRoles.filter(id => id !== role.id);
        await api.users.setRoles(user.id, updatedRoles);
      }
      await api.refreshSession();
      toast.success('Usuarios asignados al rol');
      onAssigned();
      onClose();
    } catch (e) {
      toast.error('Error al asignar usuarios');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-1">Asignar Usuarios</h3>
        <p className="text-sm text-gray-500 mb-4">Usuarios con rol: <strong>{role.name}</strong></p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {staffUsers.map(user => (
            <label
              key={user.id}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                selectedUserIds.includes(user.id)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedUserIds.includes(user.id)}
                onChange={() => toggleUser(user.id)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-400">ID: {user.id}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// User Wizard Modal
function UserWizardModal({ centers, roles, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', pin: '', roleId: '', operationCenterId: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const ROLE_COLORS = ['from-amber-400 to-orange-500', 'from-emerald-400 to-green-500', 'from-purple-400 to-indigo-500', 'from-blue-400 to-cyan-500', 'from-pink-400 to-rose-500'];
  const ROLE_ICONS = ['🍽️', '💰', '👑', '⚙️', '📋'];

  const handleSave = async () => {
    if (!form.operationCenterId) {
      toast.error('Selecciona un centro de trabajo');
      return;
    }
    if (!form.roleId) {
      toast.error('Selecciona un rol');
      return;
    }
    setLoading(true);
    try {
      const result = await api.settings.createStaffUser({
        fullName: form.name,
        pinCode: form.pin,
        role: 'waiter',
        operationCenterId: form.operationCenterId
      });
      await api.users.setRoles(result.userId, [form.roleId]);
      toast.success('¡Usuario creado!');
      onCreated();
    } catch (error) {
      toast.error(error.message || 'Error al crear usuario');
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
                {(roles.length ? roles : []).map((role, idx) => (
                  <motion.button
                    key={role.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setForm({ ...form, roleId: role.id });
                      setStep(4);
                    }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                      form.roleId === role.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${ROLE_COLORS[idx % ROLE_COLORS.length]} rounded-xl flex items-center justify-center text-2xl`}>
                      {ROLE_ICONS[idx % ROLE_ICONS.length]}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{role.name}</p>
                      <p className="text-xs text-gray-500">{role.description || role.slug}</p>
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
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">Confirma los datos</p>
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${ROLE_COLORS[roles.findIndex(r => r.id === form.roleId) % ROLE_COLORS.length]} rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl`}>
                  {ROLE_ICONS[roles.findIndex(r => r.id === form.roleId) % ROLE_ICONS.length]}
                </div>
                <p className="text-xl font-bold text-gray-900">{form.name}</p>
                <p className="text-sm text-gray-500">PIN: •••••{form.pin.slice(-2)}</p>
                <p className="text-sm font-medium text-primary-600 mt-1">{roles.find(r => r.id === form.roleId)?.name}</p>
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

// Edit User Modal
function EditUserModal({ user, centers, roles, onClose, onSaved }) {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [pinCode, setPinCode] = useState(user.pin_code || '');
  const [centerId, setCenterId] = useState(user.operation_center_id || '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!fullName.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      await api.settings.updateStaffUser(user.id, {
        fullName: fullName.trim(),
        pinCode: pinCode.trim() || undefined,
        operationCenterId: centerId || null,
      });
      toast.success('Usuario actualizado');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Editar Usuario</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              type="password"
              value={pinCode}
              onChange={e => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              placeholder="Dejar vacío para mantener el actual"
              maxLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Centro de trabajo</label>
            <select
              value={centerId}
              onChange={e => setCenterId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
            >
              <option value="">Seleccionar centro</option>
              {centers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </div>
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

function SystemSection({ restaurantName, tipPercent, logoUrl, loginBgUrl, paymentMethods, onSaved }) {
  const [name, setName] = useState(restaurantName);
  const [tip, setTip] = useState(tipPercent);
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [logoBase64, setLogoBase64] = useState(null);
  const [bgPreview, setBgPreview] = useState(loginBgUrl);
  const [bgBase64, setBgBase64] = useState(null);
  const [saving, setSaving] = useState(false);
  const [excludedMethods, setExcludedMethods] = useState(['cxc']);
  const logoInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    setName(restaurantName);
    setTip(tipPercent);
  }, [restaurantName, tipPercent]);

  useEffect(() => {
    api.settings.getTipExcludedMethods().then(r => {
      if (r.excludedMethods) setExcludedMethods(r.excludedMethods);
    }).catch(() => {});
  }, []);

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
      await api.settings.setTipExcludedMethods({ excludedMethods });
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Métodos que NO generan propina
            </label>
            <p className="text-xs text-gray-400 mb-2">Selecciona los métodos de pago que excluyen la propina</p>
            <div className="space-y-2">
              {(paymentMethods||[]).map(pm => {
                const isExcluded = excludedMethods.includes(pm.code);
                return (
                  <label key={pm.code} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isExcluded}
                      onChange={() => {
                        setExcludedMethods(prev =>
                          isExcluded ? prev.filter(c => c !== pm.code) : [...prev, pm.code]
                        );
                      }}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{pm.label}</span>
                    {isExcluded && <span className="text-xs text-red-500 ml-auto">Sin propina</span>}
                  </label>
                );
              })}
              {(!paymentMethods || paymentMethods.length === 0) && (
                <p className="text-xs text-gray-400">No hay métodos de pago configurados</p>
              )}
            </div>
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
