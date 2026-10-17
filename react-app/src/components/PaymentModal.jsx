import { useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Check,
  Banknote,
  CreditCard,
  Smartphone,
  Coins,
  AlertCircle,
  AlertTriangle,
  Split,
  ArrowRight,
  UserCheck,
  FileText,
  Search,
  CheckCircle2,
  QrCode,
  BedDouble,
  ChevronDown,
  ChevronUp,
  Delete,
  Zap
} from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { ConfirmDialog } from './ConfirmDialog';

const DEFAULT_METHODS = [
  { code: 'cash', label: 'Efectivo', icon: Banknote, color: 'bg-emerald-600', activeBorder: 'border-emerald-500', lightBg: 'bg-emerald-50 text-emerald-800' },
  { code: 'card', label: 'Tarjeta', icon: CreditCard, color: 'bg-blue-600', activeBorder: 'border-blue-500', lightBg: 'bg-blue-50 text-blue-800' },
  { code: 'transfer', label: 'Transferencia', icon: Smartphone, color: 'bg-violet-600', activeBorder: 'border-violet-500', lightBg: 'bg-violet-50 text-violet-800' },
  { code: 'cxc', label: 'Crédito Folio', icon: CreditCard, color: 'bg-amber-600', activeBorder: 'border-amber-500', lightBg: 'bg-amber-50 text-amber-800' },
  { code: 'room_charge', label: 'Cargo a Habitación', icon: BedDouble, color: 'bg-teal-600', activeBorder: 'border-teal-500', lightBg: 'bg-teal-50 text-teal-800' },
];

const BILLS = [5, 10, 20, 50, 100, 200];
const COINS = [0.25, 0.50, 1.00];

