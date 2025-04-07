import React, { useState } from "react";
import "./App.css"; // Asegúrate de importar el CSS

function Convertidor() {
  const [cantidad, setCantidad] = useState("");
  const [monedaOrigen, setMonedaOrigen] = useState("USD");
  const [monedaDestino, setMonedaDestino] = useState("EUR");
  const [resultado, setResultado] = useState(null);

  const tasasDeCambio = {
    USD: { EUR: 0.91, COP: 3900, GBP: 0.78, JPY: 145.5, MXN: 17.2, BRL: 5.1 },
    EUR: { USD: 1.10, COP: 4300, GBP: 0.86, JPY: 159.4, MXN: 18.8, BRL: 5.6 },
    COP: { USD: 0.00026, EUR: 0.00023, GBP: 0.00020, JPY: 0.037, MXN: 0.0044, BRL: 0.0013 },
    GBP: { USD: 1.28, EUR: 1.16, COP: 5050, JPY: 185.4, MXN: 22.1, BRL: 6.2 },
    JPY: { USD: 0.0069, EUR: 0.0063, COP: 27, GBP: 0.0054, MXN: 0.12, BRL: 0.034 },
    MXN: { USD: 0.058, EUR: 0.053, COP: 225, GBP: 0.045, JPY: 8.3, BRL: 0.28 },
    BRL: { USD: 0.20, EUR: 0.18, COP: 770, GBP: 0.16, JPY: 29.3, MXN: 3.6 },
  };

  const convertirMoneda = () => {
    if (!cantidad || isNaN(cantidad)) {
      alert("Ingrese un valor numérico válido");
      return;
    }
    const tasa = tasasDeCambio[monedaOrigen]?.[monedaDestino];
    if (!tasa) {
      alert("Conversión no disponible");
      return;
    }
    setResultado((cantidad * tasa).toFixed(2));
  };

  const opcionesMonedas = Object.keys(tasasDeCambio);

  return (
    <div className="convertidor-container">
      <h2>Convertidor de Monedas</h2>
      <div className="form-group">
        <input
          type="number"
          placeholder="Cantidad"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="input-field"
        />
        <div className="select-group">
          <select value={monedaOrigen} onChange={(e) => setMonedaOrigen(e.target.value)} className="select-field">
            {opcionesMonedas.map((moneda) => (
              <option key={moneda} value={moneda}>{moneda}</option>
            ))}
          </select>
          <span className="arrow">➡</span>
          <select value={monedaDestino} onChange={(e) => setMonedaDestino(e.target.value)} className="select-field">
            {opcionesMonedas.map((moneda) => (
              <option key={moneda} value={moneda}>{moneda}</option>
            ))}
          </select>
        </div>
        <button onClick={convertirMoneda} className="convert-button">Convertir</button>
      </div>
      {resultado !== null && <h3 className="resultado">Resultado: {resultado} {monedaDestino}</h3>}
    </div>
  );
}

export default Convertidor;
