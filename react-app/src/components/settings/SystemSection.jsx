import { useState, useEffect, useRef } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  Save
} from 'lucide-react';

// System Section
function resizeImage(dataUrl, maxW, maxH, quality = 0.8, format = 'image/jpeg') {
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
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL(format, quality));
    };
    img.src = dataUrl;
  });
}

export function SystemSection({ restaurantName, tipPercent, logoUrl, loginBgUrl, paymentMethods, onSaved }) {
  const [name, setName] = useState(restaurantName);
  const [tip, setTip] = useState(tipPercent);
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [logoBase64, setLogoBase64] = useState(null);
  const [bgPreview, setBgPreview] = useState(loginBgUrl);
  const [bgBase64, setBgBase64] = useState(null);
  const [saving, setSaving] = useState(false);
  const [excludedMethods, setExcludedMethods] = useState(['cxc']);
  const logoInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    setName(restaurantName);
    setTip(tipPercent);
  }, [restaurantName, tipPercent]);

  useEffect(() => {
    api.settings.getTipExcludedMethods().then(r => {
      if (r.excludedMethods) setExcludedMethods(r.excludedMethods);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLogoPreview(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    setBgPreview(loginBgUrl);
  }, [loginBgUrl]);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const resized = await resizeImage(dataUrl, 300, 300, 0.85, 'image/webp');
      setLogoBase64(resized);
      setLogoPreview(resized);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoBase64(null);
    setLogoPreview('');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleBgChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 10 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const resized = await resizeImage(dataUrl, 1920, 1080, 0.8, 'image/jpeg');
      setBgBase64(resized);
      setBgPreview(resized);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBg = () => {
    setBgBase64(null);
    setBgPreview('');
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (name.trim()) {
        await api.settings.updateBranding(name.trim());
      }
      if (logoBase64) {
        const result = await api.settings.uploadLogo(logoBase64);
        if (onSaved && result.logoUrl) {
          onSaved({ logoUrl: result.logoUrl });
        }
        setLogoBase64(null);
      }
      if (bgBase64) {
        const result = await api.settings.uploadLoginBg(bgBase64);
        if (onSaved && result.loginBgUrl) {
          onSaved({ loginBgUrl: result.loginBgUrl });
        }
        setBgBase64(null);
      }
      if (Number(tip) !== Number(tipPercent)) {
        await api.settings.updateTipConfig(Number(tip));
      }
      await api.settings.setTipExcludedMethods({ excludedMethods });
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error(error.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Configuración General
        </h2>
        <div className="bg-white rounded-xl p-4 space-y-6">
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo del Restaurante
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {logoPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Quitar logo
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <span className="text-xs text-gray-400">Se redimensiona a 300px máx. Formato WebP</span>
              </div>
            </div>
          </div>

          {/* Background image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fondo de pantalla de inicio de sesión
            </label>
            <div className="flex items-center gap-4">
              <div className="w-32 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                {bgPreview ? (
                  <img
                    src={bgPreview}
                    alt="Fondo login"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => bgInputRef.current?.click()}
                  className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {bgPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </button>
                {bgPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveBg}
                    className="text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Quitar fondo
                  </button>
                )}
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBgChange}
                  className="hidden"
                />
                <span className="text-xs text-gray-400">Se redimensiona a 1920px máx. Recomendado 16:9</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Restaurante
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi Restaurante"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Porcentaje de Propina (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={tip}
              onFocus={e => e.target.select()}
              onChange={(e) => setTip(e.target.value === '' ? 0 : Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Métodos que NO generan propina
            </label>
            <p className="text-xs text-gray-400 mb-2">Selecciona los métodos de pago que excluyen la propina</p>
            <div className="space-y-2">
              {(paymentMethods||[]).map(pm => {
                const isExcluded = excludedMethods.includes(pm.code);
                return (
                  <label key={pm.code} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isExcluded}
                      onChange={() => {
                        setExcludedMethods(prev =>
                          isExcluded ? prev.filter(c => c !== pm.code) : [...prev, pm.code]
                        );
                      }}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{pm.label}</span>
                    {isExcluded && <span className="text-xs text-red-500 ml-auto">Sin propina</span>}
                  </label>
                );
              })}
              {(!paymentMethods || paymentMethods.length === 0) && (
                <p className="text-xs text-gray-400">No hay métodos de pago configurados</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-500 hover:to-blue-400 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Acerca de
        </h2>
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">SamaPos</p>
              <p className="text-xs text-gray-500">Versión 1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Sistema de punto de venta para restaurantes
          </p>
        </div>
      </div>
    </div>
  );
}
