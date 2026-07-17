# SamaPos - Glosario de Conceptos

## Terminales
- **Qué es**: Dispositivo que usan meseros/cajeros para tomar órdenes
- **Campo "Nombre Impresora"**: Impresora de tickets para la cocina (ej: "Ticketera Mostrador")
- **Liga a**: Centro de Operación (Vaqueros, Flor, Eldeck)

## Centro de Operación
- **Qué es**: El restaurante o sucursal (ej: Vaqueros, Flor, Eldeck)
- **Función**: Agrupar mesas, usuarios y operaciones por ubicación

## Centro de Producción
- **Qué es**: Lugar físico donde se prepara la comida
- **Ejemplos**: Cocina, Bar, Parrilla
- **Se selecciona en**: El producto, para saber dónde se prepara

## Relación entre ellos

```
Centro de Operación (restaurante)
├── Terminales (dispositivos de meseros)
├── Centro de Producción (lugares de preparación)
│   ├── Cocina
│   ├── Bar
│   └── Parrilla
└── Mesas
```

## Ejemplo Práctico

1. **Centro de Operación**: "Vaqueros" (restaurante principal)
2. **Terminal**: "T1" con impresora "Ticketera Cocina"
3. **Centro de Producción**: "Cocina", "Bar"
4. **Producto**: "Hamburguesa" → Se elabora en "Cocina"
5. **Orden**: El mesero toma la orden en la terminal "T1", la orden se envía a la cocina "Cocina" para prepararse

## Resumen Rápido

| Concepto | Para qué sirve |
|----------|---------------|
| Terminal | Tomar órdenes (dispositivo) |
| Centro de Operación | Agrupar por restaurante/sucursal |
| Centro de Producción | Lugar donde se prepara (Cocina, Bar) |
