/*
=========================================================
TRADING ANALYST V8 PRO
Archivo: js/monitor.js

VERSIÓN ESTABLE DE PREALERTA

Responsabilidad:
- Buscar oportunidades continuamente.
- Mantener una candidatura interna antes de mostrar PREPARE.
- Evitar cancelaciones por un solo tick contrario.
- Dar tiempo suficiente para preparar el bot manual.
- Administrar:
  INACTIVE
  MONITORING
  CANDIDATE
  PREPARE
  CONFIRMED
  EXECUTING
  RESULT
  CANCELLED
=========================================================
*/


/* =====================================================
1. ESTADOS DEL MONITOR
===================================================== */

export const ESTADOS_MONITOR = Object.freeze({
  INACTIVE: "INACTIVE",
  MONITORING: "MONITORING",
  CANDIDATE: "CANDIDATE",
  PREPARE: "PREPARE",
  CONFIRMED: "CONFIRMED",
  EXECUTING: "EXECUTING",
  RESULT: "RESULT",
  CANCELLED: "CANCELLED"
});


/* =====================================================
2. CONFIGURACIÓN PRINCIPAL
===================================================== */

export const CONFIGURACION_MONITOR = Object.freeze({
  /*
  La señal debe repetirse internamente antes de mostrar PREPARE.
  */
  ciclosParaCandidata: 2,
  ciclosParaPrepare: 4,
  ciclosParaConfirmar: 7,

  /*
  Tolerancia frente a pequeñas caídas de puntaje o ticks contrarios.
  */
  ciclosDebilesPermitidos: 2,
  ciclosContrariosParaCancelar: 3,

  /*
  Umbrales de calidad.
  */
  puntajeCandidata: 58,
  puntajePrepare: 68,
  puntajeConfirmado: 80,

  /*
  Histeresis:
  PREPARE no se cancela hasta caer claramente por debajo.
  */
  puntajeCancelacionPrepare: 57,

  /*
  PREPARE permanecerá visible como mínimo cuatro segundos.
  */
  tiempoMinimoPrepare: 4000,
  tiempoMaximoPrepare: 16000,

  /*
  Evita señales consecutivas demasiado cercanas.
  */
  intervaloEntreSenales: 6000,

  /*
  Tiempo de visualización.
  */
  tiempoMostrarCancelacion: 1800,
  tiempoMostrarResultado: 5000,

  maximoHistorialEstados: 40
});


/* =====================================================
3. UTILIDADES
===================================================== */

function ahora() {
  return Date.now();
}


function copiarResultado(resultado) {
  if (
    !resultado ||
    typeof resultado !== "object"
  ) {
    return null;
  }

  return {
    ...resultado,

    razones: Array.isArray(resultado.razones)
      ? [...resultado.razones]
      : [],

    advertencias: Array.isArray(resultado.advertencias)
      ? [...resultado.advertencias]
      : [],

    metadata:
      resultado.metadata &&
      typeof resultado.metadata === "object"
        ? { ...resultado.metadata }
        : {}
  };
}


function direccionValida(resultado) {
  return Boolean(
    resultado &&
    typeof resultado.direccion === "string" &&
    resultado.direccion !== "WAIT"
  );
}


