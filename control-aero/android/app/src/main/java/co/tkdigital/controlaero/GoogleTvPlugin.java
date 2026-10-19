package co.tkdigital.controlaero;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import dadb.AdbKeyPair;
import dadb.AdbShellPacket;
import dadb.AdbShellResponse;
import dadb.AdbShellStream;
import dadb.Dadb;
import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Controla un Google TV / Android TV por WiFi usando ADB (depuración de Android).
 *
 * Mantiene una sola consola abierta en el TV y le escribe órdenes como
 * "cmd input keyevent 19", así cada botón llega en milisegundos.
 */
@CapacitorPlugin(name = "GoogleTv")
public class GoogleTvPlugin extends Plugin {

    private static final int SEGUNDOS_PARA_ACEPTAR = 60;

    // Todo lo de red va en un solo hilo para que las teclas lleguen en orden
    private final ExecutorService hilo = Executors.newSingleThreadExecutor();
    private final ExecutorService hiloConexion = Executors.newSingleThreadExecutor();

    private Dadb dadb;
    private AdbShellStream consola;
    private String host;
    private int puerto;
    private String comandoInput = "input";

    @PluginMethod
    public void conectar(PluginCall call) {
        String nuevoHost = call.getString("host");
        int nuevoPuerto = call.getInt("puerto", 5555);
        if (nuevoHost == null || nuevoHost.trim().isEmpty()) {
            call.reject("Falta la IP del Google TV");
            return;
        }
        hilo.execute(() -> {
            try {
                abrir(nuevoHost.trim(), nuevoPuerto);
                call.resolve();
            } catch (TimeoutException e) {
                cerrar();
                call.reject("El TV no respondió. ¿Aceptaste el permiso de depuración en la pantalla?");
            } catch (Exception e) {
                cerrar();
                call.reject(explicar(e));
            }
        });
    }

    @PluginMethod
    public void enviar(PluginCall call) {
        String tipo = call.getString("tipo", "");
        hilo.execute(() -> {
            if (dadb == null) {
                call.reject("No hay conexión con el Google TV");
                return;
            }
            try {
                ejecutar(tipo, call);
                call.resolve();
            } catch (AppNoInstalada | IllegalArgumentException e) {
                // No es un problema de conexión: la app de JS no debe desconectarse
                call.reject(e.getMessage(), "SIN_DESCONECTAR");
            } catch (Exception e) {
                // La conexión se cayó (TV apagado, WiFi...). Intentamos una vez más.
                try {
                    abrir(host, puerto);
                    ejecutar(tipo, call);
                    call.resolve();
                } catch (Exception otra) {
                    cerrar();
                    call.reject(explicar(otra));
                }
            }
        });
    }

