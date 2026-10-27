import { useState, useEffect, useMemo, useCallback } from 'react';
import { Banknote } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_METHODS } from './constants';

export function usePaymentModal({ accountId, totals, onClose, onSuccess }) {
  const toast = useToast();
  const { currencySymbol = 'Q' } = useAuth() || {};

  const [currentTotals, setCurrentTotals] = useState(totals || {});
  const [existingPayments, setExistingPayments] = useState([]);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  // Diálogo de confirmación para eliminar pagos existentes
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    itemDetail: '',
    confirmText: 'Eliminar Pago',
    variant: 'danger',
    loading: false,
    onConfirm: () => {},
  });

  const closeConfirm = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
  }, []);

  const pending = useMemo(() => {
    const val = Number(currentTotals?.pending ?? currentTotals?.total ?? 0);
    return isNaN(val) || val < 0 ? 0 : Math.round(val * 100) / 100;
  }, [currentTotals]);

  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_METHODS);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [lines, setLines] = useState(() => [
    {
      id: 1,
      method: 'cash',
      methodLabel: 'Efectivo',
      amount: pending > 0 ? pending.toFixed(2) : '0.00',
      received: pending > 0 ? pending.toFixed(2) : '0.00',
      reference: '',
      cxcClientId: null,
      cxcClientName: '',
      cxcCreditLimit: 0,
      cxcCurrentBalance: 0,
      cxcAvailableCredit: 0,
      pmsRoomNumber: null,
      pmsGuestName: '',
      pmsAvailableCredit: 0,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('select');
  const [cxcClients, setCxcClients] = useState([]);
  const [cxcSearch, setCxcSearch] = useState('');
  const [creditLimitAlert, setCreditLimitAlert] = useState(null);

  // Controles de columna derecha y Numpad
  const [activeLineId, setActiveLineId] = useState(1);
  const [numpadField, setNumpadField] = useState('received'); // 'received' | 'amount'
  const [showFelPanel, setShowFelPanel] = useState(false);
  const [showExistingPayments, setShowExistingPayments] = useState(false);

  // Estados específicos para Hotel PMS
  const [pmsRooms, setPmsRooms] = useState([]);
  const [pmsSearch, setPmsSearch] = useState('');
  const [loadingPmsRooms, setLoadingPmsRooms] = useState(false);

  // Facturación Electrónica FEL
  const [felConfig, setFelConfig] = useState(null);
  const [felRules, setFelRules] = useState([]);
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [recipientNit, setRecipientNit] = useState('CF');
  const [recipientName, setRecipientName] = useState('CONSUMIDOR FINAL');
  const [recipientAddress, setRecipientAddress] = useState('CIUDAD DE GUATEMALA');
  const [searchingNit, setSearchingNit] = useState(false);
  const [certifiedInvoice, setCertifiedInvoice] = useState(null);

  // Línea actualmente seleccionada para el panel derecho
  const activeLine = useMemo(() => {
    return lines.find((l) => l.id === activeLineId) || lines[0] || null;
  }, [lines, activeLineId]);

  useEffect(() => {
    if (!activeLineId && lines.length > 0) {
      setActiveLineId(lines[0].id);
    }
  }, [lines, activeLineId]);

  const searchPmsRooms = useCallback(
    async (searchQuery = '') => {
      setLoadingPmsRooms(true);
      try {
        const data = await api.pms.lookupRoom(searchQuery);
        setPmsRooms(data?.results || []);
      } catch (err) {
        console.error('Error buscando habitaciones PMS:', err);
        toast.error('Error al consultar habitaciones del hotel');
      } finally {
        setLoadingPmsRooms(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (totals) setCurrentTotals(totals);
  }, [totals]);

  // Carga reutilizable de pagos existentes y totales actualizados de la cuenta
  const loadAccountPayments = useCallback(async () => {
    if (!accountId) return;
    try {
      const data = await api.getAccount(accountId);
      if (data) {
        if (data.payments) setExistingPayments(data.payments);
        if (data.totals) setCurrentTotals(data.totals);
      }
    } catch (err) {
      console.error('Error cargando pagos existentes:', err);
    }
  }, [accountId]);

  useEffect(() => {
    let isCancelled = false;
    const fetchPayments = async () => {
      if (!accountId) return;
      try {
        const data = await api.getAccount(accountId);
        if (!isCancelled && data) {
          if (data.payments) setExistingPayments(data.payments);
          if (data.totals) setCurrentTotals(data.totals);
        }
      } catch (err) {
        console.error('Error cargando pagos existentes:', err);
      }
    };
    fetchPayments();
    return () => {
      isCancelled = true;
    };
  }, [accountId]);

  const loadFelConfig = useCallback(async () => {
    try {
      const res = await api.fel.getConfig();
      if (res.config) {
        setFelConfig(res.config);
        setFelRules(res.paymentMethods || []);
      }
    } catch (err) {
      console.warn('FEL no configurado o inactivo:', err.message);
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const data = await api.bootstrap();
      if (data.paymentMethods?.length > 0) {
        const mapped = data.paymentMethods.map((pm) => {
          const match = DEFAULT_METHODS.find((m) => m.code === pm.code);
          return {
            code: pm.code,
            label: pm.label,
            icon: match ? match.icon : Banknote,
            color: match ? match.color : 'bg-slate-700',
            activeBorder: match ? match.activeBorder : 'border-slate-500',
            lightBg: match ? match.lightBg : 'bg-slate-50 text-slate-800',
          };
        });
        setPaymentMethods(mapped);
      }
    } catch (error) {
      console.error('Error cargando métodos de pago:', error);
    }
  }, []);

  useEffect(() => {
    loadPaymentMethods();
    loadFelConfig();
  }, [loadPaymentMethods, loadFelConfig]);

  // Si alguna forma de pago activa requiere factura obligatoria por configuración
  useEffect(() => {
    if (!felConfig?.is_enabled) return;
    const activeCodes = new Set(lines.map((l) => l.method));
    const requiresAutoInvoice = felRules.some((r) => activeCodes.has(r.code) && r.auto_invoice);
    if (requiresAutoInvoice) {
      setWantsInvoice(true);
    }
  }, [lines, felRules, felConfig]);

  // Sincronizar monto si cambia el saldo pendiente en modo simple
  useEffect(() => {
    if (!isSplitMode) {
      setLines((prev) => {
        if (prev.length === 1) {
          return [
            {
              ...prev[0],
              amount: pending.toFixed(2),
              received: prev[0].method === 'cash' ? pending.toFixed(2) : '0.00',
            },
          ];
        }
        return prev;
      });
    }
  }, [pending, isSplitMode]);

  // Cálculos en centavos para precisión
  const pendingCents = Math.round(pending * 100);

  const totalAssignedCents = useMemo(() => {
    return lines.reduce((sum, l) => {
      const val = parseFloat(l.amount) || 0;
      return sum + Math.round(val * 100);
    }, 0);
  }, [lines]);

  const remainingCents = Math.max(0, pendingCents - totalAssignedCents);
  const overageCents = Math.max(0, totalAssignedCents - pendingCents);
  const remaining = remainingCents / 100;
  const overage = overageCents / 100;
  const totalAssigned = totalAssignedCents / 100;

  const isExact = totalAssignedCents === pendingCents && pendingCents > 0;
  const isShort = totalAssignedCents < pendingCents;
  const isOver = totalAssignedCents > pendingCents;

  // Validación de efectivo recibido
  const cashLinesWithShortage = useMemo(() => {
    return lines.filter((l) => {
      if (l.method !== 'cash') return false;
      const amt = parseFloat(l.amount) || 0;
      const rec = parseFloat(l.received) || 0;
      return rec < amt;
    });
  }, [lines]);

  // Cambio total en efectivo
  const totalCashChange = useMemo(() => {
    return lines.reduce((sum, l) => {
      if (l.method !== 'cash') return sum;
      const amt = parseFloat(l.amount) || 0;
      const rec = parseFloat(l.received) || 0;
      return sum + (rec > amt ? rec - amt : 0);
    }, 0);
  }, [lines]);

  const updateLineField = useCallback((id, field, value) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        return { ...line, [field]: value };
      })
    );
  }, []);

  const handleExactCash = useCallback((lineId) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const amt = parseFloat(line.amount) || 0;
        return { ...line, received: amt.toFixed(2) };
      })
    );
  }, []);

  // Manejo de teclado táctil POS
  const handleNumpadPress = useCallback(
    (val) => {
      if (!activeLine) return;
      const targetField = activeLine.method === 'cash' ? numpadField : 'amount';
      const currentVal = String(activeLine[targetField] ?? '');

      if (val === 'C') {
        updateLineField(activeLine.id, targetField, '0');
        return;
      }
      if (val === 'BACK') {
        const next = currentVal.length > 1 ? currentVal.slice(0, -1) : '0';
        updateLineField(activeLine.id, targetField, next);
        return;
      }
      if (val === '.') {
        if (!currentVal.includes('.')) {
          updateLineField(activeLine.id, targetField, (currentVal || '0') + '.');
        }
        return;
      }
      if (val === 'EXACT') {
        if (activeLine.method === 'cash') {
          handleExactCash(activeLine.id);
        }
        return;
      }
      if (val === 'REMAINING') {
        if (remaining > 0) {
          const cur = parseFloat(activeLine[targetField]) || 0;
          const next = Math.round((cur + remaining) * 100) / 100;
          updateLineField(activeLine.id, targetField, next.toFixed(2));
        }
        return;
      }

      let next = currentVal;
      if (next === '0' || next === '0.00' || next === '') {
        next = val === '00' ? '0' : val;
      } else {
        if (next.includes('.')) {
          const [, dec] = next.split('.');
          if (dec && dec.length >= 2) return;
        }
        next += val;
      }
      updateLineField(activeLine.id, targetField, next);
    },
    [activeLine, numpadField, remaining, updateLineField, handleExactCash]
  );

  // Consulta NIT SAT
  const handleSearchNit = useCallback(
    async (nitValue) => {
      const clean = String(nitValue || recipientNit || '')
        .trim()
        .toUpperCase()
        .replace(/[-\s]/g, '');
      if (!clean || clean === 'CF') {
        setRecipientNit('CF');
        setRecipientName('CONSUMIDOR FINAL');
        setRecipientAddress('CIUDAD DE GUATEMALA');
        return;
      }

      setSearchingNit(true);
      try {
        const data = await api.fel.consultarNit(clean);
        if (data && data.name) {
          setRecipientNit(data.nit || clean);
          setRecipientName(data.name);
          if (data.address) setRecipientAddress(data.address);
          toast.success(`Cliente SAT: ${data.name}`);
        } else {
          toast.warning('NIT no localizado. Puedes escribir el nombre manualmente.');
        }
      } catch (err) {
        toast.error('Error al consultar NIT en SAT');
      } finally {
        setSearchingNit(false);
      }
    },
    [recipientNit, toast]
  );

  const handleSetCF = useCallback(() => {
    setRecipientNit('CF');
    setRecipientName('CONSUMIDOR FINAL');
    setRecipientAddress('CIUDAD DE GUATEMALA');
  }, []);

  // Selección de método rápido (1 clic)
  const handleSelectSimpleMethod = useCallback(
    async (method) => {
      const newId = Date.now();
      setActiveLineId(newId);
      setNumpadField('received');
      if (method.code === 'cxc') {
        try {
          const data = await api.cxc.getClients();
          setCxcClients(data.filter((c) => c.cxc_enabled));
        } catch (err) {
          toast.error('Error al cargar clientes CXC');
        }
      }
      if (method.code === 'room_charge') {
        searchPmsRooms('');
      }
      setLines([
        {
          id: newId,
          method: method.code,
          methodLabel: method.label,
          amount: pending.toFixed(2),
          received: method.code === 'cash' ? pending.toFixed(2) : '0.00',
          reference: '',
          cxcClientId: null,
          cxcClientName: '',
          cxcCreditLimit: 0,
          cxcCurrentBalance: 0,
          cxcAvailableCredit: 0,
          pmsRoomNumber: null,
          pmsGuestName: '',
          pmsAvailableCredit: 0,
        },
      ]);
    },
    [pending, searchPmsRooms, toast]
  );

  // Agregar nueva línea en modo mixto
  const handleAddPaymentLine = useCallback(
    async (method) => {
      if (method.code === 'cxc') {
        try {
          const data = await api.cxc.getClients();
          setCxcClients(data.filter((c) => c.cxc_enabled));
        } catch (err) {
          toast.error('Error al cargar clientes CXC');
        }
      }
      if (method.code === 'room_charge') {
        searchPmsRooms('');
      }

      const newId = Date.now();
      const defaultAmount = remaining > 0 ? remaining.toFixed(2) : '0.00';

      setLines((prev) => [
        ...prev,
        {
          id: newId,
          method: method.code,
          methodLabel: method.label,
          amount: defaultAmount,
          received: method.code === 'cash' ? defaultAmount : '0.00',
          reference: '',
          cxcClientId: null,
          cxcClientName: '',
          cxcCreditLimit: 0,
          cxcCurrentBalance: 0,
          cxcAvailableCredit: 0,
          pmsRoomNumber: null,
          pmsGuestName: '',
          pmsAvailableCredit: 0,
        },
      ]);

      setActiveLineId(newId);
      if (method.code === 'cash') {
        setNumpadField('received');
      } else {
        setNumpadField('amount');
      }
    },
    [remaining, searchPmsRooms, toast]
  );

  const handleChangeLineMethod = useCallback(
    async (lineId, methodCode) => {
      const newMethod = paymentMethods.find((m) => m.code === methodCode);
      if (!newMethod) return;
      updateLineField(lineId, 'method', newMethod.code);
      updateLineField(lineId, 'methodLabel', newMethod.label);
      if (newMethod.code === 'cash') {
        const line = lines.find((l) => l.id === lineId);
        updateLineField(lineId, 'received', line?.amount || '0.00');
      }
      if (newMethod.code === 'cxc') {
        try {
          const data = await api.cxc.getClients();
          setCxcClients(data.filter((c) => c.cxc_enabled));
        } catch (err) {
          console.error(err);
        }
      }
      if (newMethod.code === 'room_charge') {
        searchPmsRooms('');
      }
    },
    [paymentMethods, updateLineField, lines, searchPmsRooms]
  );

  const removeLine = useCallback((id) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      const remainingLines = prev.filter((l) => l.id !== id);
      if (remainingLines.length === 1) {
        setIsSplitMode(false);
      }
      return remainingLines;
    });
    setActiveLineId((prevActive) => {
      if (prevActive === id) {
        return lines.find((l) => l.id !== id)?.id || 1;
      }
      return prevActive;
    });
  }, [lines]);

  const handleBillClick = useCallback((lineId, billValue) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        return { ...line, received: billValue.toFixed(2) };
      })
    );
  }, []);

  const handleCoinClick = useCallback((lineId, coinValue) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const current = parseFloat(line.received) || 0;
        const next = Math.round((current + coinValue) * 100) / 100;
        return { ...line, received: next.toFixed(2) };
      })
    );
  }, []);

  // Selección de cliente CXC con validación de límite de crédito
  const handleSelectCxcClient = useCallback(
    (lineId, client) => {
      const creditLimit = Number(client.credit_limit || 0);
      const currentBalance = Number(client.current_balance || 0);
      const availableCredit = Math.max(0, Math.round((creditLimit - currentBalance) * 100) / 100);
      const targetLine = lines.find((l) => l.id === lineId) || lines[0];
      const lineAmt = parseFloat(targetLine?.amount) || 0;

      if (creditLimit > 0 && lineAmt > availableCredit + 0.009) {
        const excess = Math.max(0, Math.round((lineAmt - availableCredit) * 100) / 100);
        setCreditLimitAlert({
          client,
          lineId,
          requestedAmount: lineAmt,
          availableCredit,
          excessAmount: excess,
        });
        return;
      }

      if (creditLimit <= 0) {
        setCreditLimitAlert({
          client,
          lineId,
          requestedAmount: lineAmt,
          availableCredit: 0,
          excessAmount: lineAmt,
        });
        return;
      }

      updateLineField(lineId, 'cxcClientId', client.id);
      updateLineField(lineId, 'cxcClientName', client.full_name);
      updateLineField(lineId, 'cxcCreditLimit', creditLimit);
      updateLineField(lineId, 'cxcCurrentBalance', currentBalance);
      updateLineField(lineId, 'cxcAvailableCredit', availableCredit);
    },
    [lines, updateLineField]
  );

  // Aplicar división automática cuando se excede límite CXC
  const handleApplyCreditSplit = useCallback(() => {
    if (!creditLimitAlert) return;
    const { client, lineId, availableCredit, excessAmount } = creditLimitAlert;

    setIsSplitMode(true);

    const targetId = lines.some((l) => l.id === lineId) ? lineId : lines[0]?.id;
    const otherLines = lines.filter((l) => l.id !== targetId);
    const secondLineId = otherLines.length > 0 ? otherLines[0].id : Date.now();

    setLines((prev) => {
      let nextLines = prev.map((l) => {
        if (l.id === targetId) {
          return {
            ...l,
            method: 'cxc',
            methodLabel: 'Crédito Folio',
            amount: availableCredit.toFixed(2),
            received: '0.00',
            cxcClientId: client.id,
            cxcClientName: client.full_name,
            cxcCreditLimit: Number(client.credit_limit || 0),
            cxcCurrentBalance: Number(client.current_balance || 0),
            cxcAvailableCredit: availableCredit,
          };
        }
        return l;
      });

      if (otherLines.length > 0) {
        nextLines = nextLines.map((l) => {
          if (l.id === secondLineId) {
            return {
              ...l,
              amount: excessAmount.toFixed(2),
              received: l.method === 'cash' ? excessAmount.toFixed(2) : l.received || '0.00',
            };
          }
          return l;
        });
      } else {
        nextLines.push({
          id: secondLineId,
          method: 'cash',
          methodLabel: 'Efectivo',
          amount: excessAmount.toFixed(2),
          received: excessAmount.toFixed(2),
          reference: '',
          cxcClientId: null,
          cxcClientName: '',
          cxcCreditLimit: 0,
          cxcCurrentBalance: 0,
          cxcAvailableCredit: 0,
          pmsRoomNumber: null,
          pmsGuestName: '',
          pmsAvailableCredit: 0,
        });
      }

      return nextLines;
    });

    setActiveLineId(secondLineId);
    setCreditLimitAlert(null);
    toast.success(
      `Cuenta dividida: ${currencySymbol} ${availableCredit.toFixed(2)} a Crédito Folio y ${currencySymbol} ${excessAmount.toFixed(2)} restante.`
    );
  }, [creditLimitAlert, lines, currencySymbol, toast]);

  const handleCancelCreditAlert = useCallback(
    (changeToCash = false) => {
      if (changeToCash && creditLimitAlert) {
        updateLineField(creditLimitAlert.lineId, 'method', 'cash');
        updateLineField(creditLimitAlert.lineId, 'methodLabel', 'Efectivo');
        updateLineField(creditLimitAlert.lineId, 'cxcClientId', null);
        updateLineField(creditLimitAlert.lineId, 'cxcClientName', '');
        const amt = parseFloat(lines.find((l) => l.id === creditLimitAlert.lineId)?.amount) || pending;
        updateLineField(creditLimitAlert.lineId, 'received', amt.toFixed(2));
        toast.info('Se cambió la forma de pago a Efectivo');
      }
      setCreditLimitAlert(null);
    },
    [creditLimitAlert, lines, pending, toast, updateLineField]
  );

  // Eliminar un pago individual ya registrado en la cuenta
  const handleDeleteExistingPayment = useCallback(
    (payment) => {
      setConfirmDialog({
        isOpen: true,
        title: '¿Eliminar este pago?',
        message:
          'El saldo pendiente aumentará inmediatamente para que puedas registrar la forma de pago correcta.',
        itemName: `Pago de ${currencySymbol} ${Number(payment.amount).toFixed(2)}`,
        itemDetail: `Método: ${payment.method_label || payment.method}`,
        variant: 'danger',
        confirmText: 'Eliminar Pago',
        loading: false,
        onConfirm: async () => {
          setDeletingPaymentId(payment.id);
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          try {
            await api.deleteAccountPayment(accountId, payment.id);
            toast.success('Pago eliminado exitosamente');
            await loadAccountPayments();
            closeConfirm();
          } catch (err) {
            toast.error(err.message || 'Error al eliminar pago');
            closeConfirm();
          } finally {
            setDeletingPaymentId(null);
          }
        },
      });
    },
    [accountId, currencySymbol, loadAccountPayments, closeConfirm, toast]
  );

  // Cerrar cuenta directamente si ya está liquidada al 100%
  const handleCloseAccountDirectly = useCallback(async () => {
    setLoading(true);
    try {
      await api.closeAccount(accountId);
      setStep('success');
      toast.success('Cuenta liquidada y cerrada exitosamente');
      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Error al cerrar cuenta');
    } finally {
      setLoading(false);
    }
  }, [accountId, onSuccess, onClose, toast]);

  // Procesar cobro final y emisión de Factura FEL
  const handlePay = useCallback(async () => {
    if (!isExact) {
      if (isShort) {
        toast.error(`Faltan ${currencySymbol} ${remaining.toFixed(2)} para completar la cuenta`);
      } else {
        toast.error(`El monto asignado supera el total por ${currencySymbol} ${overage.toFixed(2)}`);
      }
      return;
    }

    if (cashLinesWithShortage.length > 0) {
      toast.error('El efectivo recibido es menor al monto a pagar');
      return;
    }

    // Validación previa para Crédito Folio (CXC)
    const cxcClientsMap = new Map(cxcClients.map((c) => [c.id, c]));
    for (const line of lines) {
      if (line.method === 'cxc') {
        if (!line.cxcClientId) {
          toast.error('Debes seleccionar un cliente para el Crédito Folio (CXC)');
          return;
        }
        const lineAmt = parseFloat(line.amount) || 0;
        const client = cxcClientsMap.get(line.cxcClientId) || {
          id: line.cxcClientId,
          full_name: line.cxcClientName,
          credit_limit: line.cxcCreditLimit,
          current_balance: line.cxcCurrentBalance,
        };
        const creditLimit = Number(client.credit_limit || 0);
        const currentBalance = Number(client.current_balance || 0);
        const availableCredit = Math.max(0, Math.round((creditLimit - currentBalance) * 100) / 100);

        if (creditLimit > 0 && lineAmt > availableCredit + 0.009) {
          const excess = Math.max(0, Math.round((lineAmt - availableCredit) * 100) / 100);
          setCreditLimitAlert({
            client,
            lineId: line.id,
            requestedAmount: lineAmt,
            availableCredit,
            excessAmount: excess,
          });
          return;
        } else if (creditLimit <= 0) {
          setCreditLimitAlert({
            client,
            lineId: line.id,
            requestedAmount: lineAmt,
            availableCredit: 0,
            excessAmount: lineAmt,
          });
          return;
        }
      }
    }

    const roomChargeLine = lines.find((l) => l.method === 'room_charge');
    if (roomChargeLine && !roomChargeLine.pmsRoomNumber) {
      toast.error('Debes seleccionar una habitación del hotel para el cargo');
      return;
    }

    setLoading(true);
    try {
      // 1. Si está activa la facturación electrónica, certificar primero el DTE
      let invoiceData = null;
      if (wantsInvoice && felConfig?.is_enabled) {
        try {
          const invRes = await api.fel.emitir({
            accountId,
            recipientNit: recipientNit || 'CF',
            recipientName: recipientName || 'CONSUMIDOR FINAL',
            recipientAddress: recipientAddress || 'CIUDAD',
            emitirFel: true,
          });
          if (invRes?.invoice) {
            invoiceData = invRes.invoice;
            setCertifiedInvoice(invoiceData);
          }
        } catch (felErr) {
          console.error('Error emitiendo FEL:', felErr);
          toast.warning(`Factura no certificada (${felErr.message}), procediendo con cobro de cuenta`);
        }
      }

      // 2. Registrar los pagos en la cuenta
      for (const line of lines) {
        const lineAmt = parseFloat(line.amount) || 0;
        if (lineAmt <= 0) continue;

        let refNo = line.reference || '';

        // Si es cargo a habitación, registrar transacción en Hotel PMS
        if (line.method === 'room_charge' && line.pmsRoomNumber) {
          const pmsRes = await api.pms.postCharge({
            room_number: line.pmsRoomNumber,
            account_id: accountId,
            check_number: currentTotals?.check_number || String(accountId),
            amount: Number(lineAmt.toFixed(2)),
            financials: {
              subtotal_food: Number(currentTotals?.subtotal || lineAmt),
              subtotal_beverage: 0,
              tip_amount: Number(currentTotals?.tip || 0),
              total_charged: Number(lineAmt.toFixed(2)),
            },
            notes: `Cargo comanda #${currentTotals?.check_number || accountId} autorizado por ${line.pmsGuestName || 'Huésped'}`,
          });
          refNo = `Hab. #${line.pmsRoomNumber} - ${line.pmsGuestName} (TRX: ${pmsRes.transaction_id})`;
        }

        // Si es crédito folio CXC, crear cuenta por cobrar en módulo CXC
        if (line.method === 'cxc' && line.cxcClientId) {
          await api.cxc.createAccount({
            client_id: line.cxcClientId,
            account_id: accountId,
            amount: Number(lineAmt.toFixed(2)),
            reference: line.reference || '',
            notes: `Crédito Folio comanda #${currentTotals?.check_number || accountId}`,
          });
        }

        await api.pay(accountId, {
          method: line.method,
          amount: Number(lineAmt.toFixed(2)),
          referenceNo: refNo,
        });
      }

      setStep('success');
      toast.success(invoiceData ? '¡Cobro y Factura SAT registrados!' : '¡Cobro registrado exitosamente!');
      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1600);
    } catch (error) {
      console.error('Error al registrar pago:', error);
      toast.error(error.message || 'Error al procesar el cobro');
    } finally {
      setLoading(false);
    }
  }, [
    isExact,
    isShort,
    currencySymbol,
    remaining,
    overage,
    cashLinesWithShortage.length,
    cxcClients,
    lines,
    wantsInvoice,
    felConfig?.is_enabled,
    toast,
    accountId,
    recipientNit,
    recipientName,
    recipientAddress,
    currentTotals?.check_number,
    currentTotals?.subtotal,
    currentTotals?.tip,
    onSuccess,
    onClose,
  ]);

  return {
    currencySymbol,
    currentTotals,
    existingPayments,
    deletingPaymentId,
    confirmDialog,
    closeConfirm,
    pending,
    paymentMethods,
    isSplitMode,
    setIsSplitMode,
    lines,
    setLines,
    loading,
    step,
    cxcClients,
    setCxcClients,
    cxcSearch,
    setCxcSearch,
    creditLimitAlert,
    setCreditLimitAlert,
    activeLineId,
    setActiveLineId,
    numpadField,
    setNumpadField,
    showFelPanel,
    setShowFelPanel,
    showExistingPayments,
    setShowExistingPayments,
    pmsRooms,
    pmsSearch,
    setPmsSearch,
    loadingPmsRooms,
    searchPmsRooms,
    activeLine,
    felConfig,
    wantsInvoice,
    setWantsInvoice,
    recipientNit,
    setRecipientNit,
    recipientName,
    setRecipientName,
    recipientAddress,
    setRecipientAddress,
    searchingNit,
    certifiedInvoice,
    totalAssigned,
    remaining,
    overage,
    isExact,
    isShort,
    isOver,
    cashLinesWithShortage,
    totalCashChange,
    updateLineField,
    handleNumpadPress,
    handleSearchNit,
    handleSetCF,
    handleSelectSimpleMethod,
    handleAddPaymentLine,
    handleChangeLineMethod,
    removeLine,
    handleExactCash,
    handleBillClick,
    handleCoinClick,
    handleSelectCxcClient,
    handleApplyCreditSplit,
    handleCancelCreditAlert,
    handleDeleteExistingPayment,
    handleCloseAccountDirectly,
    handlePay,
  };
}
