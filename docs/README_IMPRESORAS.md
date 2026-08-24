# Guía de Impresoras — SamaPos

> **Para:** el operador del hostal (no técnico).
> **Qué hace esta guía:** explica cómo SamaPos envía tickets a las impresoras locales, qué hacer cuando una no responde, y cómo cambiar un rollo de papel.

---

## 1. ¿Cómo funciona?

SamaPos tiene **dos tipos de impresión**:

| Tipo | ¿Qué imprime? | ¿Cuándo? | ¿A qué impresora? |
|---|---|---|---|
| **Comanda** | Ticket de cocina / barra | Cuando el mesero presiona "Enviar a producción" en una cuenta | A la impresora del centro de producción (cocina, barra, etc.) |
| **Recibo del cliente** | La cuenta final con totales y pagos | Cuando el cajero cobra y la cuenta queda en $0 | A la impresora de la terminal (mostrador) |

**Si una impresora no responde**, no se rompe nada:

- Si falla la **comanda de cocina**: la cocina ve el pedido en el **KDS** (pantalla de cocina) que ya viene con SamaPos. La comanda también queda guardada en la base de datos para reimprimir.
- Si falla el **recibo del cliente**: el cajero puede reimprimir desde la pantalla de **Reimprimir** (sin perder el cobro).

---

## 2. ¿Qué necesito comprar?

Para un hostal típico (mostrador + cocina + barra):

| Cantidad | Qué | Modelo sugerido | Precio aprox. |
|---|---|---|---|
| 1 | Impresora 80mm ethernet (cliente) | **Xprinter XP-80C** | ~$70 USD |
| 1 | Impresora 80mm ethernet (cocina) | **Xprinter XP-80C** | ~$70 USD |
| 1 (opcional) | Impresora 58mm ethernet (barra) | **Xprinter XP-58** | ~$50 USD |
| 1 | Switch de red 5 puertos (si no hay) | Tp-link TL-SF1005D | ~$10 USD |
| 3 | Cables ethernet según distancia | Cat5e | ~$5 USD c/u |

**Total estimado: $200 USD** (sin recurrentes). Si ya tenés red cableada en el hostal, solo las impresoras.

### ¿Por qué ethernet y no USB?

- Podés poner la impresora donde quieras (cocina, barra, mostrador) sin depender de un cable a la PC.
- Si la PC del mostrador se rompe, cambiás la PC y las impresoras siguen funcionando con sus IPs.
- **Si ya tenés impresoras USB y querés usarlas**, contactanos — se puede configurar, pero requiere una PC prendida en cada ubicación de la impresora.

---

## 3. Configuración inicial (una sola vez)

### Paso 1: Conectar las impresoras a la red

1. Conectá cada impresora al switch/router del hostal con un cable ethernet.
2. Conectá la impresora a la corriente.
3. **Imprimí la página de auto-test** de cada impresora (en general: mantené presionado el botón **FEED** mientras la encendés, soltá a los 2 segundos). La página que sale tiene la **IP asignada** y la **MAC address**.

### Paso 2: Asignar IPs fijas en el router

Las impresoras necesitan **siempre la misma IP** (si no, SamaPos no las encuentra). Hay dos formas:

**Opción A — DHCP reservation (recomendado, lo hace el router):**

1. Entrá al router (generalmente `192.168.1.1` en el navegador).
2. Buscá la sección "DHCP" o "Reservas de direcciones".
3. Por cada impresora, agregá una reserva con la MAC (que viste en el auto-test) y una IP fija. Sugerimos:
   - `192.168.1.50` → Impresora de caja (mostrador)
   - `192.168.1.51` → Impresora de cocina
   - `192.168.1.52` → Impresora de barra (si la tenés)
4. Reiniciá cada impresora para que tome la nueva IP.
5. Imprimí otro auto-test y confirmá que la IP es la que asignaste.

**Opción B — IP estática en la impresora:**

1. En la página de auto-test, la mayoría de las Xprinter/Epson muestran la opción de configurar IP.
2. Conectá la impresora por USB temporalmente y usá el software del fabricante (Xprinter Setup Tool / EpsonNet Config) para fijar la IP.

