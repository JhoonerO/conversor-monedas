// Catálogo de teclas del control.
// - adb: código de tecla de Android (para Google TV por WiFi)
// - destino: a quién le corresponde la tecla normalmente
//     'tv'   -> el televisor Kalley (infrarrojo)
//     'caja' -> el Google TV / caja Android (WiFi), con infrarrojo de respaldo

export const TECLAS = {
  power: { nombre: 'Encender', adb: 26, destino: 'tv' },
  volUp: { nombre: 'Volumen +', adb: 24, destino: 'tv' },
  volDown: { nombre: 'Volumen −', adb: 25, destino: 'tv' },
  mute: { nombre: 'Silencio', adb: 164, destino: 'tv' },
  chUp: { nombre: 'Canal +', adb: 166, destino: 'tv' },
  chDown: { nombre: 'Canal −', adb: 167, destino: 'tv' },
  source: { nombre: 'Fuente', adb: 178, destino: 'tv' },

  up: { nombre: 'Arriba', adb: 19, destino: 'caja' },
  down: { nombre: 'Abajo', adb: 20, destino: 'caja' },
  left: { nombre: 'Izquierda', adb: 21, destino: 'caja' },
  right: { nombre: 'Derecha', adb: 22, destino: 'caja' },
  ok: { nombre: 'OK', adb: 23, destino: 'caja' },
  back: { nombre: 'Atrás', adb: 4, destino: 'caja' },
  home: { nombre: 'Inicio', adb: 3, destino: 'caja' },
  menu: { nombre: 'Menú', adb: 82, destino: 'caja' },
  settings: { nombre: 'Opciones', adb: 176, destino: 'caja' },
  info: { nombre: 'Info', adb: 165, destino: 'caja' },
  apps: { nombre: 'Apps', adb: 284, destino: 'caja' },
  playPause: { nombre: 'Reproducir / Pausar', adb: 85, destino: 'caja' },
  rewind: { nombre: 'Anterior', adb: 89, destino: 'caja' },
  forward: { nombre: 'Siguiente', adb: 90, destino: 'caja' },
  stop: { nombre: 'Detener', adb: 86, destino: 'caja' },

  borrar: { nombre: 'Borrar', adb: 67, destino: 'caja', soloWifi: true },
  enter: { nombre: 'Enter', adb: 66, destino: 'caja', soloWifi: true },
}

for (let n = 0; n <= 9; n++) TECLAS['n' + n] = { nombre: String(n), adb: 7 + n, destino: 'tv' }

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
