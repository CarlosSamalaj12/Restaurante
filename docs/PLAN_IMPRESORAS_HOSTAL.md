# Plan: Impresoras Locales en SamaPos (Despliegue Hostal)

> **Contexto:** Carlos quiere usar SamaPos en un hostal. Las comandas de cocina, los tickets de barra y la cuenta del cliente deben imprimirse en impresoras térmicas locales, no en un servidor remoto.

---

## 1. Estado actual del proyecto (lo que ya está)

✅ **Modelo de datos listo** (en `db/schema.sql`):

- `production_centers.printer_name` → nombre lógico de la impresora del centro (ej: "COCINA-01")
- `terminals.printer_name`, `printer_ip`, `printer_port` (default `9100`) → impresora de la cuenta del cliente
- `product_production_centers` → qué productos van a qué centro (cocina, barra, etc.)

✅ **UI de Settings** (`react-app/src/pages/Settings.jsx`):

- Wizard para crear/editar **Production Centers** con campo `printer_name`
- Wizard para crear/editar **Terminals** con `printer_name`, `printer_ip`, `printer_port`

✅ **Endpoint que arma los tickets** (`server.js` `POST /api/accounts/:id/send-to-production`):

- Agrupa los `order_items` por `production_center` en un `ticketsMap`
- Cada ticket sale con `centerName` y `printerName`
- **PERO:** solo los devuelve en el JSON. **No imprime nada.**

✅ **KDS (Kitchen Display System)** ya existe como respaldo visual: si la impresora de cocina falla, la cocina ve los productos en pantalla.

✅ **Reimpresión manual** (`react-app/src/pages/ReprintPage.jsx`): usa `window.open()` con HTML 80mm para reimprimir cuentas.

❌ **Lo que falta:**

- **Motor de impresión real** (cero librerías de ESC/POS instaladas — `package.json` no tiene ni `escpos` ni `node-thermal-printer`)
- **Tabla `print_jobs`** para log de intentos de impresión (éxitos/fallos)
- **Disparador de impresión automática** al enviar a producción y al cobrar
- **Botón "Imprimir prueba"** en Settings

---

## 2. Decisión de arquitectura (la importante)

### Recomendación: **Impresión directa por red desde el server local**

```
[PC Mostrador]  ──── WiFi/LAN ────  [Router Hostal]  ────  [Impresora Cocina]
   (server.js)                            │            ────  [Impresora Barra]
   192.168.1.10                     192.168.1.1         ────  [Impresora Caja]
                                                            .51, .52, .53
```

- **Server de SamaPos corre local** en una PC del mostrador (laptop o mini PC)
- **Impresoras térmicas con ethernet** conectadas al mismo switch/router del hostal
- Cada impresora tiene **IP fija por DHCP reservation** en el router
- SamaPos manda los bytes ESC/POS por TCP directo a `IP:9100` (puerto RAW estándar de impresoras térmicas de red)

### Por qué ethernet y no USB

| | Ethernet (recomendado) | USB |
|---|---|---|
| Dónde puede estar la impresora | Cualquier enchufe del hostal | Tiene que estar al lado de la PC |
| Si la PC muere | Cambias la PC, las impresoras siguen en su IP | La cocina se queda sin imprimir |
| Varios terminals imprimiendo | Cualquier terminal puede mandar a cualquier impresora | La cocina depende del cable a 1 sola PC |
| Costo extra | Cable ethernet ($2) | Nada |
| **Veredicto** | **✅ Elegí esto** | ❌ Solo si ya tenés la impresora USB y no querés gastar |

### Por qué server local y no cloud

- En un hostal el internet se cae. El POS no puede dejar de imprimir.
- Las impresoras están detrás del NAT del router del hostal — el server cloud no las ve.
- **Si después querés cloud**, agregás un "print agent" (mini Node script) en la PC local que SamaPos llame por HTTPS. Pero **para el hostal, local es lo correcto**.

---

## 3. Hardware que necesitás comprar (para un hostal típico)

