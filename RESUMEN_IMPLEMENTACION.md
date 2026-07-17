# Resumen Implementación POS Restaurant

## Estado: Parcialmente implementado (pendiente debug)

## SQL a ejecutar en DB

```sql
-- Terminales con IP
CREATE TABLE IF NOT EXISTS terminals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operation_center_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  printer_name VARCHAR(120) NULL,
  printer_ip VARCHAR(45) NULL,
  printer_port INT DEFAULT 9100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_terminal_center FOREIGN KEY (operation_center_id) REFERENCES operation_centers(id)
);

-- Production Centers
ALTER TABLE production_centers ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

-- Usuario con centro
ALTER TABLE staff_users ADD COLUMN operation_center_id INT NULL;

-- Mesa con centro
ALTER TABLE restaurant_tables ADD COLUMN operation_center_id INT NOT NULL DEFAULT 1;

-- Account con centro
ALTER TABLE accounts ADD COLUMN operation_center_id INT NOT NULL DEFAULT 1;

-- Terminales iniciales (3 por centro)
INSERT INTO terminals (operation_center_id, name) VALUES
(1, 'Vaqueros - T1'), (1, 'Vaqueros - T2'), (1, 'Vaqueros - T3'),
(2, 'Flor - T1'), (2, 'Flor - T2'), (2, 'Flor - T3'),
(3, 'Eldeck - T1'), (3, 'Eldeck - T2'), (3, 'Eldeck - T3');

-- Asignar mesas a centros
UPDATE restaurant_tables SET operation_center_id = 2 WHERE id <= 15;  -- Flor
UPDATE restaurant_tables SET operation_center_id = 1 WHERE id > 15;   -- Vaqueros
```

## Implementado

### 1. Terminales
- Tabla terminals con IP:puerto de impresora
- Settings → Terminales para CRUD
- Login con selección de terminal
- Terminal determina el centro de la venta

### 2. Centros de Producción
- Tabla production_centers con printer_name
- Productos se asignan a centros donde se elaboran
- Settings → Producción para CRUD

### 3. Usuarios
- Centro principal asignado a cada usuario
- Wizard de usuario incluye paso de selección de centro

### 4. Login Flow
1. Ingresar PIN
2. Seleccionar terminal
3. Ve mesas del centro de la terminal

### 5. Modificadores (UI lista)
- Pestaña Modificadores en Settings
- Crear grupos (Salsas, Guarniciones, etc)
- Configurar tipo, min/max, obligatorio
- Pendiente: guardar correctamente

## Pendiente

1. **Debug guardar modificadores** - Error `createModifierGroup is not a function`
2. **Vincular modificadores a productos** - En wizard de producto
3. **Impresión IP:puerto** - Enviar comandos ESC/POS
4. **Transferir cuentas** - Entre centros
5. **Unir cuentas** - De diferentes centros

## Conceptos Clave

- **operation_center** = Vaqueros, Flor, Eldeck (puntos de venta)
- **production_center** = Cocinas/bares donde se elaboran productos
- **terminal** = Punto de venta físico, determina origen de venta
- **usuario** = Pertenece a un centro principal para filtro

## Flujo de Venta

1. Mesero hace login en Terminal de Eldeck
2. Selecciona Mesa 5 de Eldeck
3. Crea cuenta → centro = Eldeck (de la terminal)
4. Agrega "Latte" → producto de Flor
5. Sistema detecta: Latte → production_center = Flor
6. Envía a cocina de Flor
7. Cliente paga en caja de Eldeck
