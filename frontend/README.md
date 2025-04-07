Conversor de Monedas 💱

Descripción

Aplicación full stack con frontend en React y backend en Node.js/Express, que permite convertir monedas, registrar y autenticar usuarios.

Tecnologías usadas

- React (Frontend)
- Node.js + Express (Backend)
- JWT y bcrypt (Autenticación)
- dotenv
- CORS

Estructura del proyecto

conversor-monedas/
├── backend/     → Servidor (API REST)
│   └── server.js
├── frontend/    → Aplicación React
│   └── src/
└── README.md

Cómo correr el proyecto localmente

1. Clonar el repositorio:

git clone https://github.com/JhoonerO/conversor-monedas.git
cd conversor-monedas

2. Configurar el backend:

cd backend
npm install

Crear un archivo `.env` con este contenido:

PORT=5000
JWT_SECRET=clave_super_secreta

Luego ejecutar:

npm start

3. Configurar el frontend (en otra terminal):

cd frontend
npm install
npm start

Esto abrirá la app React en: http://localhost:3000
Funcionalidades
- Registro y login de usuarios
- Conversión de monedas
- Comunicación entre frontend y backend

Licencia

MIT © JhoonerO (https://github.com/JhoonerO)
