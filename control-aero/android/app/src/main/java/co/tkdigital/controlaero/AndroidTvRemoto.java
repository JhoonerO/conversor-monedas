package co.tkdigital.controlaero;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.Principal;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.KeyManager;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509KeyManager;
import javax.net.ssl.X509TrustManager;

/**
 * Protocolo oficial "Android TV Remote" (v2), el mismo que usa la app Google TV:
 *  1. Emparejar (puerto 6467): el TV muestra un código y la persona lo escribe.
 *  2. Controlar (puerto 6466): se mandan teclas y se abren apps.
 * La "identidad" del celular es un certificado que se crea una sola vez y se
 * guarda: así el TV lo recuerda y no hay que volver a emparejar.
 */
class AndroidTvRemoto {

    private static final int PUERTO_EMPAREJAR = 6467;
    private static final int PUERTO_CONTROL = 6466;

    private final File carpeta;
    private PrivateKey clave;
    private X509Certificate certificado;

    private SSLSocket emparejando;
    private SSLSocket control;
    private OutputStream salidaControl;

    AndroidTvRemoto(File carpeta) {
        this.carpeta = carpeta;
    }

    // ---------- Emparejar ----------

    /** Abre el emparejamiento: al terminar, el TV ya muestra el código en pantalla. */
    synchronized void iniciarEmparejamiento(String host) throws Exception {
        cancelarEmparejamiento();
        emparejando = abrirTls(host, PUERTO_EMPAREJAR);
        enviarEmparejamiento(new Pb().msg(10, new Pb().str(1, "atvremote").str(2, "Control Aero")));
        esperarOk(leer(emparejando.getInputStream()));

        Pb hexa6 = new Pb().num(1, 3).num(2, 6); // código hexadecimal de 6 símbolos
        enviarEmparejamiento(new Pb().msg(20, new Pb().msg(1, hexa6).num(3, 1)));
        esperarOk(leer(emparejando.getInputStream()));

        enviarEmparejamiento(new Pb().msg(30, new Pb().msg(1, hexa6).num(2, 1)));
        esperarOk(leer(emparejando.getInputStream()));
    }

    /** Envía el código que muestra el TV. Si es correcto, el celular queda emparejado. */
    synchronized void confirmarCodigo(String codigo) throws Exception {
        if (emparejando == null) throw new IllegalStateException("Primero toca Emparejar");
        codigo = codigo.trim().toUpperCase(Locale.ROOT);
        if (!codigo.matches("[0-9A-F]{6}")) throw new CodigoInvalido("El código tiene 6 letras/números (0-9, A-F)");

        RSAPublicKey nuestra = (RSAPublicKey) certificado.getPublicKey();
        RSAPublicKey delTv = (RSAPublicKey) emparejando.getSession().getPeerCertificates()[0].getPublicKey();
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        sha.update(sinSigno(nuestra.getModulus()));
        sha.update(sinSigno(nuestra.getPublicExponent()));
        sha.update(sinSigno(delTv.getModulus()));
        sha.update(sinSigno(delTv.getPublicExponent()));
        sha.update(hex(codigo.substring(2)));
        byte[] secreto = sha.digest();
        // El primer par del código es una comprobación: así sabemos si se escribió mal
        if ((secreto[0] & 0xFF) != Integer.parseInt(codigo.substring(0, 2), 16)) {
            throw new CodigoInvalido("Ese código no coincide. Revisa las letras en el TV");
        }

        enviarEmparejamiento(new Pb().bytes(40, new Pb().bytes(1, secreto).aBytes()));
        try {
            esperarOk(leer(emparejando.getInputStream()));
        } finally {
            cancelarEmparejamiento();
        }
    }

    synchronized void cancelarEmparejamiento() {
        cerrarSilencio(emparejando);
        emparejando = null;
    }

    private void enviarEmparejamiento(Pb cuerpo) throws IOException {
        // Todo mensaje de emparejamiento lleva versión 2 y estado 200 (OK)
        Pb mensaje = new Pb().num(1, 2).num(2, 200);
        mensaje.agregar(cuerpo);
        escribir(emparejando.getOutputStream(), mensaje.aBytes());
    }

    private static void esperarOk(Map<Integer, List<Object>> respuesta) throws IOException {
        long estado = Pb.numero(respuesta, 2, 0);
        if (estado != 200) {
            throw new IOException(estado == 402 ? "El TV rechazó el código" : "El TV respondió con error " + estado);
        }
    }

