/*
=========================================================
TRADING ANALYST V8 PRO
Archivo: js/voice.js

Responsabilidad:
- Administrar el asistente de voz.
- Detectar las voces disponibles del dispositivo.
- Permitir elegir acento, velocidad, tono y volumen.
- Hablar en español aunque la interfaz use términos en inglés.
- Evitar mensajes cortados o superpuestos.
- Controlar prealertas, confirmaciones, resultados y cancelaciones.
=========================================================
*/


/* =====================================================
1. CONFIGURACIÓN GENERAL
===================================================== */

export const CONFIGURACION_VOZ = Object.freeze({
  idiomaPreferido: "es-SV",
  idiomaAlternativo: "es-ES",

  velocidad: 0.9,
  tono: 1,
  volumen: 1,

  pausaEntreMensajes: 320,
  tiempoMaximoEsperaVoces: 5000
});


/* =====================================================
2. TRADUCCIONES PARA LA VOZ
===================================================== */

const TRADUCCIONES = Object.freeze({
  RISE: "Sube",
  FALL: "Baja",
  EVEN: "Par",
  ODD: "Impar",
  OVER: "Más de cuatro",
  UNDER: "Menos de cinco",
  MATCH: "Coincidencia",
  WAIT: "Esperar",

  MONITORING: "Monitoreando",
  PREPARE: "Prepararse",
  CONFIRMED: "Confirmado",
  EXECUTING: "Ejecutando",
  RESULT: "Resultado",
  CANCELLED: "Cancelado"
});


/* =====================================================
3. UTILIDADES
===================================================== */

function esperar(
  milisegundos
) {
  return new Promise(
    (resolver) => {
      setTimeout(
        resolver,
        milisegundos
      );
    }
  );
}


function textoValido(
  texto
) {
  return (
    typeof texto === "string" &&
    texto.trim().length > 0
  );
}


function limitarNumero(
  valor,
  minimo,
  maximo
) {
  const numero =
    Number(valor);

  if (!Number.isFinite(numero)) {
    return minimo;
  }

  return Math.max(
    minimo,
    Math.min(
      maximo,
      numero
    )
  );
}


function obtenerIdiomaBase(
  codigoIdioma = ""
) {
  return String(
    codigoIdioma
  )
    .toLowerCase()
    .split("-")[0];
}


/* =====================================================
4. CREAR CONTROLADOR DE VOZ
===================================================== */

