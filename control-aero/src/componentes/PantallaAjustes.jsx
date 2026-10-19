import { useState } from 'react'
import { Boton } from './Boton.jsx'
import { Icono } from './Iconos.jsx'
import { AsistentePerfil } from './AsistentePerfil.jsx'
import {
  useControl,
  perfilActual,
  cambiarAjuste,
  conectarGoogleTv,
  desconectarGoogleTv,
} from '../servicios/control.js'
import { esApp } from '../servicios/nativo.js'

function Opcion({ valor, actual, alElegir, children }) {
  return (
    <button type="button" className={`segmento ${valor === actual ? 'activo' : ''}`} onClick={() => alElegir(valor)}>
      {children}
    </button>
  )
}

export function PantallaAjustes() {
  const control = useControl()
  const [asistente, setAsistente] = useState(false)
  const [ip, setIp] = useState(control.ipGoogleTv)
  const perfil = perfilActual()
  const conectado = control.googleTv === 'conectado'

  const estadoIr =
    control.irDisponible === false
      ? 'Este celular no tiene emisor infrarrojo'
      : control.irDisponible
        ? 'Emisor infrarrojo listo ✓'
        : 'Vista previa: el infrarrojo funciona en la app instalada'

  return (
    <div className="pantalla pantalla-ajustes">
      <section className="tarjeta vidrio-panel">
        <h2>
          <Icono nombre="infrarrojo" tam={22} /> Televisor (infrarrojo)
        </h2>
        <p className={`estado ${control.irDisponible === false ? 'mal' : 'bien'}`}>{estadoIr}</p>
        <p>
          Control guardado: <b>{perfil ? `${perfil.marca} · ${perfil.modelo}` : 'ninguno todavía'}</b>
        </p>
        <Boton className="pastilla ancha destacada" accion={() => setAsistente(true)} etiqueta="Buscar mi control">
          <Icono nombre="buscar" tam={20} /> {perfil ? 'Cambiar de control' : 'Buscar mi control'}
        </Boton>
      </section>

      <section className="tarjeta vidrio-panel">
        <h2>
          <Icono nombre="wifi" tam={22} /> Google TV (WiFi)
        </h2>
        <p className={`estado ${conectado ? 'bien' : ''}`}>
          {conectado ? 'Conectado ✓' : control.googleTv === 'conectando' ? 'Conectando… mira el TV' : 'Desconectado'}
        </p>
        <div className="campo-ip">
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="IP del Google TV, ej: 192.168.1.50"
            inputMode="decimal"
            autoComplete="off"
          />
          {conectado ? (
            <Boton className="pastilla" accion={desconectarGoogleTv} etiqueta="Desconectar">
              Salir
            </Boton>
          ) : (
            <Boton
              className="pastilla destacada"
              accion={() => control.googleTv !== 'conectando' && conectarGoogleTv(ip)}
              etiqueta="Conectar"
            >
              {control.googleTv === 'conectando' ? '…' : 'Conectar'}
            </Boton>
          )}
        </div>
        <details>
          <summary>¿Cómo lo activo? (solo la primera vez)</summary>
          <ol>
            <li>
              En el Google TV entra a <b>Configuración → Sistema → Acerca de</b>.
            </li>
            <li>
              Baja hasta <b>Compilación del SO de Android TV</b> y presiona OK <b>7 veces</b> hasta que diga que eres
              desarrollador.
            </li>
            <li>
              Vuelve a <b>Sistema → Opciones para desarrolladores</b> y activa <b>Depuración por USB</b>.
            </li>
            <li>
              Mira la IP en <b>Configuración → Red e Internet → (tu WiFi)</b> y escríbela arriba.
            </li>
            <li>
              Toca <b>Conectar</b>. En el TV saldrá "¿Permitir depuración?": marca <b>Permitir siempre</b> y acepta.
            </li>
          </ol>
          <p>El celular y el Google TV deben estar en el mismo WiFi.</p>
        </details>
      </section>

      <section className="tarjeta vidrio-panel">
        <h2>
          <Icono nombre="engranaje" tam={22} /> Preferencias
        </h2>
        <p>Flechas, OK, Atrás e Inicio van por:</p>
        <div className="segmentos">
          <Opcion valor="auto" actual={control.rutaNavegacion} alElegir={(v) => cambiarAjuste('rutaNavegacion', v)}>
            Automático
          </Opcion>
          <Opcion valor="wifi" actual={control.rutaNavegacion} alElegir={(v) => cambiarAjuste('rutaNavegacion', v)}>
            Google TV
          </Opcion>
          <Opcion valor="ir" actual={control.rutaNavegacion} alElegir={(v) => cambiarAjuste('rutaNavegacion', v)}>
            Infrarrojo
          </Opcion>
        </div>
        <p className="pista">
          Automático: el volumen, canales y encendido van al TV por infrarrojo; la navegación va al Google TV si está
          conectado.
        </p>
        <label className="interruptor">
          <input
            type="checkbox"
            checked={control.vibracion}
            onChange={(e) => cambiarAjuste('vibracion', e.target.checked)}
          />
          <span />
          Vibrar al tocar
        </label>
      </section>

      <p className="pie">Control Aero · TK Digital Solutions{esApp ? '' : ' · vista previa web'}</p>

      {asistente && <AsistentePerfil cerrar={() => setAsistente(false)} />}
    </div>
  )
}
