# 🖨️ Guía de Uso e Instalación: SamaPos Print Agent (`start-agent.bat`)

Esta guía explica paso a paso cómo configurar y ejecutar el **Print Agent** en la computadora de caja del restaurante para que las órdenes del **Menú Digital** y comandas de meseros se impriman automáticamente en tus impresoras térmicas de red local (`192.168.x.x`), incluso cuando el servidor esté alojado en la nube en **Hostinger**.

---

## 📌 1. Dos Formas de Operar Tu Sistema (Local vs VPS Hostinger)

SamaPos incluye un **Selector Visual en Ajustes -> Impresoras** para alternar entre ambas opciones según dónde instales el sistema:

### Opción A: Sistema Instalado Localmente (En una PC del Restaurante)
* **¿Cómo funciona?** El servidor y la base de datos están en tu propia computadora en el restaurante.
* **¿Necesitas ejecutar `start-agent.bat`?** **NO**. El sistema se comunica directamente por cable de red o Wi-Fi con la IP de cada impresora térmica (`192.168.1.x:9100`).
* En *Configuración -> Impresoras*, simplemente seleccionas: **Modo Local (TCP Directo)** o **Automático**.

### Opción B: Sistema Alojado en Internet (VPS / Hostinger)
* **¿Cómo funciona?** El servidor está en internet para que cualquiera acceda al menú digital desde su celular.
* **¿Necesitas ejecutar `start-agent.bat`?** **SÍ**, porque Hostinger no puede saltar el router del restaurante para ver las IPs privadas (`192.168.1.x`).
* En *Configuración -> Impresoras*, seleccionas: **Modo Nube (Print Agent)** o **Automático**, y ejecutas `start-agent.bat` en la PC de caja siguiendo los pasos a continuación.

---

## 📋 2. Requisitos Previos en la Computadora de Caja

