import api from '../api';
import { printPrecheckThermal } from './printReceipts';

/**
 * Despacha la impresión de la precuenta directamente a la impresora de la terminal.
 * Si la terminal no tiene impresora o la comunicación falla, ejecuta fallback a ventana del navegador.
 */
export async function executePrecheckPrint({
  accountId,
  selectedTerminal = null,
  businessProfile = {},
  toast = null,
}) {
  const terminalId = selectedTerminal?.id || null;
  const terminalLabel = selectedTerminal?.name || 'terminal';

  try {
    const res = await api.printPrecheck(accountId, terminalId);

    if (res?.printedDirectly) {
      if (toast) {
        toast.success(`Precuenta impresa en ${res.terminalName || terminalLabel}`);
      }
      return { ok: true, printedDirectly: true };
    }

    // Fallback acordado: si la impresora de red/agente no respondió o no está configurada
    const reason = res?.printError || 'Impresora no conectada';
    if (toast) {
      toast.warning(`${reason}: usando impresión del navegador.`);
    }

    printPrecheckThermal({
      account: res?.account || {},
      items: res?.items || [],
      totals: res?.totals || {},
      businessProfile: res?.businessProfile || businessProfile,
    });

    return { ok: true, printedDirectly: false, fallback: true };
  } catch (err) {
    if (toast) {
      toast.error(err.message || 'Error al procesar precuenta');
    }
    throw err;
  }
}

