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
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Controla el TV y el decodificador por WiFi con el protocolo de Google TV
 * (emparejamiento con código en pantalla). Cada aparato se identifica por su IP.
 */
@CapacitorPlugin(name = "GoogleTv")
public class GoogleTvPlugin extends Plugin {

    // Todo lo de red va en un solo hilo para que las teclas lleguen en orden
    private final ExecutorService hilo = Executors.newSingleThreadExecutor();
    private final Map<String, AndroidTvRemoto> aparatos = new HashMap<>();

    private AndroidTvRemoto aparato(String host) {
        return aparatos.computeIfAbsent(host, h -> new AndroidTvRemoto(getContext().getFilesDir()));
    }

    /** Llama a la acción en el hilo de red y responde a JavaScript. */
    private void enHilo(PluginCall call, Accion accion) {
        String host = call.getString("host", "").trim();
        if (host.isEmpty()) {
            call.reject("Falta la IP");
            return;
        }
        hilo.execute(() -> {
            try {
                accion.ejecutar(aparato(host));
                call.resolve();
            } catch (AndroidTvRemoto.SinEmparejar e) {
                call.reject(e.getMessage(), "SIN_EMPAREJAR");
            } catch (AndroidTvRemoto.CodigoInvalido e) {
                call.reject(e.getMessage(), "CODIGO_INVALIDO");
            } catch (Exception e) {
                call.reject(explicar(e));
            }
        });
    }

    private interface Accion {
        void ejecutar(AndroidTvRemoto a) throws Exception;
    }

    @PluginMethod
    public void emparejar(PluginCall call) {
        enHilo(call, a -> a.iniciarEmparejamiento(call.getString("host").trim()));
    }

    @PluginMethod
    public void confirmarCodigo(PluginCall call) {
        enHilo(call, a -> a.confirmarCodigo(call.getString("codigo", "")));
    }

    @PluginMethod
    public void cancelarEmparejamiento(PluginCall call) {
        enHilo(call, AndroidTvRemoto::cancelarEmparejamiento);
    }

    @PluginMethod
    public void conectar(PluginCall call) {
        enHilo(call, a -> a.conectar(call.getString("host").trim()));
    }

    @PluginMethod
    public void desconectar(PluginCall call) {
        enHilo(call, AndroidTvRemoto::desconectar);
    }

    @PluginMethod
    public void enviar(PluginCall call) {
        String host = call.getString("host", "").trim();
        enHilo(call, a -> {
            try {
                ejecutar(a, call);
            } catch (java.io.IOException cortada) {
                // La conexión se cayó (aparato dormido, WiFi...): reconectamos una vez
                a.conectar(host);
                ejecutar(a, call);
            }
        });
    }

    private static void ejecutar(AndroidTvRemoto a, PluginCall call) throws Exception {
        switch (call.getString("tipo", "")) {
            case "tecla":
                a.tecla(call.getInt("codigo", 0));
                break;
            case "texto":
                a.texto(call.getString("texto", ""));
                break;
            case "enlace":
                a.abrirEnlace(call.getString("enlace", ""));
                break;
            default:
                throw new IllegalArgumentException("Orden desconocida");
        }
    }

    public void buscar(PluginCall call) {
        NsdManager nsd = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);
        if (nsd == null) {
            call.reject("Este celular no permite buscar en la red");
            return;
        }
        String[][] tipos = { { "_androidtvremote2._tcp.", "emparejar" } };
        Map<String, JSObject> encontrados = new LinkedHashMap<>();
        ArrayDeque<NsdServiceInfo> porResolver = new ArrayDeque<>();
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
                            JSObject aparato = encontrados.get(host);
                            if (aparato == null) {
                                aparato = new JSObject();
                                aparato.put("host", host);
                                aparato.put("nombre", s.getServiceName());
                                encontrados.put(host, aparato);
                            }
                        }
                        resolviendo[0] = false;
                        siguiente[0].run();
                    });
                }
            });
        };

        for (String[] t : tipos) {
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


    @Override
    protected void handleOnDestroy() {
        hilo.execute(() -> {
            for (AndroidTvRemoto a : aparatos.values()) {
                a.desconectar();
                a.cancelarEmparejamiento();
            }
        });
        hilo.shutdown();
    }

    private static String explicar(Exception e) {
        String m = String.valueOf(e.getMessage());
        if (e instanceof java.net.ConnectException || m.contains("ECONNREFUSED") || m.contains("refused")) {
            return "El aparato rechazó la conexión. ¿Está encendido?";
        }
        if (e instanceof java.net.SocketTimeoutException || e instanceof java.net.NoRouteToHostException
                || m.contains("EHOSTUNREACH") || m.contains("timed out")) {
            return "No encuentro el aparato en esa IP. Revisa que estén en el mismo WiFi.";
        }
        return m;
    }
}