| Cantidad | Qué | Modelo sugerido | Precio aprox. (USD) |
|---|---|---|---|
| 1 | Impresora térmica 80mm ethernet (cliente) | **Xprinter XP-80C** | $70 |
| 1 | Impresora térmica 80mm ethernet (cocina) | **Xprinter XP-80C** | $70 |
| 1 | Impresora térmica 58mm ethernet (barra, opcional) | **Xprinter XP-58** | $50 |
| 1 | Switch 5 puertos (si no hay uno en la red) | Tp-link TL-SF1005D | $10 |
| 3 | Cables ethernet (longitud según distancia) | Cat5e | $5 c/u |
| 1 | PC para el server (si no hay) | Mini PC / laptop vieja con Linux/Win | $0 (reusar) |

**Total: ~$200 USD, sin recurrentes.** Si el hostal ya tiene red cableada, solo las impresoras ($140-190).

### Setup de red en el hostal (una sola vez)

1. Conectá cada impresora al switch/router con ethernet
2. En el router, **asigná IP fija por MAC** (DHCP reservation):
   - `192.168.1.50` → MAC de la impresora de caja
   - `192.168.1.51` → MAC de la impresora de cocina
   - `192.168.1.52` → MAC de la impresora de barra
3. Imprimí la **página de auto-test** de cada impresora (botón FEED + encendido) para confirmar la IP
4. Desde la PC del server: `ping 192.168.1.50` y verificar que responde

> **Tip para Windows:** si el router no soporta DHCP reservation, configurá la IP estática directo en la impresora (todas las Xprinter/Epson lo permiten vía panel web o software de fabricante).

---

## 4. Configuración dentro de SamaPos

### Centros de producción (Settings → Production Centers)

| Nombre | printer_name | IP | Puerto |
|---|---|---|---|
| Cocina | `COCINA-01` | `192.168.1.51` | `9100` |
| Barra | `BARRA-01` | `192.168.1.52` | `9100` |

> El `printer_name` que ves en la UI es el **nombre lógico** (lo que identifica la impresora para SamaPos). La IP y el puerto son los del dispositivo físico. **Cuidado: hoy la UI de Production Center solo tiene `printer_name`, falta agregar `printer_ip` y `printer_port`.** Se agrega en este plan (ver §5).

### Terminales (Settings → Terminals)

| Nombre | printer_name | IP | Puerto |
|---|---|---|---|
| Mostrador 1 | `CAJA-01` | `192.168.1.50` | `9100` |

---

## 5. Lo que hay que programar (alcance del plan)

### 5.1. Backend — el motor de impresión (la pieza que falta)

**Nuevas dependencias (`package.json` del server):**

```json
"escpos": "^3.0.0",
"escpos-network": "^3.0.0"
```

> **Por qué `escpos` y no `node-thermal-printer`:** `escpos` es más liviano y tiene mejor soporte para envío por red. `node-thermal-printer` es más alto nivel pero más opinionado. Para nuestro caso, `escpos` da control fino sobre tickets de cocina vs recibos de cliente.

**Nuevo archivo `server/print-service.js`:**

```js
// Funciones públicas:
async function printKitchenTicket(ticket, productionCenter, account) { ... }
async function printCustomerReceipt(receiptData, terminal) { ... }
async function printTestPage(printerTarget) { ... }
```

- `printKitchenTicket`: arma el ticket de cocina (comanda) con ESC/POS, lo manda por TCP a `productionCenter.printer_ip:productionCenter.printer_port`
- `printCustomerReceipt`: arma el recibo del cliente (logo, items, pagos, total, gracias) y lo manda a `terminal.printer_ip:terminal.printer_port`
- `printTestPage`: para el botón "Imprimir prueba" — imprime un ticket corto con el nombre de la impresora y la fecha

**Formato de los tickets (definido en el código):**

- **Comanda de cocina** (80mm, sin logo, fuente grande):
  ```
  ═══════════════════════
        COCINA - MESA 5
  ═══════════════════════
  Pedido #1234  -  20:35
  Mesero: Carlos
  ───────────────────────
  2x Hamburguesa simple
     - Sin cebolla
  1x Papas fritas
  1x Coca-Cola
  ───────────────────────
  Notas: Para llevar
  ═══════════════════════
  ```
