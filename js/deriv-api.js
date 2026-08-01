/*
=========================================================
TRADING ANALYST V8 PRO
Archivo: js/deriv-api.js

Responsabilidad:
- Conectarse al WebSocket público de Deriv.
- Suscribirse a ticks en tiempo real.
- Cambiar de mercado de forma segura.
- Mantener viva la conexión.
- Reconectarse automáticamente.
- Emitir eventos hacia app.js.
=========================================================
*/


/* =====================================================
1. CONFIGURACIÓN
===================================================== */

const URL_DERIV =
  "wss://api.derivws.com/trading/v1/options/ws/public";

const TIEMPO_RECONEXION_INICIAL = 2500;
const TIEMPO_RECONEXION_MAXIMO = 15000;
const TIEMPO_MAXIMO_CONEXION = 12000;
const INTERVALO_PING = 30000;


/* =====================================================
2. CLASE PRINCIPAL
===================================================== */

export class DerivAPI {
  constructor() {
    this.socket = null;

    this.estado = "offline";
    this.simboloActual = "";

    this.idSuscripcion = null;
    this.numeroSolicitud = 0;

    this.cierreManual = false;
    this.intentosReconexion = 0;

    this.temporizadorConexion = null;
    this.temporizadorReconexion = null;
    this.temporizadorPing = null;

    this.ultimoTickRecibido = 0;

    this.eventos = {
      estado: [],
      tick: [],
      error: [],
      diagnostico: []
    };
  }


  /* ===================================================
  3. SISTEMA DE EVENTOS
  =================================================== */

  al(
    tipoEvento,
    funcion
  ) {
    if (
      !this.eventos[tipoEvento] ||
      typeof funcion !== "function"
    ) {
      return false;
    }

    if (
      !this.eventos[
        tipoEvento
      ].includes(funcion)
    ) {
      this.eventos[
        tipoEvento
      ].push(funcion);
    }

    return true;
  }


  quitar(
    tipoEvento,
    funcion
  ) {
    if (
      !this.eventos[tipoEvento]
    ) {
      return false;
    }

    this.eventos[tipoEvento] =
      this.eventos[
        tipoEvento
      ].filter(
        (registrada) =>
          registrada !== funcion
      );

    return true;
  }


  emitir(
    tipoEvento,
    datos = {}
  ) {
    const funciones =
      this.eventos[
        tipoEvento
      ] || [];

    funciones.forEach(
      (funcion) => {
        try {
          funcion(datos);
        } catch (error) {
          console.error(
            `Error ejecutando evento ${tipoEvento}:`,
            error
          );
        }
      }
    );
  }


  diagnostico(
    mensaje,
    tipo = "normal"
  ) {
    this.emitir(
      "diagnostico",
      {
        mensaje:
          String(mensaje),
        tipo,
        fecha: Date.now()
      }
    );
  }


  /* ===================================================
  4. ESTADO DE CONEXIÓN
  =================================================== */

  cambiarEstado(
    nuevoEstado,
    texto = nuevoEstado
  ) {
    this.estado =
      nuevoEstado;

    this.emitir(
      "estado",
      {
        estado:
          nuevoEstado,
        texto,
        simbolo:
          this.simboloActual
      }
    );
  }


  estaConectado() {
    return Boolean(
      this.socket &&
      this.socket.readyState ===
        WebSocket.OPEN
    );
  }


  estaConectando() {
    return Boolean(
      this.socket &&
      this.socket.readyState ===
        WebSocket.CONNECTING
    );
  }


  /* ===================================================
  5. TEMPORIZADORES
  =================================================== */

  limpiarTemporizadorConexion() {
    if (
      this.temporizadorConexion
    ) {
      clearTimeout(
        this.temporizadorConexion
      );

      this.temporizadorConexion =
        null;
    }
  }


  limpiarTemporizadorReconexion() {
    if (
      this.temporizadorReconexion
    ) {
      clearTimeout(
        this.temporizadorReconexion
      );

      this.temporizadorReconexion =
        null;
    }
  }


