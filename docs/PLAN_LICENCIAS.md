# Plan — Sistema de Licencias para SamaPos

## Objetivo

Controlar qué terminales (POS y KDS) pueden operar, autorizar/desautorizar desde el panel de admin, y dejar el camino listo para monetizar (Trial + Standard).

## Decisiones acordadas

| Eje | Decisión |
|-----|----------|
| Operación offline | **Online con gracia offline** — server decide cuando hay red; firma HMAC permite trabajar hasta 7 días sin conexión |
| Identidad | **Serial único generado** por terminal (UUID v4) |
| Scope | POS + KDS |
| Tiers | **Trial** (30 días, 2 terminales) y **Standard** (sin límite) |

---

## Arquitectura en 3 capas

```
┌──────────────────────────────────────────────────────────┐
│ Terminal (Windows del POS)                               │
│  - Genera serial al instalar (UUID v4)                   │
│  - Lo guarda en C:\ProgramData\SamaPos\terminal.serial   │
│  - Envía X-Terminal-Serial en cada request                │
│  - Heartbeat cada 5 min → si falla → bloqueo             │
└──────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌──────────────────────────────────────────────────────────┐
│ Server (Node + MySQL, server.js)                         │
│  - Tabla licenses + terminals + license_audit            │
│  - Middleware requireLicensedTerminal en rutas críticas  │
│  - Endpoints admin solo para role=admin                  │
│  - Bloquea operaciones si serial no está active          │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ Admin UI (en Settings, ya existente)                     │
│  - Pantalla "Licencias" con:                             │
│    - Estado de la licencia actual (tier, max, usados)    │
│    - Terminales pendientes de aprobación                 │
│    - Terminales activas con botón revocar                │
│    - Botón "Generar trial" / "Upgrade a Standard"       │
└──────────────────────────────────────────────────────────┘
```

---

## Modelo de datos (MySQL)

```sql
-- 1. Licencia
CREATE TABLE licenses (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  tier            ENUM('trial', 'standard') NOT NULL,
  max_terminals   INT NOT NULL DEFAULT 2,    -- 2 para trial, 0 = ilimitado
  valid_from      DATETIME NOT NULL,
  valid_until     DATETIME NULL,              -- NULL en standard
  status          ENUM('active', 'expired', 'revoked') NOT NULL DEFAULT 'active',
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status)
);

-- 2. Terminales registradas (renombrada a licensed_terminals para no chocar
--    con la tabla `terminals` existente que guarda config de impresoras)
CREATE TABLE licensed_terminals (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  license_id          INT NULL,                       -- NULL mientras pending
  serial              VARCHAR(64) NOT NULL UNIQUE,    -- UUID v4
  hostname            VARCHAR(255),
  ip_address          VARCHAR(45),
  os_info             VARCHAR(255),
  terminal_type       ENUM('pos', 'kds') NOT NULL DEFAULT 'pos',
  label               VARCHAR(255),                   -- "Caja 1", "Cocina caliente"
  status              ENUM('pending', 'active', 'revoked', 'replaced')
                      NOT NULL DEFAULT 'pending',
  first_seen_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at        DATETIME NULL,
  last_online_at      DATETIME NULL,                  -- último heartbeat online exitoso
  approved_at         DATETIME NULL,
  approved_by_user_id INT NULL,
  FOREIGN KEY (license_id) REFERENCES licenses(id),
  FOREIGN KEY (approved_by_user_id) REFERENCES staff_users(id),
  INDEX idx_status (status),
  INDEX idx_serial (serial)
);

-- 3. Auditoría (para saber quién hizo qué)
CREATE TABLE license_audit (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  actor_user_id INT NULL,                -- NULL = acción del sistema
  terminal_id   INT NULL,
  license_id    INT NULL,
  action        VARCHAR(50) NOT NULL,     -- 'terminal.approve', 'license.revoke', etc.
  details       JSON,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
);
```

---

## Flujo end-to-end

### A. Primera instalación (terminal nueva)

1. Al arrancar, el cliente busca `C:\ProgramData\SamaPos\terminal.serial`.
2. Si no existe → genera `UUID v4()`, lo escribe en el archivo con permisos `0600`.
3. Envía `POST /api/license/enroll` con `{ serial, hostname, os_info, terminal_type }`.
4. Server: crea row en `terminals` con `status='pending'`, `first_seen_at=now()`.
5. Server responde `{ status: 'pending', message: 'Esperando aprobación del administrador' }`.
6. Cliente muestra pantalla de "Esperando aprobación" (no deja usar la app).
7. Admin entra a Settings → Licencias, ve la terminal pendiente, click "Aprobar".
8. Server: `status='active'`, `license_id` apunta a una licencia (o crea trial si no hay).
9. Cliente, al hacer el siguiente heartbeat, recibe `{status: 'active'}` y arranca normal.

