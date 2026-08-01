/*
=========================================================
TRADING ANALYST V8 PRO
Archivo: js/monitor.js

Responsabilidad:
- Controlar el monitoreo continuo.
- Administrar los estados:
  MONITORING
  PREPARE
  CONFIRMED
  EXECUTING
  RESULT
  CANCELLED
- Evitar señales repetidas.
- Controlar tiempos de preparación y vigencia.
- Avisar a app.js cuando cambia el estado.
=========================================================
*/


/* =====================================================
1. ESTADOS DEL MONITOR
===================================================== */

export const ESTADOS_MONITOR = Object.freeze({
  INACTIVE: "INACTIVE",
  MONITORING: "MONITORING",
  PREPARE: "PREPARE",
  CONFIRMED: "CONFIRMED",
  EXECUTING: "EXECUTING",
  RESULT: "RESULT",
  CANCELLED: "CANCELLED"
});


/* =====================================================
2. CONFIGURACIÓN
===================================================== */

export const CONFIGURACION_MONITOR = Object.freeze({
  ciclosMinimosPrepare: 2,
  ciclosMinimosConfirmacion: 3,

  tiempoMaximoPrepare: 12000,
  tiempoVisibleConfirmacion: 3500,
  tiempoVisibleResultado: 5000,

  intervaloMinimoEntreSenales: 5000,

  puntajeMinimoPrepare: 68,
  puntajeMinimoConfirmado: 80,

  maximoHistorialEstados: 30
});


/* =====================================================
3. UTILIDADES
===================================================== */

function ahora() {
  return Date.now();
}


function copiarResultado(
  resultado
) {
  if (
    !resultado ||
    typeof resultado !== "object"
  ) {
    return null;
  }

  return {
    ...resultado,

    razones: Array.isArray(
      resultado.razones
    )
      ? [...resultado.razones]
      : [],

    advertencias: Array.isArray(
      resultado.advertencias
    )
      ? [...resultado.advertencias]
      : [],

    metadata:
      resultado.metadata &&
      typeof resultado.metadata ===
        "object"
        ? {
            ...resultado.metadata
          }
        : {}
  };
}


function crearRegistroEstado(
  estado,
  datos = {}
) {
  return {
    estado,
    datos,
    fecha: ahora()
  };
}


/* =====================================================
4. CREAR MONITOR
===================================================== */

