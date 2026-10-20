# 🖨️ Instrucciones de Uso: `start-agent.bat`

Este archivo ejecuta el **SamaPos Print Agent**, encargado de recibir pedidos desde la nube (Hostinger) e imprimirlos en las impresoras térmicas de este restaurante (Cocina, Bar y Caja).

> 💡 **Nota Importante:** Si instalas todo el sistema SamaPos localmente en esta misma computadora del restaurante, **NO necesitas ejecutar este agente**; el sistema imprimirá directo por IP local (seleccionando *Modo Local* en Ajustes). Este agente es exclusivamente para cuando SamaPos esté en la nube (Hostinger/VPS).

---

## ⚡ Pasos Rápidos de Uso

### 1. Configuración inicial (Solo la primera vez)
Abre el archivo `config.json` con el **Bloc de notas** y revisa estos dos campos:
```json
{
  "serverUrl": "https://tu-dominio-en-hostinger.com",
  "agentSecret": "samapos_print_secret_2026"
}
```
* **`serverUrl`**: Pon la dirección de tu restaurante en internet.
* **`agentSecret`**: Debe coincidir con `PRINT_AGENT_SECRET` del servidor.

### 2. Ejecución
Haz doble clic en:
👉 **`start-agent.bat`**

La primera vez descargará las librerías necesarias automáticamente.  
Cuando veas el mensaje en verde:
```
>>> [ONLINE] Conectado exitosamente al servidor SamaPos
>>> Listo para recibir comandas y recibos en tiempo real.
```
Significa que el agente ya está escuchando pedidos.

---

## 🚀 Inicio Automático con Windows (Para que abra solo al prender la PC)

1. En el teclado presiona **`Windows + R`**.
2. Escribe **`shell:startup`** y presiona **Enter**.
3. Haz clic derecho sobre **`start-agent.bat`** -> **Crear acceso directo**.
4. Pega ese acceso directo dentro de la carpeta que se abrió.

¡Listo! Cada vez que se prenda la computadora de caja, la impresión térmica estará activa sin necesidad de abrirlo a mano.

---

## ❓ En caso de error

* **Si dice que falta Node.js**: Descarga e instala la versión LTS desde [https://nodejs.org](https://nodejs.org).
* **Si dice rechazo de conexión**: Revisa que `agentSecret` en `config.json` sea idéntico al de tu servidor.
* **Si no imprime en la térmica**: Comprueba que la impresora esté encendida, con papel y con su cable de red conectado.