### B. Operación normal (online)

1. Cliente hace **heartbeat cada 5 min**: `POST /api/license/heartbeat` con `X-Terminal-Serial`.
2. Server verifica:
   - ¿Serial existe?
   - ¿Status = active?
   - ¿Licencia no expirada?
   - ¿Licencia no revocada?
3. Si todo OK → actualiza `last_seen_at`, **firma un nuevo license token** (válido 7 días) y lo devuelve.
4. Cliente guarda el token cifrado localmente (clave derivada del hostname + serial).
5. Si algo falla → responde `{ok: false, reason: 'revoked' | 'expired' | 'unknown'}`.
6. Cliente, ante fallo: muestra pantalla de bloqueo con el reason y un teléfono de contacto.

### B'. Operación offline (sin red)

1. El heartbeat falla por timeout/red → cliente marca modo offline.
2. Cliente lee el token guardado localmente y verifica:
   - Firma HMAC válida (con la clave bundleada).
   - `valid_until > now()` (licencia no expirada).
   - `offline_grace_until > now()` (no excedió el tiempo desde último heartbeat online).
3. Si todo OK → cliente opera con el token cacheado.
4. Si `offline_grace_until` vencido → bloqueo. "Conecta a internet para renovar la licencia."
5. Cada vez que vuelve online, el heartbeat renueva `offline_grace_until = now() + 7 días`.

**Seguridad del modo offline (trade-off explícito):**
- HMAC-SHA256 con secreto bundleado en el JS. Un atacante con acceso al bundle puede falsificar tokens localmente.
- **Pero** esos tokens no sirven para nada si la terminal está online: el server rechaza tokens con `valid_until < now()` o con `serial` no registrado.
- Además, el secreto es único por deployment (env var) → sirve sólo para esta instalación.
- **Próximo nivel** (no incluido): Ed25519 + clave pública bundleada + clave privada sólo en server. El cliente ya no puede firmar tokens nuevos.
- **Lo que sí evita el modo offline**:
  - Que un usuario edite `terminal.serial` y desactive la app
  - Que un competidor instale la app sin comprar licencia
  - Que se use el sistema después de revocado mientras la red está caída

### C. Toda request crítica del POS

El middleware `requireLicensedTerminal` corre en rutas `/api/orders/*`, `/api/payments/*`, `/api/accounts/*`, `/api/kds/*`. Verifica:

- Header `X-Terminal-Serial` presente.
- Coincide con un terminal `status='active'`.
- La licencia del terminal no está expirada/revocada.

Si falla → `403 Forbidden { error: 'Terminal no autorizada' }`.

### D. Revocación instantánea

Admin click "Revocar" en una terminal activa:
1. Server: `UPDATE terminals SET status='revoked' WHERE id=?`.
2. Próximo heartbeat de esa terminal → falla → cliente se bloquea.
3. Log en `license_audit`.

### E. Cambio de máquina (mover licencia)

1. Admin marca la terminal antigua como `replaced` (botón "Reemplazar").
2. Nueva terminal se enrola → entra como `pending`.
3. Admin la aprueba con la misma licencia.

---