export function crearMonitorOportunidades(
  configuracionPersonalizada = {}
) {
  const configuracion = {
    ...CONFIGURACION_MONITOR,
    ...configuracionPersonalizada
  };

  let activo = false;

  let estadoActual =
    ESTADOS_MONITOR.INACTIVE;

  let resultadoActual = null;
  let resultadoAnterior = null;

  let direccionCandidata = null;
  let estrategiaCandidata = null;

  let repeticiones = 0;

  let inicioPrepare = 0;
  let ultimaSenalConfirmada = 0;

  let temporizadorPrepare = null;
  let temporizadorConfirmacion = null;
  let temporizadorResultado = null;

  let contexto = {
    simbolo: "",
    mercado: "",
    estrategia: "rise_fall",
    modo: "fast",
    horizonte: "10s"
  };

  const historialEstados = [];

  const escuchas = {
    estado: [],
    prepare: [],
    confirmado: [],
    cancelado: [],
    resultado: [],
    diagnostico: []
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
            `Error en evento ${evento}:`,
            error
          );
        }
      }
    );
  }


  function diagnostico(
    mensaje,
    tipo = "normal"
  ) {
    emitir(
      "diagnostico",
      {
        mensaje,
        tipo,
        fecha: ahora()
      }
    );
  }


  /* ===================================================
  6. HISTORIAL DE ESTADOS
  =================================================== */

  function guardarEstado(
    estado,
    datos = {}
  ) {
    historialEstados.unshift(
      crearRegistroEstado(
        estado,
        datos
      )
    );

    if (
      historialEstados.length >
      configuracion
        .maximoHistorialEstados
    ) {
      historialEstados.length =
        configuracion
          .maximoHistorialEstados;
    }
  }


  function cambiarEstado(
    nuevoEstado,
    datos = {}
  ) {
    estadoActual = nuevoEstado;

    guardarEstado(
      nuevoEstado,
      datos
    );

    emitir(
      "estado",
      {
        estado: nuevoEstado,
        resultado:
          copiarResultado(
            resultadoActual
          ),
        contexto: {
          ...contexto
        },
        ...datos
      }
    );
  }


  /* ===================================================
  7. TEMPORIZADORES
  =================================================== */

  function limpiarTemporizadorPrepare() {
    if (temporizadorPrepare) {
      clearTimeout(
        temporizadorPrepare
      );

      temporizadorPrepare = null;
    }
  }


  function limpiarTemporizadorConfirmacion() {
    if (
      temporizadorConfirmacion
    ) {
      clearTimeout(
        temporizadorConfirmacion
      );

      temporizadorConfirmacion =
        null;
    }
  }


  function limpiarTemporizadorResultado() {
    if (temporizadorResultado) {
      clearTimeout(
        temporizadorResultado
      );

      temporizadorResultado =
        null;
    }
  }


  function limpiarTemporizadores() {
    limpiarTemporizadorPrepare();
    limpiarTemporizadorConfirmacion();
    limpiarTemporizadorResultado();
  }


  /* ===================================================
  8. CONTEXTO
  =================================================== */

  function establecerContexto(
    nuevoContexto = {}
  ) {
    const contextoAnterior = {
      ...contexto
    };

    contexto = {
      ...contexto,
      ...nuevoContexto
    };

    const cambioImportante =
      contextoAnterior.simbolo !==
        contexto.simbolo ||
      contextoAnterior.estrategia !==
        contexto.estrategia ||
      contextoAnterior.modo !==
        contexto.modo ||
      contextoAnterior.horizonte !==
        contexto.horizonte;

    if (
      cambioImportante &&
      activo
    ) {
      cancelarOportunidad(
        "La configuración cambió. Se reinició el monitoreo.",
        false
      );

      iniciar();
    }

    diagnostico(
      `Contexto actualizado: ${contexto.mercado || contexto.simbolo} · ${contexto.estrategia}.`
    );
  }


  /* ===================================================
  9. REINICIAR CANDIDATO
  =================================================== */

  function reiniciarCandidato() {
    direccionCandidata = null;
    estrategiaCandidata = null;
    repeticiones = 0;
    inicioPrepare = 0;

    resultadoAnterior =
      resultadoActual;

    resultadoActual = null;

    limpiarTemporizadorPrepare();
  }


  /* ===================================================
  10. INICIAR MONITOREO
  =================================================== */

  function iniciar() {
    if (activo) {
      return;
    }

    activo = true;

    reiniciarCandidato();
    limpiarTemporizadores();

    cambiarEstado(
      ESTADOS_MONITOR.MONITORING,
      {
        mensaje:
          "Buscando una oportunidad técnica."
      }
    );

    diagnostico(
      "Monitor de oportunidades activado.",
      "exito"
    );
  }


  /* ===================================================
  11. DETENER MONITOREO
  =================================================== */

  function detener(
    motivo =
      "Monitor detenido manualmente."
  ) {
    activo = false;

    limpiarTemporizadores();
    reiniciarCandidato();

    cambiarEstado(
      ESTADOS_MONITOR.INACTIVE,
      {
        mensaje: motivo
      }
    );

    diagnostico(
      motivo,
      "advertencia"
    );
  }


  /* ===================================================
  12. VALIDAR RESULTADO
  =================================================== */

  function resultadoValido(
    resultado
  ) {
    return Boolean(
      resultado &&
      typeof resultado === "object" &&
      typeof resultado.estrategia ===
        "string" &&
      typeof resultado.direccion ===
        "string" &&
      Number.isFinite(
        Number(resultado.puntaje)
      )
    );
  }


  function resultadoEsEspera(
    resultado
  ) {
    return (
      !resultado ||
      resultado.direccion ===
        "WAIT" ||
      resultado.estado ===
        "MONITORING"
    );
  }


  function mismaCandidatura(
    resultado
  ) {
    return Boolean(
      resultado &&
      resultado.direccion ===
        direccionCandidata &&
      resultado.estrategia ===
        estrategiaCandidata
    );
  }


  /* ===================================================
  13. PREPARE
  =================================================== */

  function activarPrepare(
    resultado
  ) {
    resultadoActual =
      copiarResultado(
        resultado
      );

    inicioPrepare = ahora();

    cambiarEstado(
      ESTADOS_MONITOR.PREPARE,
      {
        mensaje:
          `Posible ${resultado.direccion}. Prepare la operación.`,
        repeticiones
      }
    );

    emitir(
      "prepare",
      {
        resultado:
          copiarResultado(
            resultadoActual
          ),

        contexto: {
          ...contexto
        },

        repeticiones
      }
    );

    diagnostico(
      `Prealerta: posible ${resultado.direccion} con puntaje ${resultado.puntaje}.`,
      "advertencia"
    );

    limpiarTemporizadorPrepare();

    temporizadorPrepare =
      setTimeout(
        () => {
          if (
            estadoActual ===
            ESTADOS_MONITOR.PREPARE
          ) {
            cancelarOportunidad(
              "La oportunidad no logró confirmarse a tiempo."
            );
          }
        },
        configuracion
          .tiempoMaximoPrepare
      );
  }


  /* ===================================================
  14. CONFIRMACIÓN
  =================================================== */

  function puedeConfirmar(
    resultado
  ) {
    const tiempoDesdeUltimaSenal =
      ahora() -
      ultimaSenalConfirmada;

    return Boolean(
      resultado.puntaje >=
        configuracion
          .puntajeMinimoConfirmado &&
      repeticiones >=
        configuracion
          .ciclosMinimosConfirmacion &&
      tiempoDesdeUltimaSenal >=
        configuracion
          .intervaloMinimoEntreSenales
    );
  }


  function confirmarOportunidad(
    resultado
  ) {
    limpiarTemporizadorPrepare();

    resultadoActual =
      copiarResultado(
        resultado
      );

    resultadoActual.estado =
      "CONFIRMED";

    resultadoActual.ejecutable =
      true;

    ultimaSenalConfirmada =
      ahora();

    cambiarEstado(
      ESTADOS_MONITOR.CONFIRMED,
      {
        mensaje:
          `${resultado.direccion} confirmado. Ejecute ahora.`,
        repeticiones
      }
    );

    emitir(
      "confirmado",
      {
        resultado:
          copiarResultado(
            resultadoActual
          ),

        contexto: {
          ...contexto
        },

        repeticiones
      }
    );

    diagnostico(
      `Oportunidad confirmada: ${resultado.direccion} · ${resultado.puntaje}/100.`,
      "exito"
    );
  }


  /* ===================================================
  15. EJECUCIÓN
  =================================================== */

  function marcarEjecutando() {
    if (
      estadoActual !==
      ESTADOS_MONITOR.CONFIRMED
    ) {
      return false;
    }

    cambiarEstado(
      ESTADOS_MONITOR.EXECUTING,
      {
        mensaje:
          "La señal se encuentra en ejecución."
      }
    );

    return true;
  }


  /* ===================================================
  16. CANCELAR OPORTUNIDAD
  =================================================== */

  function cancelarOportunidad(
    motivo =
      "La oportunidad perdió confirmación.",
    regresarAlMonitoreo = true
  ) {
    const resultadoCancelado =
      copiarResultado(
        resultadoActual
      );

    limpiarTemporizadorPrepare();
    limpiarTemporizadorConfirmacion();

    cambiarEstado(
      ESTADOS_MONITOR.CANCELLED,
      {
        mensaje: motivo,
        resultado:
          resultadoCancelado
      }
    );

    emitir(
      "cancelado",
      {
        motivo,
        resultado:
          resultadoCancelado,

        contexto: {
          ...contexto
        }
      }
    );

    diagnostico(
      motivo,
      "advertencia"
    );

    reiniciarCandidato();

    if (
      regresarAlMonitoreo &&
      activo
    ) {
      temporizadorConfirmacion =
        setTimeout(
          () => {
            cambiarEstado(
              ESTADOS_MONITOR.MONITORING,
              {
                mensaje:
                  "Buscando una nueva oportunidad."
              }
            );
          },
          1200
        );
    }
  }


  /* ===================================================
  17. REGISTRAR RESULTADO
  =================================================== */

  function registrarResultado({
    acierto,
    detalle = "",
    datos = {}
  } = {}) {
    if (
      estadoActual !==
        ESTADOS_MONITOR.CONFIRMED &&
      estadoActual !==
        ESTADOS_MONITOR.EXECUTING
    ) {
      diagnostico(
        "Se intentó registrar un resultado sin una señal activa.",
        "advertencia"
      );

      return false;
    }

    const resultadoEvaluado =
      copiarResultado(
        resultadoActual
      );

    const exitoso =
      Boolean(acierto);

    cambiarEstado(
      ESTADOS_MONITOR.RESULT,
      {
        acierto: exitoso,
        mensaje: exitoso
          ? "La predicción fue acertada."
          : "La predicción no fue acertada.",
        detalle,
        datos
      }
    );

    emitir(
      "resultado",
      {
        acierto: exitoso,
        resultado:
          resultadoEvaluado,
        detalle,
        datos,

        contexto: {
          ...contexto
        }
      }
    );

    diagnostico(
      exitoso
        ? "Resultado registrado: ACIERTO."
        : "Resultado registrado: FALLO.",
      exitoso
        ? "exito"
        : "error"
    );

    reiniciarCandidato();

    limpiarTemporizadorResultado();

    temporizadorResultado =
      setTimeout(
        () => {
          if (activo) {
            cambiarEstado(
              ESTADOS_MONITOR.MONITORING,
              {
                mensaje:
                  "Señal finalizada. Buscando una nueva oportunidad."
              }
            );
          } else {
            cambiarEstado(
              ESTADOS_MONITOR.INACTIVE,
              {
                mensaje:
                  "Señal finalizada."
              }
            );
          }
        },
        configuracion
          .tiempoVisibleResultado
      );

    return true;
  }


  /* ===================================================
  18. PROCESAR PREDICCIÓN
  =================================================== */

  function procesar(
    resultado
  ) {
    if (!activo) {
      return {
        estado:
          ESTADOS_MONITOR.INACTIVE,
        procesado: false,
        razon:
          "El monitor está apagado."
      };
    }

    if (
      !resultadoValido(
        resultado
      )
    ) {
      diagnostico(
        "El motor entregó un resultado inválido.",
        "error"
      );

      return {
        estado:
          estadoActual,
        procesado: false,
        razon:
          "Resultado inválido."
      };
    }

    if (
      [
        ESTADOS_MONITOR.CONFIRMED,
        ESTADOS_MONITOR.EXECUTING,
        ESTADOS_MONITOR.RESULT
      ].includes(
        estadoActual
      )
    ) {
      return {
        estado:
          estadoActual,
        procesado: false,
        razon:
          "Existe una señal activa."
      };
    }

    if (
      resultadoEsEspera(
        resultado
      )
    ) {
      if (
        estadoActual ===
        ESTADOS_MONITOR.PREPARE
      ) {
        cancelarOportunidad(
          "La configuración perdió fuerza antes de confirmarse."
        );
      } else {
        cambiarEstado(
          ESTADOS_MONITOR.MONITORING,
          {
            mensaje:
              "Analizando el mercado.",
            puntaje:
              resultado.puntaje || 0
          }
        );
      }

      reiniciarCandidato();

      return {
        estado:
          ESTADOS_MONITOR.MONITORING,
        procesado: true,
        resultado
      };
    }

    if (
      mismaCandidatura(
        resultado
      )
    ) {
      repeticiones++;
    } else {
      direccionCandidata =
        resultado.direccion;

      estrategiaCandidata =
        resultado.estrategia;

      repeticiones = 1;
    }

    resultadoAnterior =
      resultadoActual;

    resultadoActual =
      copiarResultado(
        resultado
      );

    const alcanzaPrepare =
      resultado.puntaje >=
        configuracion
          .puntajeMinimoPrepare &&
      repeticiones >=
        configuracion
          .ciclosMinimosPrepare;

    if (
      alcanzaPrepare &&
      estadoActual !==
        ESTADOS_MONITOR.PREPARE
    ) {
      activarPrepare(
        resultado
      );
    }

    if (
      estadoActual ===
        ESTADOS_MONITOR.PREPARE &&
      puedeConfirmar(
        resultado
      )
    ) {
      confirmarOportunidad(
        resultado
      );
    }

    if (
      resultado.puntaje <
        configuracion
          .puntajeMinimoPrepare &&
      estadoActual ===
        ESTADOS_MONITOR.PREPARE
    ) {
      cancelarOportunidad(
        "El Signal Score descendió antes de confirmar la entrada."
      );
    }

    return {
      estado:
        estadoActual,
      procesado: true,
      repeticiones,

      resultado:
        copiarResultado(
          resultadoActual
        )
    };
  }


  /* ===================================================
  19. CONSULTAS
  =================================================== */

  function obtenerEstado() {
    return {
      activo,
      estado:
        estadoActual,

      resultado:
        copiarResultado(
          resultadoActual
        ),

      resultadoAnterior:
        copiarResultado(
          resultadoAnterior
        ),

      direccionCandidata,
      estrategiaCandidata,
      repeticiones,

      inicioPrepare,
      ultimaSenalConfirmada,

      contexto: {
        ...contexto
      },

      historial:
        historialEstados.map(
          (registro) => ({
            ...registro
          })
        )
    };
  }


  function estaActivo() {
    return activo;
  }


  function haySenalActiva() {
    return [
      ESTADOS_MONITOR.CONFIRMED,
      ESTADOS_MONITOR.EXECUTING
    ].includes(
      estadoActual
    );
  }


  function estaPreparando() {
    return (
      estadoActual ===
      ESTADOS_MONITOR.PREPARE
    );
  }


  /* ===================================================
  20. DESTRUIR
  =================================================== */

  function destruir() {
    activo = false;

    limpiarTemporizadores();
    reiniciarCandidato();

    Object.keys(
      escuchas
    ).forEach(
      (evento) => {
        escuchas[evento] = [];
      }
    );

    estadoActual =
      ESTADOS_MONITOR.INACTIVE;
  }


  /* ===================================================
  21. API PÚBLICA
  =================================================== */

  return {
    al,
    quitar,

    iniciar,
    detener,
    destruir,

    procesar,

    establecerContexto,

    cancelarOportunidad,
    confirmarOportunidad,
    marcarEjecutando,
    registrarResultado,

    obtenerEstado,
    estaActivo,
    haySenalActiva,
    estaPreparando
  };
}


/* =====================================================
22. INSTANCIA PRINCIPAL
===================================================== */

export const monitorOportunidades =
  crearMonitorOportunidades();


/*
=========================================================
FIN DEL ARCHIVO js/monitor.js
TRADING ANALYST V8 PRO
=========================================================
*/
