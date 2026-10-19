// Íconos en SVG (sin librerías, para que la app pese poco)
const trazos = {
  arriba: 'M6 15l6-6 6 6',
  abajo: 'M6 9l6 6 6-6',
  izquierda: 'M15 6l-6 6 6 6',
  derecha: 'M9 6l6 6-6 6',
  atras: 'M20 12H5m6-7l-7 7 7 7',
  inicio: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  engranaje:
    'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm7.4-2.1l1.6 1.2-1.6 2.8-1.9-.7a7 7 0 01-1.8 1l-.3 2h-3.2l-.3-2a7 7 0 01-1.8-1l-1.9.7-1.6-2.8 1.6-1.2a7 7 0 010-2.1L4.6 9.6l1.6-2.8 1.9.7a7 7 0 011.8-1l.3-2h3.2l.3 2a7 7 0 011.8 1l1.9-.7 1.6 2.8-1.6 1.2a7 7 0 010 2.1z',
  fuente: 'M3 5h18v11H3zM8 20h8M12 16v4',
  apps: 'M5 5h3v3H5zM10.5 5h3v3h-3zM16 5h3v3h-3zM5 10.5h3v3H5zM10.5 10.5h3v3h-3zM16 10.5h3v3h-3zM5 16h3v3H5zM10.5 16h3v3h-3zM16 16h3v3h-3z',
  mas: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  volumen: 'M4 9v6h4l5 4V5L8 9H4zm12.5-.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12',
  silencio: 'M4 9v6h4l5 4V5L8 9H4zm12 0l5 6m0-6l-5 6',
  anterior: 'M11 7l-7 5 7 5V7zm9 0l-7 5 7 5V7z',
  siguiente: 'M13 7l7 5-7 5V7zM4 7l7 5-7 5V7z',
  reproducir: 'M4 5l8 7-8 7V5zM15 5v14M20 5v14',
  encender: 'M12 3v8m5.7-5.2a8 8 0 11-11.4 0',
  control: 'M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zm4 4.5h.01M10 11h4m-2-2v4m-2 4h.01M14 17h.01',
  touchpad: 'M9 11V5.5a1.5 1.5 0 013 0V11m0-1.5a1.5 1.5 0 013 0V11m0-.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L4 14.5a1.6 1.6 0 012.6-1.8L9 15',
  teclado: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  wifi: 'M2 9a15 15 0 0120 0M5.5 12.5a10 10 0 0113 0M9 16a5 5 0 016 0M12 19.5h.01',
  infrarrojo: 'M12 20v-6m-4.5 2.5a6.4 6.4 0 019 0M4 13a11.3 11.3 0 0116 0M9 5h6l-1 5h-4z',
  tv: 'M3 5h18v12H3zM8 21h8',
  deco: 'M3 9h18v7H3zM7 12.5h.01M11 12.5h.01M16 12.5h2M6 16v2M18 16v2',
  cursor: 'M5 3l13 8-6 1.5L9 19z',
  numeros: 'M4 9h16M4 15h16M10 4L8 20M16 4l-2 16',
  borrar: 'M21 5H9l-7 7 7 7h12zm-9 4l6 6m0-6l-6 6',
  enviar: 'M4 12l16-8-6 16-3-7z',
  cerrar: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  buscar: 'M11 18a7 7 0 100-14 7 7 0 000 14zm10 3l-5-5',
}

export function Icono({ nombre, tam = 24, grosor = 2, className }) {
  return (
    <svg
      className={className}
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={trazos[nombre]} />
    </svg>
  )
}