1. **Tener instalado Node.js (Versión LTS)**:
   - Si la computadora aún no lo tiene, descárgalo gratis desde: [https://nodejs.org](https://nodejs.org) (elige la versión **LTS**).
   - Instálalo dejando todas las opciones predeterminadas (Siguiente -> Siguiente -> Instalar).
2. **Estar en la misma red Wi-Fi o Ethernet de las impresoras**:
   - La computadora debe poder alcanzar las IPs de las impresoras (ej. `192.168.1.51`).

---

## 🚀 3. Paso a Paso de Instalación

### Paso 1: Copiar la carpeta
Copia la carpeta llamada **`print-agent`** a la computadora de caja.  
Puedes pegarla en un lugar fácil de recordar, por ejemplo:
```text
C:\SamaPos\print-agent
```

---

### Paso 2: Configurar `config.json`
Dentro de la carpeta `print-agent`, abre el archivo **`config.json`** con el **Bloc de notas** o cualquier editor de texto:

```json
{
  "serverUrl": "https://tu-dominio-en-hostinger.com",
  "agentSecret": "samapos_print_secret_2026",
  "agentName": "Caja Principal - Restaurante",
  "agentId": "caja-pos-1",
  "pollIntervalMs": 15000,
  "connectTimeoutMs": 3500,
  "retryAttempts": 2,
  "retryDelayMs": 600
}
```

#### ¿Qué valores debes cambiar?
| Campo | Descripción | Ejemplo |
| :--- | :--- | :--- |
| **`serverUrl`** | La dirección web donde está publicado tu SamaPos en Hostinger (debe incluir `https://`). Si estás probando en tu máquina pon `http://localhost:3000`. | `"https://pos.turestaurante.com"` |
| **`agentSecret`** | La clave de seguridad configurada en el archivo `.env` del servidor (`PRINT_AGENT_SECRET`). Por defecto viene como `"samapos_print_secret_2026"`. | `"samapos_print_secret_2026"` |
| **`agentName`** | Nombre descriptivo de la estación donde corre el agente. | `"Caja Principal"` |

> Guarda los cambios en `config.json` y cierra el bloc de notas.

---

### Paso 3: Ejecutar `start-agent.bat`
Haz doble clic sobre el archivo:
👉 **`start-agent.bat`**

#### ¿Qué hace este archivo automáticamente?
1. Verifica si Node.js está instalado.
2. Si es la primera vez que se ejecuta, descarga e instala automáticamente las librerías necesarias (`escpos`, `socket.io-client`).
3. Inicia el agente y se conecta al servidor.
4. Si por alguna razón se cierra o se cae, se reinicia solo automáticamente.

Al iniciar correctamente, verás una ventana de consola negra con letras verdes parecida a esta:

```text
======================================================
       SAMAPOS PRINT AGENT - PUENTE DE RED LAN        
======================================================
Servidor POS:  https://tu-dominio-en-hostinger.com
Nombre Agente: Caja Principal - Restaurante (caja-pos-1)
Estado:        Iniciando conexión WebSocket...
======================================================

>>> [ONLINE] Conectado exitosamente al servidor SamaPos (https://tu-dominio-en-hostinger.com)
>>> Listo para recibir comandas y recibos en tiempo real.
```

---

## 🧪 4. ¿Cómo comprobar que todo funciona?

1. En tu navegador, ingresa a SamaPos -> **Configuración** -> **Impresoras**.
2. En la parte superior verás el indicador:
   🟢 **Print Agent (LAN): En línea (1)**.
3. Elige una de tus impresoras (ej. Cocina o Caja) y presiona el botón **"Probar Impresión"**.
4. En la ventana del agente verás:
   ```text
   [EVENTO] Nuevo trabajo recibido vía Socket.IO: #123 (test)
   [LAN] Enviando datos a 192.168.1.51:9100...
   [ÉXITO] ¡Ticket #123 impreso correctamente en Cocina!
   ```
5. La impresora cortará el ticket de prueba de inmediato.

---

## ⚡ 5. Inicio Automático con Windows (Recomendado)

Para que el personal de caja no tenga que abrir `start-agent.bat` manualmente cada día, configúralo para que arranque solo cuando se encienda la computadora:

1. Presiona en el teclado las teclas **`Windows + R`**.
2. Escribe **`shell:startup`** y presiona **Enter**. Se abrirá la carpeta de *Inicio de Windows*.
3. Ve a tu carpeta `print-agent`, haz **clic derecho** sobre `start-agent.bat` y selecciona **Crear acceso directo**.
4. Mueve ese acceso directo a la carpeta de *Inicio de Windows* que abriste en el paso 2.

🎉 **¡Listo!** Ahora, cada vez que enciendan la computadora de caja por la mañana, el agente de impresión estará listo en segundo plano sin que nadie tenga que hacer nada.

---

## 🛡️ 6. ¿Qué pasa ante caídas de luz o internet?

* **Failsafe Offline:** Si se corta el internet en el restaurante mientras entran órdenes desde el Menú Digital o clientes QR, Hostinger guarda los pedidos en la base de datos en estado **`pending`** (en cola).
* **Auto-recuperación:** En cuanto la computadora de caja o el internet vuelvan a encenderse, el agente se reconecta y descarga automáticamente todos los tickets pendientes en orden cronológico para imprimirlos. **No se pierde ningún pedido.**

---

## ❓ 7. Preguntas Frecuentes y Solución de Problemas

### ❌ Mensaje: `Node.js no está instalado o no se encuentra en el PATH`
* **Solución**: Descarga e instala Node.js (LTS) desde [https://nodejs.org](https://nodejs.org). Luego de instalarlo, cierra la consola y vuelve a abrir `start-agent.bat`.

### ❌ Mensaje: `[ERROR AUTORIZACIÓN] El servidor rechazó la conexión`
* **Solución**: La clave `agentSecret` en tu `config.json` no coincide con el valor `PRINT_AGENT_SECRET` en el archivo `.env` de tu servidor en Hostinger. Revisa que ambas claves sean idénticas.

### ❌ Mensaje: `No se pudo conectar a la impresora 192.168.1.51:9100`
* **Solución**:
  1. Verifica que la impresora térmica esté encendida y con papel.
  2. Verifica que el cable de red o Wi-Fi de la impresora esté conectado.
  3. Asegúrate de que la computadora de caja esté conectada a la misma red (mismo router) que la impresora.
