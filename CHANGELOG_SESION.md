# Changelog — Sesión de cambios

## 1. Cuentas cobradas en vista previa de cierre

**Problema:** Al hacer "Vista Previa" del cierre de turno no se reflejaban las cuentas ya cobradas (pagadas). Solo se mostraban las cuentas pendientes.

**Solución:**
- **Server** (`server.js` — `getShiftSummary`): Se agregó query `paidAccounts` que devuelve todas las cuentas con `status = 'paid'` del turno, incluyendo `check_number`, `waiter_name`, `total` y `payment_methods`.
- **Frontend** (`Shifts.jsx`): Se agregó sección colapsable "Cuentas cobradas (N)" con detalle por cuenta (#check, mesero, métodos de pago, total).
- **Impresión**: Se agregó tabla de cuentas cobradas en el template de impresión del cierre.

---

## 2. Modal de confirmación para cerrar turno

**Problema:** Se usaba `window.confirm()` nativo del navegador para confirmar el cierre de turno.

**Solución:**
- Se reemplazó por un modal personalizado con `motion.div` (Framer Motion) que incluye:
  - Ícono de advertencia rojo (`AlertTriangle`)
  - "¿Estás seguro de cerrar el turno?"
  - "Esta acción no se puede revertir"
  - Botón **Cancelar** (gris) y **Cerrar Turno** (rojo con ícono `StopCircle`)

---

## 3. Reimprimir cuenta y cierre de turno

**Nueva funcionalidad:** Apartado para reimprimir tickets de cuenta y reportes de cierre.

### Backend (4 nuevos endpoints):

| Endpoint | Descripción |
|---|---|
| `GET /api/accounts/paid/search?q=&centerId=&startDate=&endDate=` | Busca cuentas pagadas por #check (opcional), centro y rango de fechas |
| `GET /api/accounts/:accountId/receipt` | Datos completos para reimprimir: cuenta + items + pagos + totales |
| `GET /api/shifts/closed?centerId=&limit=` | Lista de turnos cerrados por centro |
| `GET /api/shifts/:shiftId/report` | Resumen completo de un turno cerrado (reusa `getShiftSummary`) |

### Frontend (`ReprintPage.jsx`):

- **Pestaña "Reimprimir Cuenta"**:
  - Selector de centro + buscador por #check (opcional) + filtro por fechas
  - Resultados muestran: #check, mesa, mesero, fecha, total
  - Al seleccionar una cuenta: detalle con productos, subtotal, descuento, propina, total, pagos
  - Botón **Imprimir** que abre ticket en ventana nueva con formato tipo ticket

- **Pestaña "Reimprimir Cierre"**:
  - Lista de turnos cerrados del centro seleccionado
  - Al seleccionar un turno: cuadre de efectivo, métodos de pago, cuentas cobradas
  - Botón **Imprimir** que abre reporte completo

### Navegación:
- Ruta `'reprints'` agregada en `App.jsx`
- Botón "Reimpr." en la barra inferior del Dashboard

---

## 4. Reporte de ventas por categoría

**Nueva funcionalidad:** Reporte de productos vendidos agrupados por categoría.

### Backend:
- `GET /api/reports/product-sales?startDate=&endDate=&centerId=&categoryId=&productName=`
  - Filtros: fecha, centro (opcional), categoría (opcional), nombre de producto (opcional, LIKE)
  - Retorna: rows agrupados por categoría + producto con `total_qty`, `total_sales`, `account_count`
  - También retorna: `totals` (totales generales) y `categories` (lista de categorías activas)

### Frontend (`Reports.jsx`):
- Nueva tarjeta "Ventas por Categoría" en el grid de reportes
- Filtros: fechas (requerido), centro, categoría, producto (búsqueda por texto)
- Resultados: categorías como separadores, cada producto con cantidad, total Q y # cuentas
- Barra de totales generales al final
- Botón **Exportar** que abre vista de impresión

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `server.js` | `getShiftSummary` → agregado `paidAccounts`; endpoints nuevos: `accounts/paid/search`, `accounts/:id/receipt`, `shifts/closed`, `shifts/:id/report`, `reports/product-sales` |
| `react-app/src/api.js` | Métodos nuevos: `searchPaidAccounts`, `getAccountReceipt`, `getClosedShifts`, `getShiftReport`, `getProductSales` |
| `react-app/src/pages/Shifts.jsx` | Modal de confirmación, sección cuentas cobradas en preview, tabla en impresión |
| `react-app/src/pages/ReprintPage.jsx` | **Nuevo** — Página completa de reimpresión con tabs |
| `react-app/src/pages/Reports.jsx` | Tarjeta "Ventas por Categoría" + componente `ProductSalesReportPage` |
| `react-app/src/App.jsx` | Ruta `'reprints'` agregada |
| `react-app/src/pages/Dashboard.jsx` | Botón "Reimpr." en barra inferior |
