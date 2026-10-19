import { useState } from 'react'
import { Boton } from './Boton.jsx'
import { Icono } from './Iconos.jsx'
import { AsistentePerfil } from './AsistentePerfil.jsx'
import {
  useControl,
  cambiarAjuste,
  conectarGoogleTv,
  desconectarGoogleTv,
  DISPOSITIVOS,
  perfilDe,
  buscarEnRed,
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

function ResultadosBusqueda({ busqueda, alElegir }) {
  if (busqueda?.estado !== 'listo') return null
  if (busqueda.aparatos.length === 0) {
    return (
      <p className="pista">
        No apareció nada. Tu decodificador no se anuncia en la red: no acepta emparejarse con código. Usa la conexión
        manual de abajo (activar depuración una sola vez).
      </p>
    )
  }
  return busqueda.aparatos.map((a) => (
    <div key={a.host} className="dispositivo-tarjeta">
      <span className="muestra azul" />
      <div>
        <strong>{a.nombre}</strong>
        <small>
          {a.host}
          {a.emparejar ? ' · acepta código en pantalla ✓' : ''}
          {a.adb ? ' · depuración activa' : ''}
        </small>
      </div>
      {a.adb && (
        <Boton className="pastilla" accion={() => alElegir(a.host)} etiqueta={`Conectar a ${a.nombre}`}>
          Usar
        </Boton>
      )}
    </div>
  ))
}

export function PantallaAjustes() {
  const control = useControl()
  const [ip, setIp] = useState(control.ipGoogleTv)
  const [buscador, setBuscador] = useState(false)
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
        {DISPOSITIVOS.map((d) => {
          const p = perfilDe(d.id)
          return (
            <div key={d.id} className="dispositivo-tarjeta">
              <span className={`muestra ${d.tema}`} />
              <div>
                <strong>{d.nombre}</strong>
                <small>{p ? `Código ${p.marca} ${p.modelo}` : 'Sin código todavía'}</small>
              </div>
            </div>
          )
        })}
        <Boton className="pastilla ancha destacada" accion={() => setBuscador(true)} etiqueta="Buscar el código del TV">
          <Icono nombre="buscar" tam={20} /> {perfilDe('tv') ? 'Cambiar código del TV' : 'Buscar código del TV'}
        </Boton>
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
        <Boton
          className="pastilla ancha"
          accion={() => control.busqueda?.estado !== 'buscando' && buscarEnRed()}
          etiqueta="Buscar en mi red"
        >
          <Icono nombre="buscar" tam={20} />
          {control.busqueda?.estado === 'buscando' ? 'Buscando en tu WiFi…' : 'Buscar en mi red'}
        </Boton>
        <ResultadosBusqueda
          busqueda={control.busqueda}
          alElegir={(host) => {
            setIp(host)
            conectarGoogleTv(host)
          }}
        />
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

      {buscador && <AsistentePerfil cerrar={() => setBuscador(false)} />}
    </div>
  )
}
