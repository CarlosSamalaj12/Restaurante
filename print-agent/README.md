# SamaPos Print Agent (Puente de Impresión Cloud-to-LAN)

Este agente permite que el sistema SamaPos alojado en la nube (Hostinger, VPS, AWS) imprima comandas y recibos de forma instantánea en las impresoras térmicas (Cocina, Bar y Caja) conectadas a tu red local Wi-Fi o Ethernet (`192.168.x.x`).

---

## 🚀 ¿Cómo funciona?

1. El servidor en Hostinger **no puede** entrar a la red privada de tu restaurante por el firewall/NAT de tu router.
2. Este **Print Agent** se instala en la computadora de caja (o cualquier PC de la misma red local de las impresoras).
3. El agente se conecta hacia el servidor por **WebSocket seguro** (conexión saliente permitida por cualquier router).
4. Cuando un cliente comanda desde el **Menú Digital** o un mesero ingresa una orden:
   - Hostinger despacha el trabajo en tiempo real por WebSocket.
   - El Print Agent recibe los datos y manda a imprimir a la IP local (`192.168.1.51:9100`).
   - Envía confirmación (ACK) a la nube de que el ticket se imprimió con éxito.
5. **¿Qué pasa si se va el internet o se apaga la PC de caja?**
   - Hostinger guarda los pedidos en la base de datos en estado `pending` (en cola).
   - En cuanto la PC o el internet vuelven a encenderse, el agente descarga automáticamente todos los tickets pendientes y los imprime en orden cronológico. ¡Ningún pedido se pierde!

---

## 🛠️ Instalación en la Computadora de Caja

### Paso 1: Requisitos previos
- Tener instalado **Node.js LTS** (descargable gratis desde [https://nodejs.org](https://nodejs.org)).

### Paso 2: Copiar la carpeta
Copia la carpeta `print-agent` a la computadora de caja (por ejemplo en `C:\SamaPos\print-agent`).

### Paso 3: Configurar `config.json`
Abre el archivo `config.json` con el bloc de notas y edita los campos:

```json
{
  "serverUrl": "https://tu-dominio-en-hostinger.com",
  "agentSecret": "samapos_print_secret_2026",
  "agentName": "Caja Principal",
  "agentId": "caja-pos-1",
  "pollIntervalMs": 15000,
  "connectTimeoutMs": 3500,
  "retryAttempts": 2
}
```

- `serverUrl`: La dirección web donde está publicado tu SamaPos en Hostinger.
- `agentSecret`: La clave secreta configurada en tu archivo `.env` del servidor (`PRINT_AGENT_SECRET`).

### Paso 4: Iniciar el agente
Haz doble clic sobre el archivo:
👉 **`start-agent.bat`**

La primera vez instalará automáticamente las dependencias y verás en pantalla:
```
>>> [ONLINE] Conectado exitosamente al servidor SamaPos
>>> Listo para recibir comandas y recibos en tiempo real.
```

---

## 💡 Consejo para Inicio Automático con Windows
Si deseas que el agente inicie automáticamente cada vez que se encienda la computadora de caja:
1. Presiona `Windows + R`, escribe `shell:startup` y presiona Enter.
2. Crea un acceso directo a `start-agent.bat` y pégalo en esa carpeta.
¡Listo! Cada vez que prendas la PC, el servicio de impresión estará activo sin necesidad de abrirlo manualmente.
