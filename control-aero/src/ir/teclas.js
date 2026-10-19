// Catálogo de teclas del control.
// - adb: código de tecla de Android (para el decodificador por WiFi)
// - soloWifi: no existe en los controles infrarrojos

export const TECLAS = {
  power: { nombre: 'Encender', adb: 26 },
  volUp: { nombre: 'Volumen +', adb: 24 },
  volDown: { nombre: 'Volumen −', adb: 25 },
  mute: { nombre: 'Silencio', adb: 164 },
  chUp: { nombre: 'Canal +', adb: 166 },
  chDown: { nombre: 'Canal −', adb: 167 },
  source: { nombre: 'Fuente', adb: 178 },

  up: { nombre: 'Arriba', adb: 19 },
  down: { nombre: 'Abajo', adb: 20 },
  left: { nombre: 'Izquierda', adb: 21 },
  right: { nombre: 'Derecha', adb: 22 },
  ok: { nombre: 'OK', adb: 23 },
  back: { nombre: 'Atrás', adb: 4 },
  home: { nombre: 'Inicio', adb: 3 },
  menu: { nombre: 'Menú', adb: 82 },
  settings: { nombre: 'Opciones', adb: 176 },
  info: { nombre: 'Info', adb: 165 },
  apps: { nombre: 'Apps', adb: 284 },
  playPause: { nombre: 'Reproducir / Pausar', adb: 85 },
  rewind: { nombre: 'Anterior', adb: 89 },
  forward: { nombre: 'Siguiente', adb: 90 },
  stop: { nombre: 'Detener', adb: 86 },
  mouse: { nombre: 'Cursor', adb: null }, // muestra/oculta el cursor del decodificador

  borrar: { nombre: 'Borrar', adb: 67, soloWifi: true },
  enter: { nombre: 'Enter', adb: 66, soloWifi: true },
}

for (let n = 0; n <= 9; n++) TECLAS['n' + n] = { nombre: String(n), adb: 7 + n }

// Si el perfil infrarrojo no trae una tecla, probamos con otra equivalente
export const ALTERNATIVAS_IR = {
  back: ['exit'],
  home: ['menu'],
  settings: ['menu'],
  playPause: ['play', 'pause'],
}

// Aplicaciones del Google TV (se abren por WiFi; por infrarrojo solo si el
// control original trae el botón)
export const APPS = [
  { id: 'netflix', nombre: 'Netflix', paquete: 'com.netflix.ninja' },
  { id: 'youtube', nombre: 'YouTube', paquete: 'com.google.android.youtube.tv' },
  { id: 'prime', nombre: 'Prime Video', paquete: 'com.amazon.amazonvideo.livingroom' },
  { id: 'disney', nombre: 'Disney+', paquete: 'com.disney.disneyplus' },
]
