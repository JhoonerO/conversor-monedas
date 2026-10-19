import { useEffect, useRef } from 'react'

// Botón que responde al instante (pointerdown) y, si `repetir` está activo,
// sigue enviando mientras lo mantienes presionado (ideal para volumen).
export function usePresion(accion, repetir = false) {
  const temporizador = useRef()
  const detener = () => {
    clearTimeout(temporizador.current)
    clearInterval(temporizador.current)
  }
  useEffect(() => detener, [])

  return {
    onPointerDown(e) {
      if (e.button > 0) return
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // algunos navegadores no lo permiten; el botón igual funciona
      }
      accion()
      if (repetir) {
        temporizador.current = setTimeout(() => {
          temporizador.current = setInterval(accion, 140)
        }, 420)
      }
    },
    onPointerUp: detener,
    onPointerCancel: detener,
    onPointerLeave: detener,
    onContextMenu: (e) => e.preventDefault(),
    onKeyDown(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        accion()
      }
    },
  }
}

export function Boton({ accion, repetir, className = '', etiqueta, children, ...resto }) {
  const presion = usePresion(accion, repetir)
  return (
    <button type="button" className={`vidrio-boton ${className}`} aria-label={etiqueta} {...presion} {...resto}>
      {children}
    </button>
  )
}
