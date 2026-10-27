import { m } from 'framer-motion';
import { X, Split, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { usePaymentModal } from './payment/usePaymentModal';
import { PaymentFelBar } from './payment/PaymentFelBar';
import { PaymentMethodList } from './payment/PaymentMethodList';
import { PaymentNumpad } from './payment/PaymentNumpad';
import { PaymentCxcDialog } from './payment/PaymentCxcDialog';
import { PaymentSuccessView } from './payment/PaymentSuccessView';

export function PaymentModal({ accountId, totals, onClose, onSuccess }) {
  const {
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
  } = usePaymentModal({ accountId, totals, onClose, onSuccess });

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
        <PaymentFelBar
          showFelPanel={showFelPanel}
          felConfig={felConfig}
          wantsInvoice={wantsInvoice}
          setWantsInvoice={setWantsInvoice}
          recipientNit={recipientNit}
          setRecipientNit={setRecipientNit}
          recipientName={recipientName}
          setRecipientName={setRecipientName}
          recipientAddress={recipientAddress}
          setRecipientAddress={setRecipientAddress}
          searchingNit={searchingNit}
          handleSearchNit={handleSearchNit}
          handleSetCF={handleSetCF}
        />

        {/* CONTENEDOR PRINCIPAL */}
        {step === 'success' ? (
          <PaymentSuccessView />
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* COLUMNA IZQUIERDA: MÉTODOS Y RESUMEN */}
            <PaymentMethodList
              currencySymbol={currencySymbol}
              pending={pending}
              currentTotals={currentTotals}
              isSplitMode={isSplitMode}
              setIsSplitMode={setIsSplitMode}
              lines={lines}
              setLines={setLines}
              activeLine={activeLine}
              setActiveLineId={setActiveLineId}
              paymentMethods={paymentMethods}
              existingPayments={existingPayments}
              showExistingPayments={showExistingPayments}
              setShowExistingPayments={setShowExistingPayments}
              deletingPaymentId={deletingPaymentId}
              handleDeleteExistingPayment={handleDeleteExistingPayment}
              handleSelectSimpleMethod={handleSelectSimpleMethod}
              handleAddPaymentLine={handleAddPaymentLine}
              handleChangeLineMethod={handleChangeLineMethod}
              updateLineField={updateLineField}
              removeLine={removeLine}
              totalAssigned={totalAssigned}
              totalCashChange={totalCashChange}
              isExact={isExact}
              isShort={isShort}
              isOver={isOver}
              remaining={remaining}
              overage={overage}
              cashLinesWithShortage={cashLinesWithShortage}
              loading={loading}
              wantsInvoice={wantsInvoice}
              handleCloseAccountDirectly={handleCloseAccountDirectly}
              handlePay={handlePay}
            />

            {/* COLUMNA DERECHA: HERRAMIENTAS TÁCTILES Y NUMPAD */}
            <PaymentNumpad
              activeLine={activeLine}
              lines={lines}
              isSplitMode={isSplitMode}
              numpadField={numpadField}
              setNumpadField={setNumpadField}
              currencySymbol={currencySymbol}
              updateLineField={updateLineField}
              handleExactCash={handleExactCash}
              handleBillClick={handleBillClick}
              handleCoinClick={handleCoinClick}
              handleNumpadPress={handleNumpadPress}
              cxcClients={cxcClients}
              cxcSearch={cxcSearch}
              setCxcSearch={setCxcSearch}
              handleSelectCxcClient={handleSelectCxcClient}
              setCreditLimitAlert={setCreditLimitAlert}
              pmsRooms={pmsRooms}
              pmsSearch={pmsSearch}
              setPmsSearch={setPmsSearch}
              searchPmsRooms={searchPmsRooms}
              loadingPmsRooms={loadingPmsRooms}
            />
          </div>
        )}

        {/* MODAL DE ALERTA DE LÍMITE DE CRÉDITO CXC */}
        <PaymentCxcDialog
          creditLimitAlert={creditLimitAlert}
          setCreditLimitAlert={setCreditLimitAlert}
          currencySymbol={currencySymbol}
          handleApplyCreditSplit={handleApplyCreditSplit}
          handleCancelCreditAlert={handleCancelCreditAlert}
        />
      </m.div>

      {/* Modal de confirmación para eliminación de pagos existentes */}
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

export default PaymentModal;
