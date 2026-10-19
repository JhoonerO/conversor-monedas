import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Boton } from './Boton.jsx'
import { Icono } from './Iconos.jsx'
import { AsistentePerfil } from './AsistentePerfil.jsx'
import {
  useControl,
  cambiarAjuste,
  DISPOSITIVOS,
  perfilDe,
  buscarEnRed,
  empezarEmparejamiento,
  confirmarCodigo,
  cancelarEmparejamiento,
  conectarWifi,
  olvidarWifi,
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

const TEXTO_WIFI = { conectado: 'conectado ✓', conectando: 'conectando…', desconectado: 'desconectado' }

function Aparato({ d, control }) {
  const ip = d.id === 'tv' ? control.ipTv : control.ipDeco
  const wifi = control.wifi[d.id]
  const p = perfilDe(d.id)
  return (
    <div className="dispositivo-tarjeta">
      <span className={`muestra ${d.tema}`} />
      <div>
        <strong>{d.nombre}</strong>
        <small>WiFi: {ip ? `${TEXTO_WIFI[wifi]} · ${ip}` : 'sin emparejar'}</small>
        <small>Infrarrojo: {p ? `${p.marca} ${p.modelo}` : 'sin código'}</small>
      </div>
      {ip && wifi === 'desconectado' && (
        <Boton className="pastilla" accion={() => conectarWifi(d.id)} etiqueta={`Reconectar ${d.nombre}`}>
          Reconectar
        </Boton>
      )}
      {ip && wifi === 'conectado' && (
        <Boton className="pastilla" accion={() => olvidarWifi(d.id)} etiqueta={`Olvidar ${d.nombre}`}>
          Olvidar
        </Boton>
      )}
    </div>
  )
}

function BotonesEmparejar({ host }) {
  return (
    <div className="fila-botones">
      {DISPOSITIVOS.map((d) => (
        <Boton
          key={d.id}
          className={`pastilla ancha emparejar-${d.tema}`}
          accion={() => empezarEmparejamiento(d.id, host)}
          etiqueta={`Emparejar como ${d.nombre}`}
        >
          <Icono nombre={d.id === 'tv' ? 'tv' : 'deco'} tam={18} /> Es el {d.corto}
        </Boton>
      ))}
    </div>
  )
}

function HojaCodigo({ emparejando }) {
  const [codigo, setCodigo] = useState('')
  const d = DISPOSITIVOS.find((x) => x.id === emparejando.dispositivo)
  const listo = /^[0-9A-F]{6}$/.test(codigo)

  return createPortal(
    <div className="hoja-fondo">
      <div className="hoja vidrio-panel" role="dialog" aria-label="Escribir código">
        <div className="hoja-titulo">
          <strong>Emparejar {d.nombre.toLowerCase()}</strong>
          <Boton className="redondo chico" accion={cancelarEmparejamiento} etiqueta="Cancelar">
            <Icono nombre="cerrar" tam={18} />
          </Boton>
        </div>
        {emparejando.paso === 'iniciando' ? (
          <p className="pista">Conectando con {emparejando.host}… mira la pantalla.</p>
        ) : (
          <>
            <p className="pista">
              En la pantalla apareció un <b>código de 6 caracteres</b> (números y letras de la A a la F). Escríbelo
              aquí:
            </p>
            <div className="campo-texto vidrio-panel">
              <input
                className="entrada-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && listo && confirmarCodigo(codigo)}
                placeholder="A1B2C3"
                autoCapitalize="characters"
                autoComplete="off"
                autoFocus
              />
            </div>
            <Boton
              className="pastilla ancha destacada grande"
              accion={() => listo && emparejando.paso === 'codigo' && confirmarCodigo(codigo)}
              etiqueta="Confirmar código"
            >
              <Icono nombre="check" tam={22} grosor={2.6} />
              {emparejando.paso === 'confirmando' ? 'Verificando…' : 'Confirmar'}
            </Boton>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function PantallaAjustes() {
  const control = useControl()
  const [buscador, setBuscador] = useState(false)
  const [ipManual, setIpManual] = useState('')
  const { busqueda } = control

  return (
    <div className="pantalla pantalla-ajustes">
      <section className="tarjeta vidrio-panel">
        <h2>
          <Icono nombre="tv" tam={22} /> Mis aparatos
        </h2>
        {DISPOSITIVOS.map((d) => (
          <Aparato key={d.id} d={d} control={control} />
        ))}
        <Interruptor activo={control.volumenAlTv} alCambiar={(v) => cambiarAjuste('volumenAlTv', v)}>
          El volumen y el silencio siempre van al TV
        </Interruptor>
      </section>

      <section className="tarjeta vidrio-panel">
        <h2>
          <Icono nombre="wifi" tam={22} /> Emparejar por WiFi
        </h2>
        <p className="pista">
          La mejor forma: funciona sin apuntar, con touchpad, teclado y apps. El celular y los aparatos deben estar en
          el mismo WiFi.
        </p>
        <Boton
          className="pastilla ancha destacada"
          accion={() => busqueda?.estado !== 'buscando' && buscarEnRed()}
          etiqueta="Buscar en mi red"
        >
          <Icono nombre="buscar" tam={20} />
          {busqueda?.estado === 'buscando' ? 'Buscando en tu WiFi… (7 s)' : 'Buscar en mi red'}
        </Boton>
        {busqueda?.estado === 'listo' && busqueda.aparatos.length === 0 && (
          <p className="pista">No apareció nada. Revisa que estén encendidos y en el mismo WiFi, y busca otra vez.</p>
        )}
        {busqueda?.estado === 'listo' &&
          busqueda.aparatos.map((a) => (
            <div key={a.host} className="resultado-red">
              <div>
                <strong>{a.nombre}</strong>
                <small>{a.host}</small>
              </div>
              <BotonesEmparejar host={a.host} />
            </div>
          ))}
        <details>
          <summary>¿No aparece? Escribir la IP a mano</summary>
          <div className="campo-ip">
            <input
              value={ipManual}
              onChange={(e) => setIpManual(e.target.value.trim())}
              placeholder="ej: 192.168.1.11"
              inputMode="decimal"
              autoComplete="off"
            />
          </div>
          {ipManual && <BotonesEmparejar host={ipManual} />}
        </details>
      </section>

      <section className="tarjeta vidrio-panel">
        <h2>
          <Icono nombre="infrarrojo" tam={22} /> Infrarrojo (respaldo)
        </h2>
        <p className={`estado ${control.irDisponible === false ? 'mal' : 'bien'}`}>
          {control.irDisponible === false
            ? 'Este celular no tiene emisor infrarrojo'
            : control.irDisponible
              ? 'Emisor infrarrojo listo ✓'
              : 'Vista previa: el infrarrojo funciona en la app instalada'}
        </p>
        <p className="pista">Si el WiFi falla, los botones salen por infrarrojo apuntando al aparato.</p>
        <Boton className="pastilla ancha" accion={() => setBuscador(true)} etiqueta="Buscar el código del TV">
          <Icono nombre="buscar" tam={20} /> {perfilDe('tv') ? 'Cambiar código infrarrojo del TV' : 'Buscar código infrarrojo del TV'}
        </Boton>
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
      {control.emparejando && <HojaCodigo key={control.emparejando.host} emparejando={control.emparejando} />}
    </div>
  )
}
