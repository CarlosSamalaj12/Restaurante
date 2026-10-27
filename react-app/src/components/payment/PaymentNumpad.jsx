import {
  Banknote,
  CreditCard,
  Smartphone,
  BedDouble,
  UserCheck,
  Coins,
  Delete,
  AlertTriangle,
  Split,
  Search,
  Loader2,
} from 'lucide-react';
import { BILLS, COINS } from './constants';

export function PaymentNumpad({
  activeLine,
  lines,
  isSplitMode,
  numpadField,
  setNumpadField,
  currencySymbol,
  updateLineField,
  handleExactCash,
  handleBillClick,
  handleCoinClick,
  handleNumpadPress,
  cxcClients,
  cxcSearch,
  setCxcSearch,
  handleSelectCxcClient,
  setCreditLimitAlert,
  pmsRooms,
  pmsSearch,
  setPmsSearch,
  searchPmsRooms,
  loadingPmsRooms,
}) {
  if (!activeLine) return null;

  return (
    <div className="w-full md:w-7/12 lg:w-8/12 flex flex-col bg-slate-50/80 overflow-y-auto p-4 sm:p-5 h-full">
      <div className="flex-1 flex flex-col justify-between space-y-4">
        {/* CABECERA DE LA COLUMNA DERECHA */}
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                activeLine.method === 'cash'
                  ? 'bg-emerald-600'
                  : activeLine.method === 'card'
                  ? 'bg-blue-600'
                  : activeLine.method === 'transfer'
                  ? 'bg-violet-600'
                  : activeLine.method === 'cxc'
                  ? 'bg-amber-600'
                  : 'bg-teal-600'
              }`}
            >
              {activeLine.method === 'cash' ? (
                <Banknote className="w-4 h-4" />
              ) : activeLine.method === 'card' ? (
                <CreditCard className="w-4 h-4" />
              ) : activeLine.method === 'transfer' ? (
                <Smartphone className="w-4 h-4" />
              ) : activeLine.method === 'cxc' ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <BedDouble className="w-4 h-4" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">{activeLine.methodLabel}</h4>
              <p className="text-[10px] text-slate-500">
                {isSplitMode
                  ? `Configurando Línea #${lines.findIndex((l) => l.id === activeLine.id) + 1}`
                  : 'Configuración de cobro'}
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
                <div
                  className={`p-3.5 rounded-2xl border-2 transition-colors duration-150 ${
                    numpadField === 'received'
                      ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
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
                <div
                  className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between ${
                    lineRec >= lineAmt && lineAmt > 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                      : lineShortage > 0
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
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
                  {BILLS.map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => handleBillClick(activeLine.id, bill)}
                      className="py-2 bg-white hover:bg-slate-100 active:bg-emerald-600 active:text-white rounded-xl text-xs font-black text-slate-800 border border-slate-300 shadow-2xs font-mono transition-colors cursor-pointer"
                    >
                      {currencySymbol}
                      {bill}
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
                  {COINS.map((coin) => (
                    <button
                      key={coin}
                      type="button"
                      onClick={() => handleCoinClick(activeLine.id, coin)}
                      className="py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl text-xs font-black text-amber-900 font-mono transition-colors cursor-pointer"
                    >
                      +{currencySymbol}
                      {coin.toFixed(2)}
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
                  {['7', '8', '9', 'C'].map((k) => (
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
                  {['4', '5', '6', 'BACK'].map((k) => (
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
                  {['1', '2', '3', 'EXACT'].map((k) => (
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
                  {['0', '00', '.', 'REMAINING'].map((k) => (
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
                      {currencySymbol}
                      {Number(activeLine.cxcCreditLimit || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Deuda</p>
                    <p className="font-mono font-bold text-xs text-rose-700">
                      {currencySymbol}
                      {Number(activeLine.cxcCurrentBalance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <p className="text-[10px] text-emerald-800 font-bold uppercase">Cupo Disp.</p>
                    <p className="font-mono font-black text-xs text-emerald-800">
                      {currencySymbol}
                      {Number(activeLine.cxcAvailableCredit || 0).toFixed(2)}
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
                      El cliente solo puede cubrir {currencySymbol}
                      {Number(activeLine.cxcAvailableCredit || 0).toFixed(2)}. Puedes ajustar y dividir el restante.
                    </p>
                    {Number(activeLine.cxcAvailableCredit || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const avail = Number(activeLine.cxcAvailableCredit || 0);
                          const excess = Math.max(
                            0,
                            Math.round((parseFloat(activeLine.amount || 0) - avail) * 100) / 100
                          );
                          setCreditLimitAlert({
                            client: {
                              id: activeLine.cxcClientId,
                              full_name: activeLine.cxcClientName,
                              credit_limit: activeLine.cxcCreditLimit,
                              current_balance: activeLine.cxcCurrentBalance,
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
                        <span>
                          Dividir y cargar cupo disponible ({currencySymbol}
                          {Number(activeLine.cxcAvailableCredit || 0).toFixed(2)})
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs space-y-3">
                <label
                  htmlFor="cxc-client-search"
                  className="text-xs font-bold text-amber-900 uppercase tracking-wider block"
                >
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
                    .filter((c) => c.full_name?.toLowerCase().includes(cxcSearch.toLowerCase()))
                    .map((client) => {
                      const available = Math.max(
                        0,
                        Number(client.credit_limit || 0) - Number(client.current_balance || 0)
                      );
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleSelectCxcClient(activeLine.id, client)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/60 transition-colors duration-150 flex items-center justify-between text-left cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-black text-slate-900">{client.full_name}</p>
                            <p className="text-[10px] text-slate-500">
                              Deuda actual: {currencySymbol}
                              {Number(client.current_balance || 0).toFixed(2)}
                            </p>
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                              available > 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            Cupo: {currencySymbol}
                            {available.toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  {cxcClients.length === 0 && (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      No hay clientes con crédito habilitado
                    </p>
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
              <label
                htmlFor="card-transfer-amount"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1"
              >
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
              <label
                htmlFor="card-transfer-ref"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1"
              >
                No. Autorización / Voucher / Referencia Bancaria
              </label>
              <input
                id="card-transfer-ref"
                type="text"
                value={activeLine.reference}
                onChange={(e) => updateLineField(activeLine.id, 'reference', e.target.value)}
                aria-label="Número de autorización, voucher o referencia bancaria"
                placeholder={
                  activeLine.method === 'card'
                    ? 'Ej. Auth 4920 o últimos 4 dígitos'
                    : 'Ej. No. Transacción bancaria'
                }
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
                  <span className="font-mono font-black text-teal-800">
                    {currencySymbol}
                    {Number(activeLine.pmsAvailableCredit || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label
                  htmlFor="pms-search-input"
                  className="text-xs font-bold text-teal-900 uppercase tracking-wider block"
                >
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
                    pmsRooms.map((room) => {
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
                            <p className="text-xs font-black text-slate-900">
                              Hab. #{room.room_number} · {room.guest?.full_name}
                            </p>
                            <p className="text-[10px] text-slate-500">{room.room_type}</p>
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                              isAllowed
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
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
    </div>
  );
}
