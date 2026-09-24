# QA Checklist — SamaPos

> Checklist de verificación manual para SamaPos (POS de restaurante).
> Úsala antes de cada release, después de cambios grandes, o cuando algo
> "anda raro" y querés recorrer el flujo completo de manera sistemática.

**Cómo usar este documento**

- Cada caso tiene un ID (`MOD-NN`) para que puedas referenciarlo en issues /
  commits.
- Marcá el resultado real en la columna **Resultado** (PASA / FALLA / N/A) y
  cualquier nota o bug en **Observaciones**.
- Antes de empezar, completá las **Pre-condiciones generales**.
- Si un caso falla, completá una fila extra en la sección **Reporte de bugs**.

---

## Pre-condiciones generales

- [ ] Servidor levantado (`npm start` en raíz). Puerto `3000` respondiendo.
- [ ] React app levantada (`cd react-app && npm run dev` en otra terminal). Puerto `5173`.
- [ ] DB sembrada con datos de prueba (al menos: 1 área, 1 mesa, 3 categorías,
      10 productos, 2 modificadores, 3 usuarios: admin / cajero / mesero).
- [ ] Navegador limpio (sin caché, sin sesión vieja). Usar perfil privado o
      `localStorage` limpio.
- [ ] Licencia en estado válido (no `LICENSE_BLOCK` / `LICENSE_PENDING`).
- [ ] Impresora de red o `escpos` mockeada si vas a probar impresión.
- [ ] Terminal serial generado (se crea solo al primer load del frontend).

> **Tip:** Para resetear todo el estado de un usuario entre pruebas, ejecutá
> en DevTools → Application → Local Storage → "Clear All" y recargá.

---

## 0. Smoke (sanity check, ~2 min)

Hacé esto **antes** de meterte con un módulo. Si esto falla, el resto no se
puede probar.

| ID         | Caso                                                  | Esperado                                          | Resultado | Obs |
|------------|-------------------------------------------------------|---------------------------------------------------|-----------|-----|
| SMOKE-01   | `GET http://localhost:3000/`                          | Responde 200, HTML con `<title>` del POS          |           |     |
| SMOKE-02   | `GET http://localhost:3000/api/bootstrap`             | 200, JSON con datos base (áreas, mesas, usuario?) |           |     |
| SMOKE-03   | `GET http://localhost:5173/` (o donde corra el build) | 200, carga el `<div id="root">` de React          |           |     |
| SMOKE-04   | Login con PIN de admin                                | Entra a dashboard, sin pantalla de bloqueo        |           |     |
| SMOKE-05   | Logout desde el menú                                  | Vuelve a login, limpia `localStorage` de token    |           |     |
| SMOKE-06   | Abrir DevTools → Network, refrescar dashboard         | Ningún endpoint devuelve 5xx                      |           |     |
| SMOKE-07   | Sin licencia válida (forzar `LICENSE_HMAC_SECRET=`)   | Muestra pantalla de bloqueo `LicenseBlock`        |           |     |

---

## 1. Autenticación (PIN)

| ID         | Caso                                                       | Esperado                                  | Resultado | Obs |
|------------|------------------------------------------------------------|-------------------------------------------|-----------|-----|
| AUTH-01    | Login con PIN correcto de un admin                         | Entra a dashboard                         |           |     |
| AUTH-02    | Login con PIN correcto de un mesero                        | Entra con permisos de mesero (sin admin)  |           |     |
| AUTH-03    | Login con PIN incorrecto (3 veces)                         | Mensaje claro, sin lockout permanente     |           |     |
| AUTH-04    | Login con PIN vacío                                        | Validación client-side, no viaja al server |           |     |
| AUTH-05    | Cerrar sesión desde el menú lateral                        | Vuelve a `/login`, token borrado          |           |     |
| AUTH-06    | Refresh de página estando logueado                         | Mantiene sesión si el token no venció     |           |     |
| AUTH-07    | Token expirado forzado (cambiar `LICENSE_TTL` bajo)        | Auto-logout + redirect a `/login`         |           |     |
| AUTH-08    | Dos pestañas abiertas, logout en una                        | La otra detecta 401 y desloguea           |           |     |

---

## 2. Mesas y ambientes

