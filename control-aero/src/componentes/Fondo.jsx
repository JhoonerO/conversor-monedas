// Paisaje Frutiger Aero: cielo, ciudad de vidrio, agua, hojas y burbujas.
// Todo en SVG/CSS para que cargue al instante y no pese.
const BURBUJAS = [
  { x: 8, t: 34, d: 0 },
  { x: 22, t: 18, d: 4 },
  { x: 47, t: 26, d: 9 },
  { x: 68, t: 14, d: 2 },
  { x: 83, t: 30, d: 6 },
  { x: 93, t: 16, d: 11 },
]

function Hoja({ transform, claro = '#a8f05a', oscuro = '#2f9a2a' }) {
  return (
    <g transform={transform}>
      <path d="M0 0C40-60 140-70 200-20 140 30 40 40 0 0z" fill={`url(#hoja-${claro.slice(1)})`} />
      <path d="M0 0C60-18 130-22 196-20" stroke={oscuro} strokeOpacity=".5" strokeWidth="3" fill="none" />
      <defs>
        <linearGradient id={`hoja-${claro.slice(1)}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={claro} />
          <stop offset="1" stopColor={oscuro} />
        </linearGradient>
      </defs>
    </g>
  )
}

export function Fondo() {
  return (
    <div className="fondo" aria-hidden="true">
      <svg className="fondo-escena" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a5fb4" />
            <stop offset=".45" stopColor="#3aa8e8" />
            <stop offset=".7" stopColor="#9ee0ff" />
            <stop offset="1" stopColor="#1690c9" />
          </linearGradient>
          <radialGradient id="sol" cx=".75" cy=".18" r=".5">
            <stop offset="0" stopColor="#fff" stopOpacity=".9" />
            <stop offset=".3" stopColor="#dff6ff" stopOpacity=".4" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="torre" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#bfe9ff" stopOpacity=".75" />
            <stop offset=".5" stopColor="#5fb6e6" stopOpacity=".55" />
            <stop offset="1" stopColor="#2f7fbf" stopOpacity=".6" />
          </linearGradient>
          <linearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5fd3ff" stopOpacity=".85" />
            <stop offset="1" stopColor="#035a9e" />
          </linearGradient>
          <filter id="nube" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <rect width="400" height="860" fill="url(#cielo)" />
        <rect width="400" height="860" fill="url(#sol)" />

        <g fill="#fff" opacity=".75" filter="url(#nube)">
          <ellipse cx="80" cy="120" rx="70" ry="22" />
          <ellipse cx="120" cy="108" rx="44" ry="26" />
          <ellipse cx="310" cy="300" rx="80" ry="24" />
          <ellipse cx="350" cy="285" rx="40" ry="24" />
          <ellipse cx="60" cy="420" rx="60" ry="16" />
        </g>

        <g fill="url(#torre)" stroke="#e8f8ff" strokeOpacity=".6" strokeWidth=".8">
          <path d="M318 600V330l14-40 14 40v270z" />
          <path d="M290 600V430h22v170zM350 600V400h20v200zM262 600V480h20v120zM372 600V460h28v140z" />
          <path d="M20 600V500h18v100zM42 600V470h16v130z" />
        </g>

        <path d="M0 590q60-14 120 0t140 0 140 0V860H0z" fill="url(#agua)" />
        <path d="M0 640q50-22 110-4t120-2 170-10" stroke="#fff" strokeOpacity=".55" strokeWidth="3" fill="none" />
        <path d="M0 700q80-26 160-6t240-14" stroke="#fff" strokeOpacity=".35" strokeWidth="2" fill="none" />

        <Hoja transform="translate(-40 70) rotate(-18) scale(.9)" />
        <Hoja transform="translate(-30 160) rotate(12) scale(.6)" claro="#d4ff7a" oscuro="#3eaa2c" />
        <Hoja transform="translate(440 660) rotate(200) scale(.8)" />
        <Hoja transform="translate(-50 800) rotate(-30) scale(.85)" claro="#b5f56a" oscuro="#1f8a2a" />
      </svg>

      {BURBUJAS.map((b, i) => (
        <span
          key={i}
          className="burbuja"
          style={{ left: `${b.x}%`, width: b.t, height: b.t, animationDelay: `-${b.d}s` }}
        />
      ))}
    </div>
  )
}