    // ---------- Controlar ----------

    synchronized void conectar(String host) throws Exception {
        desconectar();
        SSLSocket s;
        try {
            s = abrirTls(host, PUERTO_CONTROL);
        } catch (javax.net.ssl.SSLException e) {
            throw new SinEmparejar();
        }
        control = s;
        salidaControl = s.getOutputStream();
        CountDownLatch listo = new CountDownLatch(1);
        InputStream entrada = s.getInputStream();

        Thread lector = new Thread(() -> {
            try {
                while (true) {
                    Map<Integer, List<Object>> m = leer(entrada);
                    if (m.containsKey(1)) {
                        // El TV pregunta quiénes somos
                        Pb info = new Pb().str(1, "Control Aero").str(2, "TK Digital").num(3, 1).str(4, "1")
                                .str(5, "atvremote").str(6, "1.0.0");
                        escribirControl(new Pb().msg(1, new Pb().num(1, 622).msg(2, info)));
                    } else if (m.containsKey(2)) {
                        escribirControl(new Pb().msg(2, new Pb().num(1, 622)));
                        listo.countDown();
                    } else if (m.containsKey(8)) {
                        // Ping: si no respondemos, el TV corta la conexión
                        Map<Integer, List<Object>> ping = Pb.leer((byte[]) m.get(8).get(0));
                        escribirControl(new Pb().msg(9, new Pb().num(1, Pb.numero(ping, 1, 0))));
                    }
                }
            } catch (Exception fin) {
                cerrarSilencio(s); // así sabemos que la conexión terminó
                listo.countDown();
            }
        }, "android-tv-remoto");
        lector.setDaemon(true);
        lector.start();

        listo.await(8, TimeUnit.SECONDS);
        if (control == null || control.isClosed()) throw new SinEmparejar();
    }

    boolean conectado() {
        return control != null && !control.isClosed();
    }

    void tecla(int codigo) throws IOException {
        escribirControl(new Pb().msg(10, new Pb().num(1, codigo).num(2, 3))); // 3 = pulsación corta
    }

    void abrirEnlace(String enlace) throws IOException {
        escribirControl(new Pb().msg(90, new Pb().str(1, enlace)));
    }

    /** Escribe texto tecla por tecla (funciona en los buscadores de las apps). */
    void texto(String texto) throws IOException {
        for (char c : texto.toLowerCase(Locale.ROOT).toCharArray()) {
            int codigo = codigoDeLetra(c);
            if (codigo > 0) tecla(codigo);
        }
    }

    private static int codigoDeLetra(char c) {
        if (c >= 'a' && c <= 'z') return 29 + (c - 'a');
        if (c >= '0' && c <= '9') return 7 + (c - '0');
        switch (c) {
            case ' ': return 62;
            case '.': return 56;
            case ',': return 55;
            case '-': return 69;
            case '@': return 77;
            case '/': return 76;
            case 'á': return 29;
            case 'é': return 33;
            case 'í': return 37;
            case 'ó': return 43;
            case 'ú': case 'ü': return 49;
            case 'ñ': return 42;
            default: return 0;
        }
    }

    private synchronized void escribirControl(Pb mensaje) throws IOException {
        if (salidaControl == null) throw new IOException("No hay conexión con el decodificador");
        escribir(salidaControl, mensaje.aBytes());
    }

    synchronized void desconectar() {
        cerrarSilencio(control);
        control = null;
        salidaControl = null;
    }

    // ---------- TLS e identidad ----------

    private SSLSocket abrirTls(String host, int puerto) throws Exception {
        cargarIdentidad();
        SSLContext tls = SSLContext.getInstance("TLS");
        tls.init(new KeyManager[] { administradorDeClaves() }, new TrustManager[] { confiarEnElTv() }, null);
        Socket base = new Socket();
        base.connect(new InetSocketAddress(host, puerto), 5000);
        SSLSocket s = (SSLSocket) tls.getSocketFactory().createSocket(base, host, puerto, true);
        s.startHandshake();
        return s;
    }

    private X509KeyManager administradorDeClaves() {
        return new X509KeyManager() {
            public String chooseClientAlias(String[] t, Principal[] i, Socket s) { return "aero"; }
            public String[] getClientAliases(String t, Principal[] i) { return new String[] { "aero" }; }
            public String chooseServerAlias(String t, Principal[] i, Socket s) { return null; }
            public String[] getServerAliases(String t, Principal[] i) { return null; }
            public X509Certificate[] getCertificateChain(String a) { return new X509Certificate[] { certificado }; }
            public PrivateKey getPrivateKey(String a) { return clave; }
        };
    }

