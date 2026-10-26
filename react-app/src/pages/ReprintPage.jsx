import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../hooks/useToast';
import { api } from '../api';
import {
  ArrowLeft, Search, Printer, FileText,
  Clock, ChevronDown, ChevronUp, Loader2, Coins, CreditCard,
  Building2, Users, Hash, Calendar, CheckCircle, X, AlertTriangle,
  RotateCcw, Lock, LogOut, UtensilsCrossed, Share2, Store, Check,
  RefreshCw, Eye, ShieldCheck, User, ChevronLeft, ChevronRight, SlidersHorizontal, MessageSquare
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ShiftTicketModal, printShiftTicket } from '../components/ShiftTicketModal';

// Icono minimalista de libreta de comandas de mesero (sin signo de moneda/dólar)
function NotebookMinimalIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="5" y="3" width="15" height="18" rx="2" />
      <line x1="9" y1="8" x2="16" y2="8" />
      <line x1="9" y1="12" x2="16" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
      <path d="M3 6.5h3.5" />
      <path d="M3 10.5h3.5" />
      <path d="M3 14.5h3.5" />
      <path d="M3 18.5h3.5" />
    </svg>
  );
}

const METHOD_CONFIG = {
  cash: { label: 'Efectivo', icon: Coins },
  card: { label: 'Tarjeta', icon: CreditCard },
  transfer: { label: 'Transferencia', icon: Building2 },
  cxc: { label: 'CXC', icon: Users },
  other: { label: 'Otro', icon: Coins },
};

// Formato de tiempo transcurrido amigable
function timeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = Math.max(0, now - past);
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