| ID         | Caso                                                                | Esperado                                       | Resultado | Obs |
|------------|---------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| MESAS-01   | Vista de mesas muestra todas las del centro activo                  | Grid con color correcto según ocupación        |           |     |
| MESAS-02   | Click en mesa libre → abre modal "Nueva cuenta"                     | Modal con cantidad de comensales y mesero      |           |     |
| MESAS-03   | Crear cuenta con 4 comensales → mesa cambia a "ocupada" (otro color) | Color actualizado, mesa aparece con cuenta     |           |     |
| MESAS-04   | Mesa con cuenta abierta → click → abre vista de cuenta              | Lista de productos, total, botones de acción   |           |     |
| MESAS-05   | Transferir cuenta entre mesas del mismo ambiente                    | Mesa origen queda libre, mesa destino ocupada  |           |     |
| MESAS-06   | Transferir cuenta entre ambientes distintos                         | Si `allow_transfer=0` en destino → rechaza     |           |     |
| MESAS-07   | Desactivar mesa con cuenta abierta (admin)                          | Validación: no debería poder / advertir        |           |     |
| MESAS-08   | Crear cuenta sin seleccionar mesero                                 | Validación: requiere mesero                    |           |     |

---

## 3. Órdenes / Comanda

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| ORD-01     | Abrir cuenta → agregar 2× "Café americano"                                       | Items aparecen, total correcto                 |           |     |
| ORD-02     | Producto con modificador obligatorio (ej. "Tipo de leche") → no se puede agregar sin elegir | Muestra selector antes de confirmar   |           |     |
| ORD-03     | Modificador con `price_delta` (ej. "Extra shot +Q5")                              | Total refleja el delta                         |           |     |
| ORD-04     | Asignar items a sillas distintas (`seat_no`)                                      | Silla 1, 2, 3 separados                       |           |     |
| ORD-05     | Mover item entre sillas                                                           | Item cambia de `seat_no`, total intacto        |           |     |
| ORD-06     | Cambiar cantidad de un item (qty 1 → 3)                                           | Total × 3                                      |           |     |
| ORD-07     | Cambiar cantidad a 0                                                               | Item se elimina o se ofrece "eliminar"         |           |     |
| ORD-08     | "Enviar a producción" (send order)                                                | Items aparecen en KDS, `sent_at` se setea      |           |     |
| ORD-09     | Producto sin `production_centers` asignado                                        | Falla clara o warning                         |           |     |
| ORD-10     | Producto con categoría marcada `discount_blocked=1` + descuento global            | El producto bloqueado no se descuenta         |           |     |
| ORD-11     | Anular item con PIN de supervisor                                                  | Item queda `status=void`, aparece en "anulados"|           |     |
| ORD-12     | Anular item ya enviado a KDS                                                       | Requiere autorización, queda en KDS "anulados"|           |     |
| ORD-13     | Notas por item (ej. "sin cebolla")                                                 | Se imprimen en KDS y en el recibo              |           |     |

---

## 4. Pagos y descuentos

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| PAG-01     | Pagar el total exacto en efectivo                                                 | Cuenta cierra, recibo generado                 |           |     |
| PAG-02     | Pagar con tarjeta (un solo método)                                                | Mismo comportamiento, `method='card'`         |           |     |
| PAG-03     | Pagar con 2 métodos (mixto: 50 efectivo + resto tarjeta)                          | Dos `account_payments`, total exacto          |           |     |
| PAG-04     | Propina (tip) configurable por cuenta                                             | Suma al total, configurable desde settings     |           |     |
| PAG-05     | Quitar propina después de aplicada (`remove-tip`)                                 | Resta del total, log de evento                 |           |     |
| PAG-06     | Descuento por porcentaje (10%)                                                     | `account_discounts` con `type='percent'`       |           |     |
| PAG-07     | Descuento fijo (Q20)                                                               | `account_discounts` con `type='fixed'`         |           |     |
| PAG-08     | Descuento mayor al subtotal                                                        | Validación: no permitir, o llevar a 0          |           |     |
| PAG-09     | Pago parcial (Q20 de Q100) → cuenta queda abierta                                 | `status` sigue `open`, no cierra               |           |     |
| PAG-10     | Cuenta abierta sin pagos → no se puede cerrar                                     | Error claro                                    |           |     |
| PAG-11     | Cerrar cuenta → mesa queda libre                                                   | `accounts.status='paid'`, mesa se libera       |           |     |
| PAG-12     | Reimprimir recibo                                                                  | Devuelve mismo recibo, sin doble cobro         |           |     |
| PAG-13     | Pago con monto > total                                                              | Validación: no permitir (o devolver cambio)   |           |     |

---

