# Kitchen Display System (KDS) - Registro de Cambios

## Fecha: 2026-07-23

---

## Resumen de Funcionalidades KDS

El KDS es un sistema de visualización de pedidos para cocina/bar de restaurante POS. Muestra tickets activos con tiempos de espera, permite marcar items como completados, y genera reportes de productividad.

---

## Cambios Realizados

### 1. Endpoint `/api/kds/orders-with-voided`

**Propósito:** Obtener órdenes activas con items cancelados incluidos para mostrar en KDS.

**Ubicación:** `server.js` (~línea 3337)

**Respuesta mejorada:**
```json
{
  "orders": [
    {
      "accountId": 1,
      "checkNumber": "001",
      "tableCode": "5",
      "waiterName": "Carlos",
      "centerName": "Cocina",
      "items": [
        {
          "itemId": 123,
          "productName": "Ensalada César",
          "qty": 2,
          "seatNo": 1,
          "notes": "Sin cebolla",
          "sentAt": "2026-07-23T00:30:00Z",
          "voided": false,
          "completed": false,
          "categoryName": "Ensaladas",
          "centerId": 1,
          "centerName": "Cocina"
        }
      ]
    }
  ],
  "categories": [...]
}
```

**Mejoras agregadas:**
- `categoryName` - nombre de categoría del producto
- `centerId` - ID del centro de producción
- `voided`, `voidReason`, `voidedAt` - info de items cancelados
- `completed` - indica si el item ya fue marcado como listo

---

### 2. Endpoint `/api/kds/report`

**Propósito:** Generar reporte de productividad del KDS con tiempos de preparación.

**Ubicación:** `server.js` (~línea 3590)

**Query params:**
- `date` (YYYY-MM-DD) - filtra por fecha de completado
- `centerId` - filtra por centro de producción
- `limit` - límite de registros (default: 100)

**Respuesta:**
```json
{
  "items": [
    {
      "item_id": 123,
      "product_name": "Ensalada César",
      "qty": 2,
      "table_code": "5",
      "center_name": "Cocina",
      "category_name": "Ensaladas",
      "sent_at": "2026-07-23T00:30:00Z",
      "completed_at": "2026-07-23T00:38:00Z",
      "prep_time_minutes": 8
    }
  ],
  "stats": {
    "totalItems": 45,
    "totalQty": 67,
    "avgTime": 7,
    "minTime": 2,
    "maxTime": 25,
    "byCategory": [
      { "category": "Ensaladas", "items": 12, "avgTime": 5 },
      { "category": "Carnes", "items": 8, "avgTime": 12 }
    ]
  }
}
```

---

### 3. API Methods (api.js)

**Ubicación:** `react-app/src/api.js` (~línea 370)

**Nuevo método:**
```javascript
getKdsReport: (date, centerId, limit = 100) => {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (centerId) params.append('centerId', centerId);
  params.append('limit', limit);
  return request(`/kds/report?${params}`);
}
```

---

### 4. KitchenDisplay.jsx - Componente Principal

**Ubicación:** `react-app/src/pages/KitchenDisplay.jsx`

#### 4.1 Imports agregados
```javascript
import { FileText, Timer, BarChart3, Calendar } from 'lucide-react';
```

#### 4.2 Estados agregados
```javascript
const [showReport, setShowReport] = useState(false);
const [reportData, setReportData] = useState(null);
const [reportLoading, setReportLoading] = useState(false);
const [reportDate, setReportDate] = useState(dayjs().format('YYYY-MM-DD'));
```

#### 4.3 Funciones de reporte
```javascript
const loadKdsReport = async () => { ... }
const handleShowReport = () => { ... }
```

#### 4.4 Cálculo de contadores por centro
```javascript
// Calculate counts by production center (for filter buttons)
const centerCounts = useMemo(() => {
  const counts = {};
  activeOrders.forEach(order => {
    const centerName = order.centerName || 'Restaurante';
    const pendingItems = order.items.filter(i => !i.voided && !i.completed);
    if (pendingItems.length > 0) {
      counts[centerName] = (counts[centerName] || 0) + 
        pendingItems.reduce((sum, i) => sum + i.qty, 0);
    }
  });
  return counts;
}, [orders, activeOrders]);
```

#### 4.5 Botón de reporte en header
```javascript
<button onClick={handleShowReport} className="...">
  <BarChart3 className="w-4 h-4" />
</button>
```

#### 4.6 Modal de reporte KDS
- Selector de fecha
- Tarjetas de resumen (total items, cantidad, tiempo promedio, rango)
- Breakdown por categoría con tiempos promedios
- Tabla detallada de items completados con colores por tiempo

---

## Estructura Visual

```
┌─────────────────────────────────────────────────────────────┐
│ [≡] KDS Kitchen Display          🔥 12  [Hist] [📊] [⚙️] [↻] │
│─────────────────────────────────────────────────────────────│
│ [Todos (12)] [Cocina (8)] [Bar (4)]                        │
├─────────────┬───────────────────────────────────────────────┤
│  Categorías │  ┌─────────────┐ ┌─────────────┐              │
│             │  │ Mesa 5  8m  │ │ Mesa 3  3m  │              │
│ ┌─────────┐ │  │─────────────│ │─────────────│              │
│ │Carnes(5)│ │  │ S1 2x Ensal │ │ S1 1x Cafe  │              │
│ └─────────┘ │  │ S2 1x Carne │ │ S2 2x Jugo  │              │
│ ┌─────────┐ │  │  [Completar]│ │  [Completar]│              │
│ │Bebidas(4│ │  └─────────────┘ └─────────────┘              │
│ └─────────┘ │                                              │
│             │                                              │
│ Tiempos:    │                                              │
│ 🟢 0-5 min  │                                              │
│ 🟡 5-10min  │                                              │
│ 🟠 10-15min │                                              │
│ 🔴 >15 min  │                                              │
└─────────────┴───────────────────────────────────────────────┘
```

---

## Colores de Alertas por Tiempo

Configurable en settings, default:

| Color | Rango | Significado |
|-------|-------|-------------|
| Verde | 0-5 min | Normal |
| Amarillo | 5-10 min | Atención |
| Naranja | 10-15 min | Retrasado |
| Rojo | >15 min | Crítico |

---

## Centros de Producción

Los productos se asignan a centros via tabla `product_production_centers`:

- **Cocina** - Comidas principales
- **Bar** - Bebidas
- ** otros** - Configurable desde Settings

---

## Fixes Aplicados

### Bug: Contadores incorrectos en botones de filtro
- **Problema:** Los botones mostraban contadores antiguos o de items completados
- **Solución:** Se recalculó `centerCounts` para solo contar items pendientes de `activeOrders`

### Bug: Items sin `centerId`
- **Problema:** No se podía filtrar correctamente por centro
- **Solución:** Se agregó `centerId` y `centerName` a cada item en la respuesta del API

---

## Próximas Mejoras Posibles

1. **Exportar reporte a PDF/Excel**
2. **Notificaciones de sonido** para tickets críticos (>15 min)
3. **Filtro por mesero** para saber quién pidió
4. **Tiempo objetivo por producto** configurable
5. **Widget de productividad** en dashboard
