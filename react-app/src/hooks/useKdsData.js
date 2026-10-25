import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useToast } from './useToast';
import { useSocket } from './useSocket';
import { getOrCreateSerial } from '../lib/terminalSerial';
import dayjs from 'dayjs';

export function useKdsData(options = {}) {
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [centers, setCenters] = useState([]);
  const [operationCenters, setOperationCenters] = useState([]);
  const [stationConfig, setStationConfig] = useState(null);
  const [stationLoaded, setStationLoaded] = useState(false);

  // Control de Licenciamiento / Activación del Módulo KDS
  const [moduleEnabled, setModuleEnabled] = useState(true);
  const [moduleLoading, setModuleLoading] = useState(true);

  // Filtros activos (estación de preparación y centro de consumo / salón)
  const [selectedProductionCenter, setSelectedProductionCenter] = useState(
    options.productionCenterId !== undefined ? options.productionCenterId : null
  );
  const [selectedOperationCenter, setSelectedOperationCenter] = useState(
    options.operationCenterId !== undefined ? options.operationCenterId : null
  );

  const [loading, setLoading] = useState(true);
  const [completingItems, setCompletingItems] = useState(new Set());
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDate, setReportDate] = useState(dayjs().format('YYYY-MM-DD'));
  const toast = useToast();

  // Consulta el estado de activación del módulo KDS
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await api.kds.getStatus();
        if (isMounted && res) {
          setModuleEnabled(Boolean(res.enabled));
        }
      } catch (err) {
        console.warn('Could not check KDS status:', err.message);
      } finally {
        if (isMounted) setModuleLoading(false);
      }
    };
    checkStatus();
    return () => { isMounted = false; };
  }, []);

  // Escucha cambios de activación en tiempo real vía WebSockets
  useSocket({
    'settings:module_kds_toggled': ({ enabled }) => {
      setModuleEnabled(Boolean(enabled));
    },
  });

  // Carga automática de la estación configurada para este dispositivo o terminal
  useEffect(() => {
    let isMounted = true;
    const loadStation = async () => {
      try {
        const serial = getOrCreateSerial();
        const res = await api.kds.getMyStation({ serial });
        if (isMounted && res?.station) {
          setStationConfig(res.station);
          if (res.station.kds_production_center_id) {
            setSelectedProductionCenter(res.station.kds_production_center_id);
          }
          if (res.station.kds_operation_center_id) {
            setSelectedOperationCenter(res.station.kds_operation_center_id);
          }
        }
      } catch (e) {
        console.warn('Could not auto-resolve KDS station:', e.message);
      } finally {
        if (isMounted) setStationLoaded(true);
      }
    };
    loadStation();
    return () => { isMounted = false; };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [ordersData, centersData] = await Promise.all([
        api.kds.getOrdersWithVoided({
          productionCenterId: selectedProductionCenter,
          operationCenterId: selectedOperationCenter,
        }),
        api.kds.getProductionCenters()
      ]);
      if (ordersData?.moduleDisabled) {
        setModuleEnabled(false);
        setOrders([]);
        setCategories([]);
        return;
      }
      setOrders(ordersData.orders || []);
      setCategories(ordersData.categories || []);
      setCenters(centersData.centers || []);
      setOperationCenters(centersData.operationCenters || []);
    } catch (error) {
      console.error('Error loading KDS orders:', error);
      toast.error('Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  }, [selectedProductionCenter, selectedOperationCenter]);

  useEffect(() => {
    if (!moduleEnabled) return;
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData, moduleEnabled]);

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
      await api.kds.markAccountDone(accountId, selectedProductionCenter);
      toast.success('Ticket despachado ✓');
      loadData();
    } catch (error) {
      toast.error('Error al completar');
    }
  };

  const loadKdsReport = async () => {
    setReportLoading(true);
    try {
      const data = await api.kds.getKdsReport(reportDate, selectedProductionCenter);
      setReportData(data);
    } catch (error) {
      toast.error('Error al cargar reporte');
    } finally {
      setReportLoading(false);
    }
  };

  const toggleModule = async (enabled) => {
    const res = await api.kds.toggleModule(enabled);
    setModuleEnabled(Boolean(res.enabled));
    if (res.enabled) {
      loadData();
    }
    return res;
  };

  return {
    orders,
    categories,
    centers,
    operationCenters,
    stationConfig,
    stationLoaded,
    selectedProductionCenter,
    setSelectedProductionCenter,
    selectedOperationCenter,
    setSelectedOperationCenter,
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
    moduleEnabled,
    moduleLoading,
    setModuleEnabled,
    toggleModule,
  };
}

export default useKdsData;
