import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./App.css"; // Importamos los estilos

function Login({ setToken }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/login", { username, password });
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      navigate("/convertidor");
    } catch (error) {
      alert("Error en el login");
    }
  };

  return (
    <div className="auth-container">
      <h2>Iniciar Sesión</h2>
      <div className="form-group">
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="input-field"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
        />
        <button onClick={handleLogin} className="auth-button">Iniciar Sesión</button>
      </div>
      <p>¿No tienes cuenta? <Link to="/register" className="auth-link">Regístrate aquí</Link></p>
    </div>
  );
}

export default Login;
