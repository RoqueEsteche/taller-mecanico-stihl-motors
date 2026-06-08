Plantillas de importacion para Stihl Motors

Objetivo
- Cargar datos masivos sin cambiar estructura de base de datos.
- Volumen esperado: 100 registros por entidad o mas.

Archivos incluidos
- 01_clientes.csv
- 02_proveedores.csv
- 03_repuestos.csv
- 04_ordenes_trabajo.csv

Orden recomendado de carga
1. Proveedores
2. Repuestos
3. Clientes
4. Ordenes de trabajo

Campos obligatorios por archivo

01_clientes.csv
- ci: obligatorio y unico
- name: obligatorio
- phone: opcional
- address: opcional

02_proveedores.csv
- supplier_key: obligatorio (clave temporal para Excel)
- name: obligatorio
- contact: opcional
- phone: opcional
- email: opcional
- notes: opcional

03_repuestos.csv
- code: obligatorio y unico
- description: obligatorio
- machine_category: opcional (si va vacio, usar General)
- machine_brand: opcional
- machine_model: opcional
- price: numerico >= 0
- stock: entero >= 0
- min_stock: entero >= 0
- supplier_key: opcional para mapear desde Excel
- supplier_id: UUID opcional, recomendado para carga final

04_ordenes_trabajo.csv
- client_ci: obligatorio
- client_name: obligatorio
- phone: opcional
- address: opcional
- machine_name: obligatorio
- brand: opcional
- machine_model: opcional
- serial_number: opcional
- accessories: opcional
- observations: opcional
- description: opcional
- mechanic_id: opcional (UUID existente)
- mechanic_name: opcional
- warranty_type: opcional
- warranty_notes: opcional
- related_order_id: opcional (UUID de orden existente)

Reglas para evitar errores
- No duplicar ci en clientes.
- No duplicar code en repuestos.
- Mantener price con punto decimal (ejemplo: 125000.50).
- Mantener stock y min_stock como enteros sin decimales.
- Evitar espacios al inicio y fin de celdas.
- Si no tienes supplier_id, cargar primero proveedores y luego completar supplier_id en repuestos.

Sugerencia de validaciones en Excel
- ci: longitud minima 5.
- code: sin espacios, en mayusculas.
- price, stock, min_stock: validacion numerica.
- supplier_key en repuestos: debe existir en proveedores.

Notas de API
- La orden de trabajo crea numero de orden automaticamente.
- El estado inicial de orden es pending automaticamente.
- En ordenes de trabajo, client_ci y client_name deben venir siempre para evitar inserciones inconsistentes.
