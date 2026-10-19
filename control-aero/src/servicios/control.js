// El "cerebro" del control: guarda la configuración y decide a qué aparato
// y por dónde (WiFi o infrarrojo) sale cada botón.
import { useSyncExternalStore } from 'react'
import datosPerfiles from '../ir/perfiles.json'
import { codificarCodigo } from '../ir/protocolos.js'
import { TECLAS, ALTERNATIVAS_IR, APPS } from '../ir/teclas.js'
import { Infrarrojo, GoogleTv, esApp, vibrar } from './nativo.js'

const PROTOCOLOS = datosPerfiles.protocolos
const perfil = (id) => datosPerfiles.perfiles.find((p) => p.id === id)

// El decodificador responde a dos códigos: usamos el MXQ (trae el cursor)
// y completamos con el Hisense las teclas que le falten
const MXQ = perfil('android-tv-mxq')
const HISENSE = perfil('hisense-55k3201guwus')
const PERFIL_DECO = { id: 'deco', marca: 'Android', modelo: 'MXQ + Hisense', teclas: { ...HISENSE.teclas, ...MXQ.teclas } }

// Códigos para buscar el del TV (sin los que ya sabemos que son del deco)
export const PERFILES_TV = datosPerfiles.perfiles.filter((p) => p !== MXQ && p !== HISENSE)

export const DISPOSITIVOS = [
  { id: 'tv', nombre: 'Televisor', corto: 'TV', tema: 'verde' },
  { id: 'caja', nombre: 'Decodificador', corto: 'Deco', tema: 'azul' },
]

export const perfilDe = (id) => (id === 'caja' ? PERFIL_DECO : (PERFILES_TV.find((p) => p.id === estado.perfilTv) ?? null))

// Estas teclas siempre van al TV aunque estés usando el decodificador
const TECLAS_DEL_TV = ['volUp', 'volDown', 'mute']

const CLAVE_GUARDADO = 'control-aero:ajustes-v2'
const AJUSTES_INICIALES = {
  dispositivo: 'caja',
  perfilTv: null,
  volumenAlTv: true,
  ipTv: '',
  ipDeco: '',
  vibracion: true,
}

function leerAjustes() {
  try {
    return { ...AJUSTES_INICIALES, ...JSON.parse(localStorage.getItem(CLAVE_GUARDADO)) }
  } catch {
    return { ...AJUSTES_INICIALES }
  }
}

let estado = {
  ...leerAjustes(),
  irDisponible: null, // null = todavía no sabemos
  wifi: { tv: 'desconectado', caja: 'desconectado' }, // o 'conectando' / 'conectado'
  emparejando: null, // { dispositivo, host, paso: 'iniciando' | 'codigo' | 'confirmando' }
  busqueda: null, // { estado: 'buscando' | 'listo', aparatos: [...] }
  aviso: null,
}

const oyentes = new Set()
function actualizar(cambios) {
  estado = { ...estado, ...cambios }
  oyentes.forEach((o) => o())
  if (Object.keys(cambios).some((k) => k in AJUSTES_INICIALES)) {
    const guardar = Object.fromEntries(Object.keys(AJUSTES_INICIALES).map((k) => [k, estado[k]]))
    try {
      localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(guardar))
    } catch {
      // sin almacenamiento: la app sigue funcionando, solo no recuerda ajustes
    }
  }
}

export function useControl() {
  return useSyncExternalStore(
    (o) => (oyentes.add(o), () => oyentes.delete(o)),
    () => estado,
  )
}

export const cambiarAjuste = (clave, valor) => actualizar({ [clave]: valor })

export const dispositivoActivo = () => DISPOSITIVOS.find((d) => d.id === estado.dispositivo) ?? DISPOSITIVOS[0]

export function cambiarDispositivo(id) {
  if (id === estado.dispositivo) return
  if (estado.vibracion) vibrar()
  actualizar({ dispositivo: id })
  if (!perfilDe(id) && !wifiListo(id) && !ipDe(id)) avisar('Conecta este aparato en Ajustes')
}

