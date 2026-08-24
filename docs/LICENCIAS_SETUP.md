# Sistema de Licencias — Guía de Setup

Esta guía explica cómo dejar operativo el sistema de licencias que se
implementó en el POS de SamaPos. El plan de diseño completo está en
[`PLAN_LICENCIAS.md`](./PLAN_LICENCIAS.md).

---

## 🎯 Qué hace

Cada POS o pantalla KDS que intenta usar el sistema se identifica con un
**número de serie único** (UUID v4) que se genera en la primera ejecución.
El servidor valida ese serial contra una base de datos de licencias y solo
deja operar a las terminales que el **administrador** haya aprobado
explícitamente.

- ✅ **Online**: el server valida cada 5 minutos vía heartbeat.
- ✅ **Offline**: si se cae la red, la terminal sigue trabajando con un
  token firmado localmente (gracia configurable, default 7 días).
- ✅ **Revocación instantánea**: al revocar, el próximo request falla.
- ✅ **Tiers**: Trial (30 días, 2 terminales) y Standard (sin límite).
- ✅ **Audit log**: queda registro de quién aprobó/revocó qué y cuándo.

---

## 📋 Pre-requisitos

- Node.js 18+
- MySQL con la base `restaurant_pos` ya creada (usa el `db/schema.sql` que ya tenías)
- Acceso de admin al sistema operativo donde corre el server

---

## 🚀 Setup paso a paso

### 1. Generar el secreto HMAC

Este secreto se usa para firmar los tokens de licencia. **Tiene que ser
único por deployment.** Si alguien lo obtiene, puede falsificar tokens
localmente (pero el server igual valida en cada heartbeat, así que el
alcance del ataque es limitado a "trabajar offline sin red").

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copiá el resultado (es un string hexadecimal largo).

### 2. Configurar variables de entorno

Editá tu archivo `.env` (o copiá `.env.example` → `.env` si no lo tenés):

```ini
# Variables de la DB (las que ya tenías)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=restaurant_pos
PORT=3000
NODE_ENV=production

# ───────── Licencias (CRÍTICO) ─────────
LICENSE_HMAC_SECRET=<pegar_acá_el_secreto_del_paso_1>

# Opcionales para el primer setup (paso 4)
LICENSE_BOOTSTRAP_SERIAL=
LICENSE_BOOTSTRAP_TIER=standard
LICENSE_BOOTSTRAP_LABEL=
```

> ⚠️ **No commitear el `.env`** al repositorio. Ya debería estar en tu
> `.gitignore`. Si no, agregalo.

### 3. Iniciar el server por primera vez

Las tablas de licencias se crean automáticamente al arrancar:

```bash
npm start
```

Deberías ver en consola:

```
[MIGRATION] Columna merged_into_account_id agregada a accounts
[MIGRATION] Tablas de licencias OK
POS activo en http://localhost:3000
```

Si ves error de DB, revisá las credenciales en `.env`.

### 4. Aprobar la primera terminal (la del admin)

La primera vez, no hay terminales aprobadas. Cualquier POS que se abra va
a mostrar una pantalla de "Esperando aprobación" con su número de serie
(un UUID tipo `8f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c`, 36 chars con guiones).

**Opción A — variable de entorno (recomendado en Windows/PowerShell):**

```powershell
# En PowerShell — evita problemas de parseo con < > y comillas
$env:LICENSE_BOOTSTRAP_SERIAL = "8f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c"
npm run license:bootstrap -- --label="Caja Admin"
```

**Opción B — argumento directo:**

```bash
# En bash / Git Bash / WSL
npm run license:bootstrap -- 8f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c --label="Caja Admin"
```

**Opción C — con comillas (si necesitás pasar placeholder literal):**

```powershell
# PowerShell interpreta < > como redirección — entre comillas es literal
npm run license:bootstrap -- "<pegar-uuid-aqui>" --label="Caja Admin"
```

> ⚠️ **PowerShell + placeholders con `< >`**: si copiás un comando de ejemplo
> que tiene `<serial>` o `<algo>` sin comillas, PowerShell tira el error
> `El operador '<' está reservado para uso futuro`. Dos soluciones:
> 1. Reemplazá el placeholder por el valor real antes de correr
> 2. Usá comillas dobles: `"<serial>"`
> 3. Mejor aún: usá la variable de entorno (Opción A)