    @PluginMethod
    public void desconectar(PluginCall call) {
        hilo.execute(() -> {
            cerrar();
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        hilo.execute(this::cerrar);
        hilo.shutdown();
        hiloConexion.shutdownNow();
    }

    private void ejecutar(String tipo, PluginCall call) throws Exception {
        switch (tipo) {
            case "tecla":
                escribir(comandoInput + " keyevent " + call.getInt("codigo", 0));
                break;
            case "texto":
                escribir(comandoInput + " text " + textoParaConsola(call.getString("texto", "")));
                break;
            case "app":
                abrirApp(call.getString("paquete", ""));
                break;
            default:
                throw new IllegalArgumentException("Orden desconocida: " + tipo);
        }
    }

    // ---------- Conexión ----------

    private void abrir(String nuevoHost, int nuevoPuerto) throws Exception {
        cerrar();
        host = nuevoHost;
        puerto = nuevoPuerto;
        AdbKeyPair llaves = llaves();

        // La primera vez el TV pregunta "¿Permitir depuración?"; esperamos
        // a que la persona acepte, pero sin quedarnos colgados para siempre
        Future<Dadb> intento = hiloConexion.submit(() -> {
            Dadb nuevo = Dadb.create(nuevoHost, nuevoPuerto, llaves, 5000, 0);
            AdbShellResponse prueba = nuevo.shell("echo ok");
            if (!prueba.getOutput().contains("ok")) throw new IllegalStateException("Respuesta inesperada del TV");
            return nuevo;
        });
        try {
            dadb = intento.get(SEGUNDOS_PARA_ACEPTAR, TimeUnit.SECONDS);
        } catch (java.util.concurrent.ExecutionException e) {
            throw e.getCause() instanceof Exception ? (Exception) e.getCause() : e;
        } catch (TimeoutException e) {
            intento.cancel(true);
            throw e;
        }

        // "cmd input" es mucho más rápido que "input" (Android 12+)
        AdbShellResponse rapido = dadb.shell("cmd input keyevent 0");
        boolean sirveCmd = rapido.getExitCode() == 0 && !rapido.getAllOutput().toLowerCase().contains("unknown")
                && !rapido.getAllOutput().toLowerCase().contains("can't find");
        comandoInput = sirveCmd ? "cmd input" : "input";

        try {
            consola = dadb.openShell("");
            AdbShellStream lector = consola;
            // Hay que ir leyendo lo que responde la consola para que no se llene
            Thread vaciar = new Thread(() -> {
                try {
                    while (true) {
                        AdbShellPacket paquete = lector.read();
                        if (paquete instanceof AdbShellPacket.Exit) break;
                    }
                } catch (Exception ignorado) {
                    // la consola se cerró
                }
            }, "consola-google-tv");
            vaciar.setDaemon(true);
            vaciar.start();
        } catch (Exception e) {
            consola = null; // usaremos un comando por conexión, más lento pero funciona
        }
    }

    private void escribir(String comando) throws Exception {
        if (consola != null) consola.write(comando + "\n");
        else dadb.shell(comando);
    }

    private void abrirApp(String paquete) throws Exception {
        if (!paquete.matches("[a-zA-Z0-9._]+")) throw new AppNoInstalada("Paquete inválido");
        AdbShellResponse r = dadb.shell("monkey -p " + paquete + " -c android.intent.category.LEANBACK_LAUNCHER 1");
        if (r.getAllOutput().contains("No activities found")) {
            r = dadb.shell("monkey -p " + paquete + " -c android.intent.category.LAUNCHER 1");
            if (r.getAllOutput().contains("No activities found")) {
                throw new AppNoInstalada("Esa app no está instalada en el Google TV");
            }
        }
    }

    private void cerrar() {
        try {
            if (consola != null) consola.close();
        } catch (Exception ignorado) {
        }
        try {
            if (dadb != null) dadb.close();
        } catch (Exception ignorado) {
        }
        consola = null;
        dadb = null;
    }

    private AdbKeyPair llaves() throws Exception {
        File privada = new File(getContext().getFilesDir(), "adbkey");
        File publica = new File(getContext().getFilesDir(), "adbkey.pub");
        if (!privada.exists() || !publica.exists()) AdbKeyPair.generate(privada, publica);
        return AdbKeyPair.read(privada, publica);
    }

    // ---------- Ayudas ----------

    /** "input text" no acepta espacios: se escriben como %s. Todo va entre comillas simples. */
    static String textoParaConsola(String texto) {
        String sinEspacios = texto.replace(" ", "%s");
        return "'" + sinEspacios.replace("'", "'\\''") + "'";
    }

    private static String explicar(Exception e) {
        String m = String.valueOf(e.getMessage());
        if (e instanceof java.net.ConnectException || m.contains("ECONNREFUSED") || m.contains("refused")) {
            return "El TV rechazó la conexión. Activa la Depuración por USB en Opciones para desarrolladores.";
        }
        if (e instanceof java.net.SocketTimeoutException || e instanceof java.net.NoRouteToHostException
                || m.contains("EHOSTUNREACH") || m.contains("timed out")) {
            return "No encuentro el TV en esa IP. Revisa que estén en el mismo WiFi.";
        }
        if (e instanceof java.net.UnknownHostException) return "Esa IP no es válida";
        return "No se pudo conectar: " + m;
    }

    private static class AppNoInstalada extends Exception {
        AppNoInstalada(String mensaje) {
            super(mensaje);
        }
    }
}