let temporizadorAviso
export function avisar(texto, tipo = 'info') {
  clearTimeout(temporizadorAviso)
  actualizar({ aviso: { texto, tipo, id: Date.now() } })
  temporizadorAviso = setTimeout(() => actualizar({ aviso: null }), 2600)
}

// ---------- Infrarrojo ----------

function codigoEnPerfil(p, id) {
  if (!p) return null
  for (const clave of [id, ...(ALTERNATIVAS_IR[id] ?? [])]) {
    if (p.teclas[clave]) return p.teclas[clave]
  }
  return null
}

const codigoIr = (dispositivo, id) => codigoEnPerfil(perfilDe(dispositivo.id), id)

async function transmitir(codigo, texto) {
  const { frecuencia, patron } = codificarCodigo(PROTOCOLOS, codigo)
  if (!esApp) return avisar(`Demo · ${texto}`)
  await Infrarrojo.transmitir({ frecuencia, patron })
}

const enviarIr = (dispositivo, id) =>
  transmitir(codigoIr(dispositivo, id), `${dispositivo.corto}: ${TECLAS[id]?.nombre ?? id}`)

// Usado por el buscador del código del TV
export async function probarPerfil(p, id) {
  vibrar()
  const codigo = codigoEnPerfil(p, id)
  if (!codigo) return avisar(`Este código no trae "${TECLAS[id].nombre}", prueba otro botón`, 'error')
  try {
    await transmitir(codigo, `${p.marca}: ${TECLAS[id].nombre}`)
  } catch (e) {
    avisar(e.message, 'error')
  }
}

// ---------- WiFi: emparejamiento con código (protocolo de Google TV) ----------

const ipDe = (id) => (id === 'tv' ? estado.ipTv : estado.ipDeco)
const wifiListo = (id) => estado.wifi[id] === 'conectado'
const ponerWifi = (id, valor) => actualizar({ wifi: { ...estado.wifi, [id]: valor } })

let colaWifi = Promise.resolve()
function enviarWifi(dispositivo, orden) {
  // En fila para que las teclas lleguen en el mismo orden en que se tocan
  colaWifi = colaWifi
    .then(() => GoogleTv.enviar({ host: ipDe(dispositivo.id), ...orden }))
    .catch((e) => {
      ponerWifi(dispositivo.id, 'desconectado')
      avisar(`Se perdió el WiFi con el ${dispositivo.nombre.toLowerCase()}: ${e.message}`, 'error')
    })
  return colaWifi
}

export async function conectarWifi(id, silencioso = false) {
  const host = ipDe(id)
  if (!host) return
  ponerWifi(id, 'conectando')
  try {
    await GoogleTv.conectar({ host })
    ponerWifi(id, 'conectado')
    if (!silencioso) avisar('¡Conectado por WiFi! 🎉', 'exito')
  } catch (e) {
    ponerWifi(id, 'desconectado')
    if (!silencioso) avisar(e.message || 'No se pudo conectar', 'error')
  }
}

export async function olvidarWifi(id) {
  await GoogleTv.desconectar({ host: ipDe(id) }).catch(() => {})
  ponerWifi(id, 'desconectado')
  actualizar(id === 'tv' ? { ipTv: '' } : { ipDeco: '' })
}

// Paso 1: el aparato muestra un código en pantalla
export async function empezarEmparejamiento(id, host) {
  actualizar({ emparejando: { dispositivo: id, host, paso: 'iniciando' } })
  try {
    await GoogleTv.emparejar({ host })
    actualizar({ emparejando: { dispositivo: id, host, paso: 'codigo' } })
  } catch (e) {
    actualizar({ emparejando: null })
    avisar(e.message || 'El aparato no respondió', 'error')
  }
}

