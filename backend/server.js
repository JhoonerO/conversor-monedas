require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

console.log("Iniciando servidor...");  //mensaje en la consola xd 

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "conversor_db",
  password: "123",
  port: 5432,
});

pool.connect()
  .then(() => console.log("Conexión a PostgreSQL exitosa"))
  .catch(err => {
    console.error("Error al conectar con PostgreSQL:", err);
    process.exit(1);
  });

// Registro de usuario con contraseña encriptada
app.post("/register", async (req, res) => {
  console.log("Intento de registro...");
  const { username, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, hashedPassword]);
    res.status(201).json({ message: "Usuario registrado" });
  } catch (error) {
    console.error("Error al registrar:", error);
    res.status(500).json({ error: "Error al registrar" });
  }
});

// Login con verificación de contraseña encriptada
app.post("/login", async (req, res) => {
  console.log("Intento de login...", req.body);
  const { username, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      console.log("Usuario no encontrado");
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];
    console.log("Usuario encontrado en BD:", user);
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Contraseña válida:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const token = jwt.sign({ username: user.username }, "secreto", { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ error: "Error en el login" });
  }
});

app.listen(5000, () => console.log("Servidor corriendo en http://localhost:5000"));