function obtenerPuntaje(resultado) {
  const puntaje = Number(resultado?.puntaje);

  return Number.isFinite(puntaje)
    ? puntaje
    : 0;
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
  let estadoActual = ESTADOS_MONITOR.INACTIVE;

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
    candidata: [],
    prepare: [],
    confirmado: [],
    cancelado: [],
    resultado: [],
    diagnostico: []
  };


  /* ===================================================
  5. EVENTOS
  =================================================== */

  function al(evento, funcion) {
    if (
      !escuchas[evento] ||
      typeof funcion !== "function"
    ) {
      return false;
    }

    if (!escuchas[evento].includes(funcion)) {
      escuchas[evento].push(funcion);
    }

    return true;
  }


  function quitar(evento, funcion) {
    if (!escuchas[evento]) {
      return false;
    }

    escuchas[evento] =
      escuchas[evento].filter(
        (registrada) =>
          registrada !== funcion
      );

    return true;
  }


  function emitir(evento, datos = {}) {
    const funciones =
      escuchas[evento] || [];

    funciones.forEach((funcion) => {
      try {
        funcion(datos);
      } catch (error) {
        console.error(
          `Error en evento ${evento}:`,
          error
        );
      }
    });
  }


  function diagnostico(
    mensaje,
    tipo = "normal"
  ) {
    emitir("diagnostico", {
      mensaje,
      tipo,
      fecha: ahora()
    });
  }


  /* ===================================================
  6. HISTORIAL Y ESTADOS
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
      historialEstados.length >
      configuracion.maximoHistorialEstados
    ) {
      historialEstados.length =
        configuracion.maximoHistorialEstados;
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

    emitir("estado", {
      estado: nuevoEstado,

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
    });
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


  function limpiarTemporizadorTransicion() {
    if (temporizadorTransicion) {
      clearTimeout(
        temporizadorTransicion
      );

      temporizadorTransicion = null;
    }
  }


  function limpiarTemporizadorResultado() {
    if (temporizadorResultado) {
      clearTimeout(
        temporizadorResultado
      );

      temporizadorResultado = null;
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
    direccionCandidata = null;
    estrategiaCandidata = null;

    ciclosMismaDireccion = 0;
    ciclosDebiles = 0;
    ciclosContrarios = 0;

    inicioPrepare = 0;

    if (conservarResultadoAnterior) {
      resultadoAnterior =
        resultadoActual;
    }

    resultadoActual = null;

    limpiarTemporizadorPrepare();
  }


  /* ===================================================
  9. CONTEXTO
  =================================================== */

  function establecerContexto(
    nuevoContexto = {}
  ) {
    const anterior = {
      ...contexto
    };

    contexto = {
      ...contexto,
      ...nuevoContexto
    };

    const cambioImportante =
      anterior.simbolo !== contexto.simbolo ||
      anterior.estrategia !== contexto.estrategia ||
      anterior.modo !== contexto.modo ||
      anterior.horizonte !== contexto.horizonte;

    if (
      cambioImportante &&
      activo
    ) {
      /*
      No se muestra CANCELLED porque el usuario solo cambió
      la configuración. Se reinicia silenciosamente.
      */
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
      `Contexto: ${contexto.mercado || contexto.simbolo} · ${contexto.estrategia}.`
    );
  }


  /* ===================================================
  10. INICIAR
  =================================================== */

  function iniciar() {
    /*
    Permite reiniciar correctamente incluso si ya estaba activo.
    */
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


  /* ===================================================
  11. DETENER
  =================================================== */

  function detener(
    motivo =
      "Monitor detenido."
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
  12. VALIDAR RESULTADO
  =================================================== */

  function resultadoValido(resultado) {
    return Boolean(
      resultado &&
      typeof resultado === "object" &&
      typeof resultado.estrategia === "string" &&
      typeof resultado.direccion === "string" &&
      Number.isFinite(
        Number(resultado.puntaje)
      )
    );
  }


  function mismaCandidatura(resultado) {
    return Boolean(
      resultado &&
      resultado.direccion === direccionCandidata &&
      resultado.estrategia === estrategiaCandidata
    );
  }


  function resultadoContrario(resultado) {
    return Boolean(
      direccionValida(resultado) &&
      direccionCandidata &&
      resultado.direccion !== direccionCandidata
    );
  }


  /* ===================================================
  13. CANDIDATA INTERNA
  =================================================== */

  function activarCandidata(resultado) {
    resultadoActual =
      copiarResultado(resultado);

    cambiarEstado(
      ESTADOS_MONITOR.CANDIDATE,
      {
        mensaje:
          "Se detectó una configuración preliminar. Validando estabilidad."
      }
    );

    emitir("candidata", {
      resultado:
        copiarResultado(resultadoActual),

      contexto: {
        ...contexto
      },

      ciclos:
        ciclosMismaDireccion
    });

    diagnostico(
      `Candidatura interna: ${resultado.direccion} · ${resultado.puntaje}/100.`
    );
  }


  /* ===================================================
  14. PREPARE
  =================================================== */

  function activarPrepare(resultado) {
    resultadoActual =
      copiarResultado(resultado);

    inicioPrepare = ahora();
    ciclosDebiles = 0;
    ciclosContrarios = 0;

    cambiarEstado(
      ESTADOS_MONITOR.PREPARE,
      {
        mensaje:
          `Posible ${resultado.direccion}. Prepare la operación y espere confirmación.`
      }
    );

    emitir("prepare", {
      resultado:
        copiarResultado(resultadoActual),

      contexto: {
        ...contexto
      },

      ciclos:
        ciclosMismaDireccion
    });

    diagnostico(
      `PREPARE: ${resultado.direccion} · ${resultado.puntaje}/100.`,
      "advertencia"
    );

    limpiarTemporizadorPrepare();

    temporizadorPrepare =
      setTimeout(() => {
        if (
          activo &&
          estadoActual === ESTADOS_MONITOR.PREPARE
        ) {
          cancelarOportunidad(
            "La oportunidad no logró confirmarse dentro del tiempo permitido."
          );
        }
      }, configuracion.tiempoMaximoPrepare);
  }


  /* ===================================================
  15. CONFIRMAR
  =================================================== */

  function puedeConfirmar(resultado) {
    const tiempoEnPrepare =
      ahora() - inicioPrepare;

    const tiempoDesdeAnterior =
      ahora() - ultimaConfirmacion;

    return Boolean(
      estadoActual === ESTADOS_MONITOR.PREPARE &&
      obtenerPuntaje(resultado) >=
        configuracion.puntajeConfirmado &&
      ciclosMismaDireccion >=
        configuracion.ciclosParaConfirmar &&
      tiempoEnPrepare >=
        configuracion.tiempoMinimoPrepare &&
      ciclosContrarios === 0 &&
      tiempoDesdeAnterior >=
        configuracion.intervaloEntreSenales
    );
  }


  function confirmarOportunidad(resultado) {
    limpiarTemporizadorPrepare();

    resultadoActual =
      copiarResultado(resultado);

    resultadoActual.estado =
      "CONFIRMED";

    resultadoActual.ejecutable =
      true;

    ultimaConfirmacion = ahora();

    cambiarEstado(
      ESTADOS_MONITOR.CONFIRMED,
      {
        mensaje:
          `${resultado.direccion} confirmado. Ejecute ahora.`
      }
    );

    emitir("confirmado", {
      resultado:
        copiarResultado(resultadoActual),

      contexto: {
        ...contexto
      },

      ciclos:
        ciclosMismaDireccion
    });

    diagnostico(
      `CONFIRMED: ${resultado.direccion} · ${resultado.puntaje}/100.`,
      "exito"
    );

    return true;
  }


  /* ===================================================
  16. EJECUCIÓN
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
          "La señal se encuentra dentro de la ventana de ejecución."
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
      copiarResultado(resultadoActual);

    limpiarTemporizadorPrepare();

    cambiarEstado(
      ESTADOS_MONITOR.CANCELLED,
      {
        mensaje: motivo,
        resultado:
          resultadoCancelado
      }
    );

    emitir("cancelado", {
      motivo,

      resultado:
        resultadoCancelado,

      contexto: {
        ...contexto
      }
    });

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
        setTimeout(() => {
          if (activo) {
            cambiarEstado(
              ESTADOS_MONITOR.MONITORING,
              {
                mensaje:
                  "Continuando la búsqueda de una entrada."
              }
            );
          }
        }, configuracion.tiempoMostrarCancelacion);
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
      estadoActual !== ESTADOS_MONITOR.CONFIRMED &&
      estadoActual !== ESTADOS_MONITOR.EXECUTING
    ) {
      diagnostico(
        "No existe una señal activa para registrar el resultado.",
        "advertencia"
      );

      return false;
    }

    const resultadoEvaluado =
      copiarResultado(resultadoActual);

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

    emitir("resultado", {
      acierto:
        exitoso,

      resultado:
        resultadoEvaluado,

      detalle,
      datos,

      contexto: {
        ...contexto
      }
    });

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
      setTimeout(() => {
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
      }, configuracion.tiempoMostrarResultado);

    return true;
  }


  /* ===================================================
  19. PROCESAR CADA ANÁLISIS
  =================================================== */

  function procesar(resultado) {
    if (!activo) {
      return {
        estado:
          ESTADOS_MONITOR.INACTIVE,

        procesado:
          false,

        razon:
          "El monitor está apagado."
      };
    }

    if (!resultadoValido(resultado)) {
      diagnostico(
        "El motor entregó un resultado inválido.",
        "error"
      );

      return {
        estado:
          estadoActual,

        procesado:
          false,

        razon:
          "Resultado inválido."
      };
    }

    /*
    Mientras existe una señal confirmada, no se reemplaza
    por otra predicción.
    */
    if (
      [
        ESTADOS_MONITOR.CONFIRMED,
        ESTADOS_MONITOR.EXECUTING,
        ESTADOS_MONITOR.RESULT
      ].includes(estadoActual)
    ) {
      return {
        estado:
          estadoActual,

        procesado:
          false,

        razon:
          "Existe una señal activa."
      };
    }

    const puntaje =
      obtenerPuntaje(resultado);

    /*
    -----------------------------------------------------
    RESULTADO WAIT O MUY DÉBIL
    -----------------------------------------------------
    */

    if (
      !direccionValida(resultado) ||
      puntaje <
        configuracion.puntajeCandidata
    ) {
      if (
        estadoActual === ESTADOS_MONITOR.PREPARE
      ) {
        ciclosDebiles++;

        /*
        No cancelar inmediatamente.
        */
        if (
          ciclosDebiles >
            configuracion.ciclosDebilesPermitidos &&
          puntaje <
            configuracion.puntajeCancelacionPrepare
        ) {
          cancelarOportunidad(
            "La configuración perdió fuerza durante varios análisis."
          );
        }

        return {
          estado:
            estadoActual,

          procesado:
            true,

          tolerancia:
            true,

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

        procesado:
          true,

        resultado
      };
    }

    /*
    -----------------------------------------------------
    DIRECCIÓN CONTRARIA
    -----------------------------------------------------
    */

    if (
      resultadoContrario(resultado)
    ) {
      ciclosContrarios++;

      /*
      Una sola lectura contraria no elimina PREPARE.
      */
      if (
        estadoActual === ESTADOS_MONITOR.PREPARE &&
        ciclosContrarios <
          configuracion.ciclosContrariosParaCancelar
      ) {
        diagnostico(
          `Lectura contraria tolerada: ${ciclosContrarios}/${configuracion.ciclosContrariosParaCancelar}.`,
          "advertencia"
        );

        return {
          estado:
            estadoActual,

          procesado:
            true,

          tolerancia:
            true,

          ciclosContrarios
        };
      }

      if (
        estadoActual === ESTADOS_MONITOR.PREPARE
      ) {
        cancelarOportunidad(
          "La dirección contraria se mantuvo durante varios análisis."
        );

        return {
          estado:
            ESTADOS_MONITOR.CANCELLED,

          procesado:
            true
        };
      }

      /*
      Fuera de PREPARE, se sustituye la candidatura.
      */
      direccionCandidata =
        resultado.direccion;

      estrategiaCandidata =
        resultado.estrategia;

      ciclosMismaDireccion = 1;
      ciclosDebiles = 0;
      ciclosContrarios = 0;

      resultadoActual =
        copiarResultado(resultado);

      return {
        estado:
          estadoActual,

        procesado:
          true,

        ciclosMismaDireccion
      };
    }

    /*
    -----------------------------------------------------
    MISMA DIRECCIÓN
    -----------------------------------------------------
    */

    if (
      mismaCandidatura(resultado)
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
      resultadoActual;

    resultadoActual =
      copiarResultado(resultado);

    /*
    -----------------------------------------------------
    CANDIDATA INTERNA
    -----------------------------------------------------
    */

    if (
      estadoActual === ESTADOS_MONITOR.MONITORING &&
      ciclosMismaDireccion >=
        configuracion.ciclosParaCandidata &&
      puntaje >=
        configuracion.puntajeCandidata
    ) {
      activarCandidata(resultado);
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
      ].includes(estadoActual) &&
      ciclosMismaDireccion >=
        configuracion.ciclosParaPrepare &&
      puntaje >=
        configuracion.puntajePrepare
    ) {
      activarPrepare(resultado);
    }

    /*
    -----------------------------------------------------
    CONFIRMED
    -----------------------------------------------------
    */

    if (puedeConfirmar(resultado)) {
      confirmarOportunidad(resultado);
    }

    return {
      estado:
        estadoActual,

      procesado:
        true,

      resultado:
        copiarResultado(resultadoActual),

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
    ].includes(estadoActual);
  }


  function estaPreparando() {
    return (
      estadoActual ===
      ESTADOS_MONITOR.PREPARE
    );
  }


  /* ===================================================
  21. DESTRUIR
  =================================================== */

  function destruir() {
    activo = false;

    limpiarTemporizadores();
    reiniciarCandidatura();

    Object.keys(escuchas).forEach(
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
TRADING ANALYST V8 PRO
=========================================================
*/
