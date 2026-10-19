// El "cerebro" del control: guarda la configuración y decide a qué aparato
// y por dónde (infrarrojo o WiFi) sale cada botón.
import { useSyncExternalStore } from 'react'
import datosPerfiles from '../ir/perfiles.json'
import { codificar } from '../ir/protocolos.js'
import { TECLAS, ALTERNATIVAS_IR, APPS } from '../ir/teclas.js'
import { Infrarrojo, GoogleTv, esApp, vibrar } from './nativo.js'

const PROTOCOLOS = datosPerfiles.protocolos
const perfil = (id) => datosPerfiles.perfiles.find((p) => p.id === id)

// Los dos controles que funcionaron con tus aparatos
export const DISPOSITIVOS = [
  { id: 'tv', nombre: 'Televisor', corto: 'TV', tema: 'verde', perfil: perfil('hisense-55k3201guwus') },
  { id: 'caja', nombre: 'Decodificador', corto: 'Deco', tema: 'azul', perfil: perfil('android-tv-mxq') },
]

// Estas teclas siempre van al TV aunque estés usando el decodificador
const TECLAS_DEL_TV = ['volUp', 'volDown', 'mute']

const CLAVE_GUARDADO = 'control-aero:ajustes-v2'
const AJUSTES_INICIALES = {
  dispositivo: 'caja',
  volumenAlTv: true,
  ipGoogleTv: '',
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

export const dispositivoActivo = () => DISPOSITIVOS.find((d) => d.id === estado.dispositivo) ?? DISPOSITIVOS[0]

export function cambiarDispositivo(id) {
  if (id === estado.dispositivo) return
  if (estado.vibracion) vibrar()
  actualizar({ dispositivo: id })
}

let temporizadorAviso
export function avisar(texto, tipo = 'info') {
  clearTimeout(temporizadorAviso)
  actualizar({ aviso: { texto, tipo, id: Date.now() } })
  temporizadorAviso = setTimeout(() => actualizar({ aviso: null }), 2600)
}

// ---------- Infrarrojo ----------

function codigoIr(dispositivo, id) {
  for (const clave of [id, ...(ALTERNATIVAS_IR[id] ?? [])]) {
    if (dispositivo.perfil.teclas[clave]) return dispositivo.perfil.teclas[clave]
  }
  return null
}

async function enviarIr(dispositivo, id) {
  const [protocolo, direccion, comando] = codigoIr(dispositivo, id)
  const { frecuencia, patron } = codificar(PROTOCOLOS[protocolo], direccion, comando)
  if (!esApp) return avisar(`Demo · ${dispositivo.corto}: ${TECLAS[id]?.nombre ?? id}`)
  await Infrarrojo.transmitir({ frecuencia, patron })
}

// ---------- Decodificador por WiFi (opcional: teclado y apps) ----------

let colaWifi = Promise.resolve()
function enviarWifi(orden) {
  // En fila para que las teclas lleguen en el mismo orden en que se tocan
  colaWifi = colaWifi.then(() => GoogleTv.enviar(orden)).catch((e) => {
    if (e.code === 'SIN_DESCONECTAR') return avisar(e.message, 'error')
    actualizar({ googleTv: 'desconectado' })
    avisar(`Se perdió la conexión WiFi con el decodificador (${e.message})`, 'error')
  })
  return colaWifi
}

export async function conectarGoogleTv(ip = estado.ipGoogleTv, silencioso = false) {
  ip = ip.trim()
  if (!ip) return avisar('Escribe la IP del decodificador', 'error')
  actualizar({ ipGoogleTv: ip, googleTv: 'conectando' })
  try {
    await GoogleTv.conectar({ host: ip, puerto: 5555 })
    actualizar({ googleTv: 'conectado' })
    if (!silencioso) avisar('¡Decodificador conectado por WiFi! 🎉', 'exito')
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

export async function presionar(id) {
  if (estado.vibracion) vibrar()
  const tecla = TECLAS[id]
  const wifi = estado.googleTv === 'conectado'

  if (tecla.soloWifi) {
    if (wifi) return enviarWifi({ tipo: 'tecla', codigo: tecla.adb })
    return avisar('Esto necesita el decodificador conectado por WiFi (Ajustes)', 'error')
  }

  const destino =
    estado.volumenAlTv && TECLAS_DEL_TV.includes(id) ? DISPOSITIVOS[0] : dispositivoActivo()

  if (estado.irDisponible !== false && codigoIr(destino, id)) {
    return enviarIr(destino, id).catch((e) => avisar(e.message, 'error'))
  }
  // El control infrarrojo no trae ese botón: probamos por WiFi si hay conexión
  if (destino.id === 'caja' && wifi && tecla.adb) return enviarWifi({ tipo: 'tecla', codigo: tecla.adb })
  if (estado.irDisponible === false) return avisar('Este celular no tiene infrarrojo', 'error')
  avisar(`El control del ${destino.nombre.toLowerCase()} no trae "${tecla.nombre}"`, 'error')
}

export const tieneTecla = (id) => Boolean(codigoIr(dispositivoActivo(), id))

export function abrirApp(appId) {
  if (estado.vibracion) vibrar()
  const app = APPS.find((a) => a.id === appId)
  const activo = dispositivoActivo()
  if (activo.id === 'caja' && estado.googleTv === 'conectado') {
    avisar(`Abriendo ${app.nombre}…`)
    return enviarWifi({ tipo: 'app', paquete: app.paquete })
  }
  if (codigoIr(activo, appId)) return enviarIr(activo, appId).catch((e) => avisar(e.message, 'error'))
  if (activo.id === 'caja') return avisar('Para abrir apps en el decodificador conéctalo por WiFi (Ajustes)', 'error')
  avisar(`El control del TV no trae botón de ${app.nombre}`, 'error')
}

export function escribir(texto) {
  if (!texto) return
  if (estado.googleTv !== 'conectado') return avisar('El teclado necesita el decodificador por WiFi', 'error')
  return enviarWifi({ tipo: 'texto', texto })
}

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