    /** El TV usa un certificado propio (no de una autoridad): lo aceptamos, es un aparato de la casa. */
    private static X509TrustManager confiarEnElTv() {
        return new X509TrustManager() {
            public void checkClientTrusted(X509Certificate[] c, String t) {}
            public void checkServerTrusted(X509Certificate[] c, String t) {}
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
        };
    }

    private void cargarIdentidad() throws Exception {
        if (certificado != null) return;
        File archivoClave = new File(carpeta, "atv-clave.der");
        File archivoCert = new File(carpeta, "atv-certificado.der");
        if (!archivoClave.exists() || !archivoCert.exists()) {
            KeyPairGenerator generador = KeyPairGenerator.getInstance("RSA");
            generador.initialize(2048);
            KeyPair par = generador.generateKeyPair();
            Files.write(archivoClave.toPath(), par.getPrivate().getEncoded());
            Files.write(archivoCert.toPath(), certificadoPropio(par));
        }
        clave = KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(Files.readAllBytes(archivoClave.toPath())));
        certificado = (X509Certificate) CertificateFactory.getInstance("X.509")
                .generateCertificate(new java.io.ByteArrayInputStream(Files.readAllBytes(archivoCert.toPath())));
    }

    /** Arma a mano un certificado X.509 autofirmado (Android no trae un generador público). */
    private static byte[] certificadoPropio(KeyPair par) throws Exception {
        byte[] algoritmo = der(0x30, der(0x06, hex("2A864886F70D01010B")), der(0x05)); // sha256WithRSA
        byte[] nombre = der(0x30, der(0x31, der(0x30, der(0x06, hex("550403")),
                der(0x0C, "Control Aero".getBytes(StandardCharsets.UTF_8)))));
        SimpleDateFormat utc = new SimpleDateFormat("yyMMddHHmmss'Z'", Locale.US);
        utc.setTimeZone(TimeZone.getTimeZone("UTC"));
        byte[] vigencia = der(0x30,
                der(0x17, utc.format(new Date(System.currentTimeMillis() - 86_400_000L)).getBytes(StandardCharsets.US_ASCII)),
                der(0x17, "491231235959Z".getBytes(StandardCharsets.US_ASCII)));
        byte[] datos = der(0x30,
                der(0xA0, der(0x02, new byte[] { 2 })), // versión 3
                der(0x02, BigInteger.valueOf(System.currentTimeMillis()).toByteArray()),
                algoritmo, nombre, vigencia, nombre, par.getPublic().getEncoded());
        Signature firma = Signature.getInstance("SHA256withRSA");
        firma.initSign(par.getPrivate());
        firma.update(datos);
        byte[] firmado = firma.sign();
        byte[] bits = new byte[firmado.length + 1]; // BIT STRING: primer byte = bits sobrantes (0)
        System.arraycopy(firmado, 0, bits, 1, firmado.length);
        return der(0x30, datos, algoritmo, der(0x03, bits));
    }

    private static byte[] der(int etiqueta, byte[]... partes) {
        ByteArrayOutputStream cuerpo = new ByteArrayOutputStream();
        for (byte[] p : partes) cuerpo.write(p, 0, p.length);
        int n = cuerpo.size();
        ByteArrayOutputStream r = new ByteArrayOutputStream();
        r.write(etiqueta);
        if (n < 128) {
            r.write(n);
        } else if (n < 256) {
            r.write(0x81);
            r.write(n);
        } else {
            r.write(0x82);
            r.write(n >> 8);
            r.write(n & 0xFF);
        }
        r.write(cuerpo.toByteArray(), 0, n);
        return r.toByteArray();
    }

    // ---------- Utilidades ----------

    private static byte[] sinSigno(BigInteger n) {
        byte[] b = n.toByteArray();
        if (b.length > 1 && b[0] == 0) {
            byte[] r = new byte[b.length - 1];
            System.arraycopy(b, 1, r, 0, r.length);
            return r;
        }
        return b;
    }

    private static byte[] hex(String s) {
        byte[] r = new byte[s.length() / 2];
        for (int i = 0; i < r.length; i++) r[i] = (byte) Integer.parseInt(s.substring(2 * i, 2 * i + 2), 16);
        return r;
    }

    /** Cada mensaje va precedido de su largo (varint). */
    private static void escribir(OutputStream salida, byte[] mensaje) throws IOException {
        ByteArrayOutputStream r = new ByteArrayOutputStream();
        Pb.varint(r, mensaje.length);
        r.write(mensaje, 0, mensaje.length);
        salida.write(r.toByteArray());
        salida.flush();
    }

    private static Map<Integer, List<Object>> leer(InputStream entrada) throws IOException {
        long largo = 0;
        for (int corrimiento = 0; ; corrimiento += 7) {
            int b = entrada.read();
            if (b < 0) throw new IOException("El TV cerró la conexión");
            largo |= (long) (b & 0x7F) << corrimiento;
            if ((b & 0x80) == 0) break;
        }
        if (largo > 1_000_000) throw new IOException("Mensaje inválido");
        byte[] datos = new byte[(int) largo];
        int leidos = 0;
        while (leidos < datos.length) {
            int n = entrada.read(datos, leidos, datos.length - leidos);
            if (n < 0) throw new IOException("El TV cerró la conexión");
            leidos += n;
        }
        return Pb.leer(datos);
    }

    private static void cerrarSilencio(Socket s) {
        try {
            if (s != null) s.close();
        } catch (Exception ignorado) {
        }
    }

    static class SinEmparejar extends Exception {
        SinEmparejar() {
            super("Este celular no está emparejado con el decodificador");
        }
    }

    static class CodigoInvalido extends Exception {
        CodigoInvalido(String mensaje) {
            super(mensaje);
        }
    }

    /** Mini escritor/lector de Protocol Buffers: solo lo que usa este protocolo. */
    static class Pb {
        private final ByteArrayOutputStream datos = new ByteArrayOutputStream();

        Pb num(int campo, long valor) {
            varint(datos, (long) campo << 3);
            varint(datos, valor);
            return this;
        }

        Pb bytes(int campo, byte[] valor) {
            varint(datos, ((long) campo << 3) | 2);
            varint(datos, valor.length);
            datos.write(valor, 0, valor.length);
            return this;
        }

        Pb str(int campo, String valor) {
            return bytes(campo, valor.getBytes(StandardCharsets.UTF_8));
        }

        Pb msg(int campo, Pb valor) {
            return bytes(campo, valor.aBytes());
        }

        void agregar(Pb otro) {
            byte[] b = otro.aBytes();
            datos.write(b, 0, b.length);
        }

        byte[] aBytes() {
            return datos.toByteArray();
        }

        static void varint(ByteArrayOutputStream salida, long valor) {
            while ((valor & ~0x7FL) != 0) {
                salida.write((int) ((valor & 0x7F) | 0x80));
                valor >>>= 7;
            }
            salida.write((int) valor);
        }

        static Map<Integer, List<Object>> leer(byte[] b) throws IOException {
            Map<Integer, List<Object>> campos = new HashMap<>();
            int[] i = { 0 };
            while (i[0] < b.length) {
                long llave = varintDe(b, i);
                int campo = (int) (llave >>> 3);
                int tipo = (int) (llave & 7);
                Object valor;
                if (tipo == 0) {
                    valor = varintDe(b, i);
                } else if (tipo == 2) {
                    int n = (int) varintDe(b, i);
                    if (n < 0 || i[0] + n > b.length) throw new IOException("Mensaje inválido");
                    byte[] v = new byte[n];
                    System.arraycopy(b, i[0], v, 0, n);
                    i[0] += n;
                    valor = v;
                } else if (tipo == 5) {
                    i[0] += 4;
                    continue;
                } else if (tipo == 1) {
                    i[0] += 8;
                    continue;
                } else {
                    throw new IOException("Mensaje inválido");
                }
                campos.computeIfAbsent(campo, k -> new ArrayList<>()).add(valor);
            }
            return campos;
        }

        static long numero(Map<Integer, List<Object>> m, int campo, long otro) {
            List<Object> v = m.get(campo);
            return v != null && v.get(0) instanceof Long ? (Long) v.get(0) : otro;
        }

        private static long varintDe(byte[] b, int[] i) throws IOException {
            long r = 0;
            for (int corrimiento = 0; corrimiento < 64; corrimiento += 7) {
                if (i[0] >= b.length) throw new IOException("Mensaje inválido");
                int x = b[i[0]++];
                r |= (long) (x & 0x7F) << corrimiento;
                if ((x & 0x80) == 0) return r;
            }
            throw new IOException("Mensaje inválido");
        }
    }
}
