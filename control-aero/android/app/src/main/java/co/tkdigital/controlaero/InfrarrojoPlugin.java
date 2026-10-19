package co.tkdigital.controlaero;

import android.content.Context;
import android.hardware.ConsumerIrManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Envía señales por el emisor infrarrojo del celular (Xiaomi, Redmi, Poco...).
 * Desde JavaScript se llama con: Infrarrojo.transmitir({ frecuencia, patron })
 */
@CapacitorPlugin(name = "Infrarrojo")
public class InfrarrojoPlugin extends Plugin {

    private ConsumerIrManager emisor;

    @Override
    public void load() {
        emisor = (ConsumerIrManager) getContext().getSystemService(Context.CONSUMER_IR_SERVICE);
    }

    private boolean hayEmisor() {
        return emisor != null && emisor.hasIrEmitter();
    }

    @PluginMethod
    public void disponible(PluginCall call) {
        JSObject respuesta = new JSObject();
        respuesta.put("disponible", hayEmisor());
        call.resolve(respuesta);
    }

    @PluginMethod
    public void transmitir(PluginCall call) {
        if (!hayEmisor()) {
            call.reject("Este celular no tiene emisor infrarrojo");
            return;
        }
        Integer frecuencia = call.getInt("frecuencia");
        JSArray patron = call.getArray("patron");
        if (frecuencia == null || patron == null || patron.length() == 0) {
            call.reject("Señal infrarroja inválida");
            return;
        }
        try {
            int[] tiempos = new int[patron.length()];
            for (int i = 0; i < tiempos.length; i++) tiempos[i] = patron.getInt(i);
            // transmit() espera a que termine la señal; los plugins corren fuera
            // del hilo de la interfaz, así que la app no se congela
            emisor.transmit(frecuencia, tiempos);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo enviar la señal: " + e.getMessage());
        }
    }
}
