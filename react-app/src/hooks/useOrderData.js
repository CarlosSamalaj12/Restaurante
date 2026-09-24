import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useToast } from './useToast';

export function useOrderData(accountId) {
  const [account, setAccount] = useState(null);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({});
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accountData, productsData, categoriesData, bootstrapData] = await Promise.all([
        api.getAccount(accountId),
        api.getProducts(null, selectedCenter),
        api.getCategories(selectedCenter),
        api.bootstrap()
      ]);

      setAccount(accountData.account);
      setItems(accountData.items || []);
      setTotals(accountData.totals || {});
      setCategories(categoriesData || []);
      setProducts(productsData || []);
      setCenters(bootstrapData.centers || []);

      if (!selectedCenter && bootstrapData.centers?.length > 0) {
        const accountCenterId = accountData.account?.operation_center_id;
        if (accountCenterId) {
          const match = bootstrapData.centers.find(c => c.id === accountCenterId);
          if (match) setSelectedCenter(accountCenterId);
        }
      }

      if (productsData.categories?.length > 0) {
        setSelectedCategory(productsData.categories[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [accountId, selectedCenter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadProductsByCenter = useCallback(async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(null, selectedCenter),
        api.getCategories(selectedCenter)
      ]);
      setProducts(productsData || []);
      setCategories(categoriesData || []);
      if (categoriesData?.length > 0) {
        setSelectedCategory(categoriesData[0].id);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, [selectedCenter]);

  useEffect(() => {
    if (!loading && centers.length > 0) {
      loadProductsByCenter();
    }
  }, [selectedCenter, loadProductsByCenter]);

  const addItemToAccount = async (productId, qty, currentSeat, modifierOptionIds = [], notes = '') => {
    setAddingItem(true);
    try {
      await api.addItem(accountId, {
        productId,
        qty,
        seatNo: currentSeat,
        modifierOptionIds,
        notes
      });
      loadData();
      return true;
    } catch (error) {
      console.error('Add item error:', error);
      toast.error(error.message || 'Error al agregar producto');
      return false;
    } finally {
      setAddingItem(false);
    }
  };

  const handleSendOrder = async () => {
    try {
      await api.sendOrder(accountId);
      toast.success('Pedido enviado a cocina');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Error al enviar');
    }
  };

  const confirmVoidItem = async (itemToVoid, voidPin, voidReason) => {
    if (!itemToVoid) return false;

    if (itemToVoid.sent_at && !voidPin.trim()) {
      toast.error('Ingresa el PIN de autorización para anular productos enviados');
      return false;
    }

    try {
      const payload = {
        reason: voidReason || 'Cancelado'
      };

      if (itemToVoid.sent_at) {
        payload.authPin = voidPin;
      } else {
        payload.authorizedBy = account?.waiter_id;
      }

      await api.voidItem(itemToVoid.id, payload);
      toast.success('Producto anulado');
      loadData();
      return true;
    } catch (error) {
      toast.error(error.message || 'Error al anular');
      return false;
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  return {
    account,
    items,
    totals,
    categories,
    products,
    filteredProducts,
    centers,
    selectedCenter,
    setSelectedCenter,
    selectedCategory,
    setSelectedCategory,
    loading,
    addingItem,
    loadData,
    addItemToAccount,
    handleSendOrder,
    confirmVoidItem
  };
}

export default useOrderData;
