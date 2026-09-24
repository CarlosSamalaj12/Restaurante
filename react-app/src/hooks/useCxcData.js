import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useToast } from './useToast';

export function useCxcData() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [pending, setPending] = useState([]);
  const [areas, setAreas] = useState([]);
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsData, pendingData, areasData] = await Promise.all([
        api.cxc.getClients(),
        api.cxc.getPending(),
        api.cxc.getAreas(),
      ]);
      setClients(clientsData || []);
      setPending(pendingData || []);
      setAreas(areasData || []);
    } catch (error) {
      console.error('Error loading CXC data:', error);
      toast.error('Error al cargar datos CXC');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    clients,
    setClients,
    pending,
    setPending,
    areas,
    setAreas,
    loading,
    loadData,
  };
}

export default useCxcData;
