// react-app/src/hooks/useSettingsData.js
// Custom Hook para la obtención de datos y estado global de la vista de Configuración

import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useToast } from './useToast';

export function useSettingsData() {
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
    productProductionCenters: [],
    productModifierGroups: [],
    paymentMethods: [],
    staffUsers: [],
    roles: [],
    permissions: [],
    permByRole: {},
    rolesByUser: {},
    restaurantName: 'Mi Restaurante',
    tipPercent: 0,
    logoUrl: '',
    loginBgUrl: '',
  });

  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configData, bootstrapData, paymentMethodsRes] = await Promise.all([
        api.getConfigData(),
        api.bootstrap(),
        api.settings.getPaymentMethods().catch(() => ({ paymentMethods: [] }))
      ]);

      const methods = (paymentMethodsRes?.paymentMethods?.length > 0)
        ? paymentMethodsRes.paymentMethods
        : (configData.paymentMethods || bootstrapData.paymentMethods || []);

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
        paymentMethods: methods,
        staffUsers: configData.staffUsers || [],
        roles: configData.roles || [],
        permissions: configData.permissions || [],
        permByRole: configData.permByRole || {},
        rolesByUser: configData.rolesByUser || {},
        restaurantName: bootstrapData.restaurantName || 'Mi Restaurante',
        tipPercent: 0,
        logoUrl: bootstrapData.logoUrl || '',
        loginBgUrl: bootstrapData.loginBgUrl || '',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    setData,
    loading,
    loadData,
  };
}
