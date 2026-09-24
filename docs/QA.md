# QA — SamaPos

> Sistema de verificación de SamaPos: checklist manual, smoke tests, unit
> tests, E2E con Playwright, y CI en GitHub Actions.

## TL;DR

```bash
# 1) Unit tests (no necesita MySQL, corre en cualquier lado)
npm run test:unit

# 2) Smoke test (necesita el server levantado)
npm start
# en otra terminal:
npm run test:smoke

# 3) E2E con Playwright (necesita server + frontend levantados)
npm start
cd react-app && npm run dev
# en otra terminal:
npm run test:e2e
```

## Estructura

```
.
├── docs/
│   ├── QA_CHECKLIST.md       ← checklist manual (todos los módulos)
│   └── QA.md                 ← este archivo
├── scripts/
│   └── smoke.js              ← smoke test (pings endpoints críticos)
├── src/
│   └── license.js            ← lógica de licencias (testeable)
├── tests/
│   ├── unit/                 ← tests de funciones puras (node:test, sin deps)
│   │   └── license.test.js
│   └── e2e/                  ← tests end-to-end (Playwright)
│       ├── package.json
│       ├── playwright.config.js
│       └── tests/
│           ├── _helpers.js
│           ├── 01-smoke.spec.js
│           ├── 02-auth.spec.js
│           └── 03-navigation.spec.js
└── .github/
    └── workflows/
        └── qa.yml            ← CI: corre unit + smoke + E2E
```

## ¿Qué cubre qué?

| Capa              | Qué hace                                        | Cuándo correrla                  |
|-------------------|-------------------------------------------------|----------------------------------|
| **Manual**        | 100+ casos por módulo, ojo humano               | Antes de cada release            |
| **Unit (`test:unit`)**   | Funciones puras (license crypto, dev bypass)   | Cada push, cada PR               |
| **Smoke (`test:smoke`)** | Pings a endpoints clave, detecta 5xx          | Después de deploy, antes de release |
| **E2E (`test:e2e`)**     | Flujos completos en el browser real           | Cada push, cada PR               |
| **CI (`qa.yml`)**        | Unit + smoke + E2E en cada push/PR             | Automático                       |

### ¿Por qué las tres capas automatizadas?

- **Unit** detecta bugs en lógica de un commit específico en milisegundos. Si
  alguien rompe la verificación de tokens del sistema de licencias, el unit
  test grita.
- **Smoke** detecta "el server ni siquiera arrancó" o "el endpoint crítico
  devuelve 500" en 5 segundos. Es el canario.
- **E2E** detecta bugs de integración: que la app cargue, que el login
  funcione, que la navegación no rompa, que no haya errores de JS en la
  consola. Es la red de seguridad más amplia.

## Requisitos por capa

### Unit tests

- Node.js 18+ (recomendado 20+).
- Sin DB, sin red.
- Sin dependencias extra: usa el `node:test` built-in.

```bash
node --test tests/unit/
# o:
npm run test:unit
```

### Smoke test

- El server de SamaPos tiene que estar corriendo (`npm start`).
- DB sembrada (al menos con el schema).
- Si querés testear endpoints autenticados, configurá `SMOKE_PIN` y
  pasá `--pin`.

```bash
# Sin auth (públicos)
node scripts/smoke.js

# Con auth (incluye /tables, /settings, /shifts, /inventory, /cxc)
node scripts/smoke.js --pin 1234

# Apuntando a otro server
node scripts/smoke.js --base-url http://localhost:3001

# Modo CI (sin colores, salida limpia para logs)
node scripts/smoke.js --ci

# Verbose (imprime bodies de respuesta en cada check)
node scripts/smoke.js --verbose
```

Exit codes:
- `0` — todos los checks pasaron
- `1` — uno o más checks fallaron
- `2` — el server no responde (setup error)

### E2E con Playwright

- El server de SamaPos tiene que estar corriendo (`npm start` en `:3000`).
- La app de React tiene que estar corriendo (`cd react-app && npm run dev` en `:5173`).
- DB sembrada con al menos: 1 usuario con PIN, 1 centro de operación, 1 mesa, 1 producto.
- El usuario de test debe tener PIN `1234` por default. Override con `E2E_ADMIN_PIN`.

#### Setup inicial

```bash
cd tests/e2e
npm install
npx playwright install --with-deps chromium
```

#### Correr los tests

```bash
# Headless (default)
npm run test:e2e

# Con browser visible (debugging)
npm run test:e2e:headed

# UI mode (Playwright Inspector)
npm run test:e2e:ui

# Debug mode (step-by-step)
npm run test:e2e:debug

# Ver el reporte HTML de la última corrida
npm run test:e2e:report
```

#### Variables de entorno

| Variable          | Default                   | Para qué                                      |
|-------------------|---------------------------|-----------------------------------------------|
| `E2E_BASE_URL`    | `http://localhost:5173`   | URL base de la app React                      |
| `E2E_ADMIN_PIN`   | `1234`                    | PIN que se usa en los tests de login          |