## 5. División de cuentas (split)

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| SPLIT-01   | Split equal (2 partes) sobre cuenta con 4 items                                    | 2 cuentas nuevas, items repartidos            |           |     |
| SPLIT-02   | Split custom (drag items a la cuenta B)                                           | Items quedan en las cuentas elegidas           |           |     |
| SPLIT-03   | Split shared (plato + bebida compartido, prorrateado)                             | Cada nueva cuenta recibe un % del plato        |           |     |
| SPLIT-04   | Join-with: unir dos cuentas abiertas en una                                        | Items se consolidan, una sola cuenta           |           |     |
| SPLIT-05   | Transfer account: mover toda una cuenta a otra mesa                                | Mesa origen queda libre                        |           |     |

---

## 6. KDS (Kitchen Display)

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| KDS-01     | Abrir KDS y ver items enviados                                                     | Items agrupados por orden, sin enviados no     |           |     |
| KDS-02     | Marcar item individual como "listo"                                                | Pasa a la lista de completados                 |           |     |
| KDS-03     | Marcar cuenta entera como "lista"                                                  | Todos los items de esa cuenta → completados    |           |     |
| KDS-04     | Filtrar KDS por centro de producción                                               | Solo aparecen items de ese centro             |           |     |
| KDS-05     | Ver items anulados (vista `orders-with-voided`)                                    | Aparecen tachados, no se pueden marcar         |           |     |
| KDS-06     | Reporte KDS por fecha                                                              | Devuelve agregados correctos por día/centro    |           |     |
| KDS-07     | Auto-refresh / SSE del KDS                                                         | Items nuevos aparecen sin recargar             |           |     |

---

## 7. Turnos (caja)

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| TURN-01    | Abrir turno sin turno activo                                                       | Modal de apertura, exige monto inicial         |           |     |
| TURN-02    | Abrir turno con turno ya activo en el mismo centro                                 | Error claro                                    |           |     |
| TURN-03    | Preview de cierre de turno                                                         | Muestra resumen: ventas, propinas, anulados   |           |     |
| TURN-04    | Cerrar turno                                                                        | `closed_at` se setea, no se puede reabrir      |           |     |
| TURN-05    | Reporte de turno cerrado (exportar)                                               | XLSX generado                                  |           |     |
| TURN-06    | Intentar cerrar sesión sin turno activo                                            | Bloquea o warning                              |           |     |
| TURN-07    | Intentar crear cuenta sin turno activo                                             | Bloquea o warning                              |           |     |

---

## 8. Reportes

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| REP-01     | Reporte: items anulados (con filtro de fecha)                                      | Lista de items con motivo y autorizador        |           |     |
| REP-02     | Reporte: propinas por mesero                                                       | Suma correcta, agrupada por usuario            |           |     |
| REP-03     | Reporte: ventas por producto (con filtro categoría)                               | Suma correcta                                  |           |     |
| REP-04     | Reporte: ventas por método de pago                                                 | Suma por método, coincide con pagos reales     |           |     |
| REP-05     | Reporte: ventas por centro de operación                                            | Suma por centro                                |           |     |
| REP-06     | Reporte: ventas por usuario (mesero/cajero)                                        | Suma por usuario                               |           |     |
| REP-07     | Reporte: trazabilidad de cuenta (timeline de eventos)                             | Lista cronológica de eventos de la cuenta      |           |     |
| REP-08     | Exportar cualquiera de los anteriores a Excel                                     | XLSX válido, abre sin warnings                |           |     |

---

## 9. CXC (Cuentas por cobrar)

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| CXC-01     | Crear área de CXC                                                                  | Aparece en el listado                          |           |     |
| CXC-02     | Crear cliente                                                                       | Aparece en el listado, con sus categorías      |           |     |
| CXC-03     | Asignar categorías de productos a un cliente (descuento por categoría)            | `cxc_client_categories` persiste                |           |     |
| CXC-04     | Crear cuenta de CXC para un cliente (a crédito)                                   | `cxc_accounts` con saldo pendiente             |           |     |
| CXC-05     | Pagar cuenta CXC parcial                                                            | `cxc_payments`, saldo actualizado              |           |     |
| CXC-06     | Pagar cuenta CXC total                                                              | Saldo en 0                                     |           |     |
| CXC-07     | Pay-global: pagar saldo total de un cliente en una operación                       | Distribuye entre cuentas abiertas              |           |     |
| CXC-08     | Ver estado de cuenta (statement) con filtros                                       | Solo las cuentas dentro del rango              |           |     |
| CXC-09     | Exportar estado de cuenta a Excel                                                  | XLSX válido                                    |           |     |
| CXC-10     | Resumen de pendientes (pending summary)                                            | Suma por cliente, coincide con cuentas abiertas |           |     |
| CXC-11     | `check-discount`: dado cliente + producto, ¿tiene descuento?                      | Devuelve el descuento aplicable                |           |     |

