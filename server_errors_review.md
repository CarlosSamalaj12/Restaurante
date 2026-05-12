# Revisión de server.js - Errores y Problemas

## 🔴 ERRORES CRÍTICOS

### 1. Tablas Core No Creadas
Las siguientes tablas son referenciadas pero **nunca son creadas** en `ensureConfigTables()`:

- `staff_users` (usada en requireAdmin, pin-login, bootstrap, etc.)
- `restaurant_tables` (usada en bootstrap, tablas endpoints)
- `dining_areas` (usada en bootstrap, settings)
- `products` (usada en catalog, settings)
- `product_categories` (usada en bootstrap)
- `accounts` (usada en muchos endpoints)
- `order_items` (usada en getAccountTotals, send, etc.)
- `account_payments` (usada en getAccountTotals)
- `account_discounts` (usada en getAccountTotals)
- `account_events` (usada en addAccountEvent)
- `shifts` (usada en open/close shift)
- `modifier_groups` (usada en settings)
- `modifier_options` (usada en settings)
- `product_modifier_groups` (usada en catalog)
- `production_centers` (usada en send endpoint)
- `product_production_centers` (usada en send endpoint)
- `folio_charges` (usada en DELETE accounts)
- `customers` (usada en bootstrap)

### 2. Variable `pool` No Utilizada
```javascript
const { pool, query } = require("./src/db");
```
`pool` se importa pero nunca se usa en el código.

---

## 🟡 PROBLEMAS MEDIOS

### 3. Sin Validación de Tipos en Pagos
En `/api/accounts/:accountId/payments`, el código normaliza el método pero no valida que el monto sea positivo correctamente.

### 4. Posible Referencia Circular en addAccountEvent
```javascript
JSON.stringify(payload || {})
```
Si `payload` tiene referencias circulares, fallará silenciosamente.

### 5. El endpoint `/api/reports/waiter-tips` siempre devuelve array vacío
```javascript
app.get("/api/reports/waiter-tips", async (_req, res) => {
  res.json([]);
});
```
No está implementado.

---

## 🟢 OBSERVACIONES MENORES

### 6. Consistencia en Nombres
- Mezcla de `center_id` vs `operation_center_id`
- Mezcla de `sort_order` vs `sortOrder`

### 7. El template de modifiers está duplicado
Existe tanto en `MODIFIER_GROUP_DEFAULTS` como en el endpoint `/api/modifier-templates`.

---

## ✅ LO QUE ESTÁ BIEN

1. ✅ Uso de consultas parametrizadas (previene SQL injection)
2. ✅ Normalización de códigos (normalizePaymentMethodCode)
3. ✅ Manejo de sesiones de autenticación con TTL
4. ✅ Funciones de utilidad (money, nowSql, clientIp)
5. ✅ Validación de inputs en la mayoría de endpoints
