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
      conectar: async () => {
        await demora(600)
        throw new Error('Solo funciona en la app instalada en el celular')
      },
      enviar: async () => {},
      desconectar: async () => {},
      buscar: async () => {
        await demora(1500)
        return { aparatos: [] }
      },
    }

export function vibrar() {
  if (esApp) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  else navigator.vibrate?.(8)
}
