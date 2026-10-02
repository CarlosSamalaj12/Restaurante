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
  Split,
  ArrowRight,
  UserCheck,
  FileText,
  Search,
  CheckCircle2,
  QrCode
} from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

const DEFAULT_METHODS = [
  { code: 'cash', label: 'Efectivo', icon: Banknote, color: 'bg-emerald-600', activeBorder: 'border-emerald-500', lightBg: 'bg-emerald-50 text-emerald-800' },
  { code: 'card', label: 'Tarjeta', icon: CreditCard, color: 'bg-blue-600', activeBorder: 'border-blue-500', lightBg: 'bg-blue-50 text-blue-800' },
  { code: 'transfer', label: 'Transferencia', icon: Smartphone, color: 'bg-violet-600', activeBorder: 'border-violet-500', lightBg: 'bg-violet-50 text-violet-800' },
  { code: 'cxc', label: 'Crédito Folio', icon: CreditCard, color: 'bg-amber-600', activeBorder: 'border-amber-500', lightBg: 'bg-amber-50 text-amber-800' },
];

const BILLS = [5, 10, 20, 50, 100, 200];
const COINS = [0.25, 0.50, 1.00];

export function PaymentModal({ accountId, totals, onClose, onSuccess }) {
  const toast = useToast();
  const { currencySymbol = 'Q' } = useAuth() || {};

  const [currentTotals, setCurrentTotals] = useState(totals || {});
  const [existingPayments, setExistingPayments] = useState([]);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

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
      cxcClientName: ''
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('select');
  const [cxcClients, setCxcClients] = useState([]);
  const [cxcSearch, setCxcSearch] = useState('');
  const [activeCxcLineId, setActiveCxcLineId] = useState(null);

  const loadAccountPayments = async () => {
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
  };

  useEffect(() => {
    if (totals) setCurrentTotals(totals);
  }, [totals]);

  useEffect(() => {
    loadAccountPayments();
  }, [accountId]);

  // ───────── Facturación Electrónica FEL ─────────
  const [felConfig, setFelConfig] = useState(null);
  const [felRules, setFelRules] = useState([]);
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [recipientNit, setRecipientNit] = useState('CF');
  const [recipientName, setRecipientName] = useState('CONSUMIDOR FINAL');
  const [recipientAddress, setRecipientAddress] = useState('CIUDAD DE GUATEMALA');
  const [searchingNit, setSearchingNit] = useState(false);
  const [certifiedInvoice, setCertifiedInvoice] = useState(null);

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
    const activeCodes = lines.map(l => l.method);
    const requiresAutoInvoice = felRules.some(r => activeCodes.includes(r.code) && r.auto_invoice);
    if (requiresAutoInvoice) {
      setWantsInvoice(true);
    }
  }, [lines, felRules, felConfig]);

  // Si cambia el total pendiente y solo hay 1 línea en modo simple, sincronizar
  useEffect(() => {
    if (!isSplitMode && lines.length === 1) {
      setLines(prev => [{
        ...prev[0],
        amount: pending.toFixed(2),
        received: prev[0].method === 'cash' ? pending.toFixed(2) : '0.00'
      }]);
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

  // Cálculos precisos en centavos para evitar errores de redondeo flotante
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

  // Validación de efectivo: si en alguna línea de efectivo se recibió menos del monto
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

  // Cambio de método en Modo Simple (1 clic)
  const handleSelectSimpleMethod = async (method) => {
    if (method.code === 'cxc') {
      try {
        const data = await api.cxc.getClients();
        setCxcClients(data.filter(c => c.cxc_enabled));
        setActiveCxcLineId(lines[0]?.id || 1);
      } catch (err) {
        toast.error('Error al cargar clientes CXC');
        return;
      }
    }
    setLines([
      {
        id: Date.now(),
        method: method.code,
        methodLabel: method.label,
        amount: pending.toFixed(2),
        received: method.code === 'cash' ? pending.toFixed(2) : '0.00',
        reference: '',
        cxcClientId: null,
        cxcClientName: ''
      }
    ]);
  };

  // Agregar nueva forma de pago en Modo Mixto (auto-asigna el saldo restante)
  const handleAddPaymentLine = async (method) => {
    if (method.code === 'cxc') {
      try {
        const data = await api.cxc.getClients();
        setCxcClients(data.filter(c => c.cxc_enabled));
      } catch (err) {
        toast.error('Error al cargar clientes CXC');
        return;
      }
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
        cxcClientName: ''
      }
    ]);

    if (method.code === 'cxc') {
      setActiveCxcLineId(newId);
    }
  };

  const updateLineField = (id, field, value) => {
    setLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      return updated;
    }));
  };

  const removeLine = (id) => {
    if (lines.length <= 1) return;
    const remainingLines = lines.filter(l => l.id !== id);
    setLines(remainingLines);
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

  // Pulsar Billete (asigna billete directamente al campo recibido)
  const handleBillClick = (lineId, billValue) => {
    setLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      return { ...line, received: billValue.toFixed(2) };
    }));
  };

  // Pulsar Moneda/Ficha (suma a lo recibido)
  const handleCoinClick = (lineId, coinValue) => {
    setLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      const current = parseFloat(line.received) || 0;
      const next = Math.round((current + coinValue) * 100) / 100;
      return { ...line, received: next.toFixed(2) };
    }));
  };

  // Eliminar un pago individual ya registrado (para corregir forma de pago o monto)
  const handleDeleteExistingPayment = async (payment) => {
    const confirmDel = window.confirm(
      `¿Deseas eliminar el pago de ${currencySymbol} ${Number(payment.amount).toFixed(2)} (${payment.method_label || payment.method})?\n\n` +
      `El saldo pendiente aumentará para que puedas registrar la forma de pago correcta.`
    );
    if (!confirmDel) return;

    setDeletingPaymentId(payment.id);
    try {
      await api.deleteAccountPayment(accountId, payment.id);
      toast.success('Pago eliminado exitosamente');
      await loadAccountPayments();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar pago');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  // Cerrar cuenta directamente si ya está liquidada al 100% por pagos existentes
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

    const cxcLine = lines.find(l => l.method === 'cxc');
    if (cxcLine && !cxcLine.cxcClientId) {
      toast.error('Debes seleccionar un cliente para el Crédito Folio (CXC)');
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

        await api.pay(accountId, {
          method: line.method,
          amount: Number(lineAmt.toFixed(2)),
          referenceNo: line.reference || ''
        });

        if (line.method === 'cxc' && line.cxcClientId) {
          await api.cxc.createAccount({
            client_id: line.cxcClientId,
            account_id: accountId,
            amount: Number(lineAmt.toFixed(2)),
            reference: line.reference || '',
            notes: ''
          });
        }
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

  const singleMethodCode = lines.length === 1 ? lines[0].method : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <m.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-lg text-emerald-400">
              {currencySymbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base tracking-tight">Cobrar Cuenta</h2>
                {isSplitMode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                    <Split className="w-3 h-3" /> Pago Mixto
                  </span>
                )}
                {wantsInvoice && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Factura FEL
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Total a liquidar: <strong className="text-white font-mono text-sm">{currencySymbol} {pending.toFixed(2)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {step === 'select' && (
            <>
              {/* Sección de pagos ya registrados previamente (cuentas reabiertas o pagos parciales) */}
              {existingPayments.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Pagos Registrados en Cuenta ({existingPayments.length})
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Total Pagado: <strong className="text-emerald-700 font-mono">{currencySymbol} {Number(currentTotals.paid || 0).toFixed(2)}</strong>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {existingPayments.map((p) => {
                      const methodCfg = paymentMethods.find(m => m.code === p.method) || DEFAULT_METHODS[0];
                      const Icon = methodCfg.icon;
                      const isDeleting = deletingPaymentId === p.id;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-800">{p.method_label || p.method}</span>
                              {p.reference_no && (
                                <span className="text-slate-400 text-[10px] ml-1.5 font-mono">
                                  Ref: {p.reference_no}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-700 text-sm">
                              +{currencySymbol} {Number(p.amount).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingPayment(p)}
                              disabled={isDeleting}
                              title="Eliminar este pago (por cobro erróneo o cambio de método)"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {pending <= 0 && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200">
                      <p className="text-[11px] text-slate-500">
                        La cuenta está cubierta al 100%. Para corregir una forma de pago, elimínala arriba con el basurero.
                      </p>
                      <button
                        type="button"
                        onClick={handleCloseAccountDirectly}
                        disabled={loading}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>Cerrar Cuenta con estos Pagos</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Selector de modo o métodos principales (en modo simple) */}
              {!isSplitMode ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Forma de pago principal
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSplitMode(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                    >
                      <Split className="w-3.5 h-3.5" /> Dividir / Pago Mixto
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {paymentMethods.map(method => {
                      const Icon = method.icon;
                      const isSelected = singleMethodCode === method.code;
                      return (
                        <button
                          key={method.code}
                          type="button"
                          onClick={() => handleSelectSimpleMethod(method)}
                          className={`
                            py-3 px-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-center border-2
                            ${isSelected
                              ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-sm font-bold scale-[1.02]'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold'
                            }
                          `}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Banner en modo mixto */
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-blue-900">Modo Pago Mixto Activo</p>
                      <p className="text-[11px] text-blue-700">Puedes combinar efectivo, tarjeta, transferencia o crédito.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSplitMode(false);
                      setLines([{
                        id: Date.now(),
                        method: 'cash',
                        methodLabel: 'Efectivo',
                        amount: pending.toFixed(2),
                        received: pending.toFixed(2),
                        reference: '',
                        cxcClientId: null,
                        cxcClientName: ''
                      }]);
                    }}
                    className="text-[11px] font-bold text-blue-800 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-100 transition-colors"
                  >
                    Restablecer a 1 pago
                  </button>
                </div>
              )}

              {/* Lista de formas de pago activas */}
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {lines.map((line, idx) => {
                    const methodConfig = paymentMethods.find(m => m.code === line.method) || DEFAULT_METHODS[0];
                    const Icon = methodConfig.icon;
                    const lineAmt = parseFloat(line.amount) || 0;
                    const lineRec = parseFloat(line.received) || 0;
                    const lineChange = Math.max(0, lineRec - lineAmt);
                    const lineMissingCash = Math.max(0, lineAmt - lineRec);

                    return (
                      <m.div
                        key={line.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden"
                      >
                        {/* Cabecera de la forma de pago */}
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                              <Icon className="w-4 h-4 text-slate-700" />
                              <span>{line.methodLabel}</span>
                            </div>
                          </div>

                          {isSplitMode && lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(line.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                              title="Eliminar forma de pago"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Quitar</span>
                            </button>
                          )}
                        </div>

                        {/* Cuerpo de la tarjeta de pago */}
                        <div className="p-4 space-y-3">
                          {/* Campo Monto a Cobrar */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                Monto a cobrar con {line.methodLabel}
                              </label>
                              {isSplitMode && remaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextAmt = Math.round((lineAmt + remaining) * 100) / 100;
                                    updateLineField(line.id, 'amount', nextAmt.toFixed(2));
                                    if (line.method === 'cash') {
                                      updateLineField(line.id, 'received', nextAmt.toFixed(2));
                                    }
                                  }}
                                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                                >
                                  + Sumar restante ({currencySymbol} {remaining.toFixed(2)})
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                {currencySymbol}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.amount}
                                onChange={(e) => updateLineField(line.id, 'amount', e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-base font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          {/* Sección específica de EFECTIVO */}
                          {line.method === 'cash' && (
                            <div className="pt-2 border-t border-slate-100 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                      Efectivo Recibido (Cliente)
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleExactCash(line.id)}
                                      className="text-[11px] font-extrabold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 transition-colors"
                                    >
                                      Monto Exacto
                                    </button>
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                      {currencySymbol}
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={line.received}
                                      onChange={(e) => updateLineField(line.id, 'received', e.target.value)}
                                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-base font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>

                                {/* Cambio a devolver en esta línea */}
                                <div className="flex flex-col justify-end">
                                  {lineRec >= lineAmt && lineAmt > 0 ? (
                                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Cambio a entregar</p>
                                      <p className="text-lg font-black font-mono text-emerald-700">
                                        {currencySymbol} {lineChange.toFixed(2)}
                                      </p>
                                    </div>
                                  ) : lineRec < lineAmt && lineAmt > 0 ? (
                                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Falta efectivo</p>
                                      <p className="text-sm font-bold text-amber-800">
                                        Faltan {currencySymbol} {lineMissingCash.toFixed(2)}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center justify-center">
                                      Ingresa el billete recibido
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Billetes rápidos */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                  Billetes rápidos (Cliente entrega):
                                </p>
                                <div className="grid grid-cols-6 gap-1.5">
                                  {BILLS.map(bill => (
                                    <button
                                      key={bill}
                                      type="button"
                                      onClick={() => handleBillClick(line.id, bill)}
                                      className="py-1.5 px-1 bg-slate-100 hover:bg-slate-200 active:bg-emerald-600 active:text-white rounded-xl text-xs font-bold text-slate-800 transition-colors font-mono"
                                    >
                                      {currencySymbol}{bill}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Monedas y Fichas */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                  <Coins className="w-3 h-3 text-amber-600" />
                                  Monedas / Fichas (Sumar):
                                </p>
                                <div className="flex gap-2">
                                  {COINS.map(coin => (
                                    <button
                                      key={coin}
                                      type="button"
                                      onClick={() => handleCoinClick(line.id, coin)}
                                      className="flex-1 py-1 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold text-amber-900 font-mono transition-colors"
                                    >
                                      +{currencySymbol}{coin.toFixed(2)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Sección específica de TARJETA o TRANSFERENCIA */}
                          {['card', 'transfer'].includes(line.method) && (
                            <div className="pt-2 border-t border-slate-100">
                              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                Referencia / No. Autorización / Voucher
                              </label>
                              <input
                                type="text"
                                value={line.reference}
                                onChange={(e) => updateLineField(line.id, 'reference', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                                placeholder={line.method === 'card' ? 'Ej. Auth 4920 o últimos 4 dígitos' : 'Ej. No. Transacción bancaria'}
                              />
                            </div>
                          )}

                          {/* Sección específica de CRÉDITO CXC */}
                          {line.method === 'cxc' && (
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              {line.cxcClientId ? (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs">
                                      <UserCheck className="w-4 h-4 text-amber-800" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-900">{line.cxcClientName}</p>
                                      <p className="text-[10px] text-amber-800">Crédito asignado a este cliente</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateLineField(line.id, 'cxcClientId', null);
                                      updateLineField(line.id, 'cxcClientName', '');
                                      setActiveCxcLineId(line.id);
                                    }}
                                    className="text-xs font-bold text-amber-800 hover:text-amber-900 underline"
                                  >
                                    Cambiar
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                                      Seleccionar Cliente con Crédito (CXC)
                                    </label>
                                  </div>
                                  <input
                                    type="text"
                                    value={cxcSearch}
                                    onChange={(e) => setCxcSearch(e.target.value)}
                                    placeholder="Buscar por nombre de cliente..."
                                    className="w-full px-3 py-2 bg-slate-50 border border-amber-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                                    autoFocus
                                  />
                                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-200 rounded-xl p-1 bg-slate-50">
                                    {cxcClients
                                      .filter(c => c.full_name?.toLowerCase().includes(cxcSearch.toLowerCase()))
                                      .map(client => {
                                        const available = (Number(client.credit_limit || 0) - Number(client.current_balance || 0));
                                        return (
                                          <button
                                            key={client.id}
                                            type="button"
                                            onClick={() => {
                                              updateLineField(line.id, 'cxcClientId', client.id);
                                              updateLineField(line.id, 'cxcClientName', client.full_name);
                                              setActiveCxcLineId(null);
                                            }}
                                            className="w-full p-2 hover:bg-amber-100/70 rounded-lg text-left flex items-center justify-between transition-colors"
                                          >
                                            <div>
                                              <p className="text-xs font-bold text-slate-800">{client.full_name}</p>
                                              <p className="text-[10px] text-slate-500">Saldo: {currencySymbol}{Number(client.current_balance || 0).toFixed(0)}</p>
                                            </div>
                                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                              Cupo: {currencySymbol}{available.toFixed(0)}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    {cxcClients.length === 0 && (
                                      <p className="text-xs text-slate-400 py-3 text-center">No hay clientes con crédito habilitado</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </m.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Botón para agregar más métodos (Modo Mixto) */}
              <div className="pt-1">
                {isSplitMode ? (
                  <div className="space-y-2">
                    {remaining > 0 && (
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Cubrir restante de <strong className="text-emerald-700 font-mono">{currencySymbol} {remaining.toFixed(2)}</strong> con:
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {paymentMethods.map(method => {
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.code}
                            type="button"
                            onClick={() => handleAddPaymentLine(method)}
                            className="flex-1 min-w-[120px] py-2 px-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-500" />
                            <Icon className="w-3.5 h-3.5 text-slate-600" />
                            <span>{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSplitMode(true)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-200 shadow-2xs"
                  >
                    <Split className="w-4 h-4 text-blue-600" />
                    <span>Dividir cuenta en múltiples formas de pago (Pago Mixto)</span>
                  </button>
                )}
              </div>

              {/* ───────── BLOQUE DE FACTURACIÓN ELECTRÓNICA FEL ───────── */}
              {felConfig?.is_enabled ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">Factura Electrónica (FEL SAT)</span>
                      <span className="text-[10px] font-semibold text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {felConfig.provider?.toUpperCase()}
                      </span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] font-semibold text-slate-600">
                        {wantsInvoice ? 'Facturar' : 'Sin Factura'}
                      </span>
                      <input
                        type="checkbox"
                        checked={wantsInvoice}
                        onChange={e => setWantsInvoice(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  {wantsInvoice && (
                    <m.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2.5 pt-2 border-t border-slate-200"
                    >
                      {/* Fila NIT + Botón CF + Botón Buscar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                            NIT o CUI del Cliente
                          </label>
                          <span className="text-[10px] text-slate-400">Presiona Enter para buscar en SAT</span>
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={recipientNit}
                            onChange={e => setRecipientNit(e.target.value.toUpperCase().replace(/\s/g, ''))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSearchNit(recipientNit);
                              }
                            }}
                            placeholder="Ej. 12345678 o CF"
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={handleSetCF}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black transition-colors"
                            title="Consumidor Final"
                          >
                            C/F
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSearchNit(recipientNit)}
                            disabled={searchingNit}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {searchingNit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">Buscar</span>
                          </button>
                        </div>
                      </div>

                      {/* Fila Nombre y Dirección */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Nombre / Razón Social
                          </label>
                          <input
                            type="text"
                            value={recipientName}
                            onChange={e => setRecipientName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Dirección
                          </label>
                          <input
                            type="text"
                            value={recipientAddress}
                            onChange={e => setRecipientAddress(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                          />
                        </div>
                      </div>
                    </m.div>
                  )}
                </div>
              ) : null}
            </>
          )}

          {/* Estado de Éxito */}
          {step === 'success' && (
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8 space-y-4"
            >
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"
              >
                <Check className="w-8 h-8 stroke-[3]" />
              </m.div>

              <div>
                <h3 className="text-xl font-black text-slate-900">¡Cobro Registrado con Éxito!</h3>
                <p className="text-xs text-slate-500 mt-1">La cuenta se ha liquidado correctamente.</p>
              </div>

              {/* Detalle de DTE certificado SAT si se emitió factura */}
              {certifiedInvoice && (
                <div className="max-w-md mx-auto p-4 bg-blue-50 border border-blue-200 rounded-2xl text-left space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-blue-200">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Factura Electrónica Certificada (SAT)
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      {certifiedInvoice.certifier?.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-700 space-y-0.5">
                    <p><strong className="text-slate-900">Autorización:</strong> {certifiedInvoice.uuid}</p>
                    <p><strong className="text-slate-900">Serie:</strong> {certifiedInvoice.serie} · <strong className="text-slate-900">No:</strong> {certifiedInvoice.dte_number}</p>
                    <p><strong className="text-slate-900">Cliente:</strong> {certifiedInvoice.recipient_name} (NIT: {certifiedInvoice.recipient_nit})</p>
                  </div>
                </div>
              )}

              {totalCashChange > 0 && (
                <div className="max-w-xs mx-auto p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Cambio en efectivo:</p>
                  <p className="text-3xl font-black font-mono text-emerald-700 mt-0.5">
                    {currencySymbol} {totalCashChange.toFixed(2)}
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-400 font-medium">Finalizando...</p>
            </m.div>
          )}
        </div>

        {/* Footer con Resumen Dinámico en Tiempo Real */}
        {step !== 'success' && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex-shrink-0 space-y-3">
            {/* Balanza / Resumen visual */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Total de la cuenta:</span>
                <span className="font-extrabold font-mono text-slate-900 text-sm">
                  {currencySymbol} {pending.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Total asignado a pagar:</span>
                <span className={`font-extrabold font-mono text-sm ${isExact ? 'text-emerald-700' : isOver ? 'text-red-600' : 'text-amber-700'}`}>
                  {currencySymbol} {totalAssigned.toFixed(2)}
                </span>
              </div>

              {/* Indicador de estado */}
              {isShort && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-amber-800 bg-amber-50/80 px-2.5 py-1.5 rounded-xl border border-amber-200 text-xs">
                  <span className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    Falta por cubrir:
                  </span>
                  <span className="font-black font-mono text-sm">
                    {currencySymbol} {remaining.toFixed(2)}
                  </span>
                </div>
              )}

              {isOver && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-red-800 bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200 text-xs">
                  <span className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    Monto asignado supera el total por:
                  </span>
                  <span className="font-black font-mono text-sm">
                    {currencySymbol} {overage.toFixed(2)}
                  </span>
                </div>
              )}

              {isExact && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 text-xs">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    Cuenta cubierta al 100%
                  </span>
                  <span className="font-black font-mono text-xs">
                    Exacto
                  </span>
                </div>
              )}

              {/* Resumen de cambio en efectivo global */}
              {totalCashChange > 0 && (
                <div className="pt-1 flex items-center justify-between text-xs text-blue-900 bg-blue-50/80 px-2.5 py-1.5 rounded-xl border border-blue-200">
                  <span className="font-bold flex items-center gap-1">
                    <Banknote className="w-4 h-4 text-blue-600" />
                    Cambio en efectivo a entregar:
                  </span>
                  <span className="font-black font-mono text-sm text-blue-700">
                    {currencySymbol} {totalCashChange.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Botón de Cobro Principal */}
            {pending <= 0 && existingPayments.length > 0 ? (
              <m.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCloseAccountDirectly}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer ring-2 ring-emerald-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cerrando cuenta...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    Cuenta Liquidada · Cerrar Cuenta
                  </>
                )}
              </m.button>
            ) : (
              <m.button
                whileTap={{ scale: isExact && !loading && cashLinesWithShortage.length === 0 ? 0.98 : 1 }}
                onClick={handlePay}
                disabled={!isExact || loading || cashLinesWithShortage.length > 0}
                className={`
                  w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md
                  ${isExact && cashLinesWithShortage.length === 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer ring-2 ring-emerald-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  }
                `}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando cobro...
                  </>
                ) : isShort ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    Faltan {currencySymbol} {remaining.toFixed(2)} para completar
                  </>
                ) : isOver ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    Monto supera la cuenta por {currencySymbol} {overage.toFixed(2)}
                  </>
                ) : cashLinesWithShortage.length > 0 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    Efectivo recibido insuficiente
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    {wantsInvoice ? `Cobrar y Facturar ${currencySymbol} ${pending.toFixed(2)}` : `Cobrar ${currencySymbol} ${pending.toFixed(2)}`}
                  </>
                )}
              </m.button>
            )}
          </div>
        )}
      </m.div>
    </div>
  );
}
