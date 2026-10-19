import { useRef, useState } from 'react'
import { Boton } from './Boton.jsx'
import { Icono } from './Iconos.jsx'
import { presionar } from '../servicios/control.js'

const PASO = 34 // píxeles de deslizamiento por cada movimiento en el TV
const PASO_VOLUMEN = 26

// Convierte deslizamientos en flechas, como el control oficial de Google TV
function useDeslizar({ paso, alMover, alTocar, alMantener }) {
  const gesto = useRef(null)
  const [punto, setPunto] = useState(null)

  const fin = () => {
    clearTimeout(gesto.current?.mantener)
    gesto.current = null
    setPunto(null)
  }

  return {
    punto,
    eventos: {
      onPointerDown(e) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // sin captura el gesto sigue funcionando dentro del área
        }
        const caja = e.currentTarget.getBoundingClientRect()
        gesto.current = {
          x: e.clientX,
          y: e.clientY,
          inicioX: e.clientX,
          inicioY: e.clientY,
          caja,
          movio: false,
          mantener: alMantener && setTimeout(() => {
            if (gesto.current && !gesto.current.movio) {
              alMantener()
              gesto.current.usado = true
            }
          }, 600),
        }
        setPunto({ x: e.clientX - caja.left, y: e.clientY - caja.top, id: Date.now() })
      },
      onPointerMove(e) {
        const g = gesto.current
        if (!g) return
        setPunto((p) => p && { ...p, x: e.clientX - g.caja.left, y: e.clientY - g.caja.top })
        const dx = e.clientX - g.x
        const dy = e.clientY - g.y
        if (Math.hypot(e.clientX - g.inicioX, e.clientY - g.inicioY) > 10) g.movio = true
        if (Math.abs(dx) >= paso || Math.abs(dy) >= paso) {
          if (Math.abs(dx) > Math.abs(dy)) {
            alMover(dx > 0 ? 'right' : 'left')
            g.x += Math.sign(dx) * paso
            g.y = e.clientY
          } else {
            alMover(dy > 0 ? 'down' : 'up')
            g.y += Math.sign(dy) * paso
            g.x = e.clientX
          }
        }
      },
      onPointerUp() {
        const g = gesto.current
        if (g && !g.movio && !g.usado) alTocar?.()
        fin()
      },
      onPointerCancel: fin,
    },
  }
}

export function PantallaTouchpad() {
  const pad = useDeslizar({
    paso: PASO,
    alMover: presionar,
    alTocar: () => presionar('ok'),
    alMantener: () => presionar('back'),
  })
  const volumen = useDeslizar({
    paso: PASO_VOLUMEN,
    alMover: (dir) => (dir === 'up' ? presionar('volUp') : dir === 'down' ? presionar('volDown') : null),
  })

  return (
    <div className="pantalla pantalla-touchpad">
      <div className="titulo-seccion">
        <Icono nombre="touchpad" tam={22} />
        <div>
          <strong>Modo Mouse</strong>
          <small>Desliza para moverte · toca para OK · mantén para atrás</small>
        </div>
      </div>

      <div className="touchpad-zona">
        <div className="touchpad vidrio-panel" {...pad.eventos}>
          <div className="touchpad-brillo" />
          {pad.punto ? (
            <span className="touchpad-dedo" style={{ left: pad.punto.x, top: pad.punto.y }} />
          ) : (
            <span className="touchpad-ayuda">
              <Icono nombre="touchpad" tam={46} grosor={1.5} />
              Desliza aquí
            </span>
          )}
        </div>

        <div className="tira-volumen vidrio-panel" {...volumen.eventos} aria-label="Desliza para el volumen">
          <Icono nombre="mas" tam={20} grosor={2.6} />
          <span className="tira-texto">VOL</span>
          <Icono nombre="menos" tam={20} grosor={2.6} />
          {volumen.punto && <span className="touchpad-dedo chico" style={{ left: '50%', top: volumen.punto.y }} />}
        </div>
      </div>

      <div className="barra-medios vidrio-panel">
        <div className="lateral">
          <Boton className="redondo" accion={() => presionar('back')} etiqueta="Atrás">
            <Icono nombre="atras" tam={24} />
          </Boton>
          <span>Atrás</span>
        </div>
        <div className="lateral principal">
          <Boton className="redondo" accion={() => presionar('playPause')} etiqueta="Reproducir o pausar">
            <Icono nombre="reproducir" tam={28} />
          </Boton>
          <span>Play / Pausa</span>
        </div>
        <div className="lateral">
          <Boton className="redondo" accion={() => presionar('home')} etiqueta="Inicio">
            <Icono nombre="inicio" tam={24} />
          </Boton>
          <span>Inicio</span>
        </div>
      </div>
    </div>
  )
}
