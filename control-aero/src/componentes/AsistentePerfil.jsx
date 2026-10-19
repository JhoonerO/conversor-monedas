import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Boton } from './Boton.jsx'
import { Icono } from './Iconos.jsx'
import { PERFILES, probarPerfil, cambiarAjuste, avisar, useControl } from '../servicios/control.js'

const ESPERA_AUTOMATICA = 2500

// Prueba los perfiles uno por uno hasta que el TV reaccione
export function AsistentePerfil({ cerrar }) {
  const { perfilId } = useControl()
  const [indice, setIndice] = useState(() => Math.max(0, PERFILES.findIndex((p) => p.id === perfilId)))
  const [automatico, setAutomatico] = useState(false)
  const ultimoEnvio = useRef({ indice: 0, hora: 0 })
  const perfil = PERFILES[indice]

  const probar = (i, tecla = 'mute') => {
    ultimoEnvio.current = { indice: i, hora: Date.now() }
    probarPerfil(PERFILES[i], tecla)
  }

  useEffect(() => {
    if (!automatico) return
    probar(indice)
    const t = setTimeout(() => {
      if (indice + 1 < PERFILES.length) setIndice(indice + 1)
      else {
        setAutomatico(false)
        avisar('Se acabaron los perfiles. Prueba de nuevo más cerca del TV.', 'error')
      }
    }, ESPERA_AUTOMATICA)
    return () => clearTimeout(t)
  }, [automatico, indice])

  const elegir = () => {
    // En modo automático la persona suele reaccionar tarde: si tocó apenas
    // empezó el siguiente perfil, nos quedamos con el anterior
    let elegido = indice
    if (automatico && Date.now() - ultimoEnvio.current.hora < 900 && indice > 0) elegido = indice - 1
    setAutomatico(false)
    cambiarAjuste('perfilId', PERFILES[elegido].id)
    avisar(`¡Listo! Control guardado: ${PERFILES[elegido].marca} ${PERFILES[elegido].modelo}`, 'exito')
    cerrar()
  }

  const mover = (paso) => {
    setAutomatico(false)
    setIndice((i) => (i + paso + PERFILES.length) % PERFILES.length)
  }

  return createPortal(
    <div className="hoja-fondo">
      <div className="hoja vidrio-panel asistente" role="dialog" aria-label="Buscar mi control">
        <div className="hoja-titulo">
          <strong>Buscar mi control</strong>
          <Boton className="redondo chico" accion={cerrar} etiqueta="Cerrar">
            <Icono nombre="cerrar" tam={18} />
          </Boton>
        </div>

        <p className="pista">
          Apunta la parte de arriba del celular al TV (a menos de 3 metros). Cada prueba envía <b>Silencio</b>: cuando
          veas que el TV se silencia, toca <b>¡Funcionó!</b>
        </p>

        <div className="asistente-perfil">
          <Boton className="redondo chico" accion={() => mover(-1)} etiqueta="Perfil anterior">
            <Icono nombre="izquierda" tam={20} />
          </Boton>
          <div>
            <small>
              Perfil {indice + 1} de {PERFILES.length}
            </small>
            <strong>{perfil.marca}</strong>
            <span>{perfil.modelo}</span>
          </div>
          <Boton className="redondo chico" accion={() => mover(1)} etiqueta="Perfil siguiente">
            <Icono nombre="derecha" tam={20} />
          </Boton>
        </div>

        <div className="barra-progreso">
          <span style={{ width: `${((indice + 1) / PERFILES.length) * 100}%` }} />
        </div>

        <div className="fila-botones">
          <Boton className="pastilla ancha" accion={() => probar(indice, 'mute')} etiqueta="Probar silencio">
            <Icono nombre="silencio" tam={20} /> Silencio
          </Boton>
          <Boton className="pastilla ancha" accion={() => probar(indice, 'volUp')} etiqueta="Probar volumen">
            <Icono nombre="volumen" tam={20} /> Vol +
          </Boton>
        </div>

        <Boton
          className={`pastilla ancha ${automatico ? 'activa' : ''}`}
          accion={() => setAutomatico(!automatico)}
          etiqueta="Prueba automática"
        >
          <Icono nombre={automatico ? 'cerrar' : 'buscar'} tam={20} />
          {automatico ? 'Detener prueba automática' : 'Probar todos automáticamente'}
        </Boton>

        <Boton className="pastilla ancha destacada grande" accion={elegir} etiqueta="Funcionó">
          <Icono nombre="check" tam={22} grosor={2.6} /> ¡Funcionó!
        </Boton>
      </div>
    </div>,
    document.body,
  )
}
