// Convierte un código infrarrojo (protocolo + dirección + comando) en el
// patrón que entiende Android: frecuencia y una lista de microsegundos
// alternando "luz encendida" y "luz apagada", empezando siempre encendida.

const bits = (valor, cantidad) => Array.from({ length: cantidad }, (_, i) => (valor >> i) & 1) // LSB primero

// Une pulsos del mismo tipo seguidos (útil en los protocolos Manchester)
function compactar(niveles) {
  const patron = []
  let actual = null
  for (const [encendido, duracion] of niveles) {
    if (encendido === actual) patron[patron.length - 1] += duracion
    else {
      if (patron.length === 0 && !encendido) continue // el patrón debe empezar encendido
      patron.push(duracion)
      actual = encendido
    }
  }
  if (patron.length % 2 === 0) patron.pop() // termina con un pulso encendido
  return patron
}

function pulsoDistancia(cabecera, datos, uno, cero, marca) {
  const patron = [...cabecera]
  for (const b of datos) patron.push(marca, b ? uno : cero)
  patron.push(marca)
  return patron
}

function nec(direccion, comando, extendido) {
  const dir = extendido ? bits(direccion, 16) : [...bits(direccion, 8), ...bits(~direccion, 8)]
  const cmd = extendido ? bits(comando, 16) : [...bits(comando, 8), ...bits(~comando, 8)]
  return { frecuencia: 38000, patron: pulsoDistancia([9000, 4500], [...dir, ...cmd], 1690, 560, 560) }
}

function samsung32(direccion, comando) {
  const datos = [...bits(direccion, 8), ...bits(direccion, 8), ...bits(comando, 8), ...bits(~comando, 8)]
  return { frecuencia: 38000, patron: pulsoDistancia([4500, 4500], datos, 1690, 560, 560) }
}

let alternar = 0 // RC5/RC6 cambian un bit en cada pulsación nueva

function rc5(direccion, comando) {
  const T = 889
  alternar ^= 1
  const msb = (v, n) => bits(v, n).reverse()
  const datos = [1, comando < 64 ? 1 : 0, alternar, ...msb(direccion, 5), ...msb(comando & 63, 6)]
  // En RC5 un 1 es "apagado y luego encendido"; un 0 es al revés
  const niveles = datos.flatMap((b) => (b ? [[false, T], [true, T]] : [[true, T], [false, T]]))
  return { frecuencia: 36000, patron: compactar(niveles) }
}

function rc6(direccion, comando) {
  const T = 444
  alternar ^= 1
  const msb = (v, n) => bits(v, n).reverse()
  const bit = (b, ancho = 1) => (b ? [[true, T * ancho], [false, T * ancho]] : [[false, T * ancho], [true, T * ancho]])
  const niveles = [
    [true, 6 * T], [false, 2 * T], // cabecera
    ...bit(1), ...bit(0), ...bit(0), ...bit(0), // bit de inicio + modo 0
    ...bit(alternar, 2), // bit de alternancia (doble de ancho)
    ...[...msb(direccion, 8), ...msb(comando, 8)].flatMap((b) => bit(b)),
  ]
  return { frecuencia: 36000, patron: compactar(niveles) }
}

function sirc(direccion, comando, bitsDireccion) {
  const datos = [...bits(comando, 7), ...bits(direccion, bitsDireccion)]
  const trama = [2400, 600]
  for (const b of datos) trama.push(b ? 1200 : 600, 600)
  // Sony exige repetir la trama 3 veces, cada una cada 45 ms
  const duracion = trama.reduce((a, b) => a + b, 0)
  trama[trama.length - 1] += Math.max(600, 45000 - duracion)
  const patron = [...trama, ...trama, ...trama]
  patron.pop()
  return { frecuencia: 40000, patron }
}

const CODIFICADORES = {
  NEC: (a, c) => nec(a, c, false),
  NECext: (a, c) => nec(a, c, true),
  Samsung32: samsung32,
  RC5: rc5,
  RC6: rc6,
  SIRC: (a, c) => sirc(a, c, 5),
  SIRC15: (a, c) => sirc(a, c, 8),
  SIRC20: (a, c) => sirc(a, c, 13),
}

// Un código guardado: [protocolo, dirección, comando] o, si es una señal
// cruda, [-1, frecuencia, tiempos]
export function codificarCodigo(protocolos, [protocolo, a, b]) {
  if (protocolo === -1) return { frecuencia: a, patron: b }
  return codificar(protocolos[protocolo], a, b)
}

export function codificar(protocolo, direccion, comando) {
  const codificador = CODIFICADORES[protocolo]
  if (!codificador) throw new Error(`Protocolo no soportado: ${protocolo}`)
  return codificador(direccion, comando)
}
