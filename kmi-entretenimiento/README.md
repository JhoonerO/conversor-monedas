# Kmi Entretenimiento

Tienda de cuentas de streaming. Los clientes escogen una plataforma o combo y el pedido se abre en WhatsApp.

- `index.html`: toda la tienda y el panel del vendedor en un solo archivo (sin build).
- Se publica en Vercel como sitio estático: cada push a `main` se publica solo.

## Panel del vendedor

En el sitio público el panel está escondido para los clientes. Para verlo en tu dispositivo, abre la página con `#panel` al final del link (por ejemplo `https://tu-sitio.vercel.app/#panel`). Queda recordado en ese navegador; para ocultarlo otra vez usa `#salir`.

Esto solo esconde el botón: no es una contraseña. Los datos del panel (ventas, clientes, pedidos) se guardan por ahora en el navegador de cada dispositivo; falta conectar una base de datos.