// Paso 2: la persona escribe el código y quedamos conectados
export async function confirmarCodigo(codigo) {
  const { dispositivo, host } = estado.emparejando
  actualizar({ emparejando: { ...estado.emparejando, paso: 'confirmando' } })
  try {
    await GoogleTv.confirmarCodigo({ host, codigo })
  } catch (e) {
    if (e.code === 'CODIGO_INVALIDO') {
      actualizar({ emparejando: { ...estado.emparejando, paso: 'codigo' } })
      return avisar(e.message, 'error')
    }
    actualizar({ emparejando: null })
    return avisar(`${e.message}. Intenta emparejar de nuevo`, 'error')
  }
  actualizar({ emparejando: null, ...(dispositivo === 'tv' ? { ipTv: host } : { ipDeco: host }) })
  await conectarWifi(dispositivo)
}

export function cancelarEmparejamiento() {
  if (estado.emparejando) GoogleTv.cancelarEmparejamiento({ host: estado.emparejando.host }).catch(() => {})
  actualizar({ emparejando: null })
}

// Busca en el WiFi los aparatos que aceptan emparejarse con código
export async function buscarEnRed() {
  actualizar({ busqueda: { estado: 'buscando', aparatos: [] } })
  try {
    const { aparatos } = await GoogleTv.buscar()
    actualizar({ busqueda: { estado: 'listo', aparatos } })
  } catch (e) {
    actualizar({ busqueda: null })
    avisar(e.message || 'No se pudo buscar en la red', 'error')
  }
}

// ---------- Botones ----------
// Si el aparato está conectado por WiFi, se usa eso (más confiable);
// si no, infrarrojo.

export async function presionar(id) {
  if (estado.vibracion) vibrar()
  const tecla = TECLAS[id]

  // Volumen al TV si el TV se puede controlar por algún lado
  const tvAlcanzable = perfilDe('tv') || wifiListo('tv')
  const destino = estado.volumenAlTv && TECLAS_DEL_TV.includes(id) && tvAlcanzable ? DISPOSITIVOS[0] : dispositivoActivo()

  if (wifiListo(destino.id) && tecla.adb) return enviarWifi(destino, { tipo: 'tecla', codigo: tecla.adb })
  if (tecla.soloWifi) return avisar(`Conecta el ${destino.nombre.toLowerCase()} por WiFi en Ajustes`, 'error')
  if (estado.irDisponible !== false && codigoIr(destino, id)) {
    return enviarIr(destino, id).catch((e) => avisar(e.message, 'error'))
  }
  if (!perfilDe(destino.id)) return avisar(`Conecta el ${destino.nombre.toLowerCase()} por WiFi en Ajustes`, 'error')
  if (estado.irDisponible === false) return avisar('Este celular no tiene infrarrojo', 'error')
  avisar(`El control del ${destino.nombre.toLowerCase()} no trae "${tecla.nombre}"`, 'error')
}

export const tieneTecla = (id) => Boolean(codigoIr(dispositivoActivo(), id))

export function abrirApp(appId) {
  if (estado.vibracion) vibrar()
  const app = APPS.find((a) => a.id === appId)
  const activo = dispositivoActivo()
  if (wifiListo(activo.id)) {
    avisar(`Abriendo ${app.nombre}…`)
    return enviarWifi(activo, { tipo: 'enlace', enlace: app.enlace })
  }
  if (codigoIr(activo, appId)) return enviarIr(activo, appId).catch((e) => avisar(e.message, 'error'))
  avisar(`Para abrir ${app.nombre} conecta el ${activo.nombre.toLowerCase()} por WiFi (Ajustes)`, 'error')
}

export function escribir(texto) {
  const activo = dispositivoActivo()
  if (!texto) return
  if (!wifiListo(activo.id)) return avisar(`El teclado necesita el ${activo.nombre.toLowerCase()} por WiFi`, 'error')
  return enviarWifi(activo, { tipo: 'texto', texto })
}

// ---------- Arranque ----------

export async function iniciar() {
  try {
    const { disponible } = await Infrarrojo.disponible()
    actualizar({ irDisponible: esApp ? disponible : null })
  } catch {
    actualizar({ irDisponible: false })
  }
  if (!esApp) return
  for (const d of DISPOSITIVOS) if (ipDe(d.id)) conectarWifi(d.id, true)
}
