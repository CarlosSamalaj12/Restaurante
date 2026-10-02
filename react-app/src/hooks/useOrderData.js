import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { useToast } from './useToast';

export function useOrderData(accountId) {
  const [account, setAccount] = useState(null);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({});
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [centers, setCenters] = useState([]);
  const [kitchenNotes, setKitchenNotes] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingProductId, setAddingProductId] = useState(null);
  const toast = useToast();
  const selectedCenterRef = useRef(selectedCenter);
  selectedCenterRef.current = selectedCenter;

  // Carga inicial completa de la comanda y catálogo
  const loadInitialData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const centerToUse = selectedCenterRef.current;
      const [accountData, productsData, categoriesData, bootstrapData] = await Promise.all([
        api.getAccount(accountId),
        api.getProducts(null, centerToUse),
        api.getCategories(centerToUse),
        api.bootstrap()
      ]);

      setAccount(accountData.account);
      setItems(accountData.items || []);
      setTotals(accountData.totals || {});
      setCategories(categoriesData || []);
      setProducts(productsData || []);
      setCenters(bootstrapData.centers || []);
      setKitchenNotes(bootstrapData.kitchenNotes || []);

      if (!selectedCenterRef.current && bootstrapData.centers?.length > 0) {
        const accountCenterId = accountData.account?.operation_center_id;
        if (accountCenterId) {
          const match = bootstrapData.centers.find(c => c.id === accountCenterId);
          if (match) {
            selectedCenterRef.current = accountCenterId;
            setSelectedCenter(accountCenterId);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar datos iniciales de la comanda:', error);
      toast.error(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Actualización silenciosa en segundo plano (solo refresca items y totales sin parpadear)
  const refreshAccountSilent = useCallback(async () => {
    if (!accountId) return;
    try {
      const accountData = await api.getAccount(accountId);
      if (accountData?.account) {
        setAccount(accountData.account);
        setItems(accountData.items || []);
        setTotals(accountData.totals || {});
      }
    } catch (error) {
      console.error('Error en refresco silencioso de comanda:', error);
    }
  }, [accountId]);

  // Carga de catálogo cuando el usuario cambia de centro explícitamente
  const handleSelectCenter = async (centerId) => {
    setSelectedCenter(centerId);
    selectedCenterRef.current = centerId;
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(null, centerId),
        api.getCategories(centerId)
      ]);
      setProducts(productsData || []);
      setCategories(categoriesData || []);
      // Si la categoría seleccionada no existe en el nuevo centro, resetear a Todos (null)
      if (selectedCategory && categoriesData && !categoriesData.some(c => c.id === selectedCategory)) {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('Error al cambiar de centro:', error);
      toast.error('Error al actualizar catálogo del centro');
    }
  };

  // Agregar producto agrupando si ya existe en la misma silla sin modificadores
  const addItemToAccount = async (productId, qty = 1, currentSeat = 1, modifierOptionIds = [], notes = '') => {
    setAddingProductId(productId);
    try {
      const hasModifiers = modifierOptionIds && modifierOptionIds.length > 0;
      const hasNotes = Boolean(notes && notes.trim());

      // Buscar si ya existe un ítem idéntico NO enviado en esa misma silla
      const existingMatch = !hasModifiers && !hasNotes
        ? items.find(it =>
            Number(it.product_id) === Number(productId) &&
            Number(it.seat_no || 1) === Number(currentSeat) &&
            !it.sent_at &&
            (!it.modifiers || it.modifiers.length === 0) &&
            (!it.notes || !it.notes.trim())
          )
        : null;

      if (existingMatch) {
        // Incrementa la cantidad del ítem existente
        const nextQty = Number(existingMatch.qty || 1) + Number(qty);
        await api.updateItemQty(existingMatch.id, nextQty);
      } else {
        // Inserta nuevo ítem
        await api.addItem(accountId, {
          productId,
          qty,
          seatNo: currentSeat,
          modifierOptionIds,
          notes
        });
      }

      await refreshAccountSilent();
      return true;
    } catch (error) {
      console.error('Add item error:', error);
      toast.error(error.message || 'Error al agregar producto');
      return false;
    } finally {
      setAddingProductId(null);
    }
  };

  // Ajustar cantidad (+ / -) de un producto no enviado
  const updateItemQuantity = async (itemId, nextQty) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (item.sent_at) {
      toast.error('No se puede modificar cantidad de un platillo ya enviado');
      return;
    }

    try {
      if (nextQty <= 0) {
        // Eliminación directa sin modal para ítems no enviados
        await api.voidItem(itemId, {
          reason: 'Cancelado antes de enviar',
          authorizedBy: account?.waiter_id || null
        });
        toast.success(`${item.product_name} eliminado`);
      } else {
        await api.updateItemQty(itemId, nextQty);
      }
      await refreshAccountSilent();
    } catch (error) {
      console.error('Error al actualizar cantidad:', error);
      toast.error(error.message || 'Error al cambiar cantidad');
    }
  };

  // Actualizar notas/observaciones de un producto no enviado
  const updateItemNotes = async (itemId, notes) => {
    try {
      await api.updateItemNotes(itemId, notes);
      await refreshAccountSilent();
      return true;
    } catch (error) {
      console.error('Error al actualizar notas:', error);
      toast.error(error.message || 'Error al guardar notas');
      return false;
    }
  };

  // Anular producto con autorización (para ítems ya enviados)
  const confirmVoidItem = async (itemToVoid, voidPin, voidReason, qtyToVoid = null) => {
    if (!itemToVoid) return false;

    if (itemToVoid.sent_at && !voidPin?.trim()) {
      toast.error('Ingresa el PIN de autorización para anular productos enviados');
      return false;
    }

    try {
      const payload = {
        reason: voidReason?.trim() || 'Cancelado por cliente',
        qtyToVoid: qtyToVoid !== null && qtyToVoid !== undefined ? Number(qtyToVoid) : Number(itemToVoid.qty || 1)
      };

      if (itemToVoid.sent_at) {
        payload.authPin = String(voidPin).trim();
      } else {
        payload.authorizedBy = account?.waiter_id;
      }

      await api.voidItem(itemToVoid.id, payload);
      toast.success(
        qtyToVoid && qtyToVoid < itemToVoid.qty
          ? `${qtyToVoid}x ${itemToVoid.product_name} anulado(s)`
          : 'Producto anulado exitosamente'
      );
      await refreshAccountSilent();
      return true;
    } catch (error) {
      const msg = error.message || 'Error al anular';
      toast.error(msg);
      throw error;
    }
  };

  // Enviar comanda a cocina/bar
  const handleSendOrder = async () => {
    try {
      await api.sendOrder(accountId);
      toast.success('Pedido enviado a cocina');
      await refreshAccountSilent();
    } catch (error) {
      toast.error(error.message || 'Error al enviar');
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => Number(p.category_id) === Number(selectedCategory))
    : products;

  return {
    account,
    items,
    totals,
    categories,
    products,
    filteredProducts,
    centers,
    kitchenNotes,
    selectedCenter,
    setSelectedCenter: handleSelectCenter,
    selectedCategory,
    setSelectedCategory,
    loading,
    addingProductId,
    loadData: refreshAccountSilent,
    loadInitialData,
    addItemToAccount,
    updateItemQuantity,
    updateItemNotes,
    handleSendOrder,
    confirmVoidItem
  };
}

export default useOrderData;
