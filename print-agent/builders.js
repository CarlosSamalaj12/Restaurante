// print-agent/builders.js
// Generador de secuencias ESC/POS para tickets térmicos en el Print Agent

function buildKitchenTicket(ticket, center, account, copyInfo = null) {
  return (printer) => {
    const centerName = (center?.name || "COCINA").toUpperCase();
    const now = new Date();
    const time = now.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

    // En tamaño doble (1,1): 80mm tiene ~21-24 cols y 58mm tiene ~16 cols
    const is58mm = String(center?.paper_width || "").toLowerCase().includes("58");
    const divider = is58mm ? "----------------" : "--------------------";

    printer
      .align("ct")
      .style("b")
      .size(1, 1)
      .text(centerName);

    // Distinguir múltiples copias
    if (copyInfo && copyInfo.totalCopies > 1) {
      const copyLabel =
        copyInfo.copyNumber === 1
          ? "[ORIGINAL - COCINA]"
          : copyInfo.copyNumber === 2
          ? "[COPIA - DESPACHO]"
          : `[COPIA ${copyInfo.copyNumber}]`;
      printer
        .size(0, 0)
        .text(copyLabel)
        .size(1, 1);
    }

    printer
      .text(divider)
      .style("normal")
      .align("lt");

    // Mesa y Pedido en letra grande y negrita para visibilidad inmediata en cocina/bar
    if (account?.table_code) {
      printer.style("b").size(1, 1).text(`MESA:   ${account.table_code}`).style("normal");
    }
    if (account?.check_number) {
      printer.style("b").size(1, 1).text(`PEDIDO: #${account.check_number}`).style("normal");
    }
    if (account?.order_source === "qr_guest" || account?.waiter_id === 9999) {
      printer.style("b").size(1, 1).text("ORIGEN: CLIENTE QR (SIN MESERO)").style("normal");
    } else if (account?.order_source === "kiosk") {
      printer.style("b").size(1, 1).text("ORIGEN: KIOSCO AUTOSERVICIO").style("normal");
    } else if (account?.waiter_name) {
      printer.size(1, 1).text(`MESERO: ${account.waiter_name}`);
    }
    printer.size(1, 1).text(`HORA:   ${time}`);
    printer.text(divider);

    // Ítems y Modificadores en letra grande
    for (const item of ticket.items || []) {
      const name = (item.productName || item.product_name || "").toUpperCase();
      printer.style("b").size(1, 1).text(`${item.qty} x ${name}`).style("normal");

      if (item.notes) {
        printer.style("b").size(1, 1).text(`  >> ${item.notes}`).style("normal");
      }
      if (Array.isArray(item.modifiers) && item.modifiers.length) {
        for (const mod of item.modifiers) {
          printer.size(1, 1).text(`  * ${mod.name}`);
        }
      }
      printer.text(""); // Espacio entre platos para facilitar la lectura
    }

    if (ticket.notes) {
      printer.text(divider);
      printer.style("b").size(1, 1).text(`NOTAS:\n${ticket.notes}`).style("normal");
    }

    printer
      .text(divider)
      .align("ct")
      .style("b")
      .size(1, 1)
      .text(`* ${time} *`)
      .style("normal")
      .size(0, 0);

    try {
      // Corte limpio alimentando 4 líneas para librar la distancia física entre cabezal y guillotina
      if (typeof printer.cut === "function") {
        printer.cut(false, 4);
      } else {
        printer.feed(4);
        printer.raw(Buffer.from([0x1d, 0x56, 0x00]));
      }
    } catch (_) {}

    return printer;
  };
}

