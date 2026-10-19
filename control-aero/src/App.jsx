import { useEffect, useState } from 'react'
import { Fondo } from './componentes/Fondo.jsx'
import { Icono } from './componentes/Iconos.jsx'
import { PantallaControl } from './componentes/PantallaControl.jsx'
import { PantallaTouchpad } from './componentes/PantallaTouchpad.jsx'
import { PantallaTeclado } from './componentes/PantallaTeclado.jsx'
import { PantallaAjustes } from './componentes/PantallaAjustes.jsx'
import { iniciar, useControl, cambiarDispositivo, dispositivoActivo, DISPOSITIVOS } from './servicios/control.js'

const PESTANAS = [
  { id: 'control', texto: 'Control', icono: 'control', Pantalla: PantallaControl },
  { id: 'touchpad', texto: 'Touchpad', icono: 'touchpad', Pantalla: PantallaTouchpad },
  { id: 'teclado', texto: 'Teclado', icono: 'teclado', Pantalla: PantallaTeclado },
  { id: 'ajustes', texto: 'Ajustes', icono: 'engranaje', Pantalla: PantallaAjustes },
]

function Encabezado() {
  const { aviso, dispositivo } = useControl()

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
      <div className="selector" role="tablist" aria-label="Aparato a controlar">
        {DISPOSITIVOS.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={dispositivo === d.id}
            className={`selector-opcion ${d.tema} ${dispositivo === d.id ? 'activo' : ''}`}
            onClick={() => cambiarDispositivo(d.id)}
          >
            <Icono nombre={d.id === 'tv' ? 'tv' : 'deco'} tam={20} />
            {d.corto}
          </button>
        ))}
      </div>
      {aviso && (
        <div key={aviso.id} className={`aviso aviso-${aviso.tipo}`} role="status">
          {aviso.texto}
        </div>
      )}
    </header>
  )
}

export default function App() {
  const [pestana, setPestana] = useState('control')
  const { dispositivo } = useControl()

  useEffect(() => {
    iniciar()
  }, [])

  // El tema va en <html> para que también lo usen las ventanas que suben
  useEffect(() => {
    document.documentElement.dataset.tema = dispositivoActivo().tema
  }, [dispositivo])

  const { Pantalla } = PESTANAS.find((p) => p.id === pestana)

  return (
    <div className="app">
      <Fondo />
      <Encabezado />
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
