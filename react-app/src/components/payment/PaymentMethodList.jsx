import { Zap, Split, CheckCircle2, Trash2, Plus, AlertCircle, Check, Loader2 } from 'lucide-react';
import api from '../../api';
import { DEFAULT_METHODS } from './constants';

export function PaymentMethodList({
  currencySymbol,
  pending,
  currentTotals,
  isSplitMode,
  setIsSplitMode,
  lines,
  setLines,
  activeLine,
  setActiveLineId,
  paymentMethods,
  existingPayments,
  showExistingPayments,
  setShowExistingPayments,
  deletingPaymentId,
  handleDeleteExistingPayment,
  handleSelectSimpleMethod,
  handleAddPaymentLine,
  updateLineField,
  removeLine,
  totalAssigned,
  totalCashChange,
  isExact,
  isShort,
  isOver,
  remaining,
  overage,
  cashLinesWithShortage,
  loading,
  wantsInvoice,
  handleCloseAccountDirectly,
  handlePay,
  setCxcClients,
  searchPmsRooms,
}) {
  return (
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
              setLines([
                {
                  id: newId,
                  method: 'cash',
                  methodLabel: 'Efectivo',
                  amount: pending.toFixed(2),
                  received: pending.toFixed(2),
                  reference: '',
                  cxcClientId: null,
                  cxcClientName: '',
                },
              ]);
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
            isSplitMode ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
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
              Pagado: {currencySymbol}
              {Number(currentTotals?.paid || 0).toFixed(2)} ({existingPayments.length})
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
              {existingPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center bg-white p-1.5 rounded-lg border border-amber-200 text-[11px]"
                >
                  <span>
                    {p.method_label || p.method}: {currencySymbol}
                    {Number(p.amount).toFixed(2)}
                  </span>
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
            {paymentMethods.map((method) => {
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
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`text-xs font-black ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                        {method.label}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {method.code === 'cash'
                          ? 'Efectivo, billetes y cambio'
                          : method.code === 'card'
                          ? 'Tarjeta crédito / débito'
                          : method.code === 'transfer'
                          ? 'Transferencia electrónica'
                          : method.code === 'cxc'
                          ? 'Crédito Folio a cliente'
                          : 'Cargo a huésped de hotel'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {isSelected && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black font-mono text-emerald-700">
                          {currencySymbol}
                          {pending.toFixed(2)}
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
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isExact
                    ? 'bg-emerald-100 text-emerald-800'
                    : isShort
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isExact
                  ? '✓ 100% Cubierto'
                  : isShort
                  ? `Faltan ${currencySymbol}${remaining.toFixed(2)}`
                  : `Excede ${currencySymbol}${overage.toFixed(2)}`}
              </span>
            </div>

            {lines.map((line, idx) => {
              const methodConfig = paymentMethods.find((m) => m.code === line.method) || DEFAULT_METHODS[0];
              const Icon = methodConfig.icon;
              const isLineActive = activeLine?.id === line.id;
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
                      <span
                        className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center ${
                          isLineActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Icon className="w-4 h-4 text-slate-600" />
                        <select
                          value={line.method}
                          aria-label={`Método de pago para línea ${idx + 1}`}
                          onChange={async (e) => {
                            const newMethod = paymentMethods.find((m) => m.code === e.target.value);
                            if (!newMethod) return;
                            updateLineField(line.id, 'method', newMethod.code);
                            updateLineField(line.id, 'methodLabel', newMethod.label);
                            if (newMethod.code === 'cash') {
                              updateLineField(line.id, 'received', line.amount);
                            }
                            if (newMethod.code === 'cxc') {
                              try {
                                const data = await api.cxc.getClients();
                                setCxcClients(data.filter((c) => c.cxc_enabled));
                              } catch (err) {}
                            }
                            if (newMethod.code === 'room_charge') {
                              searchPmsRooms('');
                            }
                          }}
                          className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-slate-800 focus:outline-hidden cursor-pointer"
                        >
                          {paymentMethods.map((m) => (
                            <option key={m.code} value={m.code}>
                              {m.label}
                            </option>
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
                      {line.method === 'cxc' && line.cxcClientName
                        ? `Cliente: ${line.cxcClientName}`
                        : line.method === 'room_charge' && line.pmsRoomNumber
                        ? `Hab. #${line.pmsRoomNumber}`
                        : line.method === 'cash'
                        ? `Recibido: ${currencySymbol}${Number(line.received || 0).toFixed(2)}`
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
                  Cubrir restante ({currencySymbol}
                  {remaining.toFixed(2)}) con:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {paymentMethods.map((method) => {
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
            <span className="font-mono font-bold text-slate-800">
              {currencySymbol} {pending.toFixed(2)}
            </span>
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
              <span className="font-mono font-black text-sm">
                {currencySymbol} {totalCashChange.toFixed(2)}
              </span>
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
                <span>
                  Faltan {currencySymbol} {remaining.toFixed(2)}
                </span>
              </>
            ) : isOver ? (
              <>
                <AlertCircle className="w-4 h-4 text-slate-400" />
                <span>
                  Excede por {currencySymbol} {overage.toFixed(2)}
                </span>
              </>
            ) : cashLinesWithShortage.length > 0 ? (
              <>
                <AlertCircle className="w-4 h-4 text-slate-400" />
                <span>Efectivo recibido insuficiente</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  {wantsInvoice
                    ? `Cobrar y Facturar ${currencySymbol} ${pending.toFixed(2)}`
                    : `Cobrar ${currencySymbol} ${pending.toFixed(2)}`}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