- **Recibo del cliente** (80mm, con logo, encabezado, totales):
  ```
  ═══════════════════════
        RESTAURANTE XYZ
       Av. Las Palmas 123
        Tel: 5555-5555
  ═══════════════════════
  Cuenta #1234  -  20:35
  Mesa 5  -  Mesero: Carlos
  ───────────────────────
  2x Hamburguesa  Q 90.00
  1x Papas        Q 25.00
  1x Coca-Cola    Q 15.00
  ───────────────────────
  Subtotal:       Q 130.00
  IVA:            Q 15.60
  TOTAL:          Q 145.60
  ───────────────────────
  Pago: Efectivo  Q 150.00
  Cambio:         Q   4.40
  ═══════════════════════
       ¡Gracias por su visita!
  ```

### 5.2. Cambios en el schema

**Agregar campos a `production_centers`** (los Production Centers hoy solo tienen `printer_name`, falta `printer_ip` y `printer_port`):

```sql
ALTER TABLE production_centers
  ADD COLUMN printer_ip VARCHAR(45) NULL,
  ADD COLUMN printer_port INT DEFAULT 9100;
```

**Nueva tabla `print_jobs`** (log de intentos):

```sql
CREATE TABLE IF NOT EXISTS print_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  printer_target VARCHAR(120) NOT NULL,    -- "COCINA-01", "CAJA-01"
  printer_ip VARCHAR(45) NULL,
  job_type ENUM('kitchen_ticket','customer_receipt','test') NOT NULL,
  account_id INT NULL,
  status ENUM('pending','success','failed') NOT NULL,
  error_message TEXT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_account (account_id),
  INDEX idx_created (created_at)
);
```

### 5.3. Wireado en los endpoints existentes

**`POST /api/accounts/:id/send-to-production`** (`server.js` línea ~2860):

- Después de armar el `ticketsMap` y antes de devolver el JSON:
  ```js
  for (const ticket of tickets) {
    const center = await query(
      'SELECT printer_name, printer_ip, printer_port FROM production_centers WHERE id = ?',
      [ticket.centerId]
    );
    if (center[0]?.printer_ip) {
      // fire-and-forget — no bloquea la respuesta
      printService.printKitchenTicket(ticket, center[0], account)
        .then(result => logPrintJob('kitchen_ticket', center[0], account.id, result))
        .catch(err => logPrintJob('kitchen_ticket', center[0], account.id, {ok:false, error: err.message}));
    }
  }
  ```
- Si la impresora no tiene IP → no intenta imprimir, loguea y sigue. La cocina usa KDS como respaldo.

**`POST /api/accounts/:id/payments`** (o el endpoint que cierra el cobro — hay que buscarlo):

- Después de registrar el pago, dispara `printCustomerReceipt` con la terminal del usuario logueado.

### 5.4. UI — botón "Imprimir prueba" en Settings

- En la lista de **Production Centers**: botón 🖨️ al lado de cada uno → dispara `POST /api/settings/production-centers/:id/test-print`
- En la lista de **Terminals**: igual
- Endpoint backend: `POST /api/settings/printers/test` que recibe `{type: 'production_center'|'terminal', id}` y llama `printService.printTestPage()`
- Toast verde si salió, toast rojo con detalle del error si falló

### 5.5. Manejo de fallos (clave para que la cocina no se frene)

| Falla | Qué ve el mesero | Qué ve la cocina | Log |
|---|---|---|---|
| Impresora de cocina apagada | Toast "Impresora de cocina no responde" | KDS en pantalla (respaldo) | `print_jobs.status = 'failed'` con error |
| Impresora de caja apagada | Toast al cobrar | N/A | `print_jobs.status = 'failed'`. Cajero reimprime desde ReprintPage |
| Sin red (router muerto) | Mismo que arriba, todo cae a KDS o reimpresión manual | KDS | Log con `error_message` |
| IP mal configurada | Toast "No se puede conectar a 192.168.1.51:9100" | KDS | Log con error de timeout |