export function PaymentModal({ accountId, totals, onClose, onSuccess }) {
  const toast = useToast();
  const { currencySymbol = 'Q' } = useAuth() || {};

  const [currentTotals, setCurrentTotals] = useState(totals || {});
  const [existingPayments, setExistingPayments] = useState([]);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  // Diálogo de confirmación con diseño para eliminar pagos
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

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
  };

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
      pmsAvailableCredit: 0
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('select');
  const [cxcClients, setCxcClients] = useState([]);
  const [cxcSearch, setCxcSearch] = useState('');
  const [creditLimitAlert, setCreditLimitAlert] = useState(null);

  // Estados de control para la columna derecha y Numpad
  const [activeLineId, setActiveLineId] = useState(1);
  const [numpadField, setNumpadField] = useState('received'); // 'received' | 'amount'
  const [showFelPanel, setShowFelPanel] = useState(false);
  const [showExistingPayments, setShowExistingPayments] = useState(false);

  // Estados específicos para Hotel PMS
  const [pmsRooms, setPmsRooms] = useState([]);
  const [pmsSearch, setPmsSearch] = useState('');
  const [loadingPmsRooms, setLoadingPmsRooms] = useState(false);

  // Línea actualmente seleccionada para el panel derecho
  const activeLine = useMemo(() => {
    return lines.find(l => l.id === activeLineId) || lines[0] || null;
  }, [lines, activeLineId]);

  useEffect(() => {
    if (!activeLineId && lines.length > 0) {
      setActiveLineId(lines[0].id);
    }
  }, [lines, activeLineId]);

  const searchPmsRooms = async (searchQuery = '') => {
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
  };

  useEffect(() => {
    if (totals) setCurrentTotals(totals);
  }, [totals]);

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

  // ───────── Facturación Electrónica FEL ─────────
  const [felConfig, setFelConfig] = useState(null);
  const [felRules, setFelRules] = useState([]);
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [recipientNit, setRecipientNit] = useState('CF');
  const [recipientName, setRecipientName] = useState('CONSUMIDOR FINAL');
  const [recipientAddress, setRecipientAddress] = useState('CIUDAD DE GUATEMALA');
  const [searchingNit, setSearchingNit] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
    loadFelConfig();
  }, []);

  const loadFelConfig = async () => {
    try {
      const res = await api.fel.getConfig();
      if (res.config) {
        setFelConfig(res.config);
        setFelRules(res.paymentMethods || []);
      }
    } catch (err) {
      console.warn('FEL no configurado o inactivo:', err.message);
    }
  };

  // Evaluar si alguna forma de pago activa requiere factura automática obligatoria
  useEffect(() => {
    if (!felConfig?.is_enabled) return;
    const activeCodes = new Set(lines.map(l => l.method));
    const requiresAutoInvoice = felRules.some(r => activeCodes.has(r.code) && r.auto_invoice);
    if (requiresAutoInvoice) {
      setWantsInvoice(true);
    }
  }, [lines, felRules, felConfig]);

  // Si cambia el total pendiente y solo hay 1 línea en modo simple, sincronizar
  useEffect(() => {
    if (!isSplitMode) {
      setLines(prev => {
        if (prev.length === 1) {
          return [{
            ...prev[0],
            amount: pending.toFixed(2),
            received: prev[0].method === 'cash' ? pending.toFixed(2) : '0.00'
          }];
        }
        return prev;
      });
    }
  }, [pending, isSplitMode]);

  const loadPaymentMethods = async () => {
    try {
      const data = await api.bootstrap();
      if (data.paymentMethods?.length > 0) {
        const mapped = data.paymentMethods.map(pm => {
          const match = DEFAULT_METHODS.find(m => m.code === pm.code);
          return {
            code: pm.code,
            label: pm.label,
            icon: match ? match.icon : Banknote,
            color: match ? match.color : 'bg-slate-700',
            activeBorder: match ? match.activeBorder : 'border-slate-500',
            lightBg: match ? match.lightBg : 'bg-slate-50 text-slate-800'
          };
        });
        setPaymentMethods(mapped);
      }
    } catch (error) {
      console.error('Error cargando métodos de pago:', error);
    }
  };

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
    return lines.filter(l => {
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
      return sum + (rec > amt ? (rec - amt) : 0);
    }, 0);
  }, [lines]);

  // Manejo del teclado táctil POS (Numpad)
  const handleNumpadPress = (val) => {
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
  };

  // Consulta de NIT en línea ante la SAT
  const handleSearchNit = async (nitValue) => {
    const clean = String(nitValue || recipientNit || '').trim().toUpperCase().replace(/[-\s]/g, '');
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
  };

  const handleSetCF = () => {
    setRecipientNit('CF');
    setRecipientName('CONSUMIDOR FINAL');
    setRecipientAddress('CIUDAD DE GUATEMALA');
  };

  // Cambio de método en Modo Rápido (1 clic)
  const handleSelectSimpleMethod = async (method) => {
    const newId = Date.now();
    setActiveLineId(newId);
    setNumpadField('received');
    if (method.code === 'cxc') {
      try {
        const data = await api.cxc.getClients();
        setCxcClients(data.filter(c => c.cxc_enabled));
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
        pmsAvailableCredit: 0
      }
    ]);
  };

  // Agregar nueva forma de pago en Modo Mixto
  const handleAddPaymentLine = async (method) => {
    if (method.code === 'cxc') {
      try {
        const data = await api.cxc.getClients();
        setCxcClients(data.filter(c => c.cxc_enabled));
      } catch (err) {
        toast.error('Error al cargar clientes CXC');
      }
    }
    if (method.code === 'room_charge') {
      searchPmsRooms('');
    }

    const newId = Date.now();
    const defaultAmount = remaining > 0 ? remaining.toFixed(2) : '0.00';

    setLines(prev => [
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
        pmsAvailableCredit: 0
      }
    ]);

    setActiveLineId(newId);
    if (method.code === 'cash') {
      setNumpadField('received');
    } else {
      setNumpadField('amount');
    }
  };

  const updateLineField = (id, field, value) => {
    setLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      return { ...line, [field]: value };
    }));
  };

  const removeLine = (id) => {
    if (lines.length <= 1) return;
    const remainingLines = lines.filter(l => l.id !== id);
    setLines(remainingLines);
    if (activeLineId === id) {
      setActiveLineId(remainingLines[0].id);
    }
    if (remainingLines.length === 1) {
      setIsSplitMode(false);
    }
  };

  // Monto Exacto para efectivo
  const handleExactCash = (lineId) => {
    setLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      const amt = parseFloat(line.amount) || 0;
      return { ...line, received: amt.toFixed(2) };
    }));
  };

  // Pulsar Billete
  const handleBillClick = (lineId, billValue) => {
    setLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      return { ...line, received: billValue.toFixed(2) };
    }));
  };

  // Pulsar Moneda / Ficha
  const handleCoinClick = (lineId, coinValue) => {
    setLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      const current = parseFloat(line.received) || 0;
      const next = Math.round((current + coinValue) * 100) / 100;
      return { ...line, received: next.toFixed(2) };
    }));
  };

  // Selección de cliente CXC con validación de límite de crédito
  const handleSelectCxcClient = (lineId, client) => {
    const creditLimit = Number(client.credit_limit || 0);
    const currentBalance = Number(client.current_balance || 0);
    const availableCredit = Math.max(0, Math.round((creditLimit - currentBalance) * 100) / 100);
    const targetLine = lines.find(l => l.id === lineId) || lines[0];
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
    setActiveCxcLineId(null);
  };

  // Aplicar división automática cuando excede el límite de crédito
  const handleApplyCreditSplit = () => {
    if (!creditLimitAlert) return;
    const { client, lineId, availableCredit, excessAmount } = creditLimitAlert;

    setIsSplitMode(true);

    const targetId = lines.some(l => l.id === lineId) ? lineId : lines[0]?.id;
    const otherLines = lines.filter(l => l.id !== targetId);
    const secondLineId = otherLines.length > 0 ? otherLines[0].id : Date.now();

    setLines(prev => {
      let nextLines = prev.map(l => {
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
        nextLines = nextLines.map(l => {
          if (l.id === secondLineId) {
            return {
              ...l,
              amount: excessAmount.toFixed(2),
              received: l.method === 'cash' ? excessAmount.toFixed(2) : l.received || '0.00'
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
          pmsAvailableCredit: 0
        });
      }

      return nextLines;
    });

    setActiveLineId(secondLineId);
    setActiveCxcLineId(null);
    setCreditLimitAlert(null);
    toast.success(
      `Cuenta dividida: ${currencySymbol} ${availableCredit.toFixed(2)} a Crédito Folio y ${currencySymbol} ${excessAmount.toFixed(2)} restante.`
    );
  };

  const handleCancelCreditAlert = (changeToCash = false) => {
    if (changeToCash && creditLimitAlert) {
      updateLineField(creditLimitAlert.lineId, 'method', 'cash');
      updateLineField(creditLimitAlert.lineId, 'methodLabel', 'Efectivo');
      updateLineField(creditLimitAlert.lineId, 'cxcClientId', null);
      updateLineField(creditLimitAlert.lineId, 'cxcClientName', '');
      const amt = parseFloat(lines.find(l => l.id === creditLimitAlert.lineId)?.amount) || pending;
      updateLineField(creditLimitAlert.lineId, 'received', amt.toFixed(2));
      toast.info('Se cambió la forma de pago a Efectivo');
    }
    setCreditLimitAlert(null);
  };

  // Eliminar un pago individual ya registrado
  const handleDeleteExistingPayment = (payment) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar este pago?',
      message: 'El saldo pendiente aumentará inmediatamente para que puedas registrar la forma de pago correcta.',
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
  };

  // Cerrar cuenta directamente si ya está liquidada al 100%
  const handleCloseAccountDirectly = async () => {
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
  };

  // Procesar cobro final y emisión de Factura FEL
  const handlePay = async () => {
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
    const cxcClientsMap = new Map(cxcClients.map(c => [c.id, c]));
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
          current_balance: line.cxcCurrentBalance
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

    const roomChargeLine = lines.find(l => l.method === 'room_charge');
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

        // Si es cargo a habitación, registrar primero la transacción en el Hotel PMS
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

        // Si es crédito folio CXC, crear primero la cuenta por cobrar en el módulo CXC
        if (line.method === 'cxc' && line.cxcClientId) {
          await api.cxc.createAccount({
            client_id: line.cxcClientId,
            account_id: accountId,
            amount: Number(lineAmt.toFixed(2)),
            reference: line.reference || '',
            notes: `Crédito Folio comanda #${currentTotals?.check_number || accountId}`
          });
        }

        await api.pay(accountId, {
          method: line.method,
          amount: Number(lineAmt.toFixed(2)),
          referenceNo: refNo
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
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4">
      <m.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full max-w-5xl rounded-3xl h-[92vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* HEADER PRINCIPAL */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-black text-xl text-emerald-400">
              {currencySymbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base tracking-tight text-white">Cobrar Cuenta</h2>
                {currentTotals?.check_number && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    Comanda #{currentTotals.check_number}
                  </span>
                )}
                {isSplitMode && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                    <Split className="w-3 h-3" /> Pago Mixto
                  </span>
                )}
                {wantsInvoice && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Factura SAT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <span>Total a liquidar:</span>
                <strong className="text-white font-mono text-base font-black tracking-wide">
                  {currencySymbol} {pending.toFixed(2)}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón Facturación SAT / FEL */}
            {felConfig?.is_enabled && (
              <button
                type="button"
                onClick={() => setShowFelPanel(!showFelPanel)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  wantsInvoice
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{wantsInvoice ? `Factura (${recipientNit})` : 'Facturar SAT'}</span>
                {showFelPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal de cobro"
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PANEL DESPLEGABLE FACTURA SAT (FEL) */}
        <AnimatePresence>
          {showFelPanel && felConfig?.is_enabled && (
            <m.div
              layout
              initial={{ opacity: 0, scaleY: 0.95 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-slate-800 border-b border-slate-700 text-white px-5 py-3 overflow-hidden shrink-0 origin-top"
            >
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantsInvoice}
                      onChange={(e) => setWantsInvoice(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                    <span>Emitir Factura SAT</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSetCF}
                    className="text-[11px] font-bold px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 cursor-pointer"
                  >
                    CF
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                  <div className="relative">
                    <label htmlFor="fel-nit-input" className="sr-only">NIT o CF</label>
                    <input
                      id="fel-nit-input"
                      type="text"
                      value={recipientNit}
                      onChange={(e) => setRecipientNit(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchNit(recipientNit)}
                      placeholder="NIT o CF..."
                      aria-label="NIT o CF para factura SAT"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs font-mono text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchNit(recipientNit)}
                      disabled={searchingNit}
                      aria-label="Buscar NIT en SAT"
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                    >
                      {searchingNit ? <Loader2 className="w-3 h-3 animate-spin" /> : 'SAT'}
                    </button>
                  </div>

                  <div>
                    <label htmlFor="fel-name-input" className="sr-only">Nombre de Factura</label>
                    <input
                      id="fel-name-input"
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Nombre Factura..."
                      aria-label="Nombre del receptor de factura SAT"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label htmlFor="fel-addr-input" className="sr-only">Dirección de Factura</label>
                    <input
                      id="fel-addr-input"
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="Dirección..."
                      aria-label="Dirección para factura SAT"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* CONTENEDOR PRINCIPAL */}
        {step === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">¡Cobro Registrado Exitosamente!</h3>
              <p className="text-sm text-slate-500 mt-1">La comanda ha sido liquidada en el sistema.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* COLUMNA IZQUIERDA: MÉTODOS Y RESUMEN DE COBRO */}
            <div className="w-full md:w-5/12 lg:w-4/12 flex flex-col bg-white border-r border-slate-200 h-full overflow-hidden">
              {/* Selector de Modo: Pago Rápido vs Dividir Cuenta */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isSplitMode) {
                      setIsSplitMode(false);
                      const newId = Date.now();
                      setActiveLineId(newId);
                      setLines([{
                        id: newId,
                        method: 'cash',
                        methodLabel: 'Efectivo',
                        amount: pending.toFixed(2),
                        received: pending.toFixed(2),
                        reference: '',
                        cxcClientId: null,
                        cxcClientName: ''
                      }]);
                    }
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isSplitMode
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200 ring-1 ring-slate-300/40'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pago Rápido</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSplitMode(true)}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSplitMode
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>Dividir Cuenta</span>
                </button>
              </div>

              {/* Pagos Previos Registrados (si existen) */}
              {existingPayments.length > 0 && (
                <div className="px-3 py-2 bg-amber-50/80 border-b border-amber-200 text-xs shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Pagado: {currencySymbol}{Number(currentTotals.paid || 0).toFixed(2)} ({existingPayments.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowExistingPayments(!showExistingPayments)}
                      className="text-amber-800 hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      {showExistingPayments ? 'Ocultar' : 'Ver detalle'}
                    </button>
                  </div>
                  {showExistingPayments && (
                    <div className="mt-2 space-y-1 max-h-24 overflow-y-auto pr-1">
                      {existingPayments.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white p-1.5 rounded-lg border border-amber-200 text-[11px]">
                          <span>{p.method_label || p.method}: {currencySymbol}{Number(p.amount).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingPayment(p)}
                            disabled={deletingPaymentId === p.id}
                            aria-label={`Eliminar pago registrado de ${p.method_label || p.method}`}
                            className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LISTA DE FORMAS DE PAGO / LÍNEAS */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {!isSplitMode ? (
                  /* MODO RÁPIDO (1 MÉTODO) */
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                      Selecciona la Forma de Pago:
                    </p>
                    {paymentMethods.map(method => {
                      const Icon = method.icon;
                      const isSelected = lines[0]?.method === method.code;
                      return (
                        <button
                          key={method.code}
                          type="button"
                          onClick={() => handleSelectSimpleMethod(method)}
                          className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-colors duration-150 cursor-pointer border-2 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                              isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className={`text-xs font-black ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                                {method.label}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {method.code === 'cash' ? 'Efectivo, billetes y cambio'
                                  : method.code === 'card' ? 'Tarjeta crédito / débito'
                                  : method.code === 'transfer' ? 'Transferencia electrónica'
                                  : method.code === 'cxc' ? 'Crédito Folio a cliente'
                                  : 'Cargo a huésped de hotel'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {isSelected && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black font-mono text-emerald-700">
                                  {currencySymbol}{pending.toFixed(2)}
                                </span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* MODO DIVIDIDO / MIXTO */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Líneas Divididas ({lines.length}):
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isExact ? 'bg-emerald-100 text-emerald-800' : isShort ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isExact ? '✓ 100% Cubierto' : isShort ? `Faltan ${currencySymbol}${remaining.toFixed(2)}` : `Excede ${currencySymbol}${overage.toFixed(2)}`}
                      </span>
                    </div>

                    {lines.map((line, idx) => {
                      const methodConfig = paymentMethods.find(m => m.code === line.method) || DEFAULT_METHODS[0];
                      const Icon = methodConfig.icon;
                      const isLineActive = (activeLine?.id === line.id);
                      const lineAmt = parseFloat(line.amount) || 0;

                      return (
                        <div
                          key={line.id}
                          role="group"
                          aria-label={`Línea de pago ${idx + 1}`}
                          onClick={() => setActiveLineId(line.id)}
                          className={`p-3 rounded-2xl border-2 transition-colors duration-150 cursor-pointer ${
                            isLineActive
                              ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center ${
                                isLineActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <Icon className="w-4 h-4 text-slate-600" />
                                <select
                                  value={line.method}
                                  aria-label={`Método de pago para línea ${idx + 1}`}
                                  onChange={async (e) => {
                                    const newMethod = paymentMethods.find(m => m.code === e.target.value);
                                    if (!newMethod) return;
                                    updateLineField(line.id, 'method', newMethod.code);
                                    updateLineField(line.id, 'methodLabel', newMethod.label);
                                    if (newMethod.code === 'cash') {
                                      updateLineField(line.id, 'received', line.amount);
                                    }
                                    if (newMethod.code === 'cxc') {
                                      try {
                                        const data = await api.cxc.getClients();
                                        setCxcClients(data.filter(c => c.cxc_enabled));
                                      } catch (err) {}
                                    }
                                    if (newMethod.code === 'room_charge') {
                                      searchPmsRooms('');
                                    }
                                  }}
                                  className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-slate-800 focus:outline-hidden cursor-pointer"
                                >
                                  {paymentMethods.map(m => (
                                    <option key={m.code} value={m.code}>{m.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {lines.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeLine(line.id);
                                }}
                                aria-label="Eliminar línea de pago"
                                className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Eliminar línea"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-600">
                              {line.method === 'cxc' && line.cxcClientName ? `Cliente: ${line.cxcClientName}`
                                : line.method === 'room_charge' && line.pmsRoomNumber ? `Hab. #${line.pmsRoomNumber}`
                                : line.method === 'cash' ? `Recibido: ${currencySymbol}${Number(line.received || 0).toFixed(2)}`
                                : 'Monto asignado'}
                            </span>
                            <span className="font-mono font-black text-sm text-slate-900">
                              {currencySymbol} {lineAmt.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Botones rápidos para agregar más formas de pago */}
                    {remaining > 0 && (
                      <div className="pt-1.5 space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                          Cubrir restante ({currencySymbol}{remaining.toFixed(2)}) con:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {paymentMethods.map(method => {
                            const Icon = method.icon;
                            return (
                              <button
                                key={method.code}
                                type="button"
                                onClick={() => handleAddPaymentLine(method)}
                                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition-colors duration-150 flex items-center gap-1 border border-slate-200 cursor-pointer shadow-2xs"
                              >
                                <Plus className="w-3 h-3 text-slate-500" />
                                <Icon className="w-3 h-3 text-slate-600" />
                                <span>{method.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* FOOTER DE COLUMNA IZQUIERDA (FIJO ABAJO) */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Total de la Cuenta:</span>
                    <span className="font-mono font-bold text-slate-800">{currencySymbol} {pending.toFixed(2)}</span>
                  </div>
                  {isSplitMode && (
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Total Asignado:</span>
                      <span className={`font-mono font-bold ${isExact ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {currencySymbol} {totalAssigned.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {totalCashChange > 0 && (
                    <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-100/70 px-2 py-1 rounded-lg">
                      <span>Cambio Total a Entregar:</span>
                      <span className="font-mono font-black text-sm">{currencySymbol} {totalCashChange.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* BOTÓN DE COBRO FINAL */}
                {pending <= 0 && existingPayments.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleCloseAccountDirectly}
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors duration-150"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Cuenta Liquidada · Cerrar Cuenta</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={!isExact || loading || cashLinesWithShortage.length > 0}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-colors duration-150 cursor-pointer ${
                      isExact && cashLinesWithShortage.length === 0
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white ring-2 ring-emerald-500/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando cobro...</span>
                      </>
                    ) : isShort ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                        <span>Faltan {currencySymbol} {remaining.toFixed(2)}</span>
                      </>
                    ) : isOver ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                        <span>Excede por {currencySymbol} {overage.toFixed(2)}</span>
                      </>
                    ) : cashLinesWithShortage.length > 0 ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                        <span>Efectivo recibido insuficiente</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{wantsInvoice ? `Cobrar y Facturar ${currencySymbol} ${pending.toFixed(2)}` : `Cobrar ${currencySymbol} ${pending.toFixed(2)}`}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA: HERRAMIENTAS TÁCTILES Y NUMPAD */}
            <div className="w-full md:w-7/12 lg:w-8/12 flex flex-col bg-slate-50/80 overflow-y-auto p-4 sm:p-5 h-full">
              {activeLine && (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  {/* CABECERA DE LA COLUMNA DERECHA */}
                  <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                        activeLine.method === 'cash' ? 'bg-emerald-600'
                          : activeLine.method === 'card' ? 'bg-blue-600'
                          : activeLine.method === 'transfer' ? 'bg-violet-600'
                          : activeLine.method === 'cxc' ? 'bg-amber-600'
                          : 'bg-teal-600'
                      }`}>
                        {activeLine.method === 'cash' ? <Banknote className="w-4 h-4" />
                          : activeLine.method === 'card' ? <CreditCard className="w-4 h-4" />
                          : activeLine.method === 'transfer' ? <Smartphone className="w-4 h-4" />
                          : activeLine.method === 'cxc' ? <UserCheck className="w-4 h-4" />
                          : <BedDouble className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{activeLine.methodLabel}</h4>
                        <p className="text-[10px] text-slate-500">
                          {isSplitMode ? `Configurando Línea #${lines.findIndex(l => l.id === activeLine.id) + 1}` : 'Configuración de cobro'}
                        </p>
                      </div>
                    </div>

                    {/* Si es efectivo y está en modo split, permitir alternar entre editar monto a cobrar o efectivo recibido */}
                    {activeLine.method === 'cash' && isSplitMode && (
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setNumpadField('amount')}
                          className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                            numpadField === 'amount' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                          }`}
                        >
                          Monto Línea
                        </button>
                        <button
                          type="button"
                          onClick={() => setNumpadField('received')}
                          className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                            numpadField === 'received' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500'
                          }`}
                        >
                          Efectivo Cliente
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CONTENIDO SEGÚN EL MÉTODO ACTIVO */}
                  {/* CASO 1: EFECTIVO */}
                  {activeLine.method === 'cash' && (() => {
                    const lineAmt = parseFloat(activeLine.amount) || 0;
                    const lineRec = parseFloat(activeLine.received) || 0;
                    const lineChange = Math.max(0, lineRec - lineAmt);
                    const lineShortage = Math.max(0, lineAmt - lineRec);

                    return (
                      <div className="space-y-4">
                        {/* Métricas: Monto a Cobrar, Recibido y Cambio */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Tarjeta Efectivo Recibido */}
                          <div className={`p-3.5 rounded-2xl border-2 transition-colors duration-150 ${
                            numpadField === 'received'
                              ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/20 shadow-xs'
                              : 'border-slate-200 bg-white'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                Efectivo Recibido
                              </span>
                              <button
                                type="button"
                                onClick={() => handleExactCash(activeLine.id)}
                                className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 cursor-pointer"
                              >
                                Monto Exacto
                              </button>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-slate-400 font-bold text-sm">{currencySymbol}</span>
                              <input
                                type="number"
                                step="0.01"
                                value={activeLine.received}
                                aria-label="Efectivo recibido"
                                onChange={(e) => updateLineField(activeLine.id, 'received', e.target.value)}
                                onFocus={() => setNumpadField('received')}
                                className="w-full bg-transparent font-mono text-xl sm:text-2xl font-black text-slate-900 outline-hidden"
                              />
                            </div>
                          </div>

                          {/* Tarjeta Cambio / Vuelto a entregar */}
                          <div className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between ${
                            lineRec >= lineAmt && lineAmt > 0
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                              : lineShortage > 0
                              ? 'bg-amber-50 border-amber-300 text-amber-950'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                                {lineRec >= lineAmt ? 'Cambio a Devolver' : 'Falta Efectivo'}
                              </span>
                              <Coins className="w-3.5 h-3.5 opacity-70" />
                            </div>
                            <p className="font-mono text-xl sm:text-2xl font-black mt-1">
                              {currencySymbol} {lineRec >= lineAmt ? lineChange.toFixed(2) : lineShortage.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Billetes Rápidos */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Billetes Rápidos (Toca para asignar):
                          </p>
                          <div className="grid grid-cols-6 gap-1.5">
                            {BILLS.map(bill => (
                              <button
                                key={bill}
                                type="button"
                                onClick={() => handleBillClick(activeLine.id, bill)}
                                className="py-2 bg-white hover:bg-slate-100 active:bg-emerald-600 active:text-white rounded-xl text-xs font-black text-slate-800 border border-slate-300 shadow-2xs font-mono transition-colors cursor-pointer"
                              >
                                {currencySymbol}{bill}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Monedas y Fichas */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Monedas / Sumar:
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {COINS.map(coin => (
                              <button
                                key={coin}
                                type="button"
                                onClick={() => handleCoinClick(activeLine.id, coin)}
                                className="py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl text-xs font-black text-amber-900 font-mono transition-colors cursor-pointer"
                              >
                                +{currencySymbol}{coin.toFixed(2)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Teclado Numérico Táctil (Numpad) */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Teclado Táctil POS:
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {['7', '8', '9', 'C'].map(k => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => handleNumpadPress(k === 'C' ? 'C' : k)}
                                className={`py-3 rounded-xl font-mono text-base font-black border transition-all active:scale-95 cursor-pointer ${
                                  k === 'C'
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
                                }`}
                              >
                                {k === 'C' ? 'Limpiar C' : k}
                              </button>
                            ))}
                            {['4', '5', '6', 'BACK'].map(k => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => handleNumpadPress(k)}
                                className={`py-3 rounded-xl font-mono text-base font-black border transition-all active:scale-95 cursor-pointer ${
                                  k === 'BACK'
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 flex items-center justify-center'
                                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
                                }`}
                              >
                                {k === 'BACK' ? <Delete className="w-5 h-5" /> : k}
                              </button>
                            ))}
                            {['1', '2', '3', 'EXACT'].map(k => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => handleNumpadPress(k)}
                                className={`py-3 rounded-xl font-mono text-base font-black border transition-all active:scale-95 cursor-pointer ${
                                  k === 'EXACT'
                                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs font-sans font-bold'
                                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
                                }`}
                              >
                                {k === 'EXACT' ? 'Exacto' : k}
                              </button>
                            ))}
                            {['0', '00', '.', 'REMAINING'].map(k => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => handleNumpadPress(k)}
                                className={`py-3 rounded-xl font-mono text-base font-black border transition-all active:scale-95 cursor-pointer ${
                                  k === 'REMAINING'
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-sans font-bold'
                                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
                                }`}
                              >
                                {k === 'REMAINING' ? '+ Restante' : k}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* CASO 2: CRÉDITO FOLIO (CXC) */}
                  {activeLine.method === 'cxc' && (
                    <div className="space-y-4">
                      {activeLine.cxcClientId ? (
                        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                                <UserCheck className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">{activeLine.cxcClientName}</p>
                                <p className="text-[11px] text-amber-800">Cliente Crédito Folio (CXC)</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                updateLineField(activeLine.id, 'cxcClientId', null);
                                updateLineField(activeLine.id, 'cxcClientName', '');
                                setActiveCxcLineId(activeLine.id);
                              }}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold text-xs border border-amber-200 cursor-pointer"
                            >
                              Cambiar Cliente
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100">
                            <div className="bg-slate-50 p-2 rounded-xl">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Límite</p>
                              <p className="font-mono font-bold text-xs text-slate-800">
                                {currencySymbol}{Number(activeLine.cxcCreditLimit || 0).toFixed(2)}
                              </p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Deuda</p>
                              <p className="font-mono font-bold text-xs text-rose-700">
                                {currencySymbol}{Number(activeLine.cxcCurrentBalance || 0).toFixed(2)}
                              </p>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                              <p className="text-[10px] text-emerald-800 font-bold uppercase">Cupo Disp.</p>
                              <p className="font-mono font-black text-xs text-emerald-800">
                                {currencySymbol}{Number(activeLine.cxcAvailableCredit || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Advertencia si excede cupo */}
                          {parseFloat(activeLine.amount || 0) > Number(activeLine.cxcAvailableCredit || 0) + 0.009 && (
                            <div className="p-3 bg-amber-100/90 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2">
                              <div className="flex items-center gap-1.5 font-bold">
                                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                                <span>Monto excede el cupo disponible del cliente</span>
                              </div>
                              <p className="text-[11px] text-amber-850 leading-relaxed">
                                El cliente solo puede cubrir {currencySymbol}{Number(activeLine.cxcAvailableCredit || 0).toFixed(2)}. Puedes ajustar y dividir el restante.
                              </p>
                              {Number(activeLine.cxcAvailableCredit || 0) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const avail = Number(activeLine.cxcAvailableCredit || 0);
                                    const excess = Math.max(0, Math.round((parseFloat(activeLine.amount || 0) - avail) * 100) / 100);
                                    setCreditLimitAlert({
                                      client: {
                                        id: activeLine.cxcClientId,
                                        full_name: activeLine.cxcClientName,
                                        credit_limit: activeLine.cxcCreditLimit,
                                        current_balance: activeLine.cxcCurrentBalance
                                      },
                                      lineId: activeLine.id,
                                      requestedAmount: parseFloat(activeLine.amount || 0),
                                      availableCredit: avail,
                                      excessAmount: excess,
                                    });
                                  }}
                                  className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <Split className="w-3.5 h-3.5" />
                                  <span>Dividir y cargar cupo disponible ({currencySymbol}{Number(activeLine.cxcAvailableCredit || 0).toFixed(2)})</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs space-y-3">
                          <label htmlFor="cxc-client-search" className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                            Seleccionar Cliente con Crédito Folio
                          </label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              id="cxc-client-search"
                              type="text"
                              value={cxcSearch}
                              onChange={(e) => setCxcSearch(e.target.value)}
                              placeholder="Buscar cliente por nombre..."
                              aria-label="Buscar cliente con crédito folio por nombre"
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                              autoFocus
                            />
                          </div>

                          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                            {cxcClients
                              .filter(c => c.full_name?.toLowerCase().includes(cxcSearch.toLowerCase()))
                              .map(client => {
                                const available = Math.max(0, Number(client.credit_limit || 0) - Number(client.current_balance || 0));
                                return (
                                  <button
                                    key={client.id}
                                    type="button"
                                    onClick={() => handleSelectCxcClient(activeLine.id, client)}
                                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/60 transition-colors duration-150 flex items-center justify-between text-left cursor-pointer"
                                  >
                                    <div>
                                      <p className="text-xs font-black text-slate-900">{client.full_name}</p>
                                      <p className="text-[10px] text-slate-500">Deuda actual: {currencySymbol}{Number(client.current_balance || 0).toFixed(2)}</p>
                                    </div>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                      available > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                                    }`}>
                                      Cupo: {currencySymbol}{available.toFixed(2)}
                                    </span>
                                  </button>
                                );
                              })}
                            {cxcClients.length === 0 && (
                              <p className="text-xs text-slate-400 py-6 text-center">No hay clientes con crédito habilitado</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASO 3: TARJETA / TRANSFERENCIA */}
                  {['card', 'transfer'].includes(activeLine.method) && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      <div>
                        <label htmlFor="card-transfer-amount" className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          Monto a Cobrar con {activeLine.methodLabel}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-bold text-lg">{currencySymbol}</span>
                          <input
                            id="card-transfer-amount"
                            type="number"
                            step="0.01"
                            value={activeLine.amount}
                            aria-label={`Monto a cobrar con ${activeLine.methodLabel}`}
                            onChange={(e) => updateLineField(activeLine.id, 'amount', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="card-transfer-ref" className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          No. Autorización / Voucher / Referencia Bancaria
                        </label>
                        <input
                          id="card-transfer-ref"
                          type="text"
                          value={activeLine.reference}
                          onChange={(e) => updateLineField(activeLine.id, 'reference', e.target.value)}
                          aria-label="Número de autorización, voucher o referencia bancaria"
                          placeholder={activeLine.method === 'card' ? 'Ej. Auth 4920 o últimos 4 dígitos' : 'Ej. No. Transacción bancaria'}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                        />
                      </div>
                    </div>
                  )}

                  {/* CASO 4: CARGO A HABITACIÓN (PMS) */}
                  {activeLine.method === 'room_charge' && (
                    <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-xs space-y-3">
                      {activeLine.pmsRoomNumber ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                                <BedDouble className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-900">Habitación #{activeLine.pmsRoomNumber}</p>
                                <p className="text-[11px] text-teal-800 font-semibold">{activeLine.pmsGuestName}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                updateLineField(activeLine.id, 'pmsRoomNumber', null);
                                updateLineField(activeLine.id, 'pmsGuestName', '');
                                searchPmsRooms('');
                              }}
                              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded-xl font-bold text-xs border border-teal-200 cursor-pointer"
                            >
                              Cambiar
                            </button>
                          </div>
                          <div className="p-2.5 bg-teal-50/80 rounded-xl border border-teal-200 flex justify-between items-center text-xs">
                            <span className="font-bold text-teal-900">Cupo Disponible Huésped:</span>
                            <span className="font-mono font-black text-teal-800">{currencySymbol}{Number(activeLine.pmsAvailableCredit || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label htmlFor="pms-search-input" className="text-xs font-bold text-teal-900 uppercase tracking-wider block">
                            Buscar Habitación o Huésped (Hotel PMS)
                          </label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              id="pms-search-input"
                              type="text"
                              value={pmsSearch}
                              onChange={(e) => {
                                setPmsSearch(e.target.value);
                                searchPmsRooms(e.target.value);
                              }}
                              aria-label="Buscar habitación o huésped de hotel"
                              placeholder="No. Habitación o Apellido del Huésped..."
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-teal-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                              autoFocus
                            />
                          </div>

                          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                            {loadingPmsRooms ? (
                              <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                                <span>Consultando Hotel PMS...</span>
                              </div>
                            ) : pmsRooms.length > 0 ? (
                              pmsRooms.map(room => {
                                const isAllowed = room.credit?.post_allowed;
                                const avail = Number(room.credit?.available_credit || 0);
                                return (
                                  <button
                                    key={room.room_number}
                                    type="button"
                                    disabled={!isAllowed}
                                    onClick={() => {
                                      updateLineField(activeLine.id, 'pmsRoomNumber', room.room_number);
                                      updateLineField(activeLine.id, 'pmsGuestName', room.guest?.full_name || 'Huésped');
                                      updateLineField(activeLine.id, 'pmsAvailableCredit', avail);
                                    }}
                                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                                      isAllowed
                                        ? 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/60 cursor-pointer'
                                        : 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200'
                                    }`}
                                  >
                                    <div>
                                      <p className="text-xs font-black text-slate-900">Hab. #{room.room_number} · {room.guest?.full_name}</p>
                                      <p className="text-[10px] text-slate-500">{room.room_type}</p>
                                    </div>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                      isAllowed ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                                    }`}>
                                      {isAllowed ? `Cupo: ${currencySymbol}${avail.toFixed(2)}` : 'Sin Crédito'}
                                    </span>
                                  </button>
                                );
                              })
                            ) : (
                              <p className="text-xs text-slate-400 py-6 text-center">No se encontraron habitaciones</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL DE ALERTA DE LÍMITE DE CRÉDITO CXC */}
        <AnimatePresence>
          {creditLimitAlert && (
            <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <m.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-300 relative"
              >
                {/* Encabezado con gradiente y advertencia */}
                <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-6 py-5 text-white relative">
                  <button
                    type="button"
                    onClick={() => setCreditLimitAlert(null)}
                    aria-label="Cerrar alerta de límite de crédito"
                    className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                      <AlertTriangle className="w-6 h-6 text-white stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight leading-tight">Límite de Crédito Insuficiente</h3>
                      <p className="text-xs text-amber-100 font-medium">Crédito Folio (CXC) · Cupo Excedido</p>
                    </div>
                  </div>
                </div>

                {/* Contenido con desglose del cliente y saldo */}
                <div className="p-6 space-y-4">
                  {/* Tarjeta del cliente */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs">
                          <UserCheck className="w-4 h-4 text-amber-800" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cliente Folio</p>
                          <p className="text-sm font-black text-slate-900 leading-none">{creditLimitAlert.client?.full_name}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        ID #{creditLimitAlert.client?.id}
                      </span>
                    </div>

                    {/* Grid de 3 métricas de crédito */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Límite</p>
                        <p className="text-xs font-black text-slate-800 font-mono mt-0.5">
                          {currencySymbol}{Number(creditLimitAlert.client?.credit_limit || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Deuda Actual</p>
                        <p className="text-xs font-black text-rose-700 font-mono mt-0.5">
                          {currencySymbol}{Number(creditLimitAlert.client?.current_balance || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className={`p-2.5 rounded-xl border shadow-2xs ${
                        creditLimitAlert.availableCredit > 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-rose-50 border-rose-300 text-rose-900'
                      }`}>
                        <p className="text-[10px] font-extrabold uppercase tracking-tight">Disponible</p>
                        <p className="text-xs font-black font-mono mt-0.5">
                          {currencySymbol}{creditLimitAlert.availableCredit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resumen del cobro intentado y excedente */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Monto que se intentó cargar a crédito:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {currencySymbol}{creditLimitAlert.requestedAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Cupo máximo que se puede otorgar:</span>
                      <span className="font-bold font-mono text-emerald-700">
                        {currencySymbol}{creditLimitAlert.availableCredit.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-bold text-rose-600 text-sm">
                      <span>Excedente sin límite de crédito:</span>
                      <span className="font-mono font-black">
                        +{currencySymbol}{creditLimitAlert.excessAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Explicación y botones de decisión */}
                  {creditLimitAlert.availableCredit > 0 ? (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs text-slate-600 leading-relaxed text-center">
                        ¿Deseas cargar únicamente el cupo disponible de <strong className="text-emerald-700 font-bold">{currencySymbol}{creditLimitAlert.availableCredit.toFixed(2)}</strong> a crédito y dividir los <strong className="text-rose-700 font-bold">{currencySymbol}{creditLimitAlert.excessAmount.toFixed(2)}</strong> restantes con otra forma de pago?
                      </p>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleApplyCreditSplit}
                          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-colors duration-150 cursor-pointer ring-2 ring-emerald-500/20"
                        >
                          <Split className="w-4 h-4" />
                          <span>Cargar {currencySymbol}{creditLimitAlert.availableCredit.toFixed(2)} a CXC y Dividir Restante</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCreditLimitAlert(null)}
                          className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-colors cursor-pointer"
                        >
                          Cancelar y elegir otro cliente o método
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs leading-relaxed text-center">
                        El cliente no cuenta con cupo disponible (límite alcanzado o en cero). No es posible otorgarle más crédito en este momento.
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleCancelCreditAlert(true)}
                          className="w-full py-3 px-4 bg-slate-900 hover:bg-black active:scale-98 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors duration-150 cursor-pointer"
                        >
                          <Banknote className="w-4 h-4" />
                          <span>Cambiar a Cobro en Efectivo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCreditLimitAlert(null)}
                          className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-colors cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </m.div>
            </div>
          )}
        </AnimatePresence>
      </m.div>

      {/* Modal de confirmación estilizado para eliminación de pagos */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        itemDetail={confirmDialog.itemDetail}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        loading={confirmDialog.loading}
      />
    </div>
  );
}