### Paso 3: Verificar desde la PC del server

En la PC donde corre SamaPos, abrí una terminal (cmd o PowerShell) y escribí:

```
ping 192.168.1.50
ping 192.168.1.51
```

**Si responde**, todo bien. Si dice "tiempo de espera agotado" o "host unreachable", hay un problema de red (ver §6).

### Paso 4: Configurar SamaPos

1. Iniciá sesión como **admin** en SamaPos.
2. Andá a **Configuración** → **Producción**:
   - Para cada centro (Cocina, Barra), completá:
     - **Nombre de la impresora**: una etiqueta (ej: "Cocina Mostrador")
     - **IP de la impresora**: la IP que asignaste (ej: `192.168.1.51`)
     - **Puerto**: `9100` (no lo cambies a menos que sepas lo que hacés)
3. Andá a **Configuración** → **Terminales**:
   - Para la terminal del mostrador, completá los mismos campos con la IP de la impresora de caja.
4. Para cada impresora configurada, hacé clic en el **botón 🖨️** al lado.
   - Si la impresora imprime una página que dice "PRUEBA DE IMPRESION" → todo OK ✅
   - Si no imprime, andá a §6.

---

## 4. Uso diario

- **No tenés que hacer nada.** Las comandas se imprimen solas cuando el mesero presiona "Enviar a producción". El recibo se imprime solo cuando el cajero cobra y la cuenta queda en cero.
- Si querés **reimprimir un recibo**, andá al menú **Reimprimir**, buscá la cuenta por número o por nombre, y hacé clic en "Imprimir".

---

## 5. Cambiar el rollo de papel

1. Abrí la tapa de la impresora (generalmente empujando hacia abajo la palanca lateral).
2. Sacá el rollo viejo.
3. Poné el rollo nuevo **con el papel saliendo desde abajo** (la cara térmica va a quedar hacia el cabezal).
4. Cerrá la tapa.
5. La impresora hace un auto-corte y queda lista.

> **¿Qué papel uso?** Papel térmico estándar de 80mm (o 58mm si tenés esa). Lo conseguís en cualquier librería/papelería. Buscá "rollo térmico 80mm" o "rollo POS 80mm". No requiere tinta.

---

## 6. Si una impresora no responde

### Paso 1: Ver el diagnóstico

1. Andá a **Configuración** → **Impresoras**.
2. Mirá la lista "Últimos trabajos de impresión".
3. Si ves "Falló" con un mensaje de error, esa es la pista.

### Paso 2: Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| "No se pudo abrir 192.168.1.51:9100" | Impresora apagada o desconectada de la red | Prendé la impresora, verificá el cable ethernet |
| "connect ETIMEDOUT" | Firewall de Windows bloqueando | Desactivá el firewall de Windows para la red privada |
| "ECONNREFUSED" | Hay algo en esa IP pero no es la impresora | Verificá que la IP sea la correcta (auto-test) |
| Imprime pero sale cortado/distorsionado | Rollo mal puesto o papel equivocado | Sacá y volvé a poner el rollo (ver §5) |
| Imprime pero sale en blanco | Papel al revés | Sacá el rollo y ponelo del otro lado (cara térmica hacia arriba) |
| Imprime una sola vez y se queda colgada | Buffer de la impresora lleno | Apagá y prendé la impresora |

### Paso 3: Si nada funciona

1. **Reiniciá la impresora** (apagá 5 segundos y volvé a prender).
2. **Reiniciá SamaPos** (cerrá la app y volvé a abrir).
3. Si sigue fallando, **contactanos con el mensaje de error** que ves en la pestaña Impresoras — eso nos dice exactamente qué pasa.

---

## 7. Resumen rápido (cheatsheet)

```
1. Comprá las impresoras (Xprinter XP-80C ethernet)
2. Conectalas al switch del hostal con ethernet
3. Asignales IPs fijas en el router (DHCP reservation)
4. En SamaPos: Configuración → Producción / Terminales → cargar las IPs
5. Probá con el botón 🖨️ en cada una
6. Listo. No tenés que hacer nada más.
```

**Ante cualquier duda**, mandanos el mensaje de error que aparece en **Configuración → Impresoras**.
