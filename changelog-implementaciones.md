# SamaPos — Implementaciones

## 2026-07-25

---

### 1. Reporte: Ventas por Categoría (`ProductSalesReportPage`)

**Filtros:**
- Rango de fechas (inicio automático: día 1 del mes)
- Centro (dropdown, carga de bootstrap)
- Categoría (dropdown, carga de bootstrap + del API tras búsqueda)
- Producto (autocomplete con búsqueda en vivo, min 2 caracteres, debounce 350ms)

**Vista:** Lista agrupada por categoría, mostrando producto, cantidad y total.

**Exportación:**
- Excel con estilo (headers oscuros, bordes, zebra striping)
- PDF

---

### 2. Reporte: Forma de Pago (`PaymentMethodReportPage`)

**Filtros:**
- Rango de fechas
- Centro
- Forma de Pago (dropdown cargado de bootstrap)

**Vista:**
- Resumen por método de pago con barra de progreso y %
- Detalle expandible de pagos individuales (cuenta, centro, monto, referencia)

**Exportación:**
- Excel con columnas: Método, Cuenta, Centro, Fecha, Monto, Total Cuenta, Referencia
- PDF

---

### 3. Reporte: Ventas por Centro (`SalesByCenterReportPage`)

**Filtros:**
- Rango de fechas
- Centro
- Producto (autocomplete con búsqueda en vivo)

**Vista:** 3 tabs:
1. **Detalle** — listado completo línea por línea de todos los productos vendidos
2. **Exclusivos** — productos vendidos solo en un centro
3. **Compartidos** — productos vendidos en más de un centro

**Totales:** Panel superior con resumen por centro + total general.

**Exportación:**
- Excel: 3 hojas (Detalle, Resumen, Unidas)
- PDF

**Endpoint:** `GET /api/reports/sales-by-center`
- Parámetros: `startDate`, `endDate`, `centerId`, `productName`, `productIds`
- Retorna: `center_totals`, `products`, `exclusive_products`, `shared_products`, `detail_rows`, `merged_accounts`, `grand_total`, `grand_qty`

---

### 4. Reporte: Ventas por Usuario (`SalesByUserReportPage`)

**Filtros:**
- Rango de fechas
- Centro
- Categoría
- Producto (autocomplete con búsqueda en vivo)
- Selección múltiple de usuarios (checkboxes)

**Vista:** 3 tabs:
1. **Por Usuario** — ranking con barra de progreso, productos vendidos por cada uno
2. **Comparación** — ranking de quién vende más de cada producto, con 🥇🥈🥉
3. **Detalle** — listado completo línea por línea

**Exportación:**
- Excel: 3 hojas (PorUsuario, Comparacion, Detalle, Unidas)
- PDF

**Endpoint:** `GET /api/reports/sales-by-user`
- Parámetros: `startDate`, `endDate`, `centerId`, `categoryId`, `productName`, `productIds`, `userIds`
- Retorna: `users`, `product_comparison`, `detail_rows`, `merged_accounts`, `grand_total`, `grand_qty`

---

### 5. Reporte: Anulados (`VoidedReportPage`)

**Mejoras realizadas previamente:**
- Tabla con columna para quién autorizó la anulación (PIN)
- Expandir fila para ver la comanda completa con producto anulado tachado
- Indicador visual "VOID" en productos anulados
- Impresión de ticket de reversión

---

### 6. Reporte: Propinas (`TipsReportPage`)

**Mejoras realizadas previamente:**
- Resumen por mesero con cuentas, propinas y totales
- Detalle por cuenta con método de pago
- Filtro por mesero y centro

---

### 7. Rastreo de Cuentas Unificadas

**Problema resuelto:** Al unir dos cuentas, la cuenta origen quedaba como `status = 'void'` y desaparecía de los reportes, impidiendo rastrearla.

**Solución implementada:**

#### Base de datos
- Nueva columna: `merged_into_account_id INT NULL` en tabla `accounts`
- Migración automática al iniciar el servidor

#### Al unir cuentas (`POST /api/accounts/:accountId/join-with`)
```sql
UPDATE accounts SET status = 'void', merged_into_account_id = ? WHERE id = ?
```
- La cuenta origen queda como `void` Y guarda a cuál cuenta se unió.

#### Reportes afectados
- **Ventas por Centro** — incluye `merged_accounts` en la respuesta del API
- **Ventas por Usuario** — incluye `merged_accounts` en la respuesta del API

#### En la UI
- **Tab Detalle:** Sección "⚠ Cuentas Unidas" en rojo arriba de la tabla listando cada cuenta unificada con:
  - Centro, mesero, número de cuenta original
  - **Unida a #** `[id de la cuenta destino]`
  - **Q0.00**
- Si una cuenta fue unida después de cerrarse, aparece con **U** (unida) tachada en la columna de cuenta
- **Excel:** Hoja adicional "Unidas" con el detalle de todas las cuentas unificadas

---

### 8. Utilería de Exportación (`react-app/src/utils/exports.js`)

Nueva utilería compartida para todos los reportes:

**`exportToExcel({ sheets })`**
- Usa `XLSX.utils.aoa_to_sheet` + aplicación manual de `.s` (style) y `.z` (format) a celdas existentes
- Evita el error `undefined.s` que ocurría al asignar celdas manualmente
- Soporta múltiples hojas por libro
- Headers con fondo azul oscuro (#1F4E79), texto blanco, negrita
- Zebra striping en filas de datos
- Estilos: money (verde), center, bold, boldCenter
- Auto-width de columnas basado en el ancho definido en los headers
- Totales y grand totals con estilo diferenciado

**`exportToPDF({ title, subtitle, tables })`**
- Generación de PDF con jsPDF + jspdf-autotable
- Headers con fondo azul oscuro, texto blanco
- Zebra striping
- Bordes visibles en todas las celdas
- Totales con estilo diferenciado (bold, fondo gris claro)
- Soporta múltiples tablas/secciones por documento

---

### 9. Correcciones de Formato de Dinero

**Problema:** Inconsistencias entre funciones que retornaban strings ("Q123.45") vs números.

**Regla adoptada:**
- `formatMoney(n)` → retorna `"Q123.45"` (string con prefijo Q)
- `formatQ(n)` → alias de `formatMoney`
- `formatNum(n)` → retorna `Number(n)` (para usar con `.toLocaleString()`)
- Nunca hacer `.toFixed()` sobre el resultado de `formatMoney` / `formatQ`
- Para Excel/PDF: usar `parseFloat(Number(n).toFixed(2))` para valores money

---

### Archivos modificados

| Archivo | Cambios |
|---|---|
| `server.js` | Endpoints de reportes, join-with con merged_into_account_id, migración automática, sales-by-center, sales-by-user |
| `react-app/src/api.js` | Métodos getProductSales, getSalesByPaymentMethod, getSalesByCenter, getSalesByUser |
| `react-app/src/utils/exports.js` | Utilería exportToExcel y exportToPDF |
| `react-app/src/pages/Reports.jsx` | Todos los report pages (ProductSales, PaymentMethod, SalesByCenter, SalesByUser, Voided) |

---

### Para aplicar los cambios

1. **Reiniciar servidor:** `node server.js` — la migración creará la columna `merged_into_account_id` automáticamente
2. **Reiniciar frontend:** `npm run dev`
3. **Hard refresh navegador:** `Ctrl+Shift+R`
