/*
=========================================================
TRADING ANALYST PRO MR
Archivo: js/monitor.js

Responsabilidad:
- Controlar el flujo de las oportunidades.
- Aplicar tiempos distintos por estrategia.
- Administrar:
  INACTIVE
  MONITORING
  CANDIDATE
  PREPARE
  REVALIDATING
  CONFIRMED
  EXECUTING
  RESULT
  CANCELLED
- Evitar que una señal aparezca y desaparezca demasiado rápido.
=========================================================
*/

import {
  CONFIGURACION_PREDICCION
} from "./prediction.js";


/* =====================================================
1. ESTADOS DEL MONITOR
===================================================== */

export const ESTADOS_MONITOR = Object.freeze({
  INACTIVE: "INACTIVE",
  MONITORING: "MONITORING",
  CANDIDATE: "CANDIDATE",
  PREPARE: "PREPARE",
  REVALIDATING: "REVALIDATING",
  CONFIRMED: "CONFIRMED",
  EXECUTING: "EXECUTING",
  RESULT: "RESULT",
  CANCELLED: "CANCELLED"
});


/* =====================================================
2. AJUSTES POR ESTRATEGIA
===================================================== */

export const CONFIGURACION_MONITOR = Object.freeze({
  rise_fall: {
    ciclosCandidata: 2,
    ciclosPrepare: 3,
    ciclosRevalidacion: 4,
    ciclosConfirmacion: 5,

    tiempoMinimoPrepare: 3500,
    tiempoMaximoPrepare: 14000,

    ciclosDebilesPermitidos: 2,
    ciclosContrariosPermitidos: 2,

    tiempoEnfriamiento: 6000
  },

  even_odd: {
    ciclosCandidata: 1,
    ciclosPrepare: 2,
    ciclosRevalidacion: 2,
    ciclosConfirmacion: 3,

    tiempoMinimoPrepare: 2200,
    tiempoMaximoPrepare: 10000,

    ciclosDebilesPermitidos: 2,
    ciclosContrariosPermitidos: 2,

    tiempoEnfriamiento: 4000
  },

  over_under: {
    ciclosCandidata: 1,
    ciclosPrepare: 2,
    ciclosRevalidacion: 2,
    ciclosConfirmacion: 3,

    tiempoMinimoPrepare: 2200,
    tiempoMaximoPrepare: 10000,

    ciclosDebilesPermitidos: 2,
    ciclosContrariosPermitidos: 2,

    tiempoEnfriamiento: 4000
  },

  match: {
    ciclosCandidata: 2,
    ciclosPrepare: 3,
    ciclosRevalidacion: 3,
    ciclosConfirmacion: 4,

    tiempoMinimoPrepare: 3000,
    tiempoMaximoPrepare: 12000,

    ciclosDebilesPermitidos: 2,
    ciclosContrariosPermitidos: 2,

    tiempoEnfriamiento: 5000
  }
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

    razones:
      Array.isArray(
        resultado.razones
      )
        ? [...resultado.razones]
        : [],

    advertencias:
      Array.isArray(
        resultado.advertencias
      )
        ? [...resultado.advertencias]
        : [],

    componentes:
      resultado.componentes &&
      typeof resultado.componentes ===
        "object"
        ? {
            ...resultado.componentes
          }
        : {},

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


function obtenerConfiguracionMonitor(
  estrategia
) {
  return (
    CONFIGURACION_MONITOR[
      estrategia
    ] ||
    CONFIGURACION_MONITOR
      .rise_fall
  );
}


function obtenerConfiguracionPrediccion(
  estrategia
) {
  return (
    CONFIGURACION_PREDICCION[
      estrategia
    ] ||
    CONFIGURACION_PREDICCION
      .rise_fall
  );
}


function obtenerPuntaje(
  resultado
) {
  const puntaje =
    Number(
      resultado?.puntaje
    );

  return Number.isFinite(
    puntaje
  )
    ? puntaje
    : 0;
}


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


function direccionValida(
  resultado
) {
  return Boolean(
    resultadoValido(resultado) &&
    resultado.direccion !==
      "WAIT"
  );
}


/* =====================================================
4. CREAR MONITOR
===================================================== */

export function crearMonitorOportunidades() {
  let activo = false;

  let estadoActual =
    ESTADOS_MONITOR.INACTIVE;

  let contexto = {
    simbolo: "",
    mercado: "",
    estrategia: "rise_fall",
    modo: "fast",
    horizonte: "10s"
  };

  let resultadoActual = null;
  let resultadoAnterior = null;

  let direccionCandidata = null;
  let estrategiaCandidata = null;

  let ciclosMismaDireccion = 0;
  let ciclosDebiles = 0;
  let ciclosContrarios = 0;

  let inicioPrepare = 0;
  let ultimaConfirmacion = 0;

  let temporizadorPrepare = null;
  let temporizadorTransicion = null;
  let temporizadorResultado = null;

  const historialEstados = [];

  const escuchas = {
    estado: [],
    candidata: [],
    prepare: [],
    revalidando: [],
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
      return false;
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

    return true;
  }


  function quitar(
    evento,
    funcion
  ) {
    if (
      !escuchas[evento]
    ) {
      return false;
    }

    escuchas[evento] =
      escuchas[evento].filter(
        (registrada) =>
          registrada !== funcion
      );

    return true;
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
    historialEstados.unshift({
      estado,
      datos,
      fecha: ahora()
    });

    if (
      historialEstados.length > 50
    ) {
      historialEstados.length = 50;
    }
  }


  function cambiarEstado(
    nuevoEstado,
    datos = {}
  ) {
    estadoActual =
      nuevoEstado;

    guardarEstado(
      nuevoEstado,
      datos
    );

    emitir(
      "estado",
      {
        estado:
          nuevoEstado,

        resultado:
          copiarResultado(
            resultadoActual
          ),

        contexto: {
          ...contexto
        },

        ciclosMismaDireccion,
        ciclosDebiles,
        ciclosContrarios,

        ...datos
      }
    );
  }


  /* ===================================================
  7. TEMPORIZADORES
  =================================================== */

  function limpiarTemporizadorPrepare() {
    if (
      temporizadorPrepare
    ) {
      clearTimeout(
        temporizadorPrepare
      );

      temporizadorPrepare =
        null;
    }
  }


  function limpiarTemporizadorTransicion() {
    if (
      temporizadorTransicion
    ) {
      clearTimeout(
        temporizadorTransicion
      );

      temporizadorTransicion =
        null;
    }
  }


  function limpiarTemporizadorResultado() {
    if (
      temporizadorResultado
    ) {
      clearTimeout(
        temporizadorResultado
      );

      temporizadorResultado =
        null;
    }
  }


  function limpiarTemporizadores() {
    limpiarTemporizadorPrepare();
    limpiarTemporizadorTransicion();
    limpiarTemporizadorResultado();
  }


  /* ===================================================
  8. REINICIAR CANDIDATURA
  =================================================== */

  function reiniciarCandidatura({
    conservarResultadoAnterior = true
  } = {}) {
    if (
      conservarResultadoAnterior &&
      resultadoActual
    ) {
      resultadoAnterior =
        copiarResultado(
          resultadoActual
        );
    }

    resultadoActual = null;

    direccionCandidata = null;
    estrategiaCandidata = null;

    ciclosMismaDireccion = 0;
    ciclosDebiles = 0;
    ciclosContrarios = 0;

    inicioPrepare = 0;

    limpiarTemporizadorPrepare();
  }


  /* ===================================================
  9. CONTEXTO
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
      activo &&
      cambioImportante
    ) {
      reiniciarCandidatura();

      cambiarEstado(
        ESTADOS_MONITOR.MONITORING,
        {
          mensaje:
            "Configuración actualizada. Buscando una nueva entrada."
        }
      );

      diagnostico(
        "La configuración cambió y el análisis fue reiniciado."
      );
    }

    diagnostico(
      `Contexto actualizado: ${contexto.mercado || contexto.simbolo} · ${contexto.estrategia}.`
    );
  }


  /* ===================================================
  10. INICIAR Y DETENER
  =================================================== */

  function iniciar() {
    activo = true;

    limpiarTemporizadores();
    reiniciarCandidatura();

    cambiarEstado(
      ESTADOS_MONITOR.MONITORING,
      {
        mensaje:
          `${contexto.mercado || "Mercado seleccionado"}. Buscando entrada.`
      }
    );

    diagnostico(
      "Monitor de oportunidades activado.",
      "exito"
    );

    return true;
  }


  function detener(
    motivo =
      "Motor de análisis apagado."
  ) {
    activo = false;

    limpiarTemporizadores();
    reiniciarCandidatura();

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

    return true;
  }


  /* ===================================================
  11. COMPARAR CANDIDATURAS
  =================================================== */

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


  function resultadoContrario(
    resultado
  ) {
    return Boolean(
      direccionValida(resultado) &&
      direccionCandidata &&
      resultado.direccion !==
        direccionCandidata
    );
  }


  /* ===================================================
  12. ACTIVAR CANDIDATA
  =================================================== */

  function activarCandidata(
    resultado
  ) {
    resultadoActual =
      copiarResultado(
        resultado
      );

    cambiarEstado(
      ESTADOS_MONITOR.CANDIDATE,
      {
        mensaje:
          "Posible oportunidad detectada. Validando estabilidad."
      }
    );

    emitir(
      "candidata",
      {
        resultado:
          copiarResultado(
            resultadoActual
          ),

        contexto: {
          ...contexto
        },

        ciclos:
          ciclosMismaDireccion
      }
    );

    diagnostico(
      `CANDIDATE: ${resultado.direccion} · ${resultado.puntaje}/100.`
    );
  }


  /* ===================================================
  13. ACTIVAR PREPARE
  =================================================== */

  function activarPrepare(
    resultado
  ) {
    const configuracionMonitor =
      obtenerConfiguracionMonitor(
        resultado.estrategia
      );

    resultadoActual =
      copiarResultado(
        resultado
      );

    inicioPrepare =
      ahora();

    ciclosDebiles = 0;
    ciclosContrarios = 0;

    cambiarEstado(
      ESTADOS_MONITOR.PREPARE,
      {
        mensaje:
          `Posible ${resultado.direccion}. Prepare la operación y espere confirmación.`
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

        ciclos:
          ciclosMismaDireccion
      }
    );

    diagnostico(
      `PREPARE: ${resultado.direccion} · ${resultado.puntaje}/100.`,
      "advertencia"
    );

    limpiarTemporizadorPrepare();

    temporizadorPrepare =
      setTimeout(
        () => {
          if (
            activo &&
            [
              ESTADOS_MONITOR.PREPARE,
              ESTADOS_MONITOR.REVALIDATING
            ].includes(
              estadoActual
            )
          ) {
            cancelarOportunidad(
              "La oportunidad no logró confirmarse dentro del tiempo permitido."
            );
          }
        },
        configuracionMonitor
          .tiempoMaximoPrepare
      );
  }


  /* ===================================================
  14. REVALIDACIÓN
  =================================================== */

  function activarRevalidacion(
    resultado
  ) {
    resultadoActual =
      copiarResultado(
        resultado
      );

    cambiarEstado(
      ESTADOS_MONITOR.REVALIDATING,
      {
        mensaje:
          "Revalidando la entrada con los últimos datos del mercado."
      }
    );

    emitir(
      "revalidando",
      {
        resultado:
          copiarResultado(
            resultadoActual
          ),

        contexto: {
          ...contexto
        },

        ciclos:
          ciclosMismaDireccion
      }
    );

    diagnostico(
      `REVALIDATING: ${resultado.direccion} · ${resultado.puntaje}/100.`
    );
  }


  /* ===================================================
  15. CONFIRMAR OPORTUNIDAD
  =================================================== */

  function puedeConfirmar(
    resultado
  ) {
    const configuracionMonitor =
      obtenerConfiguracionMonitor(
        resultado.estrategia
      );

    const configuracionPrediccion =
      obtenerConfiguracionPrediccion(
        resultado.estrategia
      );

    const tiempoEnPrepare =
      ahora() -
      inicioPrepare;

    const tiempoDesdeUltima =
      ahora() -
      ultimaConfirmacion;

    const aptaParaConfirmacion =
      Boolean(
        resultado.metadata
          ?.aptaParaConfirmacion
      );

    return Boolean(
      estadoActual ===
        ESTADOS_MONITOR.REVALIDATING &&
      obtenerPuntaje(resultado) >=
        configuracionPrediccion
          .puntajeConfirmado &&
      ciclosMismaDireccion >=
        configuracionMonitor
          .ciclosConfirmacion &&
      tiempoEnPrepare >=
        configuracionMonitor
          .tiempoMinimoPrepare &&
      ciclosContrarios === 0 &&
      aptaParaConfirmacion &&
      tiempoDesdeUltima >=
        configuracionMonitor
          .tiempoEnfriamiento
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

    ultimaConfirmacion =
      ahora();

    cambiarEstado(
      ESTADOS_MONITOR.CONFIRMED,
      {
        mensaje:
          `${resultado.direccion} confirmado. Ejecute ahora.`
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

        ciclos:
          ciclosMismaDireccion
      }
    );

    diagnostico(
      `CONFIRMED: ${resultado.direccion} · ${resultado.puntaje}/100.`,
      "exito"
    );

    return true;
  }


  /* ===================================================
  16. EJECUTANDO
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
          "La señal está dentro de la ventana de ejecución."
      }
    );

    return true;
  }


  /* ===================================================
  17. CANCELAR
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

    reiniciarCandidatura();

    if (
      activo &&
      regresarAlMonitoreo
    ) {
      limpiarTemporizadorTransicion();

      temporizadorTransicion =
        setTimeout(
          () => {
            if (activo) {
              cambiarEstado(
                ESTADOS_MONITOR.MONITORING,
                {
                  mensaje:
                    "Continuando la búsqueda de una entrada."
                }
              );
            }
          },
          1500
        );
    }

    return true;
  }


  /* ===================================================
  18. REGISTRAR RESULTADO
  =================================================== */

  function registrarResultado({
    acierto,
    detalle = "",
    datos = {}
  } = {}) {
    if (
      ![
        ESTADOS_MONITOR.CONFIRMED,
        ESTADOS_MONITOR.EXECUTING
      ].includes(
        estadoActual
      )
    ) {
      diagnostico(
        "No existe una señal activa para registrar el resultado.",
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
        acierto:
          exitoso,

        mensaje:
          exitoso
            ? "La predicción fue acertada."
            : "La predicción no fue acertada.",

        detalle,
        datos
      }
    );

    emitir(
      "resultado",
      {
        acierto:
          exitoso,

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
        ? "Resultado: ACIERTO."
        : "Resultado: FALLO.",

      exitoso
        ? "exito"
        : "error"
    );

    reiniciarCandidatura();

    limpiarTemporizadorResultado();

    temporizadorResultado =
      setTimeout(
        () => {
          if (activo) {
            cambiarEstado(
              ESTADOS_MONITOR.MONITORING,
              {
                mensaje:
                  "Señal finalizada. Buscando una nueva entrada."
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
        4500
      );

    return true;
  }


  /* ===================================================
  19. PROCESAR ANÁLISIS
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

    const estrategia =
      resultado.estrategia ||
      contexto.estrategia;

    const configuracionMonitor =
      obtenerConfiguracionMonitor(
        estrategia
      );

    const configuracionPrediccion =
      obtenerConfiguracionPrediccion(
        estrategia
      );

    const puntaje =
      obtenerPuntaje(
        resultado
      );


    /*
    -----------------------------------------------------
    RESULTADO WAIT O DÉBIL
    -----------------------------------------------------
    */

    if (
      !direccionValida(
        resultado
      ) ||
      puntaje <
        configuracionPrediccion
          .puntajeCandidata
    ) {
      if (
        [
          ESTADOS_MONITOR.PREPARE,
          ESTADOS_MONITOR.REVALIDATING
        ].includes(
          estadoActual
        )
      ) {
        ciclosDebiles++;

        if (
          ciclosDebiles >
            configuracionMonitor
              .ciclosDebilesPermitidos
        ) {
          cancelarOportunidad(
            "La configuración perdió fuerza durante varios análisis."
          );
        }

        return {
          estado:
            estadoActual,

          procesado: true,

          tolerancia: true,

          ciclosDebiles
        };
      }

      reiniciarCandidatura();

      if (
        estadoActual !==
        ESTADOS_MONITOR.MONITORING
      ) {
        cambiarEstado(
          ESTADOS_MONITOR.MONITORING,
          {
            mensaje:
              "Buscando una configuración más sólida."
          }
        );
      }

      return {
        estado:
          ESTADOS_MONITOR.MONITORING,

        procesado: true,

        resultado
      };
    }


    /*
    -----------------------------------------------------
    DIRECCIÓN CONTRARIA
    -----------------------------------------------------
    */

    if (
      resultadoContrario(
        resultado
      )
    ) {
      ciclosContrarios++;

      if (
        [
          ESTADOS_MONITOR.PREPARE,
          ESTADOS_MONITOR.REVALIDATING
        ].includes(
          estadoActual
        ) &&
        ciclosContrarios <=
          configuracionMonitor
            .ciclosContrariosPermitidos
      ) {
        diagnostico(
          `Lectura contraria tolerada: ${ciclosContrarios}/${configuracionMonitor.ciclosContrariosPermitidos}.`,
          "advertencia"
        );

        return {
          estado:
            estadoActual,

          procesado: true,

          tolerancia: true,

          ciclosContrarios
        };
      }

      if (
        [
          ESTADOS_MONITOR.PREPARE,
          ESTADOS_MONITOR.REVALIDATING
        ].includes(
          estadoActual
        )
      ) {
        cancelarOportunidad(
          "La dirección contraria se mantuvo durante varios análisis."
        );

        return {
          estado:
            ESTADOS_MONITOR.CANCELLED,

          procesado: true
        };
      }

      direccionCandidata =
        resultado.direccion;

      estrategiaCandidata =
        resultado.estrategia;

      resultadoActual =
        copiarResultado(
          resultado
        );

      ciclosMismaDireccion = 1;
      ciclosDebiles = 0;
      ciclosContrarios = 0;

      return {
        estado:
          estadoActual,

        procesado: true,

        ciclosMismaDireccion
      };
    }


    /*
    -----------------------------------------------------
    MISMA DIRECCIÓN
    -----------------------------------------------------
    */

    if (
      mismaCandidatura(
        resultado
      )
    ) {
      ciclosMismaDireccion++;
    } else {
      direccionCandidata =
        resultado.direccion;

      estrategiaCandidata =
        resultado.estrategia;

      ciclosMismaDireccion = 1;
    }

    ciclosDebiles = 0;
    ciclosContrarios = 0;

    resultadoAnterior =
      copiarResultado(
        resultadoActual
      );

    resultadoActual =
      copiarResultado(
        resultado
      );


    /*
    -----------------------------------------------------
    CANDIDATE
    -----------------------------------------------------
    */

    if (
      estadoActual ===
        ESTADOS_MONITOR.MONITORING &&
      ciclosMismaDireccion >=
        configuracionMonitor
          .ciclosCandidata &&
      puntaje >=
        configuracionPrediccion
          .puntajeCandidata
    ) {
      activarCandidata(
        resultado
      );
    }


    /*
    -----------------------------------------------------
    PREPARE
    -----------------------------------------------------
    */

    if (
      [
        ESTADOS_MONITOR.MONITORING,
        ESTADOS_MONITOR.CANDIDATE
      ].includes(
        estadoActual
      ) &&
      ciclosMismaDireccion >=
        configuracionMonitor
          .ciclosPrepare &&
      puntaje >=
        configuracionPrediccion
          .puntajePrepare
    ) {
      activarPrepare(
        resultado
      );
    }


    /*
    -----------------------------------------------------
    REVALIDATING
    -----------------------------------------------------
    */

    const tiempoEnPrepare =
      ahora() -
      inicioPrepare;

    if (
      estadoActual ===
        ESTADOS_MONITOR.PREPARE &&
      ciclosMismaDireccion >=
        configuracionMonitor
          .ciclosRevalidacion &&
      tiempoEnPrepare >=
        configuracionMonitor
          .tiempoMinimoPrepare
    ) {
      activarRevalidacion(
        resultado
      );
    }


    /*
    -----------------------------------------------------
    CONFIRMED
    -----------------------------------------------------
    */

    if (
      puedeConfirmar(
        resultado
      )
    ) {
      confirmarOportunidad(
        resultado
      );
    }


    return {
      estado:
        estadoActual,

      procesado: true,

      resultado:
        copiarResultado(
          resultadoActual
        ),

      ciclosMismaDireccion,
      ciclosDebiles,
      ciclosContrarios
    };
  }


  /* ===================================================
  20. CONSULTAS
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

      ciclosMismaDireccion,
      ciclosDebiles,
      ciclosContrarios,

      inicioPrepare,
      ultimaConfirmacion,

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
    return [
      ESTADOS_MONITOR.PREPARE,
      ESTADOS_MONITOR.REVALIDATING
    ].includes(
      estadoActual
    );
  }


  /* ===================================================
  21. DESTRUIR
  =================================================== */

  function destruir() {
    activo = false;

    limpiarTemporizadores();
    reiniciarCandidatura();

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
  22. API PÚBLICA
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
23. INSTANCIA PRINCIPAL
===================================================== */

export const monitorOportunidades =
  crearMonitorOportunidades();


/*
=========================================================
FIN DEL ARCHIVO js/monitor.js
TRADING ANALYST PRO MR
=========================================================
*/