  detenerPing() {
    if (
      this.temporizadorPing
    ) {
      clearInterval(
        this.temporizadorPing
      );

      this.temporizadorPing =
        null;
    }
  }


  limpiarTemporizadores() {
    this.limpiarTemporizadorConexion();
    this.limpiarTemporizadorReconexion();
    this.detenerPing();
  }


  /* ===================================================
  6. IDENTIFICADORES
  =================================================== */

  siguienteSolicitud() {
    this.numeroSolicitud++;

    if (
      this.numeroSolicitud >
      999999
    ) {
      this.numeroSolicitud = 1;
    }

    return this.numeroSolicitud;
  }


  /* ===================================================
  7. CONECTAR
  =================================================== */

  conectar(
    simbolo =
      this.simboloActual
  ) {
    const simboloLimpio =
      String(
        simbolo || ""
      ).trim();

    if (simboloLimpio) {
      this.simboloActual =
        simboloLimpio;
    }

    if (this.estaConectado()) {
      if (
        this.simboloActual
      ) {
        this.suscribirseTicks(
          this.simboloActual
        );
      }

      return true;
    }

    if (
      this.estaConectando()
    ) {
      return true;
    }

    this.cierreManual = false;

    this.limpiarTemporizadorConexion();
    this.limpiarTemporizadorReconexion();
    this.detenerPing();

    this.cambiarEstado(
      "connecting",
      "CONNECTING"
    );

    this.diagnostico(
      "Abriendo conexión pública con Deriv."
    );

    try {
      this.socket =
        new WebSocket(
          URL_DERIV
        );
    } catch (error) {
      this.socket = null;

      this.gestionarError(
        "No fue posible crear la conexión WebSocket."
      );

      this.programarReconexion();

      return false;
    }

    const socketCreado =
      this.socket;

    this.temporizadorConexion =
      setTimeout(
        () => {
          if (
            this.socket ===
              socketCreado &&
            socketCreado.readyState ===
              WebSocket.CONNECTING
          ) {
            this.diagnostico(
              "La conexión tardó demasiado y será reiniciada.",
              "advertencia"
            );

            try {
              socketCreado.close();
            } catch (error) {
              console.warn(
                "No fue posible cerrar la conexión lenta.",
                error
              );
            }
          }
        },
        TIEMPO_MAXIMO_CONEXION
      );


    socketCreado.addEventListener(
      "open",
      () => {
        if (
          this.socket !==
          socketCreado
        ) {
          return;
        }

        this.limpiarTemporizadorConexion();

        this.intentosReconexion = 0;

        this.cambiarEstado(
          "live",
          "LIVE"
        );

        this.diagnostico(
          "Conexión pública con Deriv establecida.",
          "exito"
        );

        this.iniciarPing();

        if (
          this.simboloActual
        ) {
          this.suscribirseTicks(
            this.simboloActual
          );
        }
      }
    );


    socketCreado.addEventListener(
      "message",
      (evento) => {
        if (
          this.socket !==
          socketCreado
        ) {
          return;
        }

        this.procesarMensaje(
          evento
        );
      }
    );


    socketCreado.addEventListener(
      "error",
      () => {
        if (
          this.socket !==
          socketCreado
        ) {
          return;
        }

        this.gestionarError(
          "El WebSocket informó un error."
        );
      }
    );


    socketCreado.addEventListener(
      "close",
      (evento) => {
        if (
          this.socket !==
          socketCreado
        ) {
          return;
        }

        this.procesarCierre(
          evento
        );
      }
    );

    return true;
  }


  /* ===================================================
  8. PROCESAR MENSAJES
  =================================================== */

