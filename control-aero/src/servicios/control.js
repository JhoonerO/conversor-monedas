// El "cerebro" del control: guarda la configuración y decide si cada botón
// sale por infrarrojo (al TV Kalley) o por WiFi (al Google TV).
import { useSyncExternalStore } from 'react'
import datosPerfiles from '../ir/perfiles.json'
import { codificar } from '../ir/protocolos.js'
import { TECLAS, ALTERNATIVAS_IR, APPS } from '../ir/teclas.js'
import { Infrarrojo, GoogleTv, esApp, vibrar } from './nativo.js'

export const PERFILES = datosPerfiles.perfiles
const PROTOCOLOS = datosPerfiles.protocolos

const CLAVE_GUARDADO = 'control-aero:ajustes'
const AJUSTES_INICIALES = {
  perfilId: null,
  ipGoogleTv: '',
  rutaNavegacion: 'auto', // 'auto' | 'ir' | 'wifi'
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
  googleTv: 'desconectado', // 'desconectado' | 'conectando' | 'conectado'
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

let temporizadorAviso
export function avisar(texto, tipo = 'info') {
  clearTimeout(temporizadorAviso)
  actualizar({ aviso: { texto, tipo, id: Date.now() } })
  temporizadorAviso = setTimeout(() => actualizar({ aviso: null }), 2600)
}

export const perfilActual = () => PERFILES.find((p) => p.id === estado.perfilId) ?? null

// ---------- Infrarrojo ----------

function codigoIr(perfil, id) {
  if (!perfil) return null
  for (const clave of [id, ...(ALTERNATIVAS_IR[id] ?? [])]) {
    if (perfil.teclas[clave]) return perfil.teclas[clave]
  }
  return null
}

async function enviarIr(perfil, id) {
  const codigo = codigoIr(perfil, id)
  if (!codigo) return false
  const [protocolo, direccion, comando] = codigo
  const { frecuencia, patron } = codificar(PROTOCOLOS[protocolo], direccion, comando)
  if (!esApp) {
    avisar(`Demo · infrarrojo: ${TECLAS[id]?.nombre ?? id}`)
    return true
  }
  await Infrarrojo.transmitir({ frecuencia, patron })
  return true
}

export const tieneTeclaIr = (id) => Boolean(codigoIr(perfilActual(), id))

// Usado por el asistente "Buscar mi control"
export async function probarPerfil(perfil, id) {
  vibrar()
  try {
    await enviarIr(perfil, id)
  } catch (e) {
    avisar(e.message, 'error')
  }
}

// ---------- Google TV por WiFi ----------

let colaWifi = Promise.resolve()
function enviarWifi(orden) {
  // En fila para que las teclas lleguen en el mismo orden en que se tocan
  colaWifi = colaWifi.then(() => GoogleTv.enviar(orden)).catch((e) => {
    if (e.code === 'SIN_DESCONECTAR') return avisar(e.message, 'error')
    actualizar({ googleTv: 'desconectado' })
    avisar(`Se perdió la conexión con el Google TV (${e.message})`, 'error')
  })
  return colaWifi
}

export async function conectarGoogleTv(ip = estado.ipGoogleTv, silencioso = false) {
  ip = ip.trim()
  if (!ip) return avisar('Escribe la IP del Google TV', 'error')
  actualizar({ ipGoogleTv: ip, googleTv: 'conectando' })
  try {
    await GoogleTv.conectar({ host: ip, puerto: 5555 })
    actualizar({ googleTv: 'conectado' })
    if (!silencioso) avisar('¡Google TV conectado! 🎉', 'exito')
  } catch (e) {
    actualizar({ googleTv: 'desconectado' })
    if (!silencioso) avisar(e.message || 'No se pudo conectar', 'error')
  }
}

export async function desconectarGoogleTv() {
  await GoogleTv.desconectar().catch(() => {})
  actualizar({ googleTv: 'desconectado' })
}

// ---------- Botones ----------

function ruta(id) {
  const tecla = TECLAS[id]
  const wifi = estado.googleTv === 'conectado'
  const ir = estado.irDisponible !== false && tieneTeclaIr(id)
  if (tecla.soloWifi) return wifi ? 'wifi' : null
  const preferida = estado.rutaNavegacion === 'auto' ? (tecla.destino === 'tv' ? 'ir' : 'wifi') : estado.rutaNavegacion
  if (preferida === 'ir') return ir ? 'ir' : wifi ? 'wifi' : null
  return wifi ? 'wifi' : ir ? 'ir' : null
}

export async function presionar(id) {
  if (estado.vibracion) vibrar()
  const destino = ruta(id)
  if (destino === 'wifi') return enviarWifi({ tipo: 'tecla', codigo: TECLAS[id].adb })
  if (destino === 'ir') {
    return enviarIr(perfilActual(), id).catch((e) => avisar(e.message, 'error'))
  }
  if (TECLAS[id].soloWifi || !perfilActual()) avisar(explicarSinRuta(id), 'error')
  else avisar(`Tu control no trae el botón "${TECLAS[id].nombre}". Conecta el Google TV en Ajustes.`, 'error')
}

function explicarSinRuta(id) {
  if (TECLAS[id].soloWifi) return 'Esto necesita el Google TV conectado por WiFi (Ajustes)'
  if (estado.irDisponible === false) return 'Este celular no tiene infrarrojo. Conecta el Google TV en Ajustes.'
  return 'Primero busca tu control en Ajustes → "Buscar mi control"'
}

export function abrirApp(appId) {
  if (estado.vibracion) vibrar()
  const app = APPS.find((a) => a.id === appId)
  if (estado.googleTv === 'conectado') {
    avisar(`Abriendo ${app.nombre}…`)
    return enviarWifi({ tipo: 'app', paquete: app.paquete })
  }
  if (tieneTeclaIr(appId)) return enviarIr(perfilActual(), appId)
  avisar('Para abrir apps conecta el Google TV en Ajustes', 'error')
}

export function escribir(texto) {
  if (!texto) return
  if (estado.googleTv !== 'conectado') return avisar('El teclado necesita el Google TV conectado', 'error')
  return enviarWifi({ tipo: 'texto', texto })
}

export const hayWifi = () => estado.googleTv === 'conectado'

// ---------- Arranque ----------

export async function iniciar() {
  try {
    const { disponible } = await Infrarrojo.disponible()
    actualizar({ irDisponible: esApp ? disponible : null })
  } catch {
    actualizar({ irDisponible: false })
  }
  if (estado.ipGoogleTv && esApp) conectarGoogleTv(estado.ipGoogleTv, true)
}
