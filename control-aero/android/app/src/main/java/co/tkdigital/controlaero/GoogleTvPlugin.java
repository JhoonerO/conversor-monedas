package co.tkdigital.controlaero;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
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
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

    /**
     * Busca en el WiFi aparatos Android TV / Google TV que se anuncien solos.
     * - "emparejar": aceptan emparejarse con un código en pantalla (como la app Google TV)
     * - "adb": tienen la depuración inalámbrica activada
     */
    @PluginMethod
    public void buscar(PluginCall call) {
        NsdManager nsd = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);
        if (nsd == null) {
            call.reject("Este celular no permite buscar en la red");
            return;
        }
        String[][] tipos = {
            { "_androidtvremote2._tcp.", "emparejar" },
            { "_adb-tls-connect._tcp.", "adb" },
            { "_adb._tcp.", "adb" },
        };
        Map<String, JSObject> encontrados = new LinkedHashMap<>();
        ArrayDeque<NsdServiceInfo> porResolver = new ArrayDeque<>();
        Map<String, String> tipoDe = new LinkedHashMap<>();
        List<NsdManager.DiscoveryListener> oyentes = new ArrayList<>();
        boolean[] resolviendo = { false };
        Handler principal = new Handler(Looper.getMainLooper());

        // Android solo deja resolver un servicio a la vez: los ponemos en fila
        Runnable[] siguiente = new Runnable[1];
        siguiente[0] = () -> {
            if (resolviendo[0] || porResolver.isEmpty()) return;
            resolviendo[0] = true;
            NsdServiceInfo servicio = porResolver.poll();
            nsd.resolveService(servicio, new NsdManager.ResolveListener() {
                @Override
                public void onResolveFailed(NsdServiceInfo s, int error) {
                    principal.post(() -> {
                        resolviendo[0] = false;
                        siguiente[0].run();
                    });
                }

                @Override
                public void onServiceResolved(NsdServiceInfo s) {
                    principal.post(() -> {
                        if (s.getHost() != null) {
                            String host = s.getHost().getHostAddress();
                            String tipo = tipoDe.get(s.getServiceType().replaceAll("^\\.|\\.$", ""));
                            JSObject aparato = encontrados.get(host);
                            if (aparato == null) {
                                aparato = new JSObject();
                                aparato.put("host", host);
                                aparato.put("nombre", s.getServiceName());
                                aparato.put("emparejar", false);
                                aparato.put("adb", false);
                                encontrados.put(host, aparato);
                            }
                            if ("emparejar".equals(tipo)) {
                                aparato.put("emparejar", true);
                                aparato.put("nombre", s.getServiceName());
                            } else {
                                aparato.put("adb", true);
                            }
                        }
                        resolviendo[0] = false;
                        siguiente[0].run();
                    });
                }
            });
        };

        for (String[] t : tipos) {
            tipoDe.put(t[0].replaceAll("^\\.|\\.$", ""), t[1]);
            NsdManager.DiscoveryListener oyente = new NsdManager.DiscoveryListener() {
                @Override
                public void onDiscoveryStarted(String tipo) {}

                @Override
                public void onDiscoveryStopped(String tipo) {}

                @Override
                public void onStartDiscoveryFailed(String tipo, int error) {}

                @Override
                public void onStopDiscoveryFailed(String tipo, int error) {}

                @Override
                public void onServiceLost(NsdServiceInfo s) {}

                @Override
                public void onServiceFound(NsdServiceInfo s) {
                    principal.post(() -> {
                        porResolver.add(s);
                        siguiente[0].run();
                    });
                }
            };
            try {
                nsd.discoverServices(t[0], NsdManager.PROTOCOL_DNS_SD, oyente);
                oyentes.add(oyente);
            } catch (Exception ignorado) {
                // algunos tipos no se pueden buscar en ciertos celulares
            }
        }

        // Buscamos unos segundos y devolvemos lo que haya aparecido
        principal.postDelayed(() -> {
            for (NsdManager.DiscoveryListener o : oyentes) {
                try {
                    nsd.stopServiceDiscovery(o);
                } catch (Exception ignorado) {
                }
            }
            JSArray lista = new JSArray();
            for (JSObject a : encontrados.values()) lista.put(a);
            JSObject respuesta = new JSObject();
            respuesta.put("aparatos", lista);
            call.resolve(respuesta);
        }, 7000);
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
