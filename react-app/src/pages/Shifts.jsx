import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft,
  PlayCircle,
  StopCircle,
  Clock,
  Loader2,
  DollarSign,
  CreditCard,
  Check
} from 'lucide-react';

export function ShiftsPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [cashiers, setCashiers] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftSummary, setShiftSummary] = useState(null);
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadBootstrap();
  }, []);

  const loadBootstrap = async () => {
    try {
      const data = await api.bootstrap();
      setCenters(data.centers || []);
      setCashiers(data.cashiers || []);
      if (data.centers?.length > 0) {
        setSelectedCenter(data.centers[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const handleOpenShift = async () => {
    if (!selectedCenter) {
      toast.error('Selecciona un centro de operación');
      return;
    }
    setLoading(true);
    try {
      const result = await api.openShift({
        cashierId: user?.id || 1,
        centerId: selectedCenter,
        note: '',
      });
      toast.success('Turno abierto');
      setCurrentShift({ id: result.shiftId });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!selectedCenter) {
      toast.error('Selecciona un centro de operación');
      return;
    }
    setLoading(true);
    try {
      const result = await api.closeShift({
        cashierId: user?.id || 1,
        centerId: selectedCenter,
        note: '',
      });
      setShiftSummary(result.summary || {});
      toast.success('Turno cerrado');
      setCurrentShift(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Gestión de Turnos</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Center Selection */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Centro de Operación
          </label>
          <select
            value={selectedCenter || ''}
            onChange={(e) => setSelectedCenter(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl p-3"
          >
            <option value="">Seleccionar centro...</option>
            {centers.map(center => (
              <option key={center.id} value={center.id}>{center.name}</option>
            ))}
          </select>
        </div>

        {/* Cashier Info */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Cajero en Turno</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-semibold">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.full_name || 'Usuario'}</p>
              <p className="text-sm text-gray-500">{user?.role || 'Cajero'}</p>
            </div>
          </div>
        </div>

        {/* Current Shift Status */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            {currentShift ? (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <StopCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Turno Activo</p>
                  <p className="text-sm text-gray-500">Caja abierta desde hace...</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Sin Turno Activo</p>
                  <p className="text-sm text-gray-500">Abre un turno para comenzar</p>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          {currentShift ? (
            <button
              onClick={handleCloseShift}
              disabled={loading}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <StopCircle className="w-5 h-5" />
                  Cerrar Turno
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleOpenShift}
              disabled={loading || !selectedCenter}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  Abrir Turno
                </>
              )}
            </button>
          )}
        </div>

        {/* Shift Summary (after closing) */}
        {shiftSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 border border-gray-100"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Resumen del Turno</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600">Efectivo</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  Q{Number(shiftSummary.cash_total || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-600">Tarjeta</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  Q{Number(shiftSummary.card_total || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-3 bg-gray-50 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total de Cuentas</span>
                <span className="font-semibold text-gray-900">{shiftSummary.total_checks || 0}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-900">Total General</span>
                <span className="font-bold text-lg text-primary-600">
                  Q{Number(shiftSummary.grand_total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Info Card */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <h4 className="font-medium text-amber-800 mb-2">¿Por qué abrir/cerrar turno?</h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Control de caja por período</li>
            <li>• Reportes de ventas por turno</li>
            <li>• Responsabilidad del cajero en turno</li>
          </ul>
        </div>
      </div>
    </div>
  );
}