export function crearControladorVoz(
  configuracionInicial = {}
) {
  const compatible =
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  let activa =
    compatible;

  let voces = [];
  let vozSeleccionada = null;

  let velocidad =
    limitarNumero(
      configuracionInicial.velocidad ??
        CONFIGURACION_VOZ.velocidad,
      0.5,
      1.5
    );

  let tono =
    limitarNumero(
      configuracionInicial.tono ??
        CONFIGURACION_VOZ.tono,
      0.5,
      1.5
    );

  let volumen =
    limitarNumero(
      configuracionInicial.volumen ??
        CONFIGURACION_VOZ.volumen,
      0,
      1
    );

  let hablando = false;
  let cancelacionSolicitada = false;

  const cola = [];

  const escuchas = {
    voces: [],
    inicio: [],
    fin: [],
    error: [],
    estado: []
  };


  /* ===================================================
  5. EVENTOS
  =================================================== */

  function al(
    evento,
    funcion
  ) {
    if (
      !escuchas[evento] ||
      typeof funcion !== "function"
    ) {
      return;
    }

    if (
      !escuchas[evento].includes(
        funcion
      )
    ) {
      escuchas[evento].push(
        funcion
      );
    }
  }


  function quitar(
    evento,
    funcion
  ) {
    if (!escuchas[evento]) {
      return;
    }

    escuchas[evento] =
      escuchas[evento].filter(
        (registrada) =>
          registrada !== funcion
      );
  }


  function emitir(
    evento,
    datos = {}
  ) {
    const funciones =
      escuchas[evento] || [];

    funciones.forEach(
      (funcion) => {
        try {
          funcion(datos);
        } catch (error) {
          console.error(
            `Error en evento de voz ${evento}:`,
            error
          );
        }
      }
    );
  }


  /* ===================================================
  6. CARGAR VOCES
  =================================================== */

  function ordenarVoces(
    lista
  ) {
    return [...lista].sort(
      (a, b) => {
        const aEspanol =
          obtenerIdiomaBase(
            a.lang
          ) === "es";

        const bEspanol =
          obtenerIdiomaBase(
            b.lang
          ) === "es";

        if (
          aEspanol &&
          !bEspanol
        ) {
          return -1;
        }

        if (
          !aEspanol &&
          bEspanol
        ) {
          return 1;
        }

        return a.name.localeCompare(
          b.name
        );
      }
    );
  }


  function seleccionarVozPreferida() {
    if (voces.length === 0) {
      vozSeleccionada = null;
      return null;
    }

    const idiomaPreferido =
      configuracionInicial.idioma ||
      CONFIGURACION_VOZ
        .idiomaPreferido;

    const coincidenciaExacta =
      voces.find(
        (voz) =>
          voz.lang
            .toLowerCase() ===
          idiomaPreferido
            .toLowerCase()
      );

    if (coincidenciaExacta) {
      vozSeleccionada =
        coincidenciaExacta;

      return vozSeleccionada;
    }

    const vozEspanol =
      voces.find(
        (voz) =>
          obtenerIdiomaBase(
            voz.lang
          ) === "es"
      );

    vozSeleccionada =
      vozEspanol ||
      voces[0] ||
      null;

    return vozSeleccionada;
  }


  function cargarVoces() {
    if (!compatible) {
      emitir(
        "error",
        {
          mensaje:
            "El navegador no permite utilizar voz."
        }
      );

      return [];
    }

    const disponibles =
      window.speechSynthesis
        .getVoices();

    voces =
      ordenarVoces(
        disponibles
      );

    if (
      !vozSeleccionada ||
      !voces.some(
        (voz) =>
          voz.name ===
            vozSeleccionada.name &&
          voz.lang ===
            vozSeleccionada.lang
      )
    ) {
      seleccionarVozPreferida();
    }

    emitir(
      "voces",
      {
        voces:
          obtenerVoces(),
        seleccionada:
          obtenerVozSeleccionada()
      }
    );

    return obtenerVoces();
  }


  async function esperarVoces() {
    if (!compatible) {
      return [];
    }

    const inicio =
      Date.now();

    while (
      Date.now() - inicio <
      CONFIGURACION_VOZ
        .tiempoMaximoEsperaVoces
    ) {
      cargarVoces();

      if (voces.length > 0) {
        return obtenerVoces();
      }

      await esperar(200);
    }

    return obtenerVoces();
  }


  /* ===================================================
  7. CONSULTAR VOCES
  =================================================== */

  function obtenerVoces() {
    return voces.map(
      (voz) => ({
        name: voz.name,
        lang: voz.lang,
        localService:
          Boolean(
            voz.localService
          ),
        default:
          Boolean(voz.default)
      })
    );
  }


  function obtenerVozSeleccionada() {
    if (!vozSeleccionada) {
      return null;
    }

    return {
      name:
        vozSeleccionada.name,
      lang:
        vozSeleccionada.lang,
      localService:
        Boolean(
          vozSeleccionada
            .localService
        ),
      default:
        Boolean(
          vozSeleccionada
            .default
        )
    };
  }


  function seleccionarVoz(
    identificador
  ) {
    const texto =
      String(
        identificador || ""
      );

    const encontrada =
      voces.find(
        (voz) =>
          voz.name === texto ||
          `${voz.name}|${voz.lang}` ===
            texto
      );

    if (!encontrada) {
      return false;
    }

    vozSeleccionada =
      encontrada;

    emitir(
      "estado",
      {
        tipo:
          "voz-seleccionada",
        voz:
          obtenerVozSeleccionada()
      }
    );

    return true;
  }


  /* ===================================================
  8. CONFIGURACIÓN DE VOZ
  =================================================== */

  function establecerVelocidad(
    nuevaVelocidad
  ) {
    velocidad =
      limitarNumero(
        nuevaVelocidad,
        0.5,
        1.5
      );

    return velocidad;
  }


  function establecerTono(
    nuevoTono
  ) {
    tono =
      limitarNumero(
        nuevoTono,
        0.5,
        1.5
      );

    return tono;
  }


  function establecerVolumen(
    nuevoVolumen
  ) {
    volumen =
      limitarNumero(
        nuevoVolumen,
        0,
        1
      );

    return volumen;
  }


  function obtenerConfiguracion() {
    return {
      compatible,
      activa,
      velocidad,
      tono,
      volumen,

      voz:
        obtenerVozSeleccionada()
    };
  }


  /* ===================================================
  9. ACTIVAR Y SILENCIAR
  =================================================== */

  function activar() {
    if (!compatible) {
      return false;
    }

    activa = true;

    emitir(
      "estado",
      {
        tipo: "activada",
        activa
      }
    );

    return true;
  }


  function silenciar() {
    activa = false;
    cancelarTodo();

    emitir(
      "estado",
      {
        tipo: "silenciada",
        activa
      }
    );

    return true;
  }


  function alternar() {
    if (activa) {
      silenciar();
    } else {
      activar();
    }

    return activa;
  }


  function estaActiva() {
    return activa;
  }


  /* ===================================================
  10. CREAR MENSAJE
  =================================================== */

  function crearMensaje(
    texto,
    opciones = {}
  ) {
    const mensaje =
      new SpeechSynthesisUtterance(
        texto
      );

    if (vozSeleccionada) {
      mensaje.voice =
        vozSeleccionada;

      mensaje.lang =
        vozSeleccionada.lang;
    } else {
      mensaje.lang =
        CONFIGURACION_VOZ
          .idiomaPreferido;
    }

    mensaje.rate =
      limitarNumero(
        opciones.velocidad ??
          velocidad,
        0.5,
        1.5
      );

    mensaje.pitch =
      limitarNumero(
        opciones.tono ??
          tono,
        0.5,
        1.5
      );

    mensaje.volume =
      limitarNumero(
        opciones.volumen ??
          volumen,
        0,
        1
      );

    return mensaje;
  }


  /* ===================================================
  11. HABLAR UN MENSAJE
  =================================================== */

  function hablarUno(
    texto,
    opciones = {}
  ) {
    return new Promise(
      (resolver) => {
        if (
          !compatible ||
          !activa ||
          !textoValido(texto)
        ) {
          resolver(false);
          return;
        }

        const mensaje =
          crearMensaje(
            texto.trim(),
            opciones
          );

        mensaje.onstart =
          () => {
            hablando = true;

            emitir(
              "inicio",
              {
                texto:
                  texto.trim()
              }
            );
          };

        mensaje.onend =
          () => {
            hablando = false;

            emitir(
              "fin",
              {
                texto:
                  texto.trim()
              }
            );

            resolver(true);
          };

        mensaje.onerror =
          (evento) => {
            hablando = false;

            if (
              evento.error !==
              "canceled"
            ) {
              emitir(
                "error",
                {
                  mensaje:
                    "No fue posible reproducir el mensaje.",
                  error:
                    evento.error
                }
              );
            }

            resolver(false);
          };

        try {
          window.speechSynthesis
            .speak(mensaje);
        } catch (error) {
          hablando = false;

          emitir(
            "error",
            {
              mensaje:
                "Error al iniciar la voz.",
              error
            }
          );

          resolver(false);
        }
      }
    );
  }


  /* ===================================================
  12. PROCESAR COLA
  =================================================== */

  async function procesarCola() {
    if (
      hablando ||
      cola.length === 0 ||
      !activa
    ) {
      return;
    }

    cancelacionSolicitada =
      false;

    while (
      cola.length > 0 &&
      activa &&
      !cancelacionSolicitada
    ) {
      const elemento =
        cola.shift();

      await hablarUno(
        elemento.texto,
        elemento.opciones
      );

      if (
        cola.length > 0 &&
        !cancelacionSolicitada
      ) {
        await esperar(
          elemento.opciones
            .pausa ??
          CONFIGURACION_VOZ
            .pausaEntreMensajes
        );
      }
    }
  }


  /* ===================================================
  13. AGREGAR MENSAJES
  =================================================== */

  function hablar(
    texto,
    opciones = {}
  ) {
    if (
      !compatible ||
      !activa ||
      !textoValido(texto)
    ) {
      return false;
    }

    if (
      opciones.reemplazar ===
      true
    ) {
      cancelarTodo();
    }

    cola.push({
      texto:
        texto.trim(),
      opciones
    });

    procesarCola();

    return true;
  }


  function hablarSecuencia(
    mensajes,
    opciones = {}
  ) {
    if (
      !Array.isArray(mensajes)
    ) {
      return false;
    }

    const textosValidos =
      mensajes.filter(
        textoValido
      );

    if (
      textosValidos.length === 0
    ) {
      return false;
    }

    if (
      opciones.reemplazar ===
      true
    ) {
      cancelarTodo();
    }

    textosValidos.forEach(
      (texto) => {
        cola.push({
          texto:
            texto.trim(),
          opciones
        });
      }
    );

    procesarCola();

    return true;
  }


  /* ===================================================
  14. CANCELAR VOZ
  =================================================== */

  function cancelarTodo() {
    cancelacionSolicitada =
      true;

    cola.length = 0;
    hablando = false;

    if (compatible) {
      try {
        window.speechSynthesis
          .cancel();
      } catch (error) {
        console.warn(
          "No fue posible cancelar la voz:",
          error
        );
      }
    }
  }


  /* ===================================================
  15. MENSAJES ESPECÍFICOS
  =================================================== */

  function traducirDireccion(
    direccion
  ) {
    return (
      TRADUCCIONES[
        String(
          direccion || ""
        ).toUpperCase()
      ] ||
      String(
        direccion || ""
      )
    );
  }


  function anunciarConexion(
    estado
  ) {
    const valor =
      String(
        estado || ""
      ).toUpperCase();

    if (
      valor ===
      "CONNECTING"
    ) {
      return hablar(
        "Conectando.",
        {
          reemplazar: true
        }
      );
    }

    if (
      valor ===
      "CONNECTED" ||
      valor ===
      "LIVE"
    ) {
      return hablar(
        "Conectado.",
        {
          reemplazar: true
        }
      );
    }

    if (
      valor ===
      "DISCONNECTED" ||
      valor ===
      "OFFLINE"
    ) {
      return hablar(
        "Desconectado.",
        {
          reemplazar: true
        }
      );
    }

    if (valor === "ERROR") {
      return hablar(
        "Se produjo un error de conexión.",
        {
          reemplazar: true
        }
      );
    }

    return false;
  }


  function anunciarMotor(
    encendido
  ) {
    return hablar(
      encendido
        ? "Motor de análisis encendido."
        : "Motor de análisis apagado.",
      {
        reemplazar: true
      }
    );
  }


  function anunciarMonitoreo() {
    return hablar(
      "Monitoreando el mercado.",
      {
        reemplazar: true
      }
    );
  }


  function anunciarPrepare(
    resultado
  ) {
    if (!resultado) {
      return false;
    }

    const direccion =
      traducirDireccion(
        resultado.direccion
      );

    return hablarSecuencia(
      [
        "Atención.",
        `Posible operación ${direccion}.`,
        "Prepare el bot y espere confirmación."
      ],
      {
        reemplazar: true,
        pausa: 380
      }
    );
  }


  function anunciarConfirmacion(
    resultado
  ) {
    if (!resultado) {
      return false;
    }

    const direccion =
      traducirDireccion(
        resultado.direccion
      );

    return hablarSecuencia(
      [
        `Operación ${direccion} confirmada.`,
        "Ejecute ahora."
      ],
      {
        reemplazar: true,
        pausa: 300
      }
    );
  }


  function anunciarCancelacion(
    motivo = ""
  ) {
    const mensajes = [
      "La oportunidad fue cancelada."
    ];

    if (textoValido(motivo)) {
      mensajes.push(motivo);
    }

    mensajes.push(
      "El monitoreo continúa."
    );

    return hablarSecuencia(
      mensajes,
      {
        reemplazar: true,
        pausa: 320
      }
    );
  }


  function anunciarResultado(
    acierto
  ) {
    return hablarSecuencia(
      [
        acierto
          ? "Resultado acertado."
          : "Resultado fallido.",

        "Señal finalizada.",

        "Puede esperar una nueva oportunidad."
      ],
      {
        reemplazar: true,
        pausa: 350
      }
    );
  }


  function anunciarConteo(
    numero
  ) {
    const valor =
      Math.round(
        Number(numero)
      );

    if (
      !Number.isFinite(valor) ||
      valor < 0
    ) {
      return false;
    }

    return hablar(
      String(valor),
      {
        reemplazar: true,
        velocidad: 0.82
      }
    );
  }


  function probarVoz() {
    return hablarSecuencia(
      [
        "Asistente de voz de Trading Analyst V8 Pro.",
        "La voz está funcionando correctamente."
      ],
      {
        reemplazar: true,
        pausa: 350
      }
    );
  }


  /* ===================================================
  16. INICIALIZACIÓN
  =================================================== */

  function inicializar() {
    if (!compatible) {
      activa = false;

      emitir(
        "error",
        {
          mensaje:
            "El navegador no es compatible con el asistente de voz."
        }
      );

      return false;
    }

    cargarVoces();

    window.speechSynthesis
      .addEventListener?.(
        "voiceschanged",
        cargarVoces
      );

    return true;
  }


  /* ===================================================
  17. DESTRUIR
  =================================================== */

  function destruir() {
    cancelarTodo();

    if (compatible) {
      window.speechSynthesis
        .removeEventListener?.(
          "voiceschanged",
          cargarVoces
        );
    }

    Object.keys(
      escuchas
    ).forEach(
      (evento) => {
        escuchas[evento] = [];
      }
    );
  }


  /* ===================================================
  18. API PÚBLICA
  =================================================== */

  return {
    inicializar,
    destruir,

    al,
    quitar,

    cargarVoces,
    esperarVoces,
    obtenerVoces,

    seleccionarVoz,
    obtenerVozSeleccionada,

    activar,
    silenciar,
    alternar,
    estaActiva,

    establecerVelocidad,
    establecerTono,
    establecerVolumen,
    obtenerConfiguracion,

    hablar,
    hablarSecuencia,
    cancelarTodo,

    traducirDireccion,

    anunciarConexion,
    anunciarMotor,
    anunciarMonitoreo,
    anunciarPrepare,
    anunciarConfirmacion,
    anunciarCancelacion,
    anunciarResultado,
    anunciarConteo,

    probarVoz
  };
}


/* =====================================================
19. INSTANCIA PRINCIPAL
===================================================== */

export const asistenteVoz =
  crearControladorVoz();


/*
=========================================================
FIN DEL ARCHIVO js/voice.js
TRADING ANALYST V8 PRO
=========================================================
*/