**Reintentos:** 2 intentos con 500ms de espera entre ellos. Si ambos fallan, queda como `failed` en el log.

**Visibilidad:** en el reporte de cierre de turno, mostrar cantidad de impresiones OK/fail por impresora. Esto se agrega al `Reporte de Turno` existente.

---

## 6. Pasos de implementación (orden sugerido)

1. **Schema:** agregar columnas a `production_centers` + crear tabla `print_jobs` (1 migration SQL)
2. **Backend — print-service.js:** crear el módulo con las 3 funciones (test page, kitchen, customer) — incluyendo el formateador de tickets en texto plano con caracteres de caja
3. **Backend — integración en send-to-production:** disparar `printKitchenTicket` por cada ticket, con fire-and-forget + log en `print_jobs`
4. **Backend — integración en el cierre de pago:** disparar `printCustomerReceipt` cuando se completa el pago
5. **Backend — endpoint /test:** el botón "imprimir prueba" desde Settings
6. **Frontend — UI de Settings:** agregar campos `printer_ip` y `printer_port` al wizard de Production Centers + botón 🖨️ test
7. **Frontend — toasts:** cuando falla una impresión, mostrar toast con la instrucción (ej: "La cocina usa KDS mientras tanto")
8. **Frontend — reporte de turno:** agregar contador de impresiones OK/fail por impresora
9. **Doc — README_IMPRESORAS.md:** mini guía de 1 página para el usuario final del hostal: cómo cambiar el rollo, cómo hacer self-test, qué hacer si una impresora no responde

---

## 7. Estimación

- **Punto 1 (schema):** 30 min
- **Punto 2 (print-service):** 3-4 horas (la parte más larga — formatear tickets ESC/POS lleva tiempo)
- **Puntos 3, 4, 5 (integración):** 1.5 horas
- **Punto 6 (UI):** 1.5 horas
- **Punto 7 (toasts):** 30 min
- **Punto 8 (reporte):** 1 hora
- **Punto 9 (doc):** 1 hora

**Total: ~1.5 días de trabajo.** Aceptable para un feature crítico que faltaba.

---

## 8. Riesgos y cómo los mitigué

| Riesgo | Mitigación |
|---|---|
| Una impresora de red puede ser bloqueada por firewall de Windows | Pedimos al usuario que desactive firewall en la red local del hostal en el README |
| El formato ESC/POS varía entre marcas (Epson vs Xprinter vs Star) | Usamos comandos estándar ESC/POS que el 95% de las térmicas aceptan. Si una marca falla, el `printTestPage` lo detecta antes de ir a producción |
| El server no puede alcanzar la impresora (IP mal) | `printTestPage` desde Settings antes de operar — falla rápido y se arregla en 30 seg |
| Se cae internet del hostal | No afecta — todo es local |
| Se cae la PC del mostrador | Hot failover no está en el alcance. Por ahora, KDS en otra PC o tablet es el plan B |

---

## 9. Lo que **NO** está en este plan (y se puede agregar después)

- ❌ Print agent remoto (para cuando el server sea cloud) — se hace en otra fase
- ❌ Impresión de factura electrónica (SAT Guatemala) — es otro tema
- ❌ Logo en el ticket (requiere bitmap) — se puede agregar con `escpos.image()`
- ❌ Corte de caja X/Z (Z report en la impresora) — si la impresora fiscal lo requiere
- ❌ Impresión desde una tablet sin la PC encendida (requiere print agent) — fuera de alcance

---

## 10. Decisión pendiente (1 sola pregunta para vos)

**¿La PC del mostrador donde corre el server va a estar siempre encendida durante el horario de atención del hostal?**

- **Sí (lo más probable):** implementamos todo lo de arriba. Es el caso simple.
- **No / querés cloud:** antes de imprimir, agregamos el print agent. Esto agrega 1-2 días de trabajo y un componente más para mantener.

Mi recomendación: **asumir que sí y arrancar con el caso simple.** El print agent se agrega después si hace falta, sin romper lo que ya funciona.