  procesarMensaje(
    evento
  ) {
    let datos;

    try {
      datos =
        JSON.parse(
          evento.data
        );
    } catch (error) {
      this.gestionarError(
        "Deriv envió una respuesta que no pudo interpretarse."
      );

      return;
    }

    if (datos.error) {
      const mensaje =
        datos.error.message ||
        datos.error.code ||
        "Error desconocido de Deriv.";

      this.gestionarError(
        mensaje
      );

      return;
    }

    if (
      datos.msg_type ===
        "tick" &&
      datos.tick
    ) {
      this.procesarTick(
        datos
      );

      return;
    }

    if (
      datos.msg_type ===
      "forget"
    ) {
      this.diagnostico(
        "La suscripción anterior fue cerrada."
      );

      return;
    }

    if (
      datos.msg_type ===
      "ping"
    ) {
      return;
    }
  }


  /* ===================================================
  9. PROCESAR TICK
  =================================================== */

  procesarTick(
    datos
  ) {
    if (
      datos.subscription?.id
    ) {
      this.idSuscripcion =
        datos.subscription.id;
    }

    const tick =
      datos.tick;

    const simboloRecibido =
      String(
        tick.symbol ||
        this.simboloActual ||
        ""
      ).trim();

    if (
      this.simboloActual &&
      simboloRecibido &&
      simboloRecibido !==
        this.simboloActual
    ) {
      this.diagnostico(
        "Se descartó un tick atrasado del mercado anterior.",
        "advertencia"
      );

      return;
    }

    const precio =
      Number(
        tick.quote
      );

    const epoch =
      Number(
        tick.epoch
      );

    const pipSize =
      Number(
        tick.pip_size
      );

    if (
      !Number.isFinite(
        precio
      )
    ) {
      this.gestionarError(
        "Deriv envió un precio no válido."
      );

      return;
    }

    this.ultimoTickRecibido =
      Date.now();

    this.emitir(
      "tick",
      {
        simbolo:
          simboloRecibido ||
          this.simboloActual,

        precio,

        epoch:
          Number.isFinite(epoch)
            ? epoch
            : null,

        pipSize:
          Number.isInteger(
            pipSize
          ) &&
          pipSize >= 0
            ? pipSize
            : null,

        recibidoEn:
          this.ultimoTickRecibido
      }
    );
  }


  /* ===================================================
  10. ENVIAR SOLICITUD
  =================================================== */

  enviar(
    datos
  ) {
    if (
      !this.estaConectado()
    ) {
      return false;
    }

    try {
      this.socket.send(
        JSON.stringify(
          datos
        )
      );

      return true;
    } catch (error) {
      this.gestionarError(
        "No fue posible enviar la solicitud a Deriv."
      );

      return false;
    }
  }


  /* ===================================================
  11. SUSCRIPCIÓN DE TICKS
  =================================================== */

  suscribirseTicks(
    simbolo
  ) {
    const simboloLimpio =
      String(
        simbolo || ""
      ).trim();

    if (!simboloLimpio) {
      this.gestionarError(
        "No se seleccionó un mercado válido."
      );

      return false;
    }

    this.simboloActual =
      simboloLimpio;

    if (
      !this.estaConectado()
    ) {
      return this.conectar(
        simboloLimpio
      );
    }

    this.cancelarSuscripcionActual();

    this.diagnostico(
      `Solicitando ticks de ${simboloLimpio}.`
    );

    return this.enviar({
      ticks:
        simboloLimpio,

      subscribe: 1,

      req_id:
        this.siguienteSolicitud()
    });
  }


  cancelarSuscripcionActual() {
    if (
      !this.idSuscripcion ||
      !this.estaConectado()
    ) {
      this.idSuscripcion =
        null;

      return false;
    }

    const idAnterior =
      this.idSuscripcion;

    this.idSuscripcion =
      null;

    return this.enviar({
      forget:
        idAnterior,

      req_id:
        this.siguienteSolicitud()
    });
  }


  cambiarSimbolo(
    nuevoSimbolo
  ) {
    const simboloLimpio =
      String(
        nuevoSimbolo || ""
      ).trim();

    if (!simboloLimpio) {
      this.gestionarError(
        "El símbolo seleccionado no es válido."
      );

      return false;
    }

    if (
      simboloLimpio ===
        this.simboloActual &&
      this.idSuscripcion &&
      this.estaConectado()
    ) {
      this.diagnostico(
        "El mercado seleccionado ya está activo."
      );

      return true;
    }

    this.simboloActual =
      simboloLimpio;

    return this.suscribirseTicks(
      simboloLimpio
    );
  }


