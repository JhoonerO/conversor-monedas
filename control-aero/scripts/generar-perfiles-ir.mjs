// Genera src/ir/perfiles.json a partir de la base de datos Flipper-IRDB.
//
// Uso (solo hace falta si quieres regenerar los perfiles):
//   git clone --depth 1 https://github.com/Lucaslhm/Flipper-IRDB
//   node scripts/generar-perfiles-ir.mjs ruta/a/Flipper-IRDB
//
// No hay códigos publicados para Kalley, así que tomamos los perfiles de
// las marcas con chasis más parecidos y el asistente de la app los prueba
// uno por uno hasta que el TV responda.

import fs from 'node:fs'
import path from 'node:path'

const raiz = process.argv[2]
if (!raiz) {
  console.error('Falta la ruta de Flipper-IRDB')
  process.exit(1)
}

const PROTOCOLOS = ['NEC', 'NECext', 'Samsung32', 'RC5', 'RC6', 'SIRC', 'SIRC15', 'SIRC20']

// Nombre canónico de cada tecla -> expresiones que aparecen en la base de datos
const ALIAS = {
  power: /^(power|on_off|power_toggle|pwr)$/,
  mute: /^mute$/,
  volUp: /^(vol_up|vol\+|volume_up)$/,
  volDown: /^(vol_dn|vol_down|vol-|volume_down)$/,
  chUp: /^(ch_next|ch_up|ch\+|channel_up)$/,
  chDown: /^(ch_prev|ch_dn|ch_down|ch-|channel_down)$/,
  up: /^up$/,
  down: /^down$/,
  left: /^left$/,
  right: /^right$/,
  ok: /^(ok|enter|select)$/,
  back: /^(back|return)$/,
  exit: /^exit$/,
  home: /^(home|smart_hub|smart)$/,
  menu: /^menu$/,
  settings: /^(settings|setup|tools|options?)$/,
  source: /^(source|input)$/,
  info: /^(info|display)$/,
  play: /^play$/,
  pause: /^pause$/,
  playPause: /^(play_pause|play\/pause|play_pa)$/,
  stop: /^stop$/,
  rewind: /^(rewind|rew|fast_ba)$/,
  forward: /^(fast_forward|fastforward|fast_fo|fast_fwd|forward|fwd)$/,
  netflix: /^netflix$/,
  youtube: /^youtube$/,
  prime: /^(prime_video|prime|amazon)$/,
  disney: /^disney\+?$/,
}
for (let n = 0; n <= 9; n++) ALIAS['n' + n] = new RegExp(`^${n}$`)

// Marcas con más probabilidad de compartir control con un Kalley
// (chasis chinos genéricos, Android TV y marcas comunes en Latinoamérica)
const PRIORIDAD = [
  'TCL', 'Hisense', 'Haier', 'Xiaomi', 'Android', 'Ffalcon', 'RCA', 'Element', 'Onn',
  'Westinghouse', 'Sankey', 'BGH', 'CCE', 'Daewoo', 'Akai', 'Sanyo', 'Philips',
  'Samsung', 'LG', 'Sony', 'Panasonic', 'Sharp', 'Toshiba', 'JVC', 'Hitachi',
]

function leerArchivo(ruta) {
  const teclas = {}
  for (const bloque of fs.readFileSync(ruta, 'utf8').split(/^#.*$/m)) {
    const campo = (k) => bloque.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1].trim()
    const nombre = campo('name')
    if (!nombre || campo('type') !== 'parsed') continue
    const protocolo = campo('protocol')
    if (!PROTOCOLOS.includes(protocolo)) continue
    const bytes = (txt) => txt.split(/\s+/).reduce((v, b, i) => v + parseInt(b, 16) * 256 ** i, 0)
    const clave = Object.keys(ALIAS).find((k) => ALIAS[k].test(nombre.toLowerCase()))
    if (clave && !teclas[clave]) {
      teclas[clave] = [PROTOCOLOS.indexOf(protocolo), bytes(campo('address')), bytes(campo('command'))]
    }
  }
  return teclas
}

const candidatos = []
const carpetaTv = path.join(raiz, 'TVs')
for (const marca of fs.readdirSync(carpetaTv)) {
  const dir = path.join(carpetaTv, marca)
  if (!fs.statSync(dir).isDirectory()) continue
  for (const archivo of fs.readdirSync(dir).filter((f) => f.endsWith('.ir'))) {
    const teclas = leerArchivo(path.join(dir, archivo))
    // Un perfil sirve solo si tiene lo básico para el asistente y el uso diario
    if (!['power', 'mute', 'volUp', 'volDown'].every((k) => teclas[k])) continue
    const prioridad = PRIORIDAD.indexOf(marca)
    candidatos.push({
      marca,
      modelo: archivo.replace(/\.ir$/, '').replace(new RegExp(`^${marca}[_ -]?`, 'i'), '').replace(/_/g, ' '),
      teclas,
      orden: prioridad === -1 ? PRIORIDAD.length : prioridad,
      puntaje: Object.keys(teclas).length,
    })
  }
}

candidatos.sort((a, b) => a.orden - b.orden || b.puntaje - a.puntaje)

// Juntamos perfiles repetidos: si el código de "silencio" y "volumen +" son
// iguales es el mismo control, así que completamos las teclas que le falten
const porFirma = new Map()
const perfiles = []
for (const c of candidatos) {
  const firma = JSON.stringify([c.teclas.mute, c.teclas.volUp])
  const existente = porFirma.get(firma)
  if (existente) {
    existente.teclas = { ...c.teclas, ...existente.teclas }
    continue
  }
  const perfil = { id: `${c.marca}-${c.modelo}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), marca: c.marca, modelo: c.modelo || 'Genérico', teclas: c.teclas }
  porFirma.set(firma, perfil)
  perfiles.push(perfil)
}

const salida = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'ir', 'perfiles.json')
fs.writeFileSync(salida, JSON.stringify({ protocolos: PROTOCOLOS, perfiles }))
console.log(`${perfiles.length} perfiles guardados en ${salida}`)
