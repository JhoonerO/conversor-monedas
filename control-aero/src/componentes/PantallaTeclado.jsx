import { useRef, useState } from 'react'
import { Boton } from './Boton.jsx'
import { Icono } from './Iconos.jsx'
import { escribir, presionar, useControl } from '../servicios/control.js'

// Lo que escribes aquí aparece en el TV letra por letra (en vivo)
export function PantallaTeclado() {
  const { googleTv } = useControl()
  const [texto, setTexto] = useState('')
  const enviado = useRef('')

  const cambiar = (nuevo) => {
    const antes = enviado.current
    // Cuántas letras del principio siguen iguales
    let iguales = 0
    while (iguales < antes.length && iguales < nuevo.length && antes[iguales] === nuevo[iguales]) iguales++
    for (let i = 0; i < antes.length - iguales; i++) presionar('borrar')
    escribir(nuevo.slice(iguales))
    enviado.current = nuevo
    setTexto(nuevo)
  }

  const limpiar = () => {
    enviado.current = ''
    setTexto('')
  }

  return (
    <div className="pantalla pantalla-teclado">
      <div className="titulo-seccion">
        <Icono nombre="teclado" tam={22} />
        <div>
          <strong>Teclado</strong>
          <small>Abre un buscador en el TV y escribe aquí</small>
        </div>
      </div>

      {googleTv !== 'conectado' && (
        <div className="nota vidrio-panel">
          <Icono nombre="wifi" tam={20} />
          El teclado viaja por WiFi: conecta el decodificador en <b>Ajustes</b>.
        </div>
      )}

      <div className="campo-texto vidrio-panel">
        <input
          value={texto}
          onChange={(e) => cambiar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              presionar('enter')
              limpiar()
            }
          }}
          placeholder="Escribe para buscar…"
          autoCapitalize="none"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      <div className="fila-botones">
        <Boton className="pastilla ancha" accion={() => presionar('borrar')} repetir etiqueta="Borrar en el TV">
          <Icono nombre="borrar" tam={20} /> Borrar
        </Boton>
        <Boton className="pastilla ancha" accion={limpiar} etiqueta="Empezar de nuevo">
          <Icono nombre="cerrar" tam={20} /> Nuevo
        </Boton>
        <Boton
          className="pastilla ancha destacada"
          accion={() => {
            presionar('enter')
            limpiar()
          }}
          etiqueta="Buscar"
        >
          <Icono nombre="buscar" tam={20} /> Buscar
        </Boton>
      </div>

      <p className="pista">
        Consejo: las tildes y la ñ no siempre llegan al TV (limitación de Android TV). Escribe "cancion" en vez
        de "canción" y el buscador igual la encuentra.
      </p>
    </div>
  )
}
