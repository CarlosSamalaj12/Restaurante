import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useToast } from './useToast';
import dayjs from 'dayjs';

export function useKdsData(selectedCenter) {
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingItems, setCompletingItems] = useState(new Set());
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDate, setReportDate] = useState(dayjs().format('YYYY-MM-DD'));
  const toast = useToast();

  const loadData = useCallback(async () => {
    try {
      const [ordersData, centersData] = await Promise.all([
        api.kds.getOrdersWithVoided(selectedCenter),
        api.kds.getProductionCenters()
      ]);
      setOrders(ordersData.orders || []);
      setCategories(ordersData.categories || []);
      setCenters(centersData.centers || []);
    } catch (error) {
      console.error('Error loading KDS orders:', error);
      toast.error('Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  }, [selectedCenter]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleMarkDone = async (itemId) => {
    setCompletingItems(prev => new Set([...prev, itemId]));
    try {
      await api.kds.markItemDone(itemId);
      toast.success('¡Listo!');
      loadData();
    } catch (error) {
      toast.error('Error al marcar como listo');
    } finally {
      setCompletingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleMarkAllDone = async (accountId) => {
    try {
      await api.kds.markAccountDone(accountId);
      toast.success('Ticket completado ✓');
      loadData();
    } catch (error) {
      toast.error('Error al completar');
    }
  };

  const loadKdsReport = async () => {
    setReportLoading(true);
    try {
      const data = await api.kds.getKdsReport(reportDate, selectedCenter);
      setReportData(data);
    } catch (error) {
      toast.error('Error al cargar reporte');
    } finally {
      setReportLoading(false);
    }
  };

  return {
    orders,
    categories,
    centers,
    loading,
    completingItems,
    loadData,
    handleMarkDone,
    handleMarkAllDone,
    reportData,
    reportLoading,
    reportDate,
    setReportDate,
    loadKdsReport,
  };
}

export default useKdsData;
