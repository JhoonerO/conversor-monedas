Conversor de Monedas 💱
Descripción
Aplicación full stack con frontend en React y backend en Node.js/Express, que permite convertir monedas, registrar y autenticar usuarios.
Tecnologías usadas
- React (Frontend)
- Node.js + Express (Backend)
- PostgreSQL (Base de Datos)
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
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/conversor_db
JWT_SECRET=clave_super_secreta

Luego ejecutar:

npm start

3. Configurar el frontend (en otra terminal):

cd frontend
npm install
npm start

Esto abrirá la app React en: http://localhost:3000
Base de Datos (PostgreSQL)
Este proyecto utiliza PostgreSQL para almacenar los datos de usuarios registrados.

Asegúrate de tener PostgreSQL instalado localmente o acceso a un servidor.

Agrega tu cadena de conexión al archivo `.env` en la carpeta `backend/`:

DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/conversor_db

Ejemplo de conexión con `pg`:

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log("✅ Conectado a PostgreSQL"))
  .catch((err) => console.error("❌ Error al conectar a PostgreSQL:", err));

module.exports = pool;
Funcionalidades
- Registro y login de usuarios
- Conversión de monedas
- Comunicación entre frontend y backend
- Almacenamiento seguro de contraseñas con bcrypt
Licencia
MIT © JhoonerO (https://github.com/JhoonerO)