  /* ===================================================
  12. PING
  =================================================== */

  iniciarPing() {
    this.detenerPing();

    this.temporizadorPing =
      setInterval(
        () => {
          if (
            this.estaConectado()
          ) {
            this.enviar({
              ping: 1,

              req_id:
                this.siguienteSolicitud()
            });
          }
        },
        INTERVALO_PING
      );
  }


  /* ===================================================
  13. PROCESAR CIERRE
  =================================================== */

  procesarCierre(
    evento
  ) {
    this.limpiarTemporizadorConexion();
    this.detenerPing();

    this.socket = null;
    this.idSuscripcion = null;

    this.cambiarEstado(
      "offline",
      "OFFLINE"
    );

    if (
      this.cierreManual
    ) {
      this.diagnostico(
        "La conexión fue cerrada manualmente."
      );

      return;
    }

    const codigo =
      Number.isFinite(
        evento?.code
      )
        ? evento.code
        : "desconocido";

    this.diagnostico(
      `La conexión se cerró. Código: ${codigo}.`,
      "advertencia"
    );

    this.programarReconexion();
  }


  /* ===================================================
  14. RECONEXIÓN AUTOMÁTICA
  =================================================== */

  programarReconexion() {
    if (
      this.cierreManual
    ) {
      return;
    }

    this.limpiarTemporizadorReconexion();

    this.intentosReconexion++;

    const espera =
      Math.min(
        TIEMPO_RECONEXION_INICIAL *
          this.intentosReconexion,
        TIEMPO_RECONEXION_MAXIMO
      );

    this.cambiarEstado(
      "connecting",
      "RECONNECTING"
    );

    this.diagnostico(
      `Nuevo intento de conexión en ${Math.round(
        espera / 1000
      )} segundos.`,
      "advertencia"
    );

    this.temporizadorReconexion =
      setTimeout(
        () => {
          this.temporizadorReconexion =
            null;

          this.conectar(
            this.simboloActual
          );
        },
        espera
      );
  }


  /* ===================================================
  15. DESCONECTAR
  =================================================== */

  desconectar() {
    this.cierreManual = true;

    this.limpiarTemporizadores();

    this.cancelarSuscripcionActual();

    const socketActual =
      this.socket;

    this.socket = null;
    this.idSuscripcion = null;

    if (socketActual) {
      try {
        socketActual.close(
          1000,
          "Cierre manual"
        );
      } catch (error) {
        console.warn(
          "No fue posible cerrar el WebSocket.",
          error
        );
      }
    }

    this.cambiarEstado(
      "offline",
      "OFFLINE"
    );

    this.diagnostico(
      "Conexión desconectada manualmente."
    );
  }


  /* ===================================================
  16. ERRORES
  =================================================== */

  gestionarError(
    mensaje
  ) {
    const texto =
      String(
        mensaje ||
        "Error desconocido."
      );

    this.emitir(
      "error",
      {
        mensaje:
          texto,
        fecha:
          Date.now()
      }
    );

    this.diagnostico(
      texto,
      "error"
    );
  }


  /* ===================================================
  17. INFORMACIÓN PÚBLICA
  =================================================== */

  obtenerEstado() {
    return {
      estado:
        this.estado,

      conectado:
        this.estaConectado(),

      conectando:
        this.estaConectando(),

      simbolo:
        this.simboloActual,

      idSuscripcion:
        this.idSuscripcion,

      ultimoTickRecibido:
        this.ultimoTickRecibido,

      intentosReconexion:
        this.intentosReconexion
    };
  }
}


/* =====================================================
18. INSTANCIA PRINCIPAL
===================================================== */

export const derivAPI =
  new DerivAPI();


/*
=========================================================
FIN DEL ARCHIVO js/deriv-api.js
TRADING ANALYST V8 PRO
=========================================================
*/