---

## 10. Inventario

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| INV-01     | Crear item de inventario                                                           | Aparece en listado                             |           |     |
| INV-02     | Editar item                                                                         | Cambios persistidos                            |           |     |
| INV-03     | Eliminar item con movimientos                                                      | Validación: no permitir / advertir            |           |     |
| INV-04     | Registrar movimiento de stock (entrada)                                           | Stock actual aumentado                         |           |     |
| INV-05     | Registrar movimiento de stock (salida)                                            | Stock actual reducido                          |           |     |
| INV-06     | Movimiento de salida que lleva stock a negativo                                   | Validación: no permitir (o requiere override)  |           |     |
| INV-07     | Asignar receta a un producto (BOM)                                                | Receta persistida                             |           |     |
| INV-08     | Ver historial de movimientos de un item                                           | Lista cronológica con tipo, cantidad, usuario |           |     |

---

## 11. Licencias

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| LIC-01     | Terminal con licencia válida → app carga normal                                    | Sin pantalla de bloqueo                        |           |     |
| LIC-02     | Terminal sin enrollar (primera vez) → pantalla "Esperando aprobación"             | Muestra serial, admin puede aprobar desde tab  |           |     |
| LIC-03     | Admin aprueba terminal desde LicensesTab                                          | Terminal queda autorizada                     |           |     |
| LIC-04     | Admin revoca terminal                                                              | Al próximo heartbeat, pantalla de bloqueo      |           |     |
| LIC-05     | Licencia revocada con red → bloqueo instantáneo                                    | `LICENSE_REVOKED` en pantalla                  |           |     |
| LIC-06     | Licencia vencida sin red → grace de 7 días                                         | Funciona normal con token local                |           |     |
| LIC-07     | Licencia vencida sin red por >7 días → bloqueo                                     | `LICENSE_EXPIRED` en pantalla                  |           |     |
| LIC-08     | `LICENSE_DEV_MODE=true` → cualquier serial pasa                                    | Útil solo para dev local                       |           |     |
| LIC-09     | Heartbeat stale (>2h sin red) → log de warning pero sigue andando                 | No bloquea                                     |           |     |
| LIC-10     | Crear / revocar licencia desde LicensesTab                                        | Cambios persistidos en BD                      |           |     |
| LIC-11     | Audit log de licencias                                                             | Lista los eventos                              |           |     |

---

## 12. Configuración (Settings)

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| SET-01     | Cambiar nombre del restaurante (branding)                                          | Header refleja el cambio                       |           |     |
| SET-02     | Subir logo                                                                         | Logo aparece en login y header                 |           |     |
| SET-03     | Subir imagen de fondo del login                                                    | Aparece en `/login`                            |           |     |
| SET-04     | Cambiar % de propina global                                                        | Se aplica en cuentas nuevas                    |           |     |
| SET-05     | Marcar método de pago como excluido de propina                                     | La propina no se aplica a ese método           |           |     |
| SET-06     | Asignar módulos por usuario                                                        | Ese usuario ve solo esos módulos               |           |     |
| SET-07     | Asignar módulos por dispositivo (IP)                                               | Esa IP ve solo esos módulos                   |           |     |
| SET-08     | Crear/editar/eliminar roles                                                        | Cambios persistidos                            |           |     |
| SET-09     | Asignar permisos a un rol                                                          | Permisos persistidos                           |           |     |
| SET-10     | Crear producto completo (con modificadores y centros en un solo POST)             | Producto creado con todas las relaciones       |           |     |
| SET-11     | Crear / editar / eliminar centro de operación                                      | Cambios persistidos                            |           |     |
| SET-12     | Asignar productos a un centro                                                      | Solo aparecen en comandas de ese centro        |           |     |
| SET-13     | Crear / editar / eliminar usuario (staff)                                          | PIN queda hasheado (no en claro)               |           |     |
| SET-14     | Vincular terminal a un centro (terminal binding)                                   | Terminal queda asociada a ese centro           |           |     |

---

## 13. Impresoras