## Endpoints del server

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/license/enroll` | ninguna (rate-limited) | Terminal nueva se registra |
| POST | `/api/license/heartbeat` | `X-Terminal-Serial` | Terminal reporta que está viva |
| GET | `/api/license/status` | `X-Terminal-Serial` | Devuelve estado actual de la terminal |
| GET | `/api/admin/licenses` | admin | Lista licencias |
| GET | `/api/admin/terminals` | admin | Lista terminales (filtros: status, type) |
| POST | `/api/admin/terminals/:id/approve` | admin | Aprueba terminal pending |
| POST | `/api/admin/terminals/:id/revoke` | admin | Revoca terminal activa |
| POST | `/api/admin/terminals/:id/replace` | admin | Marca como reemplazada |
| POST | `/api/admin/licenses` | admin | Crea nueva licencia (tier, max, valid_until) |
| POST | `/api/admin/licenses/:id/revoke` | admin | Revoca una licencia entera |
| GET | `/api/admin/license-audit` | admin | Log de auditoría |

---

## Cliente (React)

### Módulo `src/lib/terminalSerial.js`

```js
// Genera/lee el serial del disco. Path en Windows: C:\ProgramData\SamaPos\terminal.serial
// Usa el endpoint del server para confirmar que el archivo existe y es accesible.
```

### Módulo `src/hooks/useLicense.js`

Hook que:
- Lee el serial del disco.
- Hace heartbeat cada 5 min.
- Devuelve `{ status, reason, canOperate }`.

### Pantalla de bloqueo (`src/components/LicenseBlock.jsx`)

Si `canOperate === false` → muestra pantalla completa con:
- Reason (revoked / expired / pending)
- Mensaje al admin
- Botón "Reintentar"

### Sección en Settings

Nueva pestaña "Licencias" con:
- Card superior: estado de licencia actual (tier, días restantes, X/Y terminales usadas)
- Tabla "Pendientes" con botones Aprobar / Rechazar
- Tabla "Activas" con Revocar / Reemplazar
- Botón "+ Nueva licencia" (modal con tier, max, valid_until)

---

## Capas de seguridad (anti-bypass)

| Capa | Mecanismo | Qué previene |
|------|-----------|--------------|
| 1. Serial en `C:\ProgramData\` | Requiere admin del SO para editar | Edición casual por usuario |
| 2. Header `X-Terminal-Serial` obligatorio en server | El server rechaza sin serial | Cliente que olvida mandar serial |
| 3. Server valida serial cada request crítica | Tabla `terminals` consultada en cada operación | Cliente que modifica archivos locales |
| 4. Heartbeat cada 5 min | Server actualiza `last_seen_at` | Cliente desconectado sigue operando |
| 5. Revocación instantánea | Cambio en DB → próximo request falla | Terminal robada sigue trabajando |
| 6. Audit log | Toda acción queda registrada | Negación de acciones admin |
| 7. `license_audit` inmutable (no UPDATE/DELETE en código) | Solo INSERT | Borrado de evidencia |
| 8. Serial + IP + hostname ligados | Cambio de IP → re-prompt de aprobación | Mover disco duro a otra máquina |

---

## Tier "Trial" — comportamiento

- Al primer `approve` de un cliente, si no hay licencia activa → server crea `licenses(tier='trial', max_terminals=2, valid_until=now()+30d)`.
- Cuando se aprueba una nueva terminal y se llegaría a `max_terminals`:
  - Si la licencia es `trial` → UI muestra "Límite alcanzado. Upgrade a Standard para más."
  - Admin puede cambiar tier a `standard` con un click.
- Licencia `standard`: `max_terminals=0` significa ilimitado. `valid_until=NULL` significa sin expiración.
- Cron diario (script) marca `licenses.status='expired'` cuando `valid_until < now()`.

---

## Plan de implementación (orden)

1. **Schema** — Crear las 3 tablas + migración idempotente en `server.js`.
2. **Módulo `terminalSerial.js`** — generar/leer serial, escribir en `ProgramData`.
3. **Endpoints públicos** — `enroll`, `heartbeat`, `status` con rate limiting.
4. **Middleware `requireLicensedTerminal`** — aplicado a rutas críticas.
5. **Endpoints admin** — CRUD de licenses/terminals.
6. **Hook `useLicense`** — heartbeat, expone `canOperate`.
7. **Pantalla de bloqueo** — muestra al usuario cuando no puede operar.
8. **UI Licencias en Settings** — admin aprueba/revoca/genera trial.
9. **Audit log** — escribir en cada acción admin.
10. **Job de expiración** — script que corre diario, marca expirados.
11. **Tests manuales** — enroll, approve, revoke, expire, replace, reinstall.

Estimación: 1–2 días de trabajo continuo para la versión completa, MVP funcional en medio día.

---

## Out of scope (para v2)

- Firma criptográfica de tokens para offline (no aplica: online-only).
- Telemetry de uso (qué módulos se usan,多长时间).
- Auto-renew / billing con Stripe.
- Licencias por feature (módulo restaurant vs CRM) — hoy es all-or-nothing.
- Geofencing / IP whitelist a nivel red (lo cubre el serial).

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Cliente edita `terminal.serial` | Server valida por IP+hostname también; cambios disparan re-approval |
| DB cae y nadie puede operar | El serial + middleware siguen funcionando, solo el heartbeat falla — bloquea pero no se pierde data |
| Admin revoca por error | UI muestra confirmación con typing del nombre de la terminal |
| Cambio de router / IP dinámica | El check es por serial, no por IP. IP es solo informativa |
| Disco duro muere | Admin marca la terminal como `replaced`, nueva máquina se enrola |
| Alguien clona el disco a otra máquina | El hostname será distinto → server detecta mismatch en heartbeat → flag para review |

---

## Próximo paso

Si te late el diseño, lo implemento en este orden:
1. Schema + endpoints públicos + middleware (lo más crítico)
2. UI admin
3. Harden final (audit, rate limit, expiración)

¿Avanzo o ajustamos algo del plan antes?
