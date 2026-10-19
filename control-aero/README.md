# Control Aero 📺💧

Control remoto estilo **Frutiger Aero** para Android, hecho con React + Vite + Capacitor.

- **Infrarrojo** (celulares Xiaomi/Redmi/Poco con emisor IR): encender, volumen, silencio, canales, fuente y números del TV.
- **WiFi** (Google TV / Android TV con depuración activada): flechas, OK, atrás, inicio, touchpad, teclado y abrir Netflix, YouTube, Prime Video y Disney+.

## Pantallas

| Pestaña | Qué hace |
|---|---|
| Control | Cruceta, volumen, canales, multimedia, apps y teclado numérico |
| Touchpad | Desliza = flechas, toca = OK, mantén = atrás. Barra derecha = volumen |
| Teclado | Escribe en el buscador del TV en vivo |
| Ajustes | Buscar el control infrarrojo del TV, conectar el Google TV y preferencias |

## Estructura

```
control-aero/
├── src/
│   ├── App.jsx                 # encabezado, pestañas y avisos
│   ├── estilos.css             # todo el estilo Frutiger Aero
│   ├── componentes/            # pantallas, botones, íconos y fondo
│   ├── servicios/
│   │   ├── control.js          # decide si cada botón va por infrarrojo o WiFi
│   │   └── nativo.js           # puente con el código Android
│   └── ir/
│       ├── perfiles.json       # 60 controles de TV (generado)
│       ├── protocolos.js       # NEC, Samsung, RC5, RC6 y Sony → señal infrarroja
│       └── teclas.js           # catálogo de botones
├── scripts/generar-perfiles-ir.mjs
└── android/app/src/main/java/co/tkdigital/controlaero/
    ├── InfrarrojoPlugin.java   # usa el emisor IR del celular
    └── GoogleTvPlugin.java     # ADB por WiFi hacia el Google TV
```

## Comandos (PowerShell)

```powershell
cd control-aero
npm install
npm run dev        # vista previa en el navegador (el infrarrojo solo funciona en el celular)
npm run android    # compila la web y la copia al proyecto Android
```

Para generar el APK sin instalar nada: cada `git push` que toque `control-aero/` lo compila en
GitHub → pestaña **Actions** → **APK Control Aero** → **Artifacts** → `control-aero-apk`.

## Primera configuración

1. **Infrarrojo:** Ajustes → *Buscar mi control*. Apunta al TV y prueba perfiles hasta que el TV se silencie.
2. **Google TV:** activa *Opciones para desarrolladores* → *Depuración por USB* en el Google TV,
   escribe su IP en Ajustes → *Conectar* y acepta el permiso en la pantalla del TV.

Los perfiles infrarrojos vienen de [Flipper-IRDB](https://github.com/Lucaslhm/Flipper-IRDB).
No hay códigos publicados de Kalley, por eso el asistente prueba marcas con controles parecidos.
