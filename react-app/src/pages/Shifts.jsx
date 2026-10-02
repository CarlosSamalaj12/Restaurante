import { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { BackButton } from '../components/BackButton';
import {
  ArrowLeft,
  PlayCircle,
  StopCircle,
  Clock,
  Loader2,
  Coins,
  CreditCard,
  Printer,
  Landmark,
  Receipt,
  PiggyBank,
  XCircle,
  ChevronDown,
  ChevronUp,
  Wallet,
  AlertTriangle,
  CheckCircle,
  FileText,
  PlusCircle,
  Building2,
  User,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  ShoppingBag,
  ExternalLink,
  Trash2,
  LogOut,
  Lock
} from 'lucide-react';

const METHOD_CONFIG = {
  cash:     { label: 'Efectivo',         icon: Coins,       bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200' },
  card:     { label: 'Tarjeta POS',      icon: CreditCard,  bg: 'bg-purple-50',   text: 'text-purple-700',   border: 'border-purple-200' },
  transfer: { label: 'Transferencia/QR', icon: Landmark,    bg: 'bg-blue-50',     text: 'text-blue-700',     border: 'border-blue-200' },
  cxc:      { label: 'Cuentas x Cobrar', icon: Receipt,     bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200' },
  other:    { label: 'Otro',             icon: PiggyBank,   bg: 'bg-gray-50',     text: 'text-gray-700',     border: 'border-gray-200' },
};

export function ShiftsPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [shiftDates, setShiftDates] = useState({ openedAt: null, closedAt: null });
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'expenses' | 'open_accounts' | 'voided'

  // Cash count state
  const [closingCash, setClosingCash] = useState('');
  const [denominations, setDenominations] = useState({
    q200: '',
    q100: '',
    q50: '',
    q20: '',
    q10: '',
    q5: '',
    coins: '',
  });

  // Shift opening state
  const [openingCash, setOpeningCash] = useState('');
  const [openingNote, setOpeningNote] = useState('');

  // Modals state
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', reason: '', pin: '' });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Rectification modals
  const [changePaymentModal, setChangePaymentModal] = useState({
    open: false,
    account: null,
    payment: null,
    newMethod: 'card',
    reason: '',
    pin: '',
  });
  const [submittingPaymentChange, setSubmittingPaymentChange] = useState(false);

  const [reopenModal, setReopenModal] = useState({
    open: false,
    account: null,
    reason: '',
    pin: '',
  });
  const [submittingReopen, setSubmittingReopen] = useState(false);

  const toast = useToast();
  const { user, logout, canView, hasPermission = () => true } = useAuth();

  // Load initial data
  useEffect(() => {
    loadBootstrap();
  }, []);

  // When selected center changes, fetch active shift and real-time pre-cierre
  useEffect(() => {
    if (selectedCenter) {
      loadShiftData(selectedCenter);
    }
  }, [selectedCenter]);

  // Recalculate physical cash when denominations change
  const handleDenominationChange = (key, val) => {
    const updated = { ...denominations, [key]: val };
    setDenominations(updated);

    const q200 = (Number(updated.q200) || 0) * 200;
    const q100 = (Number(updated.q100) || 0) * 100;
    const q50 = (Number(updated.q50) || 0) * 50;
    const q20 = (Number(updated.q20) || 0) * 20;
    const q10 = (Number(updated.q10) || 0) * 10;
    const q5 = (Number(updated.q5) || 0) * 5;
    const coins = Number(updated.coins) || 0;
    const total = q200 + q100 + q50 + q20 + q10 + q5 + coins;

    if (total > 0 || Object.values(updated).some(v => v !== '')) {
      setClosingCash(total.toFixed(2));
    }
  };

  const handleResetCount = () => {
    setDenominations({
      q200: '',
      q100: '',
      q50: '',
      q20: '',
      q10: '',
      q5: '',
      coins: '',
    });
    setClosingCash('');
  };

  const loadBootstrap = async () => {
    try {
      const data = await api.bootstrap();
      setCenters(data.centers || []);
      if (data.centers?.length > 0) {
        const userCenter = user?.operation_center_id
          ? data.centers.find((c) => c.id === Number(user.operation_center_id))?.id
          : null;
        setSelectedCenter(userCenter || data.centers[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar datos del sistema');
    }
  };

  const loadShiftData = async (centerId, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const checkRes = await api.checkActiveShift(centerId);
      if (checkRes.active && checkRes.shift) {
        setCurrentShift(checkRes.shift);
        // Automatically fetch real-time pre-cierre summary
        const previewRes = await api.previewShift(centerId, closingCash ? Number(closingCash) : undefined);
        setPreviewData(previewRes.summary || null);
        setShiftDates({
          openedAt: previewRes.openedAt || checkRes.shift.opened_at,
          closedAt: null,
        });
        if (isManualRefresh) {
          toast.success('Balance actualizado en tiempo real');
        }
      } else {
        setCurrentShift(null);
        setPreviewData(null);
        setShiftDates({ openedAt: null, closedAt: null });
      }
    } catch (error) {
      console.error('Error al cargar turno:', error);
      toast.error('No se pudo sincronizar el estado del turno');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Keyboard shortcut: Ctrl + Z for final close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (currentShift && !showConfirmClose) {
          e.preventDefault();
          setShowConfirmClose(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentShift, showConfirmClose]);

  // Open Shift
  const handleOpenShift = async () => {
    if (!selectedCenter) {
      toast.error('Selecciona un centro de operación');
      return;
    }
    setLoading(true);
    try {
      await api.openShift({
        cashierId: user?.id || 1,
        centerId: selectedCenter,
        note: openingNote.trim(),
        openingCash: Number(openingCash) || 0,
      });
      toast.success('Turno abierto con éxito');
      setOpeningCash('');
      setOpeningNote('');
      await loadShiftData(selectedCenter);
    } catch (error) {
      toast.error(error.message || 'Error al abrir turno');
    } finally {
      setLoading(false);
    }
  };

  // Final Close Shift (Cierre Z)
  const confirmCloseShift = async () => {
    setShowConfirmClose(false);
    setLoading(true);
    try {
      const result = await api.closeShift({
        cashierId: user?.id || 1,
        centerId: selectedCenter,
        note: '',
        closingCash: closingCash !== '' ? Number(closingCash) : null,
      });
      toast.success('Turno cerrado exitosamente');
      // Print final Z closure
      handlePrint('Z', result.summary, result.openedAt, result.closedAt);
      // Reset state
      setCurrentShift(null);
      setPreviewData(null);
      handleResetCount();
    } catch (error) {
      toast.error(error.message || 'Error al cerrar turno');
    } finally {
      setLoading(false);
    }
  };

  // Petty Cash Expenses
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    if (!expenseForm.reason.trim()) {
      toast.error('Ingresa el motivo del retiro o gasto');
      return;
    }
    if (!expenseForm.pin.trim()) {
      toast.error('Se requiere PIN de supervisor');
      return;
    }

    setSubmittingExpense(true);
    try {
      const res = await api.addShiftExpense({
        centerId: selectedCenter,
        amount: Number(expenseForm.amount),
        reason: expenseForm.reason.trim(),
        authPin: expenseForm.pin.trim(),
      });
      toast.success('Retiro de caja registrado');
      setShowExpenseModal(false);
      setExpenseForm({ amount: '', reason: '', pin: '' });
      if (res.summary) {
        setPreviewData(res.summary);
      } else {
        await loadShiftData(selectedCenter);
      }
    } catch (err) {
      toast.error(err.message || 'Error al registrar retiro');
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Rectify Payment Method
  const handleChangePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!changePaymentModal.pin.trim()) {
      toast.error('Ingresa el PIN de supervisor');
      return;
    }

    setSubmittingPaymentChange(true);
    try {
      await api.changePaymentMethod(changePaymentModal.account.id, {
        paymentId: changePaymentModal.payment.payment_id,
        newMethod: changePaymentModal.newMethod,
        reason: changePaymentModal.reason || 'Rectificación de método de pago en pre-cierre',
        authPin: changePaymentModal.pin.trim(),
      });
      toast.success('Forma de pago rectificada');
      setChangePaymentModal({
        open: false,
        account: null,
        payment: null,
        newMethod: 'card',
        reason: '',
        pin: '',
      });
      await loadShiftData(selectedCenter);
    } catch (err) {
      toast.error(err.message || 'Error al actualizar forma de pago');
    } finally {
      setSubmittingPaymentChange(false);
    }
  };

  // Reopen Account
  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!reopenModal.pin.trim()) {
      toast.error('Ingresa el PIN de supervisor');
      return;
    }

    setSubmittingReopen(true);
    try {
      await api.reopenAccount(
        reopenModal.account.id,
        reopenModal.reason || 'Reapertura para modificación desde control de arqueo',
        reopenModal.pin.trim()
      );
      toast.success(`Cuenta #${reopenModal.account.check_number} reabierta`);
      setReopenModal({ open: false, account: null, reason: '', pin: '' });
      await loadShiftData(selectedCenter);
    } catch (err) {
      toast.error(err.message || 'Error al reabrir la cuenta');
    } finally {
      setSubmittingReopen(false);
    }
  };

  // Elapsed time helper
  const getElapsedTime = (openedAt) => {
    if (!openedAt) return '0h 00m';
    const start = new Date(openedAt).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - start);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${String(diffMinutes).padStart(2, '0')}m`;
  };

  // Calculations
  const s = previewData || {};
  const openingCashNum = Number(s.openingCash || currentShift?.opening_cash || 0);
  const cashTotalNum = Number(s.cash_total || 0);
  const cardTotalNum = Number(s.card_total || 0);
  const transferTotalNum = Number(s.transfer_total || 0);
  const cxcTotalNum = Number(s.cxc_total || 0);
  const otherTotalNum = Number(s.other_total || 0);
  const expensesTotalNum = Number(s.expensesTotal || 0);
  const grandTotalNum = Number(s.grand_total || 0);
  const totalChecksNum = Number(s.total_checks || 0);
  const itemsSoldNum = Number(s.itemsSold || 0);
  const averageTicketNum = Number(s.averageTicket || (totalChecksNum > 0 ? grandTotalNum / totalChecksNum : 0));

  const expectedCashNum = openingCashNum + cashTotalNum - expensesTotalNum;
  const closingCashNum = closingCash !== '' ? Number(closingCash) : null;
  const cashDiff = closingCashNum !== null ? closingCashNum - expectedCashNum : null;

  // Print Corte X (Audit preview) or Corte Z (Definitive closure)
  const handlePrint = (type = 'X', customSummary = null, customOpened = null, customClosed = null) => {
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Permite ventanas emergentes para imprimir');
      return;
    }

    const data = customSummary || s;
    const centerObj = centers.find(c => c.id === selectedCenter);
    const centerName = centerObj?.name || 'Centro de Operación';
    const openedStr = (customOpened || shiftDates.openedAt) ? new Date(customOpened || shiftDates.openedAt).toLocaleString('es-GT') : '---';
    const closedStr = (customClosed || shiftDates.closedAt) ? new Date(customClosed || shiftDates.closedAt).toLocaleString('es-GT') : (type === 'X' ? 'EN CURSO (NO CERRADO)' : new Date().toLocaleString('es-GT'));
    const isZ = type === 'Z';
    const title = isZ ? 'CORTE Z - CIERRE DEFINITIVO' : 'CORTE X - AUDITORÍA PARCIAL';
    const docNotice = isZ ? 'CIERRE FISCAL Y DE AUDITORÍA DEFINITIVO' : 'DOCUMENTO DE CONTROL INTERNO - NO CIERRA TURNO';

    const pOpening = Number(data.openingCash || openingCashNum).toFixed(2);
    const pCash = Number(data.cash_total || cashTotalNum).toFixed(2);
    const pExpenses = Number(data.expensesTotal || expensesTotalNum).toFixed(2);
    const pExpected = Number(data.expectedCash || expectedCashNum).toFixed(2);
    const pClosing = closingCashNum !== null ? closingCashNum.toFixed(2) : (data.closingCash !== null && data.closingCash !== undefined ? Number(data.closingCash).toFixed(2) : '---');
    const pDiff = closingCashNum !== null ? (closingCashNum - Number(pExpected)).toFixed(2) : '---';

    let methodsHtml = '';
    for (const m of (data.methods || [{ code: 'cash', label: 'Efectivo' }, { code: 'card', label: 'Tarjeta' }, { code: 'transfer', label: 'Transferencia' }])) {
      const tot = Number(data[m.code + '_total'] || 0);
      if (tot > 0) {
        methodsHtml += `
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;">
            <span>${m.label}:</span>
            <span style="font-weight:bold;">Q${tot.toFixed(2)}</span>
          </div>
        `;
      }
    }

    let expensesHtml = '';
    const expList = data.expenses || [];
    if (expList.length > 0) {
      expensesHtml = `
        <div style="margin-top:12px;border-top:1px dashed #999;padding-top:6px;">
          <div style="font-weight:bold;font-size:11px;text-transform:uppercase;margin-bottom:4px;">Retiros de Caja Chica (${expList.length})</div>
          ${expList.map(e => `
            <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">
              <span>- ${e.reason}</span>
              <span style="color:#b91c1c;font-weight:bold;">-Q${Number(e.amount).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 78mm;
            margin: 0 auto;
            padding: 10px 4px;
            color: #111;
            font-size: 12px;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header-box { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; text-align: center; }
          .h-title { font-size: 15px; font-weight: bold; letter-spacing: 0.5px; }
          .sub { font-size: 11px; margin-top: 2px; }
          .box { border: 1px dashed #666; padding: 6px; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; padding: 2px 0; }
          .highlight { font-size: 13px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 6px 0; }
          .footer { margin-top: 18px; text-align: center; font-size: 10px; color: #555; border-top: 1px dashed #999; padding-top: 8px; }
          .sign-area { margin-top: 28px; display: flex; justify-content: space-between; }
          .sign-box { width: 45%; border-top: 1px solid #000; text-align: center; font-size: 10px; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="h-title">${title}</div>
          <div class="sub">${centerName}</div>
          <div class="sub" style="font-weight:bold;margin-top:4px;">${docNotice}</div>
        </div>

        <div style="font-size:11px;margin-bottom:8px;">
          <div class="row"><span>Turno ID:</span><span class="bold">#TRN-${data.shiftId || currentShift?.id || '---'}</span></div>
          <div class="row"><span>Cajero:</span><span>${user?.full_name || 'Cajero'}</span></div>
          <div class="row"><span>Apertura:</span><span>${openedStr}</span></div>
          <div class="row"><span>${isZ ? 'Cierre:' : 'Hora Impresión:'}</span><span>${closedStr}</span></div>
        </div>

        <div class="box">
          <div class="bold" style="font-size:11px;margin-bottom:4px;text-align:center;">ARQUEO DE EFECTIVO</div>
          <div class="row"><span>Fondo Inicial:</span><span>Q${pOpening}</span></div>
          <div class="row"><span>+ Ventas Efectivo:</span><span>+Q${pCash}</span></div>
          <div class="row"><span>- Retiros Caja Chica:</span><span>-Q${pExpenses}</span></div>
          <div class="row highlight"><span>EFECTIVO ESPERADO:</span><span>Q${pExpected}</span></div>
          <div class="row"><span>Efectivo Contado:</span><span class="bold">Q${pClosing}</span></div>
          <div class="row" style="font-weight:bold;">
            <span>Diferencia:</span>
            <span style="${Number(pDiff) === 0 ? '' : Number(pDiff) > 0 ? 'color:#047857;' : 'color:#b91c1c;'}">
              ${Number(pDiff) > 0 ? '+' : ''}Q${pDiff}
            </span>
          </div>
        </div>

        ${expensesHtml}

        <div style="margin-top:10px;">
          <div class="bold" style="font-size:11px;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:4px;">TOTALES POR FORMA DE PAGO</div>
          ${methodsHtml}
          <div class="row highlight" style="font-size:14px;">
            <span>VENTAS BRUTAS:</span>
            <span>Q${Number(data.grand_total || grandTotalNum).toFixed(2)}</span>
          </div>
        </div>

        <div class="row" style="margin-top:8px;font-size:11px;">
          <span>Cuentas Cobradas:</span><span class="bold">${totalChecksNum}</span>
        </div>
        <div class="row" style="font-size:11px;">
          <span>Ticket Promedio:</span><span class="bold">Q${averageTicketNum.toFixed(2)}</span>
        </div>
        <div class="row" style="font-size:11px;">
          <span>Artículos Vendidos:</span><span class="bold">${itemsSoldNum} items</span>
        </div>

        ${isZ ? `
          <div class="sign-area">
            <div class="sign-box">Firma Cajero</div>
            <div class="sign-box">Firma Supervisor</div>
          </div>
        ` : ''}

        <div class="footer">
          <div>SamaPos • Gestión de Restaurante</div>
          <div>Impreso: ${new Date().toLocaleString('es-GT')}</div>
        </div>
        <script>
          window.print();
          window.close();
        <\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const selectedCenterName = centers.find(c => c.id === selectedCenter)?.name || 'Sucursal Principal';

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 text-slate-800 antialiased">
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <BackButton
              onClick={onBack}
              label="Volver"
              title="Regresar"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Gestión de Turnos</h1>
                {currentShift ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Turno Activo • Caja #{String(currentShift.id || '1').padStart(2, '0')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Caja Cerrada
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Control de arqueo, pre-cierre y balance en tiempo real</p>
            </div>
          </div>

          {/* Right Center Selector & Cashier Profile */}
          <div className="flex items-center gap-3">
            {/* Center Selector */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 transition-colors">
                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 leading-none">Centro de Operación</div>
                  <select
                    value={selectedCenter || ''}
                    onChange={(e) => setSelectedCenter(Number(e.target.value))}
                    className="bg-transparent text-sm font-semibold text-slate-800 pr-5 focus:outline-none cursor-pointer"
                  >
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            {currentShift && (
              <button
                onClick={() => loadShiftData(selectedCenter, true)}
                disabled={refreshing}
                className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
                title="Actualizar balance en tiempo real"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}

            {/* User Profile Pill */}
            <div 
              onClick={logout}
              title="Clic para Cerrar Sesión / Salir (PIN)"
              className="flex items-center gap-2.5 bg-slate-50 hover:bg-red-50/70 hover:border-red-200 border border-slate-200 rounded-xl pl-2 pr-3 py-1.5 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 group-hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center shadow-xs transition-colors">
                {user?.full_name ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'CS'}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900 group-hover:text-red-700 leading-tight transition-colors">{user?.full_name || 'Carlos Samalaj'}</div>
                <div className="text-[11px] text-slate-500">
                  {user?.role === 'superadmin' ? 'Superadministrador' : user?.role === 'admin' ? 'Administrador' : user?.role === 'manager' ? 'Gerente' : 'Cajero'} • {new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Botón Salir (PIN) */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
              title="Cerrar sesión / Cambiar de PIN"
            >
              <LogOut className="w-4 h-4 text-red-600" />
              <span className="hidden sm:inline">Salir (PIN)</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-6">
        {loading && !refreshing ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Cargando estado del turno y arqueo...</p>
          </div>
        ) : currentShift ? (
          /* ========================================================================= */
          /* CASO 1: TURNO ACTIVO - INTERFAZ DE PRE-CIERRE, ARQUEO Y BALANCE EN TIEMPO REAL */
          /* ========================================================================= */
          <>
            {/* 2. TOP BANNER: SESIÓN DE CAJA ABIERTA */}
            <m.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Sesión de Caja Abierta</h2>
                    <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      ID #TRN-{currentShift.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Iniciado hoy a las {shiftDates.openedAt ? new Date(shiftDates.openedAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : '08:30 AM'} por {user?.full_name || 'Carlos Samalaj'} • {selectedCenterName}
                  </p>
                </div>
              </div>

              {/* Badges de Actividad */}
              <div className="flex items-center gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-right">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Tiempo de Actividad</div>
                  <div className="text-base font-extrabold text-slate-800">{getElapsedTime(shiftDates.openedAt)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-right">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Transacciones</div>
                  <div className="text-base font-extrabold text-slate-800">{totalChecksNum} operaciones</div>
                </div>
              </div>
            </m.div>

            {/* 3. MAIN GRID 2 COLUMNS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: ARQUEO FÍSICO Y PRE-CIERRE (Col 7 / 12) */}
              <div className="lg:col-span-7 space-y-6">
                {/* CARD 1: EFECTIVO CONTADO AL CERRAR */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Efectivo Contado al Cerrar</h3>
                        <p className="text-xs text-slate-500">Realiza el arqueo físico de billetes y monedas en el cajón de dinero</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-slate-500" />
                      Desglose de Billetes
                    </span>
                  </div>

                  {/* DISPLAY TOTAL EFECTIVO FÍSICO */}
                  <div className="space-y-1.5 mb-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Efectivo Físico en Caja
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-2xl font-bold text-slate-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={closingCash}
                        onChange={(e) => setClosingCash(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-11 pr-28 py-3.5 bg-slate-50/60 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl text-3xl font-extrabold text-slate-900 focus:outline-none transition-all tracking-tight"
                      />
                      <button
                        type="button"
                        onClick={handleResetCount}
                        className="absolute right-3 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs"
                      >
                        Recontar
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                      Ingresa el monto exacto antes de continuar. Puedes ayudarte con el desglose por denominación.
                    </p>
                  </div>

                  {/* CONTEO RÁPIDO POR DENOMINACIÓN (QUETZALES) */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Conteo Rápido por Denominación (Quetzales)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Q200 */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                        <div className="text-[11px] font-semibold text-slate-600 mb-1">Billetes Q200</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-bold">×</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={denominations.q200}
                            onChange={(e) => handleDenominationChange('q200', e.target.value)}
                            className="w-full py-1 px-2 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="text-right text-[11px] font-bold text-slate-800 mt-1">
                          Q {((Number(denominations.q200) || 0) * 200).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Q100 */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                        <div className="text-[11px] font-semibold text-slate-600 mb-1">Billetes Q100</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-bold">×</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={denominations.q100}
                            onChange={(e) => handleDenominationChange('q100', e.target.value)}
                            className="w-full py-1 px-2 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="text-right text-[11px] font-bold text-slate-800 mt-1">
                          Q {((Number(denominations.q100) || 0) * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Q50 */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                        <div className="text-[11px] font-semibold text-slate-600 mb-1">Billetes Q50</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-bold">×</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={denominations.q50}
                            onChange={(e) => handleDenominationChange('q50', e.target.value)}
                            className="w-full py-1 px-2 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="text-right text-[11px] font-bold text-slate-800 mt-1">
                          Q {((Number(denominations.q50) || 0) * 50).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Q20 / Q10 / Q5 */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                        <div className="text-[11px] font-semibold text-slate-600 mb-1">Billetes Q20</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-bold">×</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={denominations.q20}
                            onChange={(e) => handleDenominationChange('q20', e.target.value)}
                            className="w-full py-1 px-2 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="text-right text-[11px] font-bold text-slate-800 mt-1">
                          Q {((Number(denominations.q20) || 0) * 20).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Monedas y total desglose */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-medium">Monedas y fraccionario sumados:</span>
                        <div className="relative inline-flex items-center">
                          <span className="absolute left-2 font-bold text-slate-400">Q</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            placeholder="0.00"
                            value={denominations.coins}
                            onChange={(e) => handleDenominationChange('coins', e.target.value)}
                            className="w-24 pl-5 pr-2 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                        Total Desglose: Q {closingCash || '0.00'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: PRE-CIERRE Y BALANCE DE CAJA */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Pre-Cierre y Balance de Caja</h3>
                      <p className="text-xs text-slate-500">Comparativa automática entre lo registrado por sistema y el arqueo real</p>
                    </div>

                    {/* BADGE DE CUADRE */}
                    {cashDiff === null ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Ingresa conteo físico
                      </span>
                    ) : cashDiff === 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Cuadre Exacto (Diferencia: Q 0.00)
                      </span>
                    ) : cashDiff > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                        Sobrante en Caja (+Q {cashDiff.toFixed(2)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Faltante en Caja (-Q {Math.abs(cashDiff).toFixed(2)})
                      </span>
                    )}
                  </div>

                  {/* 3 METRIC CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
                    {/* Esperado en Sistema */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Esperado en Sistema</div>
                      <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        Q {expectedCashNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Fondo + Ventas - Egresos</div>
                    </div>

                    {/* Contado en Caja */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-blue-600 mb-1">Contado en Caja</div>
                      <div className="text-2xl font-extrabold text-blue-700 tracking-tight">
                        {closingCashNum !== null ? `Q ${closingCashNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
                      </div>
                      <div className="text-[11px] text-blue-600/80 mt-1">Monto físico reportado</div>
                    </div>

                    {/* Diferencia Final */}
                    <div className={`border rounded-2xl p-4 ${
                      cashDiff === null
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : cashDiff === 0
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                        : cashDiff > 0
                        ? 'bg-blue-50/60 border-blue-200 text-blue-800'
                        : 'bg-rose-50/60 border-rose-200 text-rose-800'
                    }`}>
                      <div className="text-[10px] uppercase font-bold tracking-wider opacity-75 mb-1">Diferencia Final</div>
                      <div className="text-2xl font-extrabold tracking-tight">
                        {cashDiff === null ? '---' : `${cashDiff >= 0 ? '+' : ''}Q ${cashDiff.toFixed(2)}`}
                      </div>
                      <div className="text-[11px] opacity-80 mt-1">
                        {cashDiff === null
                          ? 'Pendiente de conteo'
                          : cashDiff === 0
                          ? 'Sin sobrantes ni faltantes'
                          : cashDiff > 0
                          ? 'Efectivo sobrante reportado'
                          : 'Efectivo faltante reportado'}
                      </div>
                    </div>
                  </div>

                  {/* DESGLOSE DE MOVIMIENTOS DEL TURNO */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Desglose de Movimientos del Turno
                      </div>
                      <button
                        onClick={() => setShowExpenseModal(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Registrar Retiro de Caja
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 text-sm">
                      {/* Efectivo Inicial */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          <span>Efectivo Inicial en Caja (Fondo de apertura)</span>
                        </div>
                        <span className="font-bold text-slate-900">
                          Q {openingCashNum.toFixed(2)}
                        </span>
                      </div>

                      {/* Ventas en Efectivo */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Ventas en Efectivo (+ Cobros registrados)</span>
                        </div>
                        <span className="font-bold text-emerald-600">
                          + Q {cashTotalNum.toFixed(2)}
                        </span>
                      </div>

                      {/* Retiros de Caja Chica */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>Retiros de Caja chica / Gastos autorizados</span>
                        </div>
                        <span className="font-bold text-rose-600">
                          - Q {expensesTotalNum.toFixed(2)}
                        </span>
                      </div>

                      {/* Efectivo Teórico Esperado */}
                      <div className="py-3 flex items-center justify-between font-bold bg-slate-50/70 px-3 rounded-xl mt-1">
                        <span className="text-slate-800">Efectivo Teórico Total Esperado en Caja</span>
                        <span className="text-slate-900 text-base">
                          Q {expectedCashNum.toFixed(2)}
                        </span>
                      </div>

                      {/* Ventas con Tarjeta */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <span>Ventas con Tarjeta Crédito / Débito (POS BAC/Visa)</span>
                        </div>
                        <span className="font-bold text-slate-900">
                          Q {cardTotalNum.toFixed(2)}
                        </span>
                      </div>

                      {/* Transferencias & QR */}
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>Transferencias Bancarias & QR Pagos</span>
                        </div>
                        <span className="font-bold text-slate-900">
                          Q {transferTotalNum.toFixed(2)}
                        </span>
                      </div>

                      {/* Otras formas de pago si aplican (CxC, etc.) */}
                      {cxcTotalNum > 0 && (
                        <div className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>Cuentas por Cobrar (CxC / Crédito)</span>
                          </div>
                          <span className="font-bold text-slate-900">
                            Q {cxcTotalNum.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* BANNER OSCURO TOTAL VENTAS BRUTAS */}
                    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between mt-4 shadow-sm">
                      <div>
                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Ventas Brutas del Turno</div>
                        <div className="text-xs text-slate-400 mt-0.5">{totalChecksNum} cuentas pagadas en este turno</div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                        Q {grandTotalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: RENDIMIENTO, ADVERTENCIA, FLUJO Y BOTONES (Col 5 / 12) */}
              <div className="lg:col-span-5 space-y-6">
                {/* RENDIMIENTO DEL TURNO */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Rendimiento del Turno
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                      <div className="text-xs text-slate-500 mb-1">Ticket Promedio</div>
                      <div className="text-xl font-extrabold text-slate-900">
                        Q {averageTicketNum.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                      <div className="text-xs text-slate-500 mb-1">Artículos Vendidos</div>
                      <div className="text-xl font-extrabold text-slate-900">
                        {itemsSoldNum} items
                      </div>
                    </div>
                  </div>

                  {/* ADVERTENCIA DE CIERRE IRREVERSIBLE */}
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex gap-3 text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <strong className="font-bold block text-amber-950 mb-0.5">Cierre Irreversible</strong>
                      Al efectuar el cierre definitivo (Cierre Z), se imprimirá la tira de auditoría fiscal y se deshabilitará la caja para este cajero.
                    </div>
                  </div>
                </div>

                {/* FLUJO DE TRABAJO SUGERIDO */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Flujo de Trabajo Sugerido
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      Paso 3 de 4
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* Paso 1 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">1. Arqueo de Apertura</div>
                        <p className="text-slate-500 mt-0.5">Se validó el fondo de caja inicial de Q {openingCashNum.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Paso 2 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">2. Operación y Cobros</div>
                        <p className="text-slate-500 mt-0.5">{totalChecksNum} transacciones completadas sin notas pendientes</p>
                      </div>
                    </div>

                    {/* Paso 3 (Actual) */}
                    <div className="flex items-start gap-3 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                        3
                      </div>
                      <div>
                        <div className="font-bold text-blue-900">3. Conteo Físico de Cierre</div>
                        <p className="text-blue-700/80 mt-0.5">Ingresar el dinero en caja y contrastar contra el esperado.</p>
                      </div>
                    </div>

                    {/* Paso 4 */}
                    <div className="flex items-start gap-3 opacity-60">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 font-bold text-xs">
                        4
                      </div>
                      <div>
                        <div className="font-bold text-slate-700">4. Cierre Z y Bloqueo</div>
                        <p className="text-slate-500 mt-0.5">Emisión de reporte fiscal y entrega al supervisor.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN: CORTE X & CIERRE Z */}
                <div className="space-y-3 pt-1">
                  {/* Vista Previa de Corte (X) */}
                  <button
                    onClick={() => handlePrint('X')}
                    className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-2xl font-bold text-sm shadow-xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.99]"
                  >
                    <FileText className="w-4 h-4 text-slate-600" />
                    Vista Previa de Corte (X)
                  </button>

                  {/* Finalizar y Cerrar Turno (Cierre Z) - Solo con permiso shifts.close */}
                  {hasPermission('shifts.close') && (
                    <button
                      onClick={() => setShowConfirmClose(true)}
                      className="w-full py-4 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-2xl font-bold text-base shadow-md shadow-rose-600/20 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99]"
                    >
                      <StopCircle className="w-5 h-5 text-white" />
                      Finalizar y Cerrar Turno
                    </button>
                  )}

                  <div className="text-center text-[11px] text-slate-400">
                    Atajo de teclado: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">Ctrl + Z</kbd> para confirmación
                  </div>
                </div>
              </div>
            </div>

            {/* 4. RECTIFICACIÓN Y DETALLES DEL TURNO (PESTAÑAS) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mt-6">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('accounts')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                      activeTab === 'accounts'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    Cuentas Cobradas ({s.paidAccounts?.length || 0})
                  </button>

                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                      activeTab === 'expenses'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    Retiros de Caja Chica ({s.expenses?.length || 0})
                  </button>

                  {(s.openAccounts?.length || 0) > 0 && (
                    <button
                      onClick={() => setActiveTab('open_accounts')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                        activeTab === 'open_accounts'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'text-amber-700 bg-amber-50/50 hover:bg-amber-100/50'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Cuentas Pendientes ({s.openAccounts.length})
                    </button>
                  )}

                  {(s.voidedItems?.length || 0) > 0 && (
                    <button
                      onClick={() => setActiveTab('voided')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                        activeTab === 'voided'
                          ? 'bg-slate-100 text-slate-800'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      Anulaciones ({s.voidedItems.length})
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-400">
                  Revisa y rectifica los cobros antes de realizar el Cierre Z
                </div>
              </div>

              {/* CONTENIDO DE PESTAÑAS */}
              {activeTab === 'accounts' && (
                <div className="space-y-2">
                  {(!s.paidAccounts || s.paidAccounts.length === 0) ? (
                    <p className="text-xs text-slate-400 text-center py-8">No hay cuentas cobradas registradas en este turno.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {s.paidAccounts.map((account) => {
                        // Find matching payments detail
                        const payments = (s.paymentsDetail || []).filter(p => p.account_id === account.id);
                        return (
                          <div key={account.id} className="py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 font-mono font-bold text-slate-800 flex items-center justify-center text-xs">
                                #{account.check_number}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-900">Cuenta #{account.check_number}</span>
                                  <span className="text-xs text-slate-500">• Mesero: {account.waiter_name || 'General'}</span>
                                  {account.closed_at && (
                                    <span className="text-[11px] text-slate-400">
                                      {new Date(account.closed_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {payments.map((p, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                      <span className="font-bold uppercase">{p.method}:</span> Q{Number(p.amount).toFixed(2)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-base font-extrabold text-slate-900">
                                Q {Number(account.total).toFixed(2)}
                              </span>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1.5">
                                {payments.length > 0 && (
                                  <button
                                    onClick={() => setChangePaymentModal({
                                      open: true,
                                      account,
                                      payment: payments[0],
                                      newMethod: payments[0].method === 'cash' ? 'card' : 'cash',
                                      reason: '',
                                      pin: '',
                                    })}
                                    className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1"
                                    title="Rectificar si se cobró en Efectivo, Tarjeta o Transferencia"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    Cambiar Pago
                                  </button>
                                )}

                                <button
                                  onClick={() => setReopenModal({
                                    open: true,
                                    account,
                                    reason: '',
                                    pin: '',
                                  })}
                                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                                  title="Reabrir la orden para modificar platillos"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Reabrir Cuenta
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'expenses' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs text-slate-500">
                      Gastos y retiros efectuados de la caja chica durante el turno actual.
                    </span>
                    <button
                      onClick={() => setShowExpenseModal(true)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Nuevo Retiro
                    </button>
                  </div>

                  {(!s.expenses || s.expenses.length === 0) ? (
                    <p className="text-xs text-slate-400 text-center py-8">No se han registrado retiros de efectivo en este turno.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {s.expenses.map((expense) => (
                        <div key={expense.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm text-slate-900">{expense.reason}</div>
                            <div className="text-xs text-slate-500">
                              Autorizado por: {expense.authorizer_name || 'Supervisor'} • {new Date(expense.created_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span className="text-base font-extrabold text-rose-600">
                            - Q {Number(expense.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'open_accounts' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Hay mesas o cuentas activas que aún no han sido cobradas. Debes cobrarlas o cancelarlas antes de hacer el cierre de día.</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {(s.openAccounts || []).map((account) => (
                      <div key={account.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-slate-900">Cuenta #{account.check_number}</div>
                          <div className="text-xs text-slate-500">Mesero: {account.waiter_name || '---'}</div>
                        </div>
                        <span className="text-sm font-bold text-amber-700">
                          Q {Number(account.total).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'voided' && (
                <div className="space-y-2">
                  <div className="divide-y divide-slate-100">
                    {(s.voidedItems || []).map((v, i) => (
                      <div key={i} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono text-slate-500 font-bold">#{v.check_number}</span>
                          <span className="text-slate-800 font-medium ml-2">{v.product_name}</span>
                          {v.void_reason && <span className="text-slate-400 italic ml-2">({v.void_reason})</span>}
                        </div>
                        <span className="text-rose-600 font-bold">-Q {Number(v.line_total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* CASO 2: SIN TURNO ACTIVO - PANTALLA MODERNA DE APERTURA DE TURNO          */
          /* ========================================================================= */
          <div className="max-w-xl mx-auto py-8">
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-xs">
                  <Wallet className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Apertura de Turno de Caja</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Inicia la sesión de caja en {selectedCenterName} registrando el fondo inicial de cambio
                </p>
              </div>

              <div className="space-y-4">
                {/* Centro de Operación */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Centro de Operación / Sucursal
                  </label>
                  <select
                    value={selectedCenter || ''}
                    onChange={(e) => setSelectedCenter(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Fondo Inicial en Caja */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Fondo Inicial de Efectivo (Apertura)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">Q</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-2xl font-extrabold text-slate-900 focus:outline-none transition-all"
                    />
                  </div>
                  {/* Botones rápidos de fondo */}
                  <div className="flex gap-2 mt-2">
                    {[100, 200, 300, 500].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setOpeningCash(amt.toString())}
                        className="flex-1 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                      >
                        +Q{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nota de Apertura (opcional) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Nota de Apertura (Opcional)
                  </label>
                  <input
                    type="text"
                    value={openingNote}
                    onChange={(e) => setOpeningNote(e.target.value)}
                    placeholder="Ej. Billetes de baja denominación entregados"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Botón Abrir Turno - Solo con permiso shifts.open */}
              {hasPermission('shifts.open') ? (
                <button
                  onClick={handleOpenShift}
                  disabled={loading || !selectedCenter}
                  className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <PlayCircle className="w-5 h-5" />
                      Iniciar Turno y Abrir Caja
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-semibold text-amber-800">
                  No tienes autorización para abrir turnos de caja en esta terminal.
                </div>
              )}

              {/* Botón Cerrar Sesión / Salir PIN en tarjeta */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors py-2 px-4 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Cerrar sesión / Cambiar de Cajero (PIN)</span>
                </button>
              </div>
            </m.div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR RETIRO DE CAJA CHICA                                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-rose-600">
                  <Coins className="w-5 h-5" />
                  <h3 className="font-bold text-base text-slate-900">Registrar Retiro de Caja Chica</h3>
                </div>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Monto a Retirar
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">Q</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Motivo del Retiro / Gasto
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseForm.reason}
                    onChange={(e) => setExpenseForm({ ...expenseForm, reason: e.target.value })}
                    placeholder="Ej. Compra de hielo / Pago proveedor pan"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    PIN de Autorización (Supervisor / Admin)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={expenseForm.pin}
                      onChange={(e) => setExpenseForm({ ...expenseForm, pin: e.target.value })}
                      placeholder="Ingresa PIN de supervisor"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold tracking-widest text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingExpense}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    {submittingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Autorizar y Registrar'}
                  </button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: RECTIFICAR FORMA DE PAGO                                        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {changePaymentModal.open && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <CreditCard className="w-5 h-5" />
                  <h3 className="font-bold text-base text-slate-900">Rectificar Forma de Pago</h3>
                </div>
                <button
                  onClick={() => setChangePaymentModal({ ...changePaymentModal, open: false })}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cuenta:</span>
                  <span className="font-bold font-mono text-slate-900">#{changePaymentModal.account?.check_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto:</span>
                  <span className="font-bold text-slate-900">Q {Number(changePaymentModal.payment?.amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registrado actualmente como:</span>
                  <span className="font-bold text-blue-700 uppercase">{changePaymentModal.payment?.method}</span>
                </div>
              </div>

              <form onSubmit={handleChangePaymentSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Nueva Forma de Pago
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { code: 'cash', label: 'Efectivo', icon: Coins },
                      { code: 'card', label: 'Tarjeta', icon: CreditCard },
                      { code: 'transfer', label: 'Transf/QR', icon: Landmark },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const selected = changePaymentModal.newMethod === opt.code;
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => setChangePaymentModal({ ...changePaymentModal, newMethod: opt.code })}
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                            selected
                              ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-xs">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Motivo de la Corrección
                  </label>
                  <input
                    type="text"
                    value={changePaymentModal.reason}
                    onChange={(e) => setChangePaymentModal({ ...changePaymentModal, reason: e.target.value })}
                    placeholder="Ej. El cliente pagó con tarjeta POS BAC"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    PIN de Autorización (Supervisor / Admin)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={changePaymentModal.pin}
                      onChange={(e) => setChangePaymentModal({ ...changePaymentModal, pin: e.target.value })}
                      placeholder="Ingresa PIN de supervisor"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold tracking-widest text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setChangePaymentModal({ ...changePaymentModal, open: false })}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPaymentChange}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    {submittingPaymentChange ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Cambio'}
                  </button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: REABRIR CUENTA COMPLETA                                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {reopenModal.open && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-rose-600">
                  <RefreshCw className="w-5 h-5" />
                  <h3 className="font-bold text-base text-slate-900">Reabrir Cuenta #{reopenModal.account?.check_number}</h3>
                </div>
                <button
                  onClick={() => setReopenModal({ ...reopenModal, open: false })}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-800">
                La cuenta volverá al estado activo para que puedas añadir o eliminar platillos o aplicar descuentos, y deberá cobrarse nuevamente antes del cierre definitivo.
              </div>

              <form onSubmit={handleReopenSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Motivo de la Reapertura
                  </label>
                  <input
                    type="text"
                    required
                    value={reopenModal.reason}
                    onChange={(e) => setReopenModal({ ...reopenModal, reason: e.target.value })}
                    placeholder="Ej. Corrección de platillo o anulación parcial"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    PIN de Autorización (Supervisor / Admin)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={reopenModal.pin}
                      onChange={(e) => setReopenModal({ ...reopenModal, pin: e.target.value })}
                      placeholder="Ingresa PIN de supervisor"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold tracking-widest text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setReopenModal({ ...reopenModal, open: false })}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReopen}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    {submittingReopen ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Autorizar Reapertura'}
                  </button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRMACIÓN FINAL DE CIERRE Z                                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showConfirmClose && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 text-center space-y-4"
            >
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <AlertTriangle className="w-7 h-7 text-rose-600" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">¿Finalizar y Cerrar Turno?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Se emitirá la tira final de auditoría (Corte Z) y la caja quedará inhabilitada. Esta acción es irreversible.
                </p>
              </div>

              {/* Resumen de cuadre */}
              <div className="bg-slate-50 rounded-2xl p-3.5 text-xs text-left space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Esperado en Sistema:</span>
                  <span className="font-bold text-slate-900">Q {expectedCashNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Efectivo Contado:</span>
                  <span className="font-bold text-blue-700">
                    {closingCashNum !== null ? `Q ${closingCashNum.toFixed(2)}` : 'Q 0.00'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="font-bold text-slate-700">Diferencia:</span>
                  <span className={`font-bold ${
                    cashDiff === 0 ? 'text-emerald-600' : (cashDiff || 0) > 0 ? 'text-blue-600' : 'text-rose-600'
                  }`}>
                    {cashDiff !== null ? `${cashDiff >= 0 ? '+' : ''}Q ${cashDiff.toFixed(2)}` : 'Q 0.00'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowConfirmClose(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
                >
                  Regresar
                </button>
                <button
                  onClick={confirmCloseShift}
                  disabled={loading}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Cierre'}
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}