export function ReprintPage({ onBack, onSelectAccount }) {
  const toast = useToast();
  const { user, logout } = useAuth();
  
  // Navigation tabs: 'account' | 'kitchen' | 'shift'
  const [tab, setTab] = useState('account');
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const [tablesList, setTablesList] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [openAccountsCount, setOpenAccountsCount] = useState(0);
  const [showShiftTicketModal, setShowShiftTicketModal] = useState(false);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [quickFilter, setQuickFilter] = useState('active_shift'); // 'active_shift' | 'today' | 'last_hour' | 'pending' | 'paid' | 'all'
  
  // Results & Selected Account
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenModal, setReopenModal] = useState({ open: false, account: null });

  // Print Configuration state
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('default');
  const [printerOnline, setPrinterOnline] = useState(true);
  const [reprintReason, setReprintReason] = useState('Solicitud de cliente / División de cuenta');
  const [watermarkAudit, setWatermarkAudit] = useState(true);
  const [logSupervisor, setLogSupervisor] = useState(true);
  const [reprintCount, setReprintCount] = useState(2);

  // Shift list (Tab 3)
  const [closedShifts, setClosedShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [shiftReport, setShiftReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Kitchen items (Tab 2)
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loadingKitchen, setLoadingKitchen] = useState(false);
  const [selectedKitchenAccount, setSelectedKitchenAccount] = useState(null);

  // Initial load
  useEffect(() => {
    api.bootstrap().then(data => {
      const availCenters = data.centers || [];
      setCenters(availCenters);
      setTablesList(data.tables || []);
      setBusinessProfile(data.businessProfile || null);

      let preferredCenter = user?.operation_center_id
        ? availCenters.find(c => c.id === Number(user.operation_center_id))?.id
        : (availCenters[0]?.id || '');
      setSelectedCenter(preferredCenter);
    }).catch(() => {});

    // Load available printers
    api.getPrinters().then(list => {
      if (Array.isArray(list) && list.length > 0) {
        setPrinters(list);
        setSelectedPrinter(list[0].id || list[0].name || 'default');
      }
    }).catch(() => {});
  }, [user]);

  // Unique areas for current center
  const areasList = useMemo(() => {
    const set = new Set();
    tablesList.forEach(t => {
      if ((!selectedCenter || t.operation_center_id === Number(selectedCenter)) && t.area_name) {
        set.add(t.area_name);
      }
    });
    return Array.from(set);
  }, [tablesList, selectedCenter]);

  // Load active shift status & open count
  const checkShiftAndOpenCount = useCallback(async (centerId) => {
    if (!centerId) return;
    try {
      const shiftCheck = await api.checkActiveShift(centerId);
      setActiveShift(shiftCheck?.active ? shiftCheck.shift : null);
    } catch (_) {}

    try {
      const openAccounts = await api.getOpenAccounts(centerId);
      setOpenAccountsCount(Array.isArray(openAccounts) ? openAccounts.length : 0);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (selectedCenter) {
      checkShiftAndOpenCount(selectedCenter);
    }
  }, [selectedCenter, checkShiftAndOpenCount]);

  // Main search function
  const doSearch = useCallback(async () => {
    if (!selectedCenter) return;
    setSearching(true);
    try {
      let statusParam = 'all';
      if (quickFilter === 'pending') statusParam = 'open';
      else if (quickFilter === 'paid') statusParam = 'paid';

      let q = searchQuery.trim();
      let sDate = startDate;
      let eDate = endDate;

      // Handle Quick Filters
      if (quickFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        sDate = todayStr;
        eDate = todayStr;
      } else if (quickFilter === 'last_hour') {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        sDate = oneHourAgo;
      }

      const results = await api.searchPaidAccounts(
        q,
        selectedCenter,
        sDate || undefined,
        eDate || undefined,
        statusParam,
        selectedArea !== 'all' ? selectedArea : undefined
      );

      let filtered = Array.isArray(results) ? results : [];

      // Filter by active shift if selected
      if (quickFilter === 'active_shift' && activeShift) {
        filtered = filtered.filter(r => r.shift_id === activeShift.id || r.shift_status !== 'closed');
      }

      setSearchResults(filtered);

      // Auto-select first account if none selected
      if (filtered.length > 0 && !selectedAccount) {
        loadReceipt(filtered[0].id);
      } else if (filtered.length === 0) {
        setReceiptData(null);
        setSelectedAccount(null);
      }
    } catch (e) {
      toast.error(e.message || 'Error al buscar cuentas');
    } finally {
      setSearching(false);
    }
  }, [selectedCenter, searchQuery, startDate, endDate, quickFilter, selectedArea, activeShift, selectedAccount]);

  // Trigger search on dependencies
  useEffect(() => {
    if (selectedCenter && tab === 'account') {
      doSearch();
    }
  }, [selectedCenter, quickFilter, selectedArea, tab]);

  // Load full receipt
  const loadReceipt = async (accountId) => {
    if (!accountId) return;
    setLoadingReceipt(true);
    setSelectedAccount(accountId);
    try {
      const data = await api.getAccountReceipt(accountId);
      setReceiptData(data);
    } catch (e) {
      toast.error(e.message || 'Error al cargar detalle');
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Quick Filter handlers
  const handleQuickFilterClick = (filterKey) => {
    setQuickFilter(filterKey);
    if (filterKey === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (filterKey === 'last_hour') {
      setStartDate('');
      setEndDate('');
    } else if (filterKey === 'all') {
      setStartDate('');
      setEndDate('');
      setSearchQuery('');
    }
  };

  // Reopen account modal opener
  const handleReopen = () => {
    if (!receiptData?.account) return;
    const { account } = receiptData;
    if (account.shift_status === 'closed') {
      toast.error('No se puede reabrir: el turno de caja ya fue cerrado para mantener la integridad contable.');
      return;
    }
    setReopenModal({ open: true, account });
  };

  // Confirm and execute reopen
  const confirmReopenAccount = async () => {
    if (!reopenModal.account) return;
    const account = reopenModal.account;
    setReopening(true);
    try {
      const res = await api.reopenAccount(account.id, 'Reapertura para modificación desde módulo de reimpresiones');
      toast.success(res.message || 'Cuenta reabierta correctamente');
      setReopenModal({ open: false, account: null });
      if (onSelectAccount) {
        onSelectAccount({
          id: res.accountId || account.id,
          table_code: res.tableCode || account.table_code,
          table_id: res.tableId || account.table_id
        });
      } else {
        doSearch();
        loadReceipt(account.id);
      }
    } catch (e) {
      toast.error(e.message || 'Error al reabrir cuenta');
    } finally {
      setReopening(false);
    }
  };

  // Thermal Print Receipt (Pre-cuenta o Comprobante Final)
  const handlePrintReceipt = () => {
    if (!receiptData) {
      toast.error('Selecciona una cuenta para reimprimir');
      return;
    }
    const { account, items, payments, totals } = receiptData;
    const centerObj = centers.find(c => c.id === Number(selectedCenter));
    const restaurantName = businessProfile?.restaurant_name || centerObj?.name || 'RESTAURANTE PRINCIPAL';
    const subtitle = businessProfile?.business_subtitle || 'POS RESTAURANTE & BAR';
    const nit = businessProfile?.tax_id || businessProfile?.nit || '8492048-2';
    const phone = businessProfile?.phone || '2333-8800';
    const address = businessProfile?.address || centerObj?.name || 'Ciudad de Guatemala';
    const receiptLogo = businessProfile?.receipt_logo_url || null;
    const footerText = businessProfile?.receipt_footer || '¡Gracias por su visita!';
    const now = new Date().toLocaleString('es-GT');
    const isPaid = account.status === 'paid';
    const docTitle = isPaid ? '*** CUENTA FINAL / PAGADA ***' : '*** PRE-CUENTA / ESTADO ***';

    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Permite ventanas emergentes para imprimir');
      return;
    }

    setReprintCount(prev => prev + 1);

    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Ticket - #${account.check_number}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000 !important;
          }
          body {
            font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;
            width: 78mm;
            margin: 0 auto;
            padding: 4px 2px;
            color: #000 !important;
            background: #fff !important;
            font-size: 11px;
            line-height: 1.3;
            -webkit-font-smoothing: none !important;
            -moz-osx-font-smoothing: grayscale !important;
            font-smooth: never !important;
            text-rendering: geometricPrecision !important;
            image-rendering: pixelated !important;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .logo-box { text-align: center; margin-bottom: 4px; }
          .logo-box img { max-width: 130px; max-height: 55px; object-fit: contain; filter: grayscale(100%) contrast(300%); image-rendering: pixelated; }
          .header { text-align: center; border-bottom: 1.5px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
          .sub-giro { font-size: 10px; font-weight: bold; color: #000 !important; text-transform: uppercase; }
          .title { font-size: 17px; font-weight: 900; text-transform: uppercase; margin-bottom: 1px; color: #000 !important; line-height: 1.2; }
          .sub { font-size: 10px; margin-top: 1px; font-weight: bold; color: #000 !important; }
          .doc-type { font-size: 11px; font-weight: 900; margin: 4px 0 2px 0; letter-spacing: 0; color: #000 !important; }
          .meta { font-size: 10.5px; margin-bottom: 5px; padding-bottom: 4px; border-bottom: 1.5px dashed #000; line-height: 1.35; color: #000 !important; font-weight: bold; }
          .meta-row { display: flex; justify-content: space-between; padding: 1px 0; color: #000 !important; }
          .table-items { width: 100%; border-collapse: collapse; margin-top: 4px; color: #000 !important; }
          .table-items th { font-size: 10px; border-bottom: 1.5px solid #000; padding: 2px 0; text-transform: uppercase; font-weight: 900; color: #000 !important; }
          .table-items td { font-size: 11px; padding: 2.5px 0; border-bottom: 1px dotted #000; color: #000 !important; font-weight: 700; }
          .totals { margin-top: 5px; border-top: 1.5px solid #000; padding-top: 3px; font-size: 11px; color: #000 !important; }
          .tot-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-weight: 700; color: #000 !important; }
          .grand { font-size: 14px; font-weight: 900; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 3px 0; margin-top: 3px; color: #000 !important; }
          .watermark { text-align: center; font-weight: 900; font-size: 11px; margin-top: 6px; padding: 3px 0; border: 1.5px dashed #000; text-transform: uppercase; color: #000 !important; }
          .footer { text-align: center; font-size: 10px; margin-top: 10px; border-top: 1.5px dashed #000; padding-top: 4px; line-height: 1.3; font-weight: 700; color: #000 !important; }
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #000 !important;
              border-color: #000 !important;
            }
            body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;
              -webkit-font-smoothing: none !important;
              text-rendering: geometricPrecision !important;
            }
            @page {
              margin: 0;
              size: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${receiptLogo ? `
            <div class="logo-box">
              <img src="${receiptLogo}" alt="Logo" />
            </div>
          ` : ''}
          <div class="sub-giro">${subtitle}</div>
          <div class="title">${restaurantName}</div>
          <div class="sub">NIT: ${nit} • PBX: ${phone}</div>
          <div class="sub">${address}</div>
          <div class="doc-type">${docTitle}</div>
        </div>

        <div class="meta">
          <div class="meta-row"><span>Comanda:</span><span class="bold">#${account.check_number}</span></div>
          <div class="meta-row"><span>Mesa / Orden:</span><span class="bold">${account.table_code ? `Mesa ${account.table_code}` : 'Mostrador'}</span></div>
          <div class="meta-row"><span>Mesero / Atiende:</span><span>${account.waiter_name || 'Personal'}</span></div>
          <div class="meta-row"><span>Fecha y Hora:</span><span>${account.closed_at ? new Date(account.closed_at).toLocaleString('es-GT') : now}</span></div>
          <div class="meta-row"><span>Reimpresión:</span><span class="bold">#${reprintCount} (Auditoría POS)</span></div>
          ${reprintReason ? `<div class="meta-row"><span>Motivo:</span><span>${reprintReason}</span></div>` : ''}
        </div>

        <table class="table-items">
          <thead>
            <tr>
              <th style="text-align:left;width:20%;">Cant</th>
              <th style="text-align:left;width:55%;">Descripción</th>
              <th style="text-align:right;width:25%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(items || []).map(i => `
              <tr>
                <td style="font-weight:bold;">${i.qty}x</td>
                <td>${i.product_name}</td>
                <td style="text-align:right;font-weight:bold;">Q${Number(i.line_total).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="tot-row"><span>Subtotal:</span><span>Q${Number(totals.subtotal || 0).toFixed(2)}</span></div>
          ${Number(totals.discountTotal || 0) > 0 ? `
            <div class="tot-row" style="color:#000;"><span>Descuento:</span><span>-Q${Number(totals.discountTotal).toFixed(2)}</span></div>
          ` : ''}
          <div class="tot-row"><span>Propina (${totals.tipPercent || 0}%):</span><span>Q${Number(totals.tipAmount || 0).toFixed(2)}</span></div>
          <div class="tot-row grand"><span>TOTAL:</span><span>Q${Number(totals.total || 0).toFixed(2)}</span></div>
        </div>

        ${(payments || []).length > 0 ? `
          <div style="margin-top:6px;font-size:10.5px;">
            <div style="font-weight:bold;border-bottom:1px solid #000;padding-bottom:1px;margin-bottom:2px;">PAGOS REGISTRADOS:</div>
            ${payments.map(p => `
              <div style="display:flex;justify-content:space-between;padding:1px 0;">
                <span>${(p.method_label || p.method).toUpperCase()}</span>
                <span style="font-weight:bold;">Q${Number(p.amount).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${watermarkAudit ? `
          <div class="watermark">*** COPIA AUDITADA ***</div>
        ` : ''}

        <div class="footer">
          <div>${footerText}</div>
          <div style="font-size:8px;margin-top:2px;">SamaPos • Control de Restaurante • Reimpreso: ${now}</div>
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

  // Impresión de corte de caja de turno cerrado histórico
  const handlePrintShiftClosure = () => {
    if (!shiftReport) {
      toast.error('Selecciona un turno cerrado para reimprimir');
      return;
    }
    const { shift, summary: s } = shiftReport;
    const centerObj = centers.find(c => c.id === Number(selectedCenter));
    try {
      printShiftTicket({
        type: 'Z',
        shiftData: {
          ...s,
          shiftId: shift.id,
          openedAt: shift.opened_at,
          closedAt: shift.closed_at,
          closingCash: s.closingCash,
        },
        businessProfile,
        centerName: centerObj?.name || 'Centro de Operación',
        cashierName: shift.cashier_name || 'Cajero',
        terminalInfo: { code: 'POS-01', name: 'Histórico' },
      });
    } catch (e) {
      toast.error(e.message || 'Error al imprimir ticket');
    }
  };

  // Digital sharing via WhatsApp or Navigator Share
  const handleDigitalShare = () => {
    if (!receiptData) return;
    const { account, totals } = receiptData;
    const centerObj = centers.find(c => c.id === Number(selectedCenter));
    const restaurantName = businessProfile?.restaurant_name || centerObj?.name || 'Restaurante';
    const text = `*COMPROBANTE ${restaurantName}*\n` +
      `Cuenta: #${account.check_number}\n` +
      `Mesa: ${account.table_code || '---'}\n` +
      `Mesero: ${account.waiter_name || '---'}\n` +
      `Total: Q${Number(totals.total || 0).toFixed(2)}\n\n` +
      `¡Gracias por su preferencia!`;

    if (navigator.share) {
      navigator.share({
        title: `Comprobante Cuenta #${account.check_number}`,
        text: text,
      }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // Keyboard shortcut listener: ESC to back, F10 to print
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack && onBack();
      } else if (e.key === 'F10') {
        e.preventDefault();
        handlePrintReceipt();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [receiptData, selectedCenter, watermarkAudit, reprintReason]);

  // Tab 3: Shift report helpers
  const loadClosedShifts = async (centerId) => {
    setLoadingShifts(true);
    try {
      const data = await api.getClosedShifts(centerId);
      setClosedShifts(data || []);
      if (data && data.length > 0) {
        loadShiftReport(data[0].id);
      }
    } catch (e) {
      toast.error('Error al cargar turnos cerrados');
    } finally {
      setLoadingShifts(false);
    }
  };

  const loadShiftReport = async (shiftId) => {
    setLoadingReport(true);
    setSelectedShiftId(shiftId);
    try {
      const data = await api.getShiftReport(shiftId);
      setShiftReport(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (tab === 'shift' && selectedCenter) {
      loadClosedShifts(selectedCenter);
    }
  }, [tab, selectedCenter]);

  // Tab 2: Kitchen comanda reprint helper
  const handlePrintKitchenComanda = (itemOrAccount) => {
    const data = itemOrAccount || receiptData;
    if (!data || !data.account) {
      toast.error('Selecciona una comanda para reimprimir a cocina');
      return;
    }
    const { account, items } = data;
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Permite ventanas emergentes en tu navegador para imprimir');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Comanda Cocina - #${account.check_number}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: monospace; width: 78mm; margin: 0 auto; padding: 4px; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 4px; margin-bottom: 6px; }
          .title { font-size: 16px; font-weight: 900; }
          .item { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; padding: 3px 0; border-bottom: 1px dotted #ccc; }
          @media print {
            body { width: 100%; margin: 0; padding: 0; }
            @page { margin: 0; size: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">REIMPRESIÓN COMANDA</div>
          <div>Mesa: ${account.table_code || '---'} | Chk: #${account.check_number}</div>
          <div>Mesero: ${account.waiter_name || '---'}</div>
          <div>Hora: ${new Date().toLocaleTimeString('es-GT')}</div>
        </div>
        ${(items || []).map(i => `
          <div class="item">
            <span>${i.qty}x ${i.product_name}</span>
          </div>
          ${i.notes ? `<div style="font-size:11px;font-style:italic;color:#333;margin-bottom:2px;">* ${i.notes}</div>` : ''}
        `).join('')}
        <script>window.print();window.close();<\/script>
      </body>
      </html>
    `);
    win.document.close();
    toast.success(`Comanda #${account.check_number} enviada a impresión`);
  };

  const centerObj = centers.find(c => c.id === Number(selectedCenter));
  const userInitials = (user?.full_name || 'Carlos Samalaj')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  const formatDate = (d) => {
    if (!d) return '---';
    return new Date(d).toLocaleString('es-GT');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 text-slate-800 antialiased flex flex-col justify-between select-none">
      
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Volver al POS + Title + Pill Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              title="Regresar al POS [ESC]"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Volver al POS</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Reimpresión de Comandas & Cuentas
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[2.2]" />
                  Módulo Auditoría
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Historial de tickets, comandas activas y comprobantes emitidos
              </p>
            </div>
          </div>

          {/* Right: Center Selector + User Card + Exit PIN */}
          <div className="flex items-center gap-3">
            
            {/* Center Selector Dropdown */}
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer">
                <Store className="w-4 h-4 text-slate-500 shrink-0" />
                <select
                  value={selectedCenter}
                  onChange={(e) => {
                    setSelectedCenter(e.target.value);
                    setSelectedAccount(null);
                    setReceiptData(null);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
                >
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {areasList.length > 0 ? `— Salón ${areasList[0]}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* User Badge */}
            <div className="hidden md:flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {userInitials || 'CS'}
              </div>
              <div className="leading-tight text-left">
                <div className="text-xs font-bold text-slate-900">
                  {user?.full_name || 'Carlos Samalaj'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {user?.role ? user.role.toUpperCase() : 'Caja Principal 01'} • {activeShift ? 'Turno Activo' : 'Turno General'}
                </div>
              </div>
            </div>

            {/* Logout / Salir PIN */}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Cerrar sesión / Salir (PIN)"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
              <span className="hidden sm:inline">Salir (PIN)</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. BODY CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex-1 w-full space-y-4">
        
        {/* TOP NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 border border-slate-200/90 rounded-2xl shadow-2xs">
          
          {/* Tab 1: Reimprimir Cuenta / Pre-cuenta */}
          <button
            type="button"
            onClick={() => setTab('account')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'account'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <NotebookMinimalIcon className="w-4 h-4" />
            <span>Reimprimir Cuenta / Pre-cuenta</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              tab === 'account' ? 'bg-blue-500/80 text-white' : 'bg-slate-300 text-slate-700'
            }`}>
              {openAccountsCount > 0 ? `${openAccountsCount} activas` : `${searchResults.length} cuentas`}
            </span>
          </button>

          {/* Tab 2: Reimprimir Comanda Cocina / Barra */}
          <button
            type="button"
            onClick={() => setTab('kitchen')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'kitchen'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 stroke-[2.2]" />
            <span>Reimprimir Comanda Cocina / Barra</span>
          </button>

          {/* Tab 3: Reimprimir Cierre de Turno (Corte Z/X) */}
          <button
            type="button"
            onClick={() => setTab('shift')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'shift'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Printer className="w-4 h-4 stroke-[2.2]" />
            <span>Reimprimir Cierre de Turno (Corte Z/X)</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: REIMPRIMIR CUENTAS & PRE-CUENTAS (DISEÑO SOLICITADO) */}
        {/* ======================================================== */}
        {tab === 'account' && (
          <div className="space-y-4">
            
            {/* SEARCH & FILTERS CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
              
              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                
                {/* 1. Buscar por número o mesa */}
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>Buscar por número o mesa</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                      placeholder="CHK-0001 o Mesa 01"
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => { setSearchQuery(''); doSearch(); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Desde */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Desde</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-800 outline-none transition-all"
                  />
                </div>

                {/* 3. Hasta */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hasta</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-800 outline-none transition-all"
                  />
                </div>

                {/* 4. Área de Despacho */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Área de Despacho</span>
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                  >
                    <option value="all">Todas las áreas</option>
                    {areasList.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Action Button & Quick Filters Row */}
              <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                
                {/* Quick Filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 mr-1">Filtros rápidos:</span>
                  
                  <button
                    type="button"
                    onClick={() => handleQuickFilterClick('active_shift')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      quickFilter === 'active_shift'
                        ? 'bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs font-extrabold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                    }`}
                  >
                    Turno Activo (Actual)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFilterClick('today')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      quickFilter === 'today'
                        ? 'bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs font-extrabold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                    }`}
                  >
                    Hoy
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFilterClick('last_hour')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      quickFilter === 'last_hour'
                        ? 'bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs font-extrabold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                    }`}
                  >
                    Última Hora
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFilterClick('pending')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      quickFilter === 'pending'
                        ? 'bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs font-extrabold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                    }`}
                  >
                    Pendientes de Pago
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFilterClick('paid')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      quickFilter === 'paid'
                        ? 'bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs font-extrabold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                    }`}
                  >
                    Cobradas Recientes
                  </button>
                </div>

                {/* Primary Search Button */}
                <button
                  type="button"
                  onClick={doSearch}
                  disabled={searching}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>Buscar Cuentas</span>
                </button>

              </div>
            </div>

            {/* MAIN TWO-COLUMN WORKSPACE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* LEFT COLUMN: RESULTADOS (Lg:col-span-7) */}
              <div className="lg:col-span-7 space-y-3">
                
                {/* Results Header Bar */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm tracking-wide">
                      RESULTADOS ({searchResults.length})
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Sincronizado al momento
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    ↓ Más recientes primero
                  </span>
                </div>

                {/* Accounts List Container */}
                {searching ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-500">Buscando cuentas y comprobantes...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs space-y-2">
                    <NotebookMinimalIcon className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="font-bold text-slate-800 text-sm">No se encontraron cuentas</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Prueba cambiando los términos de búsqueda, el rango de fechas o los filtros rápidos arriba.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {searchResults.map(acc => {
                      const isSelected = selectedAccount === acc.id;
                      const isOpen = acc.status === 'open';
                      const isClosedShift = acc.shift_status === 'closed';

                      return (
                        <div
                          key={acc.id}
                          onClick={() => loadReceipt(acc.id)}
                          className={`rounded-2xl border p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                              : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Left icon + Details */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <NotebookMinimalIcon className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 space-y-1">
                              {/* Line 1: Check number + Table badge + Status badge */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                                  <NotebookMinimalIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  #{acc.check_number || `CHK-${acc.id}`}
                                </span>
                                
                                <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60">
                                  {acc.table_code ? `Mesa ${acc.table_code}` : 'Mostrador'}
                                </span>

                                {isOpen ? (
                                  <span className="text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
                                    Pendiente de cobro
                                  </span>
                                ) : isClosedShift ? (
                                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                    Turno cerrado
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    Turno activo
                                  </span>
                                )}
                              </div>

                              {/* Line 2: Waiter + Date & Time ago */}
                              <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-700">{acc.waiter_name || 'Mesero'}</span>
                                <span>•</span>
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{formatDate(acc.closed_at || acc.opened_at)}</span>
                                <span className="text-blue-600 font-semibold hidden sm:inline">
                                  ({timeAgo(acc.closed_at || acc.opened_at)})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Total + Action Button */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Total
                              </span>
                              <span className="font-mono font-extrabold text-slate-900 text-sm sm:text-base">
                                Q {Number(acc.total || 0).toFixed(2)}
                              </span>
                            </div>

                            {isSelected ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintReceipt();
                                }}
                                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-transform active:scale-90"
                                title="Reimprimir directamente este ticket [F10]"
                              >
                                <Printer className="w-4 h-4 stroke-[2.5]" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadReceipt(acc.id);
                                }}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                                title="Ver vista previa"
                              >
                                <Eye className="w-4 h-4 stroke-[2]" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Results Footer Pagination */}
                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>
                    Mostrando {searchResults.length} cuentas de {searchResults.length} registradas
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      disabled
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs">
                      1
                    </span>
                    <button
                      disabled
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: VISTA PREVIA TÉRMICA & CONFIGURACIÓN (Lg:col-span-5 Sticky) */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
                
                {/* CARD 1: VISTA PREVIA TÉRMICA */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                  
                  {/* Dark Header Bar */}
                  <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-400 stroke-[2.5]" />
                      <span className="text-xs font-black tracking-wider uppercase">
                        VISTA PREVIA TÉRMICA
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded tracking-wide uppercase">
                        COPIA / REIMPRESIÓN
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        80mm
                      </span>
                    </div>
                  </div>

                  {/* Thermal Paper Container */}
                  <div className="bg-slate-100/80 p-4 border-x border-b border-slate-200">
                    
                    {loadingReceipt ? (
                      <div className="py-20 text-center">
                        <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
                        <span className="text-xs font-semibold text-slate-500">Cargando comprobante...</span>
                      </div>
                    ) : receiptData ? (
                      <div className="bg-white rounded-lg shadow-sm border border-slate-200/90 p-5 font-mono text-xs text-slate-800 leading-tight space-y-2">
                        
                        {/* Restaurant Header */}
                        <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                          <div className="font-extrabold text-sm text-slate-900 tracking-wide uppercase">
                            {businessProfile?.restaurant_name || centerObj?.name || 'RESTAURANTE PRINCIPAL'}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            NIT: {businessProfile?.tax_id || businessProfile?.nit || '8392019-2'} • PBX: {businessProfile?.phone || '2333-8800'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {businessProfile?.address || 'Boulevard Los Próceres 12-40, Zona 10'}
                          </div>
                          <div className="font-black text-xs text-slate-900 pt-1 tracking-wider">
                            {receiptData.account.status === 'paid' ? '*** CUENTA FINAL / PAGADA ***' : '*** PRE-CUENTA / ESTADO ***'}
                          </div>
                        </div>

                        {/* Metadata block */}
                        <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Comanda:</span>
                            <span className="font-bold">#{receiptData.account.check_number || `CHK-${receiptData.account.id}`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Mesa / Orden:</span>
                            <span className="font-bold">{receiptData.account.table_code ? `Mesa ${receiptData.account.table_code}` : 'Mostrador'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Mesero / Atiende:</span>
                            <span>{receiptData.account.waiter_name || 'Carlos Samalaj'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Fecha y Hora:</span>
                            <span>{formatDate(receiptData.account.closed_at || receiptData.account.opened_at)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Reimpresión:</span>
                            <span className="font-bold text-rose-700">#{reprintCount} (Auditoría POS)</span>
                          </div>
                        </div>

                        {/* Items list */}
                        <div className="space-y-1 text-[11px] pt-1">
                          <div className="flex justify-between font-bold text-slate-400 uppercase text-[10px] border-b border-slate-200 pb-1">
                            <span>Cant Descripción</span>
                            <span>Total</span>
                          </div>

                          {(receiptData.items || []).map((it, idx) => (
                            <div key={idx} className="flex justify-between items-start py-0.5 border-b border-slate-100">
                              <span className="text-slate-800">
                                <strong className="text-slate-950">{it.qty}x</strong> {it.product_name}
                              </span>
                              <span className="font-bold text-slate-900 shrink-0">
                                Q {Number(it.line_total).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Totals */}
                        <div className="border-t border-slate-300 pt-2 space-y-1 text-[11px]">
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span>Q {Number(receiptData.totals?.subtotal || 0).toFixed(2)}</span>
                          </div>

                          {Number(receiptData.totals?.discountTotal || 0) > 0 && (
                            <div className="flex justify-between text-rose-600 font-semibold">
                              <span>Descuento</span>
                              <span>-Q {Number(receiptData.totals.discountTotal).toFixed(2)}</span>
                            </div>
                          )}

                          <div className="flex justify-between text-slate-600">
                            <span>Propina ({receiptData.totals?.tipPercent || 0}%)</span>
                            <span>Q {Number(receiptData.totals?.tipAmount || 0).toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between font-black text-sm text-slate-900 pt-1.5 border-t border-slate-300">
                            <span>TOTAL:</span>
                            <span>Q {Number(receiptData.totals?.total || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Payments (if registered) */}
                        {(receiptData.payments || []).length > 0 && (
                          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[10px]">
                            <div className="font-bold text-slate-600 uppercase">Pagos Registrados:</div>
                            {receiptData.payments.map((p, idx) => (
                              <div key={idx} className="flex justify-between text-slate-700">
                                <span>{(p.method_label || p.method).toUpperCase()}</span>
                                <span className="font-bold">Q {Number(p.amount).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Watermark Banner */}
                        {watermarkAudit && (
                          <div className="mt-3 py-1 border border-dashed border-slate-400 text-center font-black text-[11px] text-slate-700 tracking-wider">
                            *** COPIA AUDITADA ***
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-20 text-center space-y-2">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-500">
                          Selecciona una cuenta a la izquierda para ver su comprobante térmico
                        </p>
                      </div>
                    )}

                  </div>
                </div>

                {/* CARD 2: CONFIGURACIÓN DE IMPRESIÓN */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3.5 shadow-xs">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-slate-600 stroke-[2.5]" />
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        Configuración de Impresión
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Impresora en línea</span>
                    </div>
                  </div>

                  {/* 2 Inputs: Impresora Destino + Motivo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Impresora Destino */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Impresora Destino
                      </label>
                      <select
                        value={selectedPrinter}
                        onChange={(e) => setSelectedPrinter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                      >
                        {printers.length > 0 ? (
                          printers.map(p => (
                            <option key={p.id || p.name} value={p.id || p.name}>
                              {p.name} {p.interface_type ? `(${p.interface_type})` : ''}
                            </option>
                          ))
                        ) : (
                          <option value="default">EPSON TM-T20III (Caja 1 - Principal)</option>
                        )}
                      </select>
                    </div>

                    {/* Motivo de Reimpresión */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Motivo de Reimpresión
                      </label>
                      <input
                        type="text"
                        value={reprintReason}
                        onChange={(e) => setReprintReason(e.target.value)}
                        placeholder="Motivo de auditoría"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={watermarkAudit}
                        onChange={(e) => setWatermarkAudit(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Marcar marca de agua "COPIA AUDITADA"</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={logSupervisor}
                        onChange={(e) => setLogSupervisor(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Registrar en bitácora de supervisor</span>
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center gap-2.5 flex-wrap">
                    
                    {/* Reabrir Cuenta button (if shift active and account paid) */}
                    {receiptData?.account && receiptData.account.status === 'paid' && receiptData.account.shift_status !== 'closed' && (
                      <button
                        type="button"
                        onClick={handleReopen}
                        disabled={reopening}
                        className="px-3.5 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Reabrir cuenta para modificar productos o formas de pago"
                      >
                        {reopening ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 stroke-[2.5]" />}
                        <span className="hidden sm:inline">Reabrir</span>
                      </button>
                    )}

                    {/* Primary Print Button */}
                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      disabled={!receiptData || loadingReceipt}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Printer className="w-4 h-4 stroke-[2.5]" />
                      <span>REIMPRIMIR AHORA</span>
                      <span className="px-1.5 py-0.5 bg-blue-500/80 text-[10px] font-mono rounded">
                        F10
                      </span>
                    </button>

                    {/* Digital Share Button */}
                    <button
                      type="button"
                      onClick={handleDigitalShare}
                      disabled={!receiptData}
                      className="px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      title="Compartir comprobante vía WhatsApp o Digital"
                    >
                      <Share2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                      <span>Enviar Digital</span>
                    </button>

                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: REIMPRIMIR COMANDA COCINA / BARRA */}
        {/* ======================================================== */}
        {tab === 'kitchen' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Comandas List */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Comandas Disponibles ({searchResults.length})
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Cocina & Barra
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <NotebookMinimalIcon className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-xs">No hay comandas registradas con los filtros actuales</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
                  {searchResults.map(acc => {
                    const isSelected = selectedAccount === acc.id;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => loadReceipt(acc.id)}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-50/60 font-bold border-l-4 border-amber-500' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <NotebookMinimalIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-slate-900 text-sm">
                                #{acc.check_number || `CHK-${acc.id}`}
                              </span>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                {acc.table_code ? `Mesa ${acc.table_code}` : 'Mostrador'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                              <span>{acc.waiter_name || 'Mesero'}</span>
                              <span>•</span>
                              <span>{timeAgo(acc.closed_at || acc.opened_at)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadReceipt(acc.id).then(() => handlePrintKitchenComanda());
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                          title="Imprimir comanda a cocina directamente"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Comanda</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Kitchen Comanda Preview & Actions */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-amber-600" />
                    <span>Reimpresión de Comanda de Producción</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reenvía el ticket a la ticketera de cocina o barra si el ticket físico se extravió o manchó.
                  </p>
                </div>
              </div>

              {receiptData ? (
                <div className="space-y-4">
                  {/* Comanda details header card */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <NotebookMinimalIcon className="w-4 h-4 text-amber-700" />
                        <span className="font-mono font-extrabold text-slate-900 text-sm">
                          Comanda #{receiptData.account.check_number}
                        </span>
                        <span className="bg-amber-200 text-amber-900 font-bold text-[11px] px-2 py-0.5 rounded-full">
                          Mesa {receiptData.account.table_code || '---'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-2">
                        <span>Atiende: <strong>{receiptData.account.waiter_name || 'Mesero'}</strong></span>
                        <span>•</span>
                        <span>{receiptData.items?.length || 0} platillos registrados</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePrintKitchenComanda()}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Reimprimir Comanda Cocina</span>
                    </button>
                  </div>

                  {/* Items list with kitchen notes */}
                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 flex justify-between">
                      <span>Platillos a Preparar</span>
                      <span>Ubicación / Asiento</span>
                    </div>
                    {(receiptData.items || []).map((it, idx) => (
                      <div key={idx} className="p-3.5 flex items-start justify-between gap-3 bg-white hover:bg-slate-50/50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-amber-700 text-sm bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                              {it.qty}x
                            </span>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {it.product_name}
                            </span>
                          </div>
                          {it.notes && (
                            <div className="text-xs text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/70 inline-block font-semibold">
                              Nota de preparación: {it.notes}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md shrink-0">
                          {it.seat_no ? `Silla ${it.seat_no}` : 'General'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <NotebookMinimalIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">Selecciona una comanda de la lista</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Haz clic en cualquier comanda de la columna izquierda para ver el detalle y reimprimir su ticket de cocina.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: REIMPRIMIR CIERRE DE TURNO (CORTE Z/X) */}
        {/* ======================================================== */}
        {tab === 'shift' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Left Column: Closed Shifts List */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Turnos Históricos Cerrados
                </span>
                {loadingShifts && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
              </div>

              {closedShifts.length === 0 && !loadingShifts ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-xs">No hay turnos cerrados en este centro</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {closedShifts.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => loadShiftReport(s.id)}
                      className={`w-full flex items-center justify-between p-3.5 text-left transition-colors cursor-pointer ${
                        selectedShiftId === s.id ? 'bg-blue-50/60 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Turno #{s.id}</div>
                          <div className="text-[11px] text-slate-500">{formatDate(s.closed_at || s.opened_at)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-semibold">{s.cashier_name || 'Cajero'}</span>
                        {selectedShiftId === s.id && <Check className="w-4 h-4 text-blue-600 stroke-[2.5]" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Shift Preview & Print */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              {shiftReport ? (() => {
                const { shift, summary: s } = shiftReport;
                const totalChecks = (s.paidAccounts || []).length + (s.openAccounts || []).length;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                          Cierre de Turno #{shift.id} — Reimpresión Oficial
                        </h3>
                        <p className="text-xs text-slate-500">
                          Cajero: {shift.cashier_name || '---'} • Cerrado: {formatDate(shift.closed_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowShiftTicketModal(true)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                          <span>Vista Previa</span>
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintShiftClosure}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
                        >
                          <Printer className="w-4 h-4 stroke-[2.5]" />
                          <span>Imprimir Cierre</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Fondo Inicial</span>
                        <span className="font-mono font-extrabold text-slate-900 text-sm">Q {Number(s.openingCash || 0).toFixed(2)}</span>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block">Ventas Efectivo</span>
                        <span className="font-mono font-extrabold text-emerald-700 text-sm">+Q {Number(s.cashTotal || s.cash_total || 0).toFixed(2)}</span>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                        <span className="text-[10px] font-bold text-blue-600 uppercase block">Efectivo Esperado</span>
                        <span className="font-mono font-extrabold text-blue-800 text-sm">Q {Number(s.expectedCash || 0).toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-900 text-white rounded-xl p-3">
                        <span className="text-[10px] font-bold text-slate-300 uppercase block">Ventas Brutas</span>
                        <span className="font-mono font-extrabold text-white text-sm">Q {Number(s.grand_total || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Breakdown by methods */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                        Detalle por Forma de Pago:
                      </span>
                      {(s.methods || []).map((m, idx) => {
                        const tot = Number(s[m.code + '_total'] || 0);
                        if (tot === 0) return null;
                        return (
                          <div key={idx} className="flex justify-between py-1.5 px-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold">
                            <span>{m.label}</span>
                            <span className="font-mono font-bold text-slate-900">Q {tot.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })() : (
                <div className="py-20 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Selecciona un turno a la izquierda para ver su arqueo</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* 3. BOTTOM FIXED STATUS BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sistema POS Online v4.8</span>
          <span>|</span>
          <span>Base de datos: <strong>Local Sync Activo</strong></span>
          <span>|</span>
          <span>Servidor: <strong>192.168.1.150:8080</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <span>Atajo: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">[ESC]</kbd> Salir</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">[F10]</kbd> Imprimir Directo</span>
          <span>•</span>
          <span>Restaurante POS Pro © 2026</span>
        </div>
      </footer>

      {/* MODAL DE REAPERTURA CON DISEÑO MODERNO (SIN ALERTS NATIVOS) */}
      {reopenModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-base">
                  ¿Reabrir Cuenta #{reopenModal.account?.check_number}?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Esta acción revertirá el cobro de la <strong>Mesa {reopenModal.account?.table_code || '---'}</strong> para permitir modificaciones, agregar platillos o corregir pagos.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-medium">Total de la cuenta:</span>
                <span className="font-extrabold text-slate-900 font-mono">
                  Q {Number(reopenModal.account?.total || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-medium">Mesero / Atiende:</span>
                <span className="font-bold text-slate-800">{reopenModal.account?.waiter_name || 'Mesero'}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-800 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>La reapertura quedará registrada en la bitácora de auditoría.</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setReopenModal({ open: false, account: null })}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={reopening}
                onClick={confirmReopenAccount}
                className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {reopening ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reabriendo...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirmar Reapertura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PREVISUALIZACIÓN DE CIERRE HISTÓRICO */}
      {shiftReport && (
        <ShiftTicketModal
          isOpen={showShiftTicketModal}
          onClose={() => setShowShiftTicketModal(false)}
          type="Z"
          shiftData={{
            ...shiftReport.summary,
            shiftId: shiftReport.shift.id,
            openedAt: shiftReport.shift.opened_at,
            closedAt: shiftReport.shift.closed_at,
            closingCash: shiftReport.summary?.closingCash,
          }}
          businessProfile={businessProfile}
          centerName={centers.find(c => c.id === Number(selectedCenter))?.name || 'Centro de Operación'}
          cashierName={shiftReport.shift.cashier_name || 'Cajero'}
          terminalInfo={{ code: 'POS-01', name: 'Histórico' }}
        />
      )}

    </div>
  );
}
