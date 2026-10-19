import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Boton } from './Boton.jsx'
import { Icono } from './Iconos.jsx'
import { presionar, abrirApp } from '../servicios/control.js'

const p = (id) => () => presionar(id)

function BotonLateral({ id, icono, texto }) {
  return (
    <div className="lateral">
      <Boton className="redondo" accion={p(id)} etiqueta={texto}>
        <Icono nombre={icono} tam={26} />
      </Boton>
      <span>{texto}</span>
    </div>
  )
}

function Cruceta() {
  return (
    <div className="cruceta">
      <div className="cruceta-anillo" />
      <Boton className="cruceta-flecha arriba" accion={p('up')} repetir etiqueta="Arriba">
        <Icono nombre="arriba" tam={30} grosor={2.4} />
      </Boton>
      <Boton className="cruceta-flecha abajo" accion={p('down')} repetir etiqueta="Abajo">
        <Icono nombre="abajo" tam={30} grosor={2.4} />
      </Boton>
      <Boton className="cruceta-flecha izquierda" accion={p('left')} repetir etiqueta="Izquierda">
        <Icono nombre="izquierda" tam={30} grosor={2.4} />
      </Boton>
      <Boton className="cruceta-flecha derecha" accion={p('right')} repetir etiqueta="Derecha">
        <Icono nombre="derecha" tam={30} grosor={2.4} />
      </Boton>
      <Boton className="cruceta-ok" accion={p('ok')} etiqueta="OK">
        <span className="cruceta-ok-punto" />
      </Boton>
    </div>
  )
}

function Balancin({ arriba, abajo, centro, texto }) {
  return (
    <div className="balancin-grupo">
      <div className="balancin">
        <Boton className="balancin-mitad" accion={p(arriba.id)} repetir etiqueta={arriba.texto}>
          {arriba.contenido}
        </Boton>
        <div className="balancin-centro">{centro}</div>
        <Boton className="balancin-mitad" accion={p(abajo.id)} repetir etiqueta={abajo.texto}>
          {abajo.contenido}
        </Boton>
      </div>
      <span>{texto}</span>
    </div>
  )
}

function LogoApp({ id }) {
  if (id === 'netflix') return <span className="logo-netflix">N</span>
  if (id === 'youtube')
    return (
      <svg viewBox="0 0 28 20" width="34" aria-hidden="true">
        <rect width="28" height="20" rx="6" fill="#ff1f1f" />
        <path d="M11 6l7 4-7 4z" fill="#fff" />
      </svg>
    )
  if (id === 'prime') return <span className="logo-prime">prime<br />video</span>
  return <span className="logo-disney">Disney+</span>
}

function Numeros({ cerrar }) {
  return createPortal(
    <div className="hoja-fondo" onPointerDown={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="hoja vidrio-panel" role="dialog" aria-label="Teclado numérico">
        <div className="hoja-titulo">
          <strong>Números</strong>
          <Boton className="redondo chico" accion={cerrar} etiqueta="Cerrar">
            <Icono nombre="cerrar" tam={18} />
          </Boton>
        </div>
        <div className="numeros">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Boton key={n} className="numero" accion={p('n' + n)} etiqueta={String(n)}>
              {n}
            </Boton>
          ))}
          <Boton className="numero" accion={p('back')} etiqueta="Atrás">
            <Icono nombre="atras" tam={22} />
          </Boton>
          <Boton className="numero" accion={p('n0')} etiqueta="0">
            0
          </Boton>
          <Boton className="numero ok" accion={p('ok')} etiqueta="OK">
            OK
          </Boton>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function PantallaControl() {
  const [numeros, setNumeros] = useState(false)

  return (
    <div className="pantalla pantalla-control">
      <div className="fila-pastillas">
        <Boton className="pastilla encender" accion={p('power')} etiqueta="Encender o apagar">
          <span className="pastilla-icono rojo">
            <Icono nombre="encender" tam={20} grosor={2.4} />
          </span>
          <span className="pastilla-texto">
            <strong>Encender</strong>
            <small>o apagar el TV</small>
          </span>
        </Boton>
        <Boton className="pastilla" accion={() => setNumeros(true)} etiqueta="Teclado numérico">
          <span className="pastilla-icono">
            <Icono nombre="numeros" tam={20} />
          </span>
          <span className="pastilla-texto">
            <strong>Números</strong>
            <small>0 – 9</small>
          </span>
        </Boton>
      </div>

      <div className="zona-cruceta">
        <div className="columna">
          <BotonLateral id="back" icono="atras" texto="Atrás" />
          <BotonLateral id="home" icono="inicio" texto="Inicio" />
          <BotonLateral id="menu" icono="menu" texto="Menú" />
        </div>
        <Cruceta />
        <div className="columna">
          <BotonLateral id="settings" icono="engranaje" texto="Opciones" />
          <BotonLateral id="source" icono="fuente" texto="Fuente" />
          <BotonLateral id="apps" icono="apps" texto="Apps" />
        </div>
      </div>

      <div className="zona-volumen">
        <Balancin
          texto="Volumen"
          arriba={{ id: 'volUp', texto: 'Subir volumen', contenido: <Icono nombre="mas" tam={26} grosor={2.6} /> }}
          abajo={{ id: 'volDown', texto: 'Bajar volumen', contenido: <Icono nombre="menos" tam={26} grosor={2.6} /> }}
          centro={<Icono nombre="volumen" tam={24} />}
        />
        <div className="lateral silencio">
          <Boton className="redondo grande" accion={p('mute')} etiqueta="Silencio">
            <Icono nombre="silencio" tam={30} />
          </Boton>
          <span>Silencio</span>
        </div>
        <Balancin
          texto="Canales"
          arriba={{ id: 'chUp', texto: 'Canal siguiente', contenido: <Icono nombre="arriba" tam={26} grosor={2.6} /> }}
          abajo={{ id: 'chDown', texto: 'Canal anterior', contenido: <Icono nombre="abajo" tam={26} grosor={2.6} /> }}
          centro={<b>CH</b>}
        />
      </div>

      <div className="barra-medios vidrio-panel">
        {[
          ['rewind', 'anterior', 'Anterior'],
          ['playPause', 'reproducir', 'Reproducir / Pausar'],
          ['forward', 'siguiente', 'Siguiente'],
        ].map(([id, icono, texto]) => (
          <div key={id} className={`lateral ${id === 'playPause' ? 'principal' : ''}`}>
            <Boton className="redondo" accion={p(id)} repetir={id !== 'playPause'} etiqueta={texto}>
              <Icono nombre={icono} tam={id === 'playPause' ? 30 : 26} />
            </Boton>
            <span>{texto}</span>
          </div>
        ))}
      </div>

      <div className="barra-apps vidrio-panel">
        {['netflix', 'youtube', 'prime', 'disney'].map((id) => (
          <Boton key={id} className={`mosaico mosaico-${id}`} accion={() => abrirApp(id)} etiqueta={`Abrir ${id}`}>
            <LogoApp id={id} />
          </Boton>
        ))}
        <Boton className="mosaico mosaico-mas" accion={p('apps')} etiqueta="Todas las apps">
          <Icono nombre="mas" tam={26} grosor={2.4} />
        </Boton>
      </div>

      {numeros && <Numeros cerrar={() => setNumeros(false)} />}
    </div>
  )
}