#### Datos de test mínimos

Los tests asumen que tenés cargado:

```sql
-- 1 usuario admin con PIN 1234
INSERT INTO staff_users (full_name, role, pin_code, operation_center_id)
  VALUES ('Admin Test', 'admin', '1234', 1);

-- 1 centro de operación
INSERT INTO operation_centers (name, is_active)
  VALUES ('Centro Test', 1);

-- 1 mesa
INSERT INTO dining_areas (name, allow_transfer) VALUES ('Salón', 1);
INSERT INTO restaurant_tables (area_id, operation_center_id, code, seats, is_active)
  VALUES (1, 1, 'M1', 4, 1);

-- 1 producto
INSERT INTO product_categories (name, sort_order) VALUES ('Bebidas', 1);
INSERT INTO products (category_id, name, base_price, is_active)
  VALUES (1, 'Café', 15.00, 1);
```

(El CI ya siembra esto automáticamente — ver `qa.yml`.)

## CI (GitHub Actions)

El workflow `.github/workflows/qa.yml` corre automáticamente en cada push
a `main` o `develop`, y en cada PR hacia esas ramas. También se puede
disparar manualmente desde la tab "Actions".

Pasos del CI:

1. Levanta un servicio de MariaDB 10.11
2. Espera a que MariaDB esté listo
3. Aplica el schema (`db/schema.sql` + `db/cxc_schema.sql`)
4. Siembra datos mínimos de test
5. Build de la app React
6. Arranca el backend en `:3000`
7. Corre el smoke test
8. Arranca el frontend (vite preview) en `:5173`
9. Corre los tests de Playwright
10. Sube el reporte HTML y los traces como artifacts (retenidos 7 días)

Si algún step falla, el job se pone rojo y te llega el mail. Andá a la tab
"Actions" → click en el run → bajá los artifacts para ver qué pasó.

### Permisos necesarios para el CI

El workflow usa las acciones estándar (`actions/checkout@v4`,
`actions/setup-node@v4`, `actions/upload-artifact@v4`). No requiere secrets
adicionales. Los servicios de MariaDB son provistos por GitHub sin config.

## Cómo agregar un test nuevo

### Unit test

Editá `tests/unit/license.test.js` o creá un archivo nuevo en `tests/unit/`.
El runner los levanta automáticamente.

Convenciones:
- `describe(...)` para agrupar tests
- `test(...)` para un caso individual
- `assert.equal`, `assert.deepEqual`, `assert.ok` de `node:assert/strict`

### E2E test

Creá un archivo `NN-nombre.spec.js` en `tests/e2e/tests/`. El prefijo numérico
es solo para que el orden de ejecución sea predecible.

Convenciones:
- Importá helpers con `require('./_helpers')` para login/logout.
- Usá selectores robustos: `getByRole`, `getByText`, `getByLabel`.
- Si un test depende de datos que pueden no existir, usá `test.skip(true, "...")`
  con un mensaje claro.
- Para tests que sí requieren un estado específico, sembralos con SQL antes
  (o documentá el setup en un comentario al inicio del archivo).

### Smoke test

Editá `scripts/smoke.js`. Hay dos tipos de checks:
- `checkJsonEndpoint(baseUrl, path, id, name, reporter)` — para `GET`s.
- Manual con `fetch` para lógica custom (ver `checkPinLogin`).

## Reporte de bugs

Cuando algo falla:

1. **En local:** corré el test individual con `--verbose` o `--headed` para
   ver el error completo.
2. **En CI:** bajá el artifact `playwright-report` (HTML navegable) o
   `playwright-traces` (videos + traces por test).
3. **Si es manual:** usá el template de reporte en `QA_CHECKLIST.md` sección 16.

## Roadmap (lo que no está todavía)

Cosas que serían valiosas para agregar cuando crezca el proyecto:

- [ ] **Tests de integración del server** con `supertest` + una DB de
      test (docker-compose con MariaDB efímero). Hoy el server.js monolítico
      hace difícil mockear la DB sin refactor.
- [ ] **Refactor del server.js** en módulos más pequeños para poder
      testear rutas individualmente.
- [ ] **Tests de property-based** para cálculos (totales con propina,
      prorrateos, descuentos).
- [ ] **Visual regression tests** con Playwright screenshots para los
      flujos críticos.
- [ ] **Performance tests** con k6 o artillery sobre los endpoints más
      usados.
- [ ] **Mutation testing** para verificar que los tests son sensibles
      (no solo pasan por casualidad).

Por ahora, lo que está te cubre:
- ✅ Detectar regresiones en crypto de licencias (unit)
- ✅ Detectar que el server arrancó y responde a endpoints clave (smoke)
- ✅ Detectar que el login y la navegación básica no rompen (E2E)
- ✅ Tener una checklist sistemática para QA manual antes de releases
