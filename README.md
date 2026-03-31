# POS Restaurante (Node.js + MariaDB)

## Requisitos
- Node.js 18+
- MariaDB 10.6+

## Instalacion
1. Copia `.env.example` a `.env` y ajusta credenciales.
2. Crea la base y tablas:
```sql
SOURCE db/schema.sql;
```
3. Instala dependencias:
```bash
npm install
```
4. Inicia:
```bash
npm start
```
5. Abre:
```txt
http://localhost:3000
```

## Funcionalidad base implementada
- Mesas por ambiente, color por ocupacion.
- Multiples cuentas por mesa.
- Comanda por silla.
- Categorias y productos por botones.
- Modificadores por producto (guarniciones, leche, temperatura, hielo, etc.).
- Descuentos (% y fijo).
- Multiples formas de pago por cuenta.
- Cierre de cuenta al completar pagos.
- Apertura/cierre de turno con resumen.
- Trazabilidad de eventos de cuenta.
- Anulacion de item con autorizacion.

## Nota de conexion
- El proyecto usa el driver `mysql2`, que es compatible con MariaDB.
