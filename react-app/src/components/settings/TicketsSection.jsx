import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import {
  Printer,
  Save,
  Loader2,
  Image as ImageIcon,
  Trash2,
  FileText,
  Building2,
  Phone,
  MapPin,
  FileCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

/**
 * Convierte una imagen a blanco y negro puro (monocromático de alto contraste)
 * óptimo para cabezales de impresión térmica de 203 DPI.
 */
function convertToThermalMonochrome(dataUrl, maxW = 384, maxH = 160, threshold = 180) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      // Fondo blanco para manejar PNGs con transparencia
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        // Luminancia estándar
        const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const val = v < threshold ? 0 : 255;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

export function TicketsSection({ onReload }) {
  const toast = useToast();
  const { reloadBranding } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('corte_x'); // 'corte_x' | 'corte_z' | 'precuenta'

  // Campos de formulario
  const [businessSubtitle, setBusinessSubtitle] = useState('POS RESTAURANTE & BAR');
  const [restaurantName, setRestaurantName] = useState('SAMAPOS ARQUEO');
  const [address, setAddress] = useState('Sucursal Zona 10 • Ciudad de Guatemala');
  const [taxId, setTaxId] = useState('8492048-2');
  const [phone, setPhone] = useState('(502) 2345-6789');
  const [receiptFooter, setReceiptFooter] = useState('¡Gracias por su preferencia!');
  const [shiftReceiptFooter, setShiftReceiptFooter] = useState(
    '💡 Arqueo parcial completado: Todos los cheques han sido consolidados según las formas de pago configuradas en el turno actual.'
  );
  const [receiptLogoUrl, setReceiptLogoUrl] = useState('');
  const [newLogoBase64, setNewLogoBase64] = useState(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.settings.getBusinessProfile();
      if (data) {
        if (data.business_subtitle) setBusinessSubtitle(data.business_subtitle);
        if (data.restaurant_name) setRestaurantName(data.restaurant_name);
        if (data.address) setAddress(data.address);
        if (data.tax_id) setTaxId(data.tax_id);
        if (data.phone) setPhone(data.phone);
        if (data.receipt_footer) setReceiptFooter(data.receipt_footer);
        if (data.shift_receipt_footer) setShiftReceiptFooter(data.shift_receipt_footer);
        if (data.receipt_logo_url) setReceiptLogoUrl(data.receipt_logo_url);
      }
    } catch (e) {
      toast.error('Error al cargar perfil de tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const rawUrl = ev.target.result;
        const bAndW = await convertToThermalMonochrome(rawUrl);
        setNewLogoBase64(bAndW);
        setReceiptLogoUrl(bAndW);
        toast.success('Logotipo optimizado en blanco y negro para impresora térmica');
      } catch (_) {
        toast.error('Error al procesar la imagen');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setNewLogoBase64(null);
    setReceiptLogoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalLogoUrl = receiptLogoUrl;

      if (newLogoBase64) {
        const logoRes = await api.settings.uploadReceiptLogo(newLogoBase64);
        if (logoRes.receiptLogoUrl) {
          finalLogoUrl = logoRes.receiptLogoUrl;
          setReceiptLogoUrl(finalLogoUrl);
          setNewLogoBase64(null);
        }
      } else if (!receiptLogoUrl) {
        await api.settings.uploadReceiptLogo('');
      }

      await api.settings.updateBusinessProfile({
        business_subtitle: businessSubtitle.trim(),
        restaurant_name: restaurantName.trim(),
        address: address.trim(),
        tax_id: taxId.trim(),
        phone: phone.trim(),
        receipt_footer: receiptFooter.trim(),
        shift_receipt_footer: shiftReceiptFooter.trim(),
        receipt_logo_url: finalLogoUrl || null,
      });

      toast.success('Configuración de tickets guardada con éxito');
      if (reloadBranding) await reloadBranding();
      if (onReload) onReload();
    } catch (e) {
      toast.error(e.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-semibold">Cargando personalización de tickets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CABECERA DE LA SECCIÓN */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            Personalización de Tickets y Comprobantes
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configura el encabezado fiscal, logotipo monocromático de alta definición y pies de página para cuentas y cierres de turno.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. LOGO MONOCROMÁTICO TÉRMICO */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  Logotipo para Impresora Térmica POS
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Optimizado automáticamente a 1-bit blanco y negro puro para evitar manchas de calor y garantizar impresión instantánea.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-36 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center p-2 overflow-hidden shrink-0">
                {receiptLogoUrl ? (
                  <img
                    src={receiptLogoUrl}
                    alt="Logo Térmico"
                    className="max-h-full max-w-full object-contain filter grayscale contrast-200"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400 font-semibold text-center">Sin logo asignado</span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    {receiptLogoUrl ? 'Cambiar imagen' : 'Subir logotipo'}
                  </button>
                  {receiptLogoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Quitar</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="text-[10px] text-slate-400">
                  Recomendado: imagen horizontal PNG o JPG de alto contraste (máx. 384x160 px).
                </p>
              </div>
            </div>
          </div>

          {/* 2. DATOS DE ENCABEZADO */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                Datos de Cabecera (Encabezado)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Se imprimen en la parte superior de todos los comprobantes (Cuentas, Precuentas y Arqueos).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subtítulo / Giro Comercial
                </label>
                <input
                  type="text"
                  value={businessSubtitle}
                  onChange={(e) => setBusinessSubtitle(e.target.value)}
                  placeholder="POS RESTAURANTE & BAR"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Comercial Principal
                </label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="SAMAPOS ARQUEO"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIT / Identificación Tributaria
                </label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="8492048-2"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono / PBX
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(502) 2345-6789"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección Comercial / Sucursal
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Sucursal Zona 10 • Ciudad de Guatemala"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. PIES DE PÁGINA DIFERENCIADOS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Pies de Página Diferenciados
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Define el mensaje final según el tipo de documento emitido.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pie de Página para Cuentas y Precuentas (Clientes)
                </label>
                <textarea
                  rows={2}
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="¡Gracias por su visita! Propina sugerida no incluida."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Aparece al pie del ticket entregado al cliente en mesa o mostrador.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pie de Página para Arqueo y Cierre de Caja (Corte X / Z)
                </label>
                <textarea
                  rows={2}
                  value={shiftReceiptFooter}
                  onChange={(e) => setShiftReceiptFooter(e.target.value)}
                  placeholder="💡 Arqueo parcial completado: Todos los cheques han sido consolidados según las formas de pago configuradas en el turno actual."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Nota de auditoría interna al final de la tira térmica de cierre de turno.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: PREVISUALIZADOR EN TIEMPO REAL */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col items-center">
          
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Vista Previa en Vivo
            </span>

            {/* SELECTOR DE VISTA PREVIA */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewMode('corte_x')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                  previewMode === 'corte_x' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Corte X
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('corte_z')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                  previewMode === 'corte_z' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Corte Z
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('precuenta')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                  previewMode === 'precuenta' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Precuenta
              </button>
            </div>
          </div>

          {/* SIMULADOR DE PAPEL TÉRMICO */}
          <div className="w-[310px] bg-white text-black p-4 rounded-xs shadow-2xl font-mono text-[10.5px] leading-tight select-none">
            
            {/* CABECERA */}
            <div className="text-center pb-2">
              {receiptLogoUrl && (
                <div className="mb-2 flex justify-center">
                  <img
                    src={receiptLogoUrl}
                    alt="Logo"
                    className="max-h-12 max-w-[130px] object-contain filter grayscale contrast-200"
                  />
                </div>
              )}
              <div className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                {businessSubtitle || 'POS RESTAURANTE & BAR'}
              </div>
              <div className="text-[15px] font-black uppercase tracking-tight text-black my-0.5">
                {restaurantName || 'SAMAPOS ARQUEO'}
              </div>
              <div className="text-[9.5px] text-slate-700">
                {address || 'Sucursal Zona 10 • Ciudad de Guatemala'}
              </div>
              <div className="text-[9.5px] font-semibold text-slate-800">
                NIT: {taxId || '8492048-2'} • Tel: {phone || '(502) 2345-6789'}
              </div>
            </div>

            {previewMode !== 'precuenta' ? (
              <>
                {/* BANNER NEGRO CORTE */}
                <div className="bg-black text-white text-center py-1 px-1 mt-1">
                  <div className="text-[11px] font-black tracking-wide uppercase">
                    {previewMode === 'corte_z' ? 'CORTE Z - CIERRE DEFINITIVO' : 'CORTE X - ARQUEO PARCIAL'}
                  </div>
                </div>
                <div className="text-center text-[8.5px] font-extrabold tracking-tight py-0.5 border-b border-black mb-2 uppercase">
                  {previewMode === 'corte_z' ? 'CIERRE FISCAL Y DE AUDITORÍA DEFINITIVO' : 'DOCUMENTO DE CONTROL INTERNO - NO CIERRA TURNO'}
                </div>

                {/* METADATOS */}
                <div className="border border-black rounded-xs p-1.5 mb-2 space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">TURNO ID:</span>
                    <span className="font-black text-black">#TRN-0004</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">CAJERO / OPERADOR:</span>
                    <span className="font-bold text-black">Carlos Samalaj</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">TERMINAL / CAJA:</span>
                    <span className="font-bold text-black">#POS-01 (Lado A)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">APERTURA TURNO:</span>
                    <span className="text-black">26/06/2026 09:30:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">{previewMode === 'corte_z' ? 'CIERRE TURNO:' : 'HORA IMPRESIÓN:'}</span>
                    <span className="font-black text-black">{previewMode === 'corte_z' ? '26/06/2026 23:15:00' : 'EN CURSO (23:04:13)'}</span>
                  </div>
                </div>

                {/* CAJA ARQUEO */}
                <div className="border-[1.5px] border-black rounded-xs p-1.5 my-1.5 space-y-0.5 text-[10px]">
                  <div className="font-black text-center text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    ARQUEO DE EFECTIVO EN CAJA
                  </div>
                  <div className="flex justify-between">
                    <span>Fondo Inicial (Base):</span>
                    <span className="font-bold">Q1,000.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(+) Ventas Efectivo:</span>
                    <span className="font-bold text-emerald-800">+Q846.45</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(-) Retiros Caja Chica:</span>
                    <span className="font-bold text-rose-800">-Q0.00</span>
                  </div>
                  <div className="border-t border-b border-black py-0.5 my-0.5 flex justify-between font-black text-[11px]">
                    <span>EFECTIVO ESPERADO:</span>
                    <span>Q1,846.45</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Efectivo Contado (Físico):</span>
                    <span className="font-black">Q1,846.45</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Diferencia:</span>
                    <span className="font-black text-emerald-700">Q0.00 (Cuadrado)</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-black my-2"></div>

                {/* DETALLE EJEMPLO */}
                <div className="space-y-1 text-[10px]">
                  <div className="font-black text-center text-[10.5px] uppercase">
                    DETALLE DE CHEQUES POR FORMA DE PAGO
                  </div>
                  <div className="bg-black text-white px-1 py-0.5 flex justify-between font-black uppercase text-[10px]">
                    <span>1. EFECTIVO (2 CHKS)</span>
                    <span>Q846.45</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span>CHK-0954 • 10:45 AM</span>
                    <span className="font-black">Q752.67</span>
                  </div>
                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-0.5">
                    <span>CHK-0978 • 11:20 AM</span>
                    <span className="font-black">Q93.78</span>
                  </div>
                </div>

                {/* BANNER VENTAS BRUTAS */}
                <div className="bg-black text-white p-1.5 mt-2 flex justify-between items-center text-[10px]">
                  <div>
                    <div className="text-[8px] font-bold text-slate-300">TOTAL FACTURADO</div>
                    <div className="text-[11px] font-black">VENTAS BRUTAS:</div>
                  </div>
                  <div className="text-[14px] font-black">Q2,362.95</div>
                </div>

                {/* PIE DE ARQUEO */}
                <div className="mt-2.5 text-[8.5px] leading-tight text-center text-slate-800 border-t border-dashed border-black pt-1.5">
                  {shiftReceiptFooter || '💡 Arqueo parcial completado.'}
                </div>
              </>
            ) : (
              <>
                {/* VISTA PREVIA PRECUENTA */}
                <div className="text-center font-black text-[11px] border-b border-black py-1 mb-2 uppercase">
                  *** ESTADO DE CUENTA / PRECUENTA ***
                </div>
                <div className="border border-black rounded-xs p-1.5 mb-2 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Comanda / Mesa:</span>
                    <span className="font-bold">Mesa 04 (CHK-0954)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mesero:</span>
                    <span>Carlos Samalaj</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span>26/06/2026 12:45 PM</span>
                  </div>
                </div>

                <div className="border-t border-b border-black py-1 my-1 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>2x Hamburguesa Clásica</span>
                    <span className="font-bold">Q130.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2x Cerveza Artesanal</span>
                    <span className="font-bold">Q60.00</span>
                  </div>
                </div>

                <div className="space-y-0.5 text-[10px] pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Q190.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Propina sugerida (10%):</span>
                    <span>Q19.00</span>
                  </div>
                  <div className="flex justify-between font-black text-[12px] border-t border-b border-black py-0.5">
                    <span>TOTAL A PAGAR:</span>
                    <span>Q209.00</span>
                  </div>
                </div>

                {/* PIE DE PRECUENTA */}
                <div className="mt-3 text-[9px] leading-tight text-center text-slate-800 border-t border-dashed border-black pt-2">
                  {receiptFooter || '¡Gracias por su preferencia!'}
                </div>
              </>
            )}

          </div>

          <div className="text-[10px] text-slate-500 mt-3 text-center">
            Diseño optimizado para rollos térmicos de 80mm y 58mm.
          </div>
        </div>
      </div>
    </div>
  );
}
