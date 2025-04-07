import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./App.css"; // Importamos los estilos

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await axios.post("http://localhost:5000/register", { username, password });
      alert("Registro exitoso. Ahora puedes iniciar sesión.");
      navigate("/login");
    } catch (error) {
      alert("Error en el registro");
    }
  };

  return (
    <div className="auth-container">
      <h2>Registro</h2>
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
        <button onClick={handleRegister} className="auth-button">Registrarse</button>
      </div>
    </div>
  );
}

export default Register;