| ID         | Caso                                                                              | Esperado                                       | Resultado | Obs |
|------------|-----------------------------------------------------------------------------------|------------------------------------------------|-----------|-----|
| IMP-01     | Probar impresión de test desde settings                                            | Imprime ticket de prueba                       |           |     |
| IMP-02     | Estado del servicio de impresión                                                   | Devuelve OK si `escpos`/socket responde       |           |     |
| IMP-03     | Imprimir comanda al enviar items                                                   | KDS recibe comanda                             |           |     |
| IMP-04     | Imprimir precheck                                                                  | Imprime vista previa de la cuenta             |           |     |
| IMP-05     | Imprimir recibo al cerrar cuenta                                                   | Recibo completo con totales                   |           |     |
| IMP-06     | Impresora caída / no responde → ¿qué pasa?                                        | Mensaje claro, reintento, no rompe la venta    |           |     |
| IMP-07     | Ver log de trabajos de impresión recientes                                         | Lista con éxito/fallo                         |           |     |

---

## 14. Pre-release checklist (rápido)

Antes de mergear a `main` o de hacer un deploy:

- [ ] **SMOKE-01..07** todos PASA
- [ ] **AUTH-01..04** todos PASA
- [ ] **MESAS-03, MESAS-04, MESAS-05** PASA
- [ ] **ORD-01, ORD-02, ORD-08, ORD-11** PASA
- [ ] **PAG-01, PAG-03, PAG-11** PASA
- [ ] **KDS-01, KDS-02, KDS-03** PASA
- [ ] **TURN-01, TURN-03, TURN-04** PASA
- [ ] **REP-03, REP-04** PASA (los dos más consultados)
- [ ] **CXC-04, CXC-05, CXC-08** PASA
- [ ] **LIC-01, LIC-05** PASA
- [ ] Smoke test automatizado pasa (`npm run test:smoke`)
- [ ] E2E tests pasan (`npm run test:e2e`)
- [ ] Sin errores en consola del navegador en los flujos probados
- [ ] Sin warnings 5xx en server logs durante los flujos probados

---

## 15. Escenarios "bug hunt" (sospechosos comunes)

Correr estos cuando algo se siente "rarío" sin saber por dónde empezar:

| Escenario                                                                  | Por qué es sospechoso                                       |
|----------------------------------------------------------------------------|-------------------------------------------------------------|
| Recargar la página justo después de un POST                                 | Race conditions con el token / sesión                       |
| Doble click rápido en "Cobrar"                                              | Doble inserción de `account_payments`                       |
| Cambiar de centro de operación mientras hay una cuenta abierta              | Items enviados al centro equivocado                         |
| Impresora caída al hacer un pago                                            | Cobro registrado pero no impreso — verificar rollback       |
| Mover un item entre cuentas con modificadores                              | ¿Se preservan los `order_item_modifiers`?                   |
| Anular el único item de una cuenta                                          | ¿La cuenta queda en estado válido?                         |
| Crear 100 cuentas en un turno (stress)                                      | Performance, memory leaks, queries lentas                   |
| Dos cajeros abren turnos en el mismo centro (forzado)                      | ¿Qué gana? ¿Hay validación?                                |
| Forzar `LICENSE_HMAC_SECRET` inválido                                       | ¿Falla gracefully? ¿Pantalla clara?                        |
| Bajar el server con la app abierta                                          | Frontend debe mostrar error, no pantalla blanca             |
| Cambiar la zona horaria del server durante operación                        | `created_at` y `closed_at` pueden quedar inconsistentes     |

---

## 16. Reporte de bugs

Cuando un caso FALLA, copiá este bloque al issue / commit:

```markdown
### Bug: <título corto>

- **ID del caso:** MOD-NN (ej. PAG-05)
- **Severidad:** Bloqueante / Alta / Media / Baja
- **Entorno:** dev / staging / producción — OS — navegador
- **Pasos para reproducir:**
  1. ...
  2. ...
- **Esperado:** ...
- **Actual:** ...
- **Screenshots / logs:** (adjuntar)
- **Probable archivo/módulo:** (ej. `server.js:3540` o `react-app/src/pages/OrderView.jsx`)
```

---

## Notas

- Si un caso no aplica a tu instalación (ej. no usás CXC), marcalo N/A y seguí.
- Sumá tus propios casos a medida que descubrís bugs — convertí cada fix en un
  caso de regresión.
- Este documento se actualiza junto con cada cambio de módulo. Si agregás una
  feature nueva, su QA va en este archivo, no en otro lado.
