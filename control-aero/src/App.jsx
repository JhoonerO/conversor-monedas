import { useEffect, useState } from 'react'
import { Fondo } from './componentes/Fondo.jsx'
import { Icono } from './componentes/Iconos.jsx'
import { PantallaControl } from './componentes/PantallaControl.jsx'
import { PantallaTouchpad } from './componentes/PantallaTouchpad.jsx'
import { PantallaTeclado } from './componentes/PantallaTeclado.jsx'
import { PantallaAjustes } from './componentes/PantallaAjustes.jsx'
import { iniciar, useControl, perfilActual } from './servicios/control.js'

const PESTANAS = [
  { id: 'control', texto: 'Control', icono: 'control', Pantalla: PantallaControl },
  { id: 'touchpad', texto: 'Touchpad', icono: 'touchpad', Pantalla: PantallaTouchpad },
  { id: 'teclado', texto: 'Teclado', icono: 'teclado', Pantalla: PantallaTeclado },
  { id: 'ajustes', texto: 'Ajustes', icono: 'engranaje', Pantalla: PantallaAjustes },
]

function Encabezado({ irAAjustes }) {
  const { googleTv, aviso } = useControl()
  const perfil = perfilActual()
  const conectado = googleTv === 'conectado'

  return (
    <header className="encabezado vidrio-panel">
      <div className="marca">
        <span className="orbe" />
        <div>
          <h1>
            CONTROL <span>AERO</span>
          </h1>
          <small>Tu Smart TV en la mano</small>
        </div>
      </div>
      <button type="button" className="dispositivo" onClick={irAAjustes}>
        <Icono nombre="tv" tam={22} />
        <span>
          <strong>Kalley TV</strong>
          <small>
            <i className={`luz ${perfil ? 'verde' : 'gris'}`} /> IR
            <i className={`luz ${conectado ? 'verde' : googleTv === 'conectando' ? 'amarilla' : 'gris'}`} /> WiFi
          </small>
        </span>
      </button>
      {aviso && (
        <div key={aviso.id} className={`aviso aviso-${aviso.tipo}`} role="status">
          {aviso.texto}
        </div>
      )}
    </header>
  )
}

export default function App() {
  const [pestana, setPestana] = useState(() => (perfilActual() ? 'control' : 'ajustes'))

  useEffect(() => {
    iniciar()
  }, [])

  const { Pantalla } = PESTANAS.find((p) => p.id === pestana)

  return (
    <div className="app">
      <Fondo />
      <Encabezado irAAjustes={() => setPestana('ajustes')} />
      <main className="contenido">
        <Pantalla key={pestana} />
      </main>
      <nav className="pestanas vidrio-panel">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`pestana ${pestana === p.id ? 'activa' : ''}`}
            onClick={() => setPestana(p.id)}
          >
            <Icono nombre={p.icono} tam={24} />
            <span>{p.texto}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
