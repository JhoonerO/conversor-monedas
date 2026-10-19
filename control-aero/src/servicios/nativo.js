// Puente con el código Android (carpeta android/app/src/main/java/...).
// En el navegador no existen, así que usamos versiones de demostración.
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export const esApp = Capacitor.isNativePlatform()

const demora = (ms) => new Promise((r) => setTimeout(r, ms))

export const Infrarrojo = esApp
  ? registerPlugin('Infrarrojo')
  : {
      disponible: async () => ({ disponible: false }),
      transmitir: async () => {},
    }

export const GoogleTv = esApp
  ? registerPlugin('GoogleTv')
  : {
      // Simulación para la vista previa en el navegador
      conectar: () => demora(500),
      enviar: async () => {},
      desconectar: async () => {},
      emparejar: () => demora(800),
      confirmarCodigo: () => demora(500),
      cancelarEmparejamiento: async () => {},
      buscar: async () => {
        await demora(1500)
        return {
          aparatos: [
            { host: '192.168.1.11', nombre: 'Google_TV' },
            { host: '192.168.1.6', nombre: 'TV de Habitación principal' },
          ],
        }
      },
    }

export function vibrar() {
  if (esApp) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  else navigator.vibrate?.(8)
}