> ⚠️ **Formato del serial**: tiene que ser un UUID v4 válido
> (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`, 36 chars, 4 guiones). Si
> pegás otro hex largo sin guiones, el script ahora te avisa con un
> error claro. Sacalo siempre del POS (pantalla de bloqueo, DevTools
> `localStorage.getItem('v1.terminal.serial')`, o la consola del navegador).

Vas a ver algo como:

```
[bootstrap] Licencia creada #1 (tier=standard, max=ilimitado)
[bootstrap] Terminal #1 aprobada y ligada a licencia #1.
```

**Opción B — desde la UI (si ya tenés una terminal aprobada):**

1. Abrí el POS en la terminal del admin → entrá con PIN de admin.
2. Andá a **Settings → Licencias** (la nueva pestaña al final).
3. Vas a ver la terminal pendiente en la tabla "Pendientes de aprobación".
4. Click **Aprobar**.

### 5. Poner TU máquina como "default autorizado" (creador/desarrollador)

Si sos el dueño del proyecto y la pantalla de bloqueo no te deja entrar,
hay tres formas de destrabarlo (de la más rápida a la más permanente):

**Opción A — auto-aprobación con tu PIN (sin tocar código):**
En la pantalla de bloqueo, si el estado es "Esperando aprobación", tocá
**"Soy admin · aprobar esta terminal"** e ingresá el PIN de un usuario
admin. El server aprueba la terminal y te inicia sesión solo.

**Opción B — dev-bypass con variable de entorno (recomendado):**
Agrega el serial de tu máquina a `.env` y la terminal queda **siempre**
autorizada, aunque esté `pending`, `revoked` o la licencia esté vencida:

```ini
LICENSE_DEV_SERIALS=8f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c
```

Varias máquinas: `LICENSE_DEV_SERIALS=uuid1,uuid2`.

Para sacar el serial de tu máquina: pantalla de bloqueo (botón
**Copiar**), o DevTools → Console →
`localStorage.getItem('v1.terminal.serial')`.

> ⚠️ Si preferís que **cualquier** terminal pase sin licencia (solo
> desarrollo local, nunca en un server compartido), usá:
> `LICENSE_DEV_MODE=true`

> ⚠️ **Ojo:** si tu navegador regenera el serial (limpiás datos de
> navegación o cambiás de navegador/máquina), aparece un serial nuevo
> que no está en la lista. Agregalo a `LICENSE_DEV_SERIALS` o usá
> `LICENSE_DEV_MODE=true` para no lidiar con esto en desarrollo.

**Opción C — bootstrap por CLI:**
```powershell
npm run license:bootstrap -- "8f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c" --label="Caja Admin"
```
Aprueba la terminal una sola vez (no es "siempre autorizado": si después
la revocás o vence la licencia, vuelve a bloquearse).

### 6. Verificar que todo funciona

Recargá el POS en la terminal aprobada. Debería:

- Pasar la pantalla de bloqueo
- Mostrar la pantalla de login
- Dejar entrar con cualquier PIN de staff

Para confirmar que el server está validando correctamente, abrí la consola
del navegador y vas a ver requests a `/api/license/heartbeat` cada 5 min.

---

## 🖥️ Uso desde la UI admin (Settings → Licencias)

### Ver el estado actual
- **Tier**: Trial o Standard
- **Terminales usadas / disponibles**: ej. `1 / 2` o `3 / ∞`
- **Vence**: fecha de expiración (null = sin vencimiento)
- **Gracia offline**: días que la terminal puede trabajar sin red

### Aprobar terminales pendientes
Aparecen en la tabla superior con fondo ámbar. Click en **Aprobar**.

### Revocar terminales activas
Click en **Revocar** en la fila. Te pide que escribas el nombre o ID para
confirmar. Después de revocar, la terminal se bloquea en su próximo
heartbeat (≤ 5 minutos, instantáneo si la red está bien).

### Reemplazar terminales
Útil cuando se mueve la licencia a otra máquina (ej. se rompió el disco
duro). Click en **Reemplazar** deja la terminal vieja en estado
`replaced`. La nueva terminal que se enrole entra como `pending` y se
puede aprobar con la misma licencia.

### Crear licencias nuevas
Click en **+ Nueva licencia** (esquina superior derecha de la card de
licencia). Opciones:

| Campo | Qué poner |
|-------|-----------|
| Tier | `trial` o `standard` |
| Máx terminales | número, o `0` para ilimitado (default según tier) |
| Días gracia offline | default 7 |
| Notas | texto libre, ej. "Cliente X - pagado hasta dic 2026" |

### Ver el audit log
Al final de la página hay un panel plegable con las últimas 50 acciones:
quién aprobó, quién revocó, con timestamp.

---

## 🔄 Flujo del día a día

### Una terminal nueva entra al sistema
1. La encienden → genera UUID → manda `POST /api/license/enroll`
2. Aparece en **Settings → Licencias** como "Pendiente"
3. El admin la aprueba con un click
4. La terminal empieza a operar (próximo heartbeat devuelve token)

### Una terminal existente se cambia de máquina
1. Marcar la vieja como **Reemplazar**
2. Encender la nueva → se enrola como pendiente
3. Aprobar la nueva

### La red se cae
1. Heartbeat falla 2 veces (10 min)
2. La terminal pasa a modo **offline** (sigue operando con token cacheado)
3. Cuando vuelve la red, heartbeat exitoso → modo normal

### Un terminal se comporta mal
1. Click **Revocar** en la UI
2. La terminal se bloquea en su próximo request
3. Queda en estado `revoked` y no se puede volver a usar sin intervención manual

---

## 🛠️ Troubleshooting

### "Esta terminal fue revocada"
El admin la revocó. Contactalo para reactivar. Si fue un error, el admin
puede crear un nuevo registro desde la línea de comandos:

```bash
node bin/bootstrap-license.js --tier=standard
```
Y luego aprobar manualmente con un INSERT en la DB (no hay endpoint admin
para "re-revocar" porque eso debería ser raro).

### "Licencia vencida"
La licencia de tipo `trial` o `standard` con fecha de expiración venció.
El admin debe crear una nueva licencia y aprobar las terminales contra
ella. Las terminales activas se marcan automáticamente como revocadas.

### "Sin conexión y no hay licencia offline guardada"
La terminal nunca pudo hacer un heartbeat exitoso (o se borró el storage).
Soluciones:
- Verificar conectividad de red
- Revisar que el server esté corriendo
- Si es la primera vez, esperar a que el admin apruebe

### "Data too long for column 'serial'" en el bootstrap
Pegaste un serial con formato incorrecto (hex largo sin guiones, o dos
serials concatenados). Un UUID v4 válido tiene exactamente este formato:

```
8f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c
^^^^^^^ ^^^^ ^^^^ ^^^^ ^^^^^^^^^^^^
8-4-4-4-12  =  32 hex + 4 guiones = 36 chars
```

**Cómo sacar el correcto:**
- Pantalla de bloqueo del POS: el UUID aparece en monoespaciado
- DevTools → Console → `localStorage.getItem('v1.terminal.serial')`
- DevTools → Application → Local Storage → clave `v1.terminal.serial`

El script de bootstrap valida el formato y rechaza lo que no sea UUID.
Si aún así te da error, **reiniciá el server** (`npm start`) — al
arrancar aplica un `ALTER TABLE` que amplía la columna `serial` a
`VARCHAR(128)` por si en el futuro se usan identificadores más largos.

### El admin no puede entrar al POS para aprobar
Verificar:
1. Que la terminal del admin esté en estado `active` (visible en
   `Settings → Licencias` o vía `SELECT * FROM licensed_terminals`)
2. Que la licencia no esté vencida
3. Que el PIN del admin sea correcto

### PowerShell: "El operador '<' está reservado para uso futuro"
PowerShell interpreta `<` y `>` como redirección (igual que bash).
Si copiás un comando de ejemplo con placeholders como `<serial>` sin
comillas, falla el parseo. Tres formas de evitarlo:
1. **Reemplazá el placeholder** por el valor real antes de correr
2. **Comillas dobles**: `npm run license:bootstrap -- "<serial>" --label="..."`
3. **Variable de entorno** (más limpio):
   ```powershell
   $env:LICENSE_BOOTSTRAP_SERIAL = "8f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c"
   npm run license:bootstrap -- --label="Caja Admin"
   ```

### Cambiar el secreto HMAC
Si comprometés el secreto, regenerá uno y reiniciá el server. **Todas
las terminales van a tener que re-enrolar** porque sus tokens cacheados
no van a ser válidos (en realidad sí, porque la verificación HMAC solo
la hace el server, no el cliente — pero igual conviene rotar).

```bash
# 1. Generar nuevo secreto
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 2. Cambiar LICENSE_HMAC_SECRET en .env

# 3. Reiniciar
npm start
```

---

## 🔐 Lo que SÍ cubre el sistema

- ✅ Un competidor no puede clonar la app y usarla sin una licencia aprobada
- ✅ Un usuario no puede borrar la app y "resetear" el trial (el serial se queda en localStorage)
- ✅ Un empleado no puede usar el POS después de que lo despidieron (admin revoca)
- ✅ El sistema sigue operando si se cae la red (hasta 7 días de gracia)
- ✅ Toda acción admin queda registrada para auditoría

## ⚠️ Lo que NO cubre (limitaciones conocidas)

- ❌ Si alguien edita el `localStorage` puede cambiar el serial. El server
  detecta seriales desconocidos/revocados pero no puede impedir que un
  usuario avanzado lo edite localmente. **Mitigación**: kiosko mode en
  el navegador o wrapper Electron para producción.
- ❌ El modo offline confía en el `expires_at` del token cacheado. No
  verifica criptográficamente la firma en el cliente (requeriría
  bundlear el secreto en el JS, lo que anula la protección). El server
  valida realmente en cada heartbeat.
- ❌ Si el server está caído y la gracia offline venció, no hay forma de
  operar hasta que vuelva el server. Es por diseño: online-first.

---

## 📂 Archivos relevantes

| Archivo | Qué hace |
|---------|----------|
| `src/license.js` | Módulo backend: crypto, endpoints, middleware |
| `bin/bootstrap-license.js` | CLI para el setup inicial |
| `server.js` | Patches: import del módulo + endpoints + middleware global |
| `react-app/src/lib/terminalSerial.js` | Genera/lee el UUID v4 en localStorage |
| `react-app/src/lib/licenseStorage.js` | Cache cifrado del token (AES-GCM) |
| `react-app/src/hooks/useLicense.js` | Heartbeat online + modo offline |
| `react-app/src/components/LicenseBlock.jsx` | Pantalla de bloqueo |
| `react-app/src/components/LicensesTab.jsx` | UI admin de licencias |
| `react-app/src/App.jsx` | LicenseGate envuelve toda la app |
| `react-app/src/api.js` | Agrega header `X-Terminal-Serial` a todas las requests |
| `react-app/src/pages/Settings.jsx` | Nueva pestaña "Licencias" |
| `docs/PLAN_LICENCIAS.md` | Plan de diseño completo (decisiones, trade-offs) |
| `.env.example` | Variables de entorno documentadas |

---

## ❓ Preguntas frecuentes

**¿Qué pasa si el admin se va de la empresa?**
Los tokens de admin están en la tabla `staff_users`. Cambiar el `pin_code`
del admin viejo + crear uno nuevo resuelve. Las licencias no dependen
del admin, solo de las decisiones registradas en el audit log.

**¿Se puede tener una terminal con tier "trial" y otras con "standard"?**
No en el modelo actual: las terminales heredan el tier de la licencia a la
que están asignadas. Si querés tiers mixtos, cada terminal necesita su
propia licencia (hoy todas cuelgan de la primera licencia activa).

**¿Cómo migro un sistema que ya estaba en uso?**
1. Hacé backup de la DB
2. Configurá el `.env` con el nuevo secreto
3. Iniciá el server (crea las tablas)
4. Las terminales que ya están operativas van a aparecer como
   `pending` cuando el admin las abra en un browser nuevo
5. Aprobá cada una desde la UI
6. El sistema viejo sigue funcionando durante la transición (no hay
   breaking changes en `/api/auth/pin-login` ni en las rutas operativas
   hasta que se intente usar — el middleware solo aplica si la terminal
   se identifica con `X-Terminal-Serial`, que la app ahora manda siempre)
