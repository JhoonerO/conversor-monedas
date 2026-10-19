import { useState } from 'react'
import { Boton } from './Boton.jsx'
import { Icono } from './Iconos.jsx'
import {
  useControl,
  cambiarAjuste,
  conectarGoogleTv,
  desconectarGoogleTv,
  DISPOSITIVOS,
} from '../servicios/control.js'
import { esApp } from '../servicios/nativo.js'

function Interruptor({ activo, alCambiar, children }) {
  return (
    <label className="interruptor">
      <input type="checkbox" checked={activo} onChange={(e) => alCambiar(e.target.checked)} />
      <span />
      {children}
    </label>
  )
}

export function PantallaAjustes() {
  const control = useControl()
  const [ip, setIp] = useState(control.ipGoogleTv)
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
          <Icono nombre="infrarrojo" tam={22} /> Mis controles
        </h2>
        <p className={`estado ${control.irDisponible === false ? 'mal' : 'bien'}`}>{estadoIr}</p>
        {DISPOSITIVOS.map((d) => (
          <div key={d.id} className="dispositivo-tarjeta">
            <span className={`muestra ${d.tema}`} />
            <div>
              <strong>{d.nombre}</strong>
              <small>
                Código {d.perfil.marca} {d.perfil.modelo} · tema {d.tema}
              </small>
            </div>
          </div>
        ))}
        <Interruptor activo={control.volumenAlTv} alCambiar={(v) => cambiarAjuste('volumenAlTv', v)}>
          El volumen y el silencio siempre van al TV
        </Interruptor>
        <p className="pista">Cambia entre TV y Deco con los botones de arriba a la derecha.</p>
      </section>

      <section className="tarjeta vidrio-panel">
        <h2>
          <Icono nombre="wifi" tam={22} /> Decodificador por WiFi (opcional)
        </h2>
        <p className="pista">
          No hace falta para los botones ni el touchpad. Sirve para el <b>teclado</b> y para abrir Netflix,
          YouTube y demás apps directo.
        </p>
        <p className={`estado ${conectado ? 'bien' : ''}`}>
          {conectado ? 'Conectado ✓' : control.googleTv === 'conectando' ? 'Conectando… mira el TV' : 'Desconectado'}
        </p>
        <div className="campo-ip">
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="IP del decodificador, ej: 192.168.1.50"
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
              En el decodificador entra a <b>Configuración → Acerca de</b> (a veces está en{' '}
              <b>Preferencias del dispositivo</b>).
            </li>
            <li>
              Baja hasta <b>Número de compilación</b> y presiona OK <b>7 veces</b> hasta que diga que eres
              desarrollador.
            </li>
            <li>
              Entra a <b>Opciones para desarrolladores</b> y activa <b>Depuración por USB</b> (o{' '}
              <b>Depuración ADB por red</b> si aparece).
            </li>
            <li>
              Mira la IP en <b>Configuración → Red</b> y escríbela arriba.
            </li>
            <li>
              Toca <b>Conectar</b>. Si en el TV sale "¿Permitir depuración?", marca <b>Permitir siempre</b> y
              acepta.
            </li>
          </ol>
          <p>El celular y el decodificador deben estar en el mismo WiFi.</p>
        </details>
      </section>

      <section className="tarjeta vidrio-panel">
        <h2>
          <Icono nombre="engranaje" tam={22} /> Preferencias
        </h2>
        <Interruptor activo={control.vibracion} alCambiar={(v) => cambiarAjuste('vibracion', v)}>
          Vibrar al tocar
        </Interruptor>
      </section>

      <p className="pie">Control Aero · TK Digital Solutions{esApp ? '' : ' · vista previa web'}</p>
    </div>
  )
}
