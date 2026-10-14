# Kmi Entretenimiento

Tienda de cuentas de streaming. Los clientes escogen una plataforma o combo y el pedido se abre en WhatsApp.

- `index.html`: toda la tienda y el panel del vendedor en un solo archivo (sin build). Se publica en Vercel como sitio estático.
- `supabase/`: esquema de la base de datos (correr en orden en el SQL Editor de Supabase).

## Base de datos (Supabase, proyecto `pantallas`)

- Los clientes (sin sesión) solo ven la vista `catalogo` y `tienda_info`, y pueden crear pedidos pendientes. No ven costos, proveedores, clientes ni ventas.
- El vendedor entra con correo y contraseña. Su correo debe estar en la tabla `admins`.
- Los registros públicos están desactivados: los usuarios se crean en Supabase → Authentication → Users.
- Las portadas y logos se guardan en el bucket público `imagenes`.

La llave que está en `index.html` es la `anon` (pública por diseño). Nunca pongas la `service_role` ni la `secret` en este repo.

## Panel del vendedor

En el sitio público el botón del panel está escondido. Para verlo, abre el link con `#panel` al final (por ejemplo `https://tu-sitio.vercel.app/#panel`) e inicia sesión. Queda recordado en ese navegador; `#salir` lo vuelve a esconder.