function buildCustomerReceipt(receipt, restaurant, copyInfo = null) {
  return (printer) => {
    const { account = {}, items = [], payments = [], totals = {}, felInvoice = null } = receipt || {};
    const restName = restaurant?.name || "RESTAURANTE";
    const now = new Date();
    const dateStr = now.toLocaleString("es-GT");

    printer
      .align("ct")
      .style("b")
      .size(1, 1)
      .text(restName)
      .style("normal")
      .size(0, 0);

    if (copyInfo && copyInfo.totalCopies > 1) {
      const copyLabel =
        copyInfo.copyNumber === 1
          ? "[ORIGINAL - CLIENTE]"
          : copyInfo.copyNumber === 2
          ? "[COPIA - CAJA]"
          : `[COPIA ${copyInfo.copyNumber}]`;
      printer
        .style("b")
        .text(copyLabel)
        .style("normal");
    }

    if (restaurant?.commercial_name && restaurant.commercial_name !== restName) {
      printer.text(restaurant.commercial_name);
    }
    if (restaurant?.address) printer.text(restaurant.address);
    if (restaurant?.phone) printer.text(`Tel: ${restaurant.phone}`);
    if (restaurant?.nit || felInvoice?.issuer_nit) {
      printer.text(`NIT: ${restaurant.nit || felInvoice?.issuer_nit}`);
    }
    if (restaurant?.establishment_code) {
      printer.text(`Establecimiento SAT: ${restaurant.establishment_code}`);
    }
    printer.text("================================");

    // Si tiene factura electrónica certificada (FEL SAT Guatemala)
    if (felInvoice && felInvoice.uuid) {
      printer
        .align("ct")
        .style("b")
        .text("FACTURA ELECTRONICA (FEL)")
        .text("DOCUMENTO TRIBUTARIO ELECTRONICO")
        .style("normal")
        .text("--------------------------------")
        .align("lt")
        .text("AUTORIZACION (UUID):")
        .style("b")
        .text(felInvoice.uuid)
        .style("normal")
        .text(`SERIE: ${felInvoice.serie}   NUMERO: ${felInvoice.dte_number}`)
        .text(`FECHA CERT: ${new Date(felInvoice.certified_at).toLocaleString("es-GT")}`)
        .text(`CERTIFICADOR: ${String(felInvoice.certifier || "SAT").toUpperCase()}`)
        .text("--------------------------------")
        .style("b")
        .text("DATOS DEL RECEPTOR / CLIENTE:")
        .style("normal")
        .text(`NIT/CUI:   ${felInvoice.recipient_nit || "CF"}`)
        .text(`NOMBRE:    ${felInvoice.recipient_name || "CONSUMIDOR FINAL"}`)
        .text(`DIRECCION: ${felInvoice.recipient_address || "CIUDAD"}`)
        .text("--------------------------------");
    }

    printer.align("lt");
    if (account.check_number) printer.text(`Cuenta:  ${account.check_number}`);
    if (account.table_code) printer.text(`Mesa:    ${account.table_code}`);
    if (account.waiter_name) printer.text(`Mesero:  ${account.waiter_name}`);
    if (!felInvoice) printer.text(`Fecha:   ${dateStr}`);
    printer.text("--------------------------------");

    for (const item of items) {
      printer.text(`${item.qty} x ${item.product_name}`);
      printer.align("rt").text(`Q ${Number(item.line_total || 0).toFixed(2)}`).align("lt");
    }

    printer.text("--------------------------------");
    const totalAmount = Number(totals.total || felInvoice?.total_amount || 0);
    const netAmount = felInvoice?.net_amount
      ? Number(felInvoice.net_amount)
      : Math.round((totalAmount / 1.12) * 100) / 100;
    const taxAmount = felInvoice?.tax_amount
      ? Number(felInvoice.tax_amount)
      : Math.round((totalAmount - netAmount) * 100) / 100;

    if (felInvoice) {
      printer.text("Subtotal sin IVA:");
      printer.align("rt").text(`Q ${netAmount.toFixed(2)}`).align("lt");
      printer.text("IVA (12% SAT):");
      printer.align("rt").text(`Q ${taxAmount.toFixed(2)}`).align("lt");
    } else {
      if (totals.subtotal !== undefined) {
        printer.text("Subtotal:");
        printer.align("rt").text(`Q ${Number(totals.subtotal).toFixed(2)}`).align("lt");
      }
    }

    if (totals.discount !== undefined && Number(totals.discount) > 0) {
      printer.text("Descuento:");
      printer.align("rt").text(`-Q ${Number(totals.discount).toFixed(2)}`).align("lt");
    }
    if (totals.tip !== undefined && Number(totals.tip) > 0) {
      printer.text("Propina:");
      printer.align("rt").text(`Q ${Number(totals.tip).toFixed(2)}`).align("lt");
    }

    printer
      .style("b")
      .text("TOTAL:")
      .align("rt")
      .text(`Q ${totalAmount.toFixed(2)}`)
      .align("lt")
      .style("normal");
    printer.text("--------------------------------");

    let totalPaid = 0;
    for (const p of payments) {
      const methodLabel = p.method_label || p.method;
      printer.text(`${methodLabel}:`);
      printer.align("rt").text(`Q ${Number(p.amount).toFixed(2)}`).align("lt");
      totalPaid += Number(p.amount || 0);
    }
    const change = totalPaid - totalAmount;
    if (change > 0.005) {
      printer.text("Cambio:");
      printer.align("rt").text(`Q ${change.toFixed(2)}`).align("lt");
    }

    // Frases SAT y QR si es FEL
    if (felInvoice) {
      printer
        .text("================================")
        .align("ct")
        .text("SUJETO A PAGOS TRIMESTRALES ISR")
        .text("DOCUMENTO TRIBUTARIO ELECTRONICO");

      if (felInvoice.qr_data) {
        printer.text("--------------------------------");
        try {
          if (typeof printer.qrcode === "function") {
            printer.qrcode(felInvoice.qr_data, 1, 6, "L");
          } else {
            printer.text("Verifique su factura en:");
            printer.text(felInvoice.qr_data);
          }
        } catch (qrErr) {
          printer.text("Verifique su factura en:");
          printer.text(felInvoice.qr_data);
        }
      }
    }

    printer
      .text("================================")
      .align("ct")
      .style("b")
      .text("Gracias por su visita!")
      .style("normal");

    try {
      if (typeof printer.cut === "function") {
        printer.cut(false, 4);
      } else {
        printer.feed(4);
        printer.raw(Buffer.from([0x1d, 0x56, 0x00]));
      }
    } catch (_) {}

    return printer;
  };
}

function buildTestPage(target) {
  return (printer) => {
    const now = new Date().toLocaleString("es-GT");
    const name = target.printer_name || target.name || "N/A";
    const ip = target.printer_ip || "N/A";
    const port = target.printer_port || 9100;

    printer
      .align("ct")
      .style("b")
      .size(1, 1)
      .text("PRUEBA DE IMPRESION")
      .style("normal")
      .size(0, 0)
      .text("================================")
      .align("lt")
      .text(`Impresora: ${name}`)
      .text(`IP:        ${ip}:${port}`)
      .text(`Fecha:     ${now}`)
      .text("================================")
      .text("Si lees este mensaje,")
      .text("el Print Agent conecto con exito")
      .text("a la impresora en tu red local.")
      .align("ct")
      .text("--- SamaPos Print Agent ---");

    try {
      if (typeof printer.cut === "function") {
        printer.cut(false, 4);
      } else {
        printer.feed(4);
        printer.raw(Buffer.from([0x1d, 0x56, 0x00]));
      }
    } catch (_) {}

    return printer;
  };
}

module.exports = {
  buildKitchenTicket,
  buildCustomerReceipt,
  buildTestPage,
};
