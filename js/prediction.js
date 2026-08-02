/*
=========================================================
TRADING ANALYST PRO MR
Archivo: js/prediction.js

Responsabilidad:
- Calcular el Signal Score.
- Aplicar reglas independientes por estrategia.
- Generar oportunidades para:
  Rise / Fall
  Even / Odd
  Over / Under
  Matches
- Entregar las señales al monitor.
=========================================================
*/

import {
  limitarNumero,
  resumenTecnicoValido
} from "./indicators.js";


/* =====================================================
1. CONFIGURACIÓN POR ESTRATEGIA
===================================================== */

export const CONFIGURACION_PREDICCION = Object.freeze({
  rise_fall: {
    puntajeCandidata: 56,
    puntajePrepare: 67,
    puntajeConfirmado: 80,
    diferenciaMinima: 14,
    maximoPuntaje: 100
  },

  even_odd: {
    puntajeCandidata: 54,
    puntajePrepare: 64,
    puntajeConfirmado: 74,
    diferenciaMinima: 10,
    minimoDigitos: 20,
    maximoPuntaje: 86
  },

  over_under: {
    puntajeCandidata: 54,
    puntajePrepare: 64,
    puntajeConfirmado: 74,
    diferenciaMinima: 10,
    minimoDigitos: 20,
    maximoPuntaje: 86
  },

  match: {
    puntajeCandidata: 52,
    puntajePrepare: 62,
    puntajeConfirmado: 70,
    minimoDigitos: 30,
    frecuenciaMinima: 4,
    porcentajeMinimo: 15,
    ventanaEvaluacionTicks: 5,
    maximoPuntaje: 82
  }
});


/* =====================================================
2. NOMBRES VISIBLES Y DE VOZ
===================================================== */

export const NOMBRES_ESTRATEGIAS = Object.freeze({
  rise_fall: "Rise / Fall",
  even_odd: "Even / Odd",
  over_under: "Over / Under",
  match: "Matches"
});


export const NOMBRES_VOZ = Object.freeze({
  RISE: "Sube",
  FALL: "Baja",
  EVEN: "Par",
  ODD: "Impar",
  OVER: "Mayor",
  UNDER: "Menor",
  MATCH: "Coincidencia",
  WAIT: "Esperar"
});


/* =====================================================
3. UTILIDADES
===================================================== */

function numeroSeguro(
  valor,
  predeterminado = 0
) {
  const numero =
    Number(valor);

  return Number.isFinite(numero)
    ? numero
    : predeterminado;
}


function agregarTexto(
  lista,
  texto
) {
  if (
    Array.isArray(lista) &&
    typeof texto === "string" &&
    texto.trim()
  ) {
    lista.push(
      texto.trim()
    );
  }
}


function obtenerConfiguracion(
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


/* =====================================================
4. RESULTADO BASE
===================================================== */

function crearResultadoBase({
  estrategia,
  direccion = "WAIT",
  puntaje = 0,
  estado = "MONITORING",
  razones = [],
  advertencias = [],
  componentes = {},
  metadata = {}
}) {
  const puntajeFinal =
    Math.round(
      limitarNumero(
        numeroSeguro(puntaje),
        0,
        100
      )
    );

  return {
    estrategia,

    nombreEstrategia:
      NOMBRES_ESTRATEGIAS[
        estrategia
      ] || estrategia,

    direccion,

    nombreVoz:
      NOMBRES_VOZ[
        direccion
      ] || direccion,

    puntaje:
      puntajeFinal,

    estado,

    ejecutable:
      estado === "CONFIRMED",

    razones:
      Array.isArray(razones)
        ? razones
        : [],

    advertencias:
      Array.isArray(advertencias)
        ? advertencias
        : [],

    componentes:
      componentes &&
      typeof componentes === "object"
        ? componentes
        : {},

    metadata:
      metadata &&
      typeof metadata === "object"
        ? metadata
        : {},

    creadoEn:
      Date.now()
  };
}


export function crearResultadoMonitoreo(
  estrategia,
  mensaje =
    "Buscando una configuración técnica más sólida."
) {
  return crearResultadoBase({
    estrategia,
    direccion: "WAIT",
    puntaje: 0,
    estado: "MONITORING",
    razones: [mensaje]
  });
}


/* =====================================================
5. CLASIFICACIÓN DEL PUNTAJE
===================================================== */

export function clasificarPuntaje(
  puntaje,
  estrategia = "rise_fall"
) {
  const configuracion =
    obtenerConfiguracion(
      estrategia
    );

  const valor =
    limitarNumero(
      numeroSeguro(puntaje),
      0,
      100
    );

  if (
    valor >=
    configuracion
      .puntajeConfirmado
  ) {
    return {
      nivel: "STRONG",
      descripcion:
        "La señal puede pasar a revalidación.",
      prioridad: 4
    };
  }

  if (
    valor >=
    configuracion
      .puntajePrepare
  ) {
    return {
      nivel: "PREPARE",
      descripcion:
        "Posible oportunidad en formación.",
      prioridad: 3
    };
  }

  if (
    valor >=
    configuracion
      .puntajeCandidata
  ) {
    return {
      nivel: "CANDIDATE",
      descripcion:
        "Configuración preliminar en validación.",
      prioridad: 2
    };
  }

  if (valor >= 40) {
    return {
      nivel: "MONITORING",
      descripcion:
        "La señal todavía no tiene suficiente fuerza.",
      prioridad: 1
    };
  }

  return {
    nivel: "NO TRADE",
    descripcion:
      "No existe una ventaja técnica clara.",
    prioridad: 0
  };
}


/* =====================================================
6. ESTADO PRELIMINAR
===================================================== */

function obtenerEstadoPreliminar(
  estrategia,
  puntaje
) {
  const clasificacion =
    clasificarPuntaje(
      puntaje,
      estrategia
    );

  if (
    clasificacion.nivel ===
      "STRONG" ||
    clasificacion.nivel ===
      "PREPARE"
  ) {
    return "PREPARE";
  }

  if (
    clasificacion.nivel ===
    "CANDIDATE"
  ) {
    return "CANDIDATE";
  }

  return "MONITORING";
}


/* =====================================================
7. RISE / FALL
===================================================== */

export function evaluarRiseFall(
  resumen
) {
  if (
    !resumenTecnicoValido(
      resumen
    )
  ) {
    return crearResultadoMonitoreo(
      "rise_fall",
      "Todavía no existen suficientes datos para evaluar Rise / Fall."
    );
  }

  const configuracion =
    CONFIGURACION_PREDICCION
      .rise_fall;

  const razonesBullish = [];
  const razonesBearish = [];
  const advertencias = [];

  let bullish = 0;
  let bearish = 0;

  const tendencia =
    resumen.tendencia;

  const momentum =
    resumen.momentum;

  const flujoCorto =
    resumen.flujoCorto;

  const flujoMedio =
    resumen.flujoMedio;

  const volatilidad =
    resumen.volatilidad;

  const fibonacci =
    resumen.fibonacci;

  const mercadoLateral =
    resumen.mercadoLateral;

  const rsi =
    numeroSeguro(
      resumen.rsi
    );

  const interpretacionRsi =
    resumen.interpretacionRsi;


  /*
  -------------------------------------------------------
  TENDENCIA
  -------------------------------------------------------
  */

  if (
    tendencia?.direccion ===
    "ALCISTA"
  ) {
    bullish +=
      18 +
      numeroSeguro(
        tendencia.fuerza
      ) * 4;

    agregarTexto(
      razonesBullish,
      "La tendencia reciente es alcista."
    );
  }

  if (
    tendencia?.direccion ===
    "BAJISTA"
  ) {
    bearish +=
      18 +
      numeroSeguro(
        tendencia.fuerza
      ) * 4;

    agregarTexto(
      razonesBearish,
      "La tendencia reciente es bajista."
    );
  }

  if (
    tendencia?.lateral ||
    tendencia?.direccion ===
      "LATERAL"
  ) {
    agregarTexto(
      advertencias,
      "La tendencia todavía presenta comportamiento lateral."
    );
  }


  /*
  -------------------------------------------------------
  RSI
  -------------------------------------------------------
  */

  if (
    interpretacionRsi?.direccion ===
    "BULLISH"
  ) {
    bullish +=
      10 +
      numeroSeguro(
        interpretacionRsi.fuerza
      ) * 4;

    agregarTexto(
      razonesBullish,
      `RSI ${rsi.toFixed(1)} favorece presión alcista.`
    );
  }

  if (
    interpretacionRsi?.direccion ===
    "BEARISH"
  ) {
    bearish +=
      10 +
      numeroSeguro(
        interpretacionRsi.fuerza
      ) * 4;

    agregarTexto(
      razonesBearish,
      `RSI ${rsi.toFixed(1)} favorece presión bajista.`
    );
  }

  if (
    interpretacionRsi?.direccion ===
    "NEUTRAL"
  ) {
    agregarTexto(
      advertencias,
      `RSI ${rsi.toFixed(1)} en zona neutral.`
    );
  }

  if (rsi >= 78) {
    bullish -= 5;

    agregarTexto(
      advertencias,
      "El RSI está muy alto y puede existir agotamiento alcista."
    );
  }

  if (rsi <= 22) {
    bearish -= 5;

    agregarTexto(
      advertencias,
      "El RSI está muy bajo y puede existir agotamiento bajista."
    );
  }


  /*
  -------------------------------------------------------
  MOMENTUM
  -------------------------------------------------------
  */

  if (
    momentum?.direccion ===
    "POSITIVO"
  ) {
    bullish +=
      13 +
      numeroSeguro(
        momentum.fuerza
      ) * 4;

    agregarTexto(
      razonesBullish,
      "El momentum es positivo."
    );
  }

  if (
    momentum?.direccion ===
    "NEGATIVO"
  ) {
    bearish +=
      13 +
      numeroSeguro(
        momentum.fuerza
      ) * 4;

    agregarTexto(
      razonesBearish,
      "El momentum es negativo."
    );
  }

  if (
    momentum?.direccion ===
    "NEUTRAL"
  ) {
    agregarTexto(
      advertencias,
      "El momentum no presenta una dirección clara."
    );
  }


  /*
  -------------------------------------------------------
  FLUJO DE TICKS
  -------------------------------------------------------
  */

  if (
    flujoCorto?.direccion ===
    "ALCISTA"
  ) {
    bullish +=
      11 +
      numeroSeguro(
        flujoCorto.fuerza
      ) * 3;

    agregarTexto(
      razonesBullish,
      "El flujo corto de ticks favorece la subida."
    );
  }

  if (
    flujoCorto?.direccion ===
    "BAJISTA"
  ) {
    bearish +=
      11 +
      numeroSeguro(
        flujoCorto.fuerza
      ) * 3;

    agregarTexto(
      razonesBearish,
      "El flujo corto de ticks favorece la bajada."
    );
  }

  if (
    flujoMedio?.direccion ===
    "ALCISTA"
  ) {
    bullish +=
      6 +
      numeroSeguro(
        flujoMedio.fuerza
      ) * 2;
  }

  if (
    flujoMedio?.direccion ===
    "BAJISTA"
  ) {
    bearish +=
      6 +
      numeroSeguro(
        flujoMedio.fuerza
      ) * 2;
  }

  if (
    flujoCorto &&
    flujoMedio &&
    flujoCorto.direccion !==
      "NEUTRAL" &&
    flujoMedio.direccion !==
      "NEUTRAL" &&
    flujoCorto.direccion !==
      flujoMedio.direccion
  ) {
    bullish -= 8;
    bearish -= 8;

    agregarTexto(
      advertencias,
      "El flujo corto y el flujo medio no coinciden."
    );
  }


  /*
  -------------------------------------------------------
  FIBONACCI
  -------------------------------------------------------
  */

  if (
    fibonacci?.disponible &&
    fibonacci?.cercaDeNivel &&
    fibonacci?.nivelCercano
  ) {
    const nivel =
      fibonacci.nivelCercano
        .porcentaje;

    const puntos =
      [50, 61.8].includes(nivel)
        ? 14
        : [38.2, 78.6].includes(nivel)
          ? 11
          : 8;

    if (
      fibonacci.direccionBase ===
      "ALCISTA"
    ) {
      bullish += puntos;

      agregarTexto(
        razonesBullish,
        `Fibonacci ${nivel}% actúa como posible soporte.`
      );
    }

    if (
      fibonacci.direccionBase ===
      "BAJISTA"
    ) {
      bearish += puntos;

      agregarTexto(
        razonesBearish,
        `Fibonacci ${nivel}% actúa como posible resistencia.`
      );
    }
  }


  /*
  -------------------------------------------------------
  VOLATILIDAD
  -------------------------------------------------------
  */

  if (
    volatilidad?.nivel ===
    "BAJA"
  ) {
    bullish += 3;
    bearish += 3;
  }

  if (
    volatilidad?.nivel ===
    "MEDIA"
  ) {
    bullish += 1;
    bearish += 1;
  }

  if (
    volatilidad?.nivel ===
    "ALTA"
  ) {
    bullish -= 6;
    bearish -= 6;

    agregarTexto(
      advertencias,
      "La volatilidad alta reduce la estabilidad."
    );
  }

  if (
    volatilidad?.nivel ===
    "MUY ALTA"
  ) {
    bullish -= 14;
    bearish -= 14;

    agregarTexto(
      advertencias,
      "La volatilidad muy alta impide confirmar una entrada estable."
    );
  }


  /*
  -------------------------------------------------------
  MERCADO LATERAL
  -------------------------------------------------------
  */

  if (
    mercadoLateral?.lateral
  ) {
    bullish -= 16;
    bearish -= 16;

    agregarTexto(
      advertencias,
      "El mercado se encuentra lateral."
    );
  }


  bullish =
    limitarNumero(
      bullish,
      0,
      configuracion
        .maximoPuntaje
    );

  bearish =
    limitarNumero(
      bearish,
      0,
      configuracion
        .maximoPuntaje
    );


  const diferencia =
    Math.abs(
      bullish -
      bearish
    );

  let direccion =
    bullish >= bearish
      ? "RISE"
      : "FALL";

  let puntaje =
    Math.max(
      bullish,
      bearish
    );

  let razones =
    direccion === "RISE"
      ? razonesBullish
      : razonesBearish;


  /*
  -------------------------------------------------------
  COINCIDENCIA PRINCIPAL
  -------------------------------------------------------
  */

  const coincidenciaRise =
    direccion === "RISE" &&
    tendencia?.direccion ===
      "ALCISTA" &&
    momentum?.direccion ===
      "POSITIVO" &&
    flujoCorto?.direccion ===
      "ALCISTA";

  const coincidenciaFall =
    direccion === "FALL" &&
    tendencia?.direccion ===
      "BAJISTA" &&
    momentum?.direccion ===
      "NEGATIVO" &&
    flujoCorto?.direccion ===
      "BAJISTA";

  const coincidenciaPrincipal =
    coincidenciaRise ||
    coincidenciaFall;


  if (
    !coincidenciaPrincipal
  ) {
    puntaje -= 12;

    agregarTexto(
      advertencias,
      "Tendencia, momentum y flujo corto todavía no coinciden completamente."
    );
  }


  if (
    diferencia <
    configuracion
      .diferenciaMinima
  ) {
    puntaje -= 8;

    agregarTexto(
      advertencias,
      "La diferencia entre presión alcista y bajista es reducida."
    );
  }


  puntaje =
    limitarNumero(
      puntaje,
      0,
      100
    );


  if (
    puntaje <
      configuracion
        .puntajeCandidata ||
    diferencia < 10
  ) {
    direccion = "WAIT";
  }


  const estado =
    direccion === "WAIT"
      ? "MONITORING"
      : obtenerEstadoPreliminar(
          "rise_fall",
          puntaje
        );


  const aptaParaConfirmacion =
    Boolean(
      direccion !== "WAIT" &&
      puntaje >=
        configuracion
          .puntajeConfirmado &&
      coincidenciaPrincipal &&
      diferencia >=
        configuracion
          .diferenciaMinima &&
      !mercadoLateral?.lateral &&
      volatilidad?.nivel !==
        "MUY ALTA"
    );


  if (
    razones.length === 0
  ) {
    razones = [
      "Los indicadores todavía no presentan una dirección clara."
    ];
  }


  return crearResultadoBase({
    estrategia:
      "rise_fall",

    direccion,

    puntaje,

    estado,

    razones,

    advertencias,

    componentes: {
      tendencia,
      momentum,
      flujoCorto,
      flujoMedio,
      volatilidad,
      fibonacci,
      mercadoLateral
    },

    metadata: {
      bullish:
        Math.round(bullish),

      bearish:
        Math.round(bearish),

      diferencia:
        Math.round(diferencia),

      coincidenciaPrincipal,

      aptaParaConfirmacion
    }
  });
}


/* =====================================================
8. EVEN / ODD
===================================================== */

export function evaluarEvenOdd(
  resumen
) {
  const configuracion =
    CONFIGURACION_PREDICCION
      .even_odd;

  const estadisticas =
    resumen?.estadisticasDigitos;

  if (
    !estadisticas ||
    estadisticas.cantidad <
      configuracion
        .minimoDigitos
  ) {
    return crearResultadoMonitoreo(
      "even_odd",
      `Se necesitan al menos ${configuracion.minimoDigitos} últimos dígitos.`
    );
  }


  const porcentajePares =
    numeroSeguro(
      estadisticas
        .porcentajePares
    );

  const porcentajeImpares =
    numeroSeguro(
      estadisticas
        .porcentajeImpares
    );

  const diferencia =
    Math.abs(
      porcentajePares -
      porcentajeImpares
    );

  const direccionDominante =
    porcentajePares >=
      porcentajeImpares
      ? "EVEN"
      : "ODD";


  let puntaje =
    48 +
    diferencia * 1.55;

  if (
    estadisticas.cantidad >= 50
  ) {
    puntaje += 4;
  }

  if (
    estadisticas.cantidad >= 80
  ) {
    puntaje += 2;
  }


  puntaje =
    limitarNumero(
      puntaje,
      0,
      configuracion
        .maximoPuntaje
    );


  const direccion =
    diferencia >=
      configuracion
        .diferenciaMinima &&
    puntaje >=
      configuracion
        .puntajeCandidata
      ? direccionDominante
      : "WAIT";


  const estado =
    direccion === "WAIT"
      ? "MONITORING"
      : obtenerEstadoPreliminar(
          "even_odd",
          puntaje
        );


  return crearResultadoBase({
    estrategia:
      "even_odd",

    direccion,

    puntaje,

    estado,

    razones: [
      `Últimos ${estadisticas.cantidad} ticks: ${estadisticas.pares} pares y ${estadisticas.impares} impares.`,
      `Diferencia observada: ${diferencia.toFixed(1)}%.`
    ],

    advertencias: [
      "La frecuencia pasada no garantiza el siguiente dígito."
    ],

    componentes: {
      pares:
        porcentajePares,

      impares:
        porcentajeImpares
    },

    metadata: {
      diferencia,
      porcentajePares,
      porcentajeImpares,

      aptaParaConfirmacion:
        direccion !== "WAIT" &&
        puntaje >=
          configuracion
            .puntajeConfirmado
    }
  });
}


/* =====================================================
9. OVER / UNDER
===================================================== */

export function evaluarOverUnder(
  resumen
) {
  const configuracion =
    CONFIGURACION_PREDICCION
      .over_under;

  const estadisticas =
    resumen?.estadisticasDigitos;

  if (
    !estadisticas ||
    estadisticas.cantidad <
      configuracion
        .minimoDigitos
  ) {
    return crearResultadoMonitoreo(
      "over_under",
      `Se necesitan al menos ${configuracion.minimoDigitos} últimos dígitos.`
    );
  }


  const porcentajeAltos =
    numeroSeguro(
      estadisticas
        .porcentajeAltos
    );

  const porcentajeBajos =
    numeroSeguro(
      estadisticas
        .porcentajeBajos
    );

  const diferencia =
    Math.abs(
      porcentajeAltos -
      porcentajeBajos
    );

  const direccionDominante =
    porcentajeAltos >=
      porcentajeBajos
      ? "OVER"
      : "UNDER";


  let puntaje =
    48 +
    diferencia * 1.55;

  if (
    estadisticas.cantidad >= 50
  ) {
    puntaje += 4;
  }

  if (
    estadisticas.cantidad >= 80
  ) {
    puntaje += 2;
  }


  puntaje =
    limitarNumero(
      puntaje,
      0,
      configuracion
        .maximoPuntaje
    );


  const direccion =
    diferencia >=
      configuracion
        .diferenciaMinima &&
    puntaje >=
      configuracion
        .puntajeCandidata
      ? direccionDominante
      : "WAIT";


  const estado =
    direccion === "WAIT"
      ? "MONITORING"
      : obtenerEstadoPreliminar(
          "over_under",
          puntaje
        );


  return crearResultadoBase({
    estrategia:
      "over_under",

    direccion,

    puntaje,

    estado,

    razones: [
      `Últimos ${estadisticas.cantidad} ticks: ${estadisticas.bajos} dígitos entre 0 y 4 y ${estadisticas.altos} entre 5 y 9.`,
      `Diferencia observada: ${diferencia.toFixed(1)}%.`
    ],

    advertencias: [
      "La frecuencia pasada no garantiza el siguiente dígito."
    ],

    componentes: {
      bajos:
        porcentajeBajos,

      altos:
        porcentajeAltos
    },

    metadata: {
      diferencia,
      porcentajeBajos,
      porcentajeAltos,

      aptaParaConfirmacion:
        direccion !== "WAIT" &&
        puntaje >=
          configuracion
            .puntajeConfirmado
    }
  });
}


/* =====================================================
10. MATCHES
===================================================== */

export function evaluarMatch(
  resumen
) {
  const configuracion =
    CONFIGURACION_PREDICCION
      .match;

  const estadisticas =
    resumen?.estadisticasDigitos;

  if (
    !estadisticas ||
    estadisticas.cantidad <
      configuracion
        .minimoDigitos
  ) {
    return crearResultadoMonitoreo(
      "match",
      `Se necesitan al menos ${configuracion.minimoDigitos} últimos dígitos para analizar Matches.`
    );
  }


  const cantidad =
    numeroSeguro(
      estadisticas.cantidad
    );

  const digito =
    estadisticas
      .digitoCaliente;

  const frecuencia =
    numeroSeguro(
      estadisticas
        .frecuenciaCaliente
    );

  const porcentaje =
    cantidad > 0
      ? (
          frecuencia /
          cantidad
        ) * 100
      : 0;


  const excesoSobreEsperado =
    Math.max(
      0,
      porcentaje - 10
    );


  let puntaje =
    48 +
    excesoSobreEsperado * 2.2;


  if (
    frecuencia >= 5
  ) {
    puntaje += 5;
  }

  if (
    frecuencia >= 7
  ) {
    puntaje += 3;
  }


  puntaje =
    limitarNumero(
      puntaje,
      0,
      configuracion
        .maximoPuntaje
    );


  const frecuenciaSuficiente =
    frecuencia >=
      configuracion
        .frecuenciaMinima &&
    porcentaje >=
      configuracion
        .porcentajeMinimo;


  const direccion =
    frecuenciaSuficiente &&
    puntaje >=
      configuracion
        .puntajeCandidata
      ? "MATCH"
      : "WAIT";


  const estado =
    direccion === "WAIT"
      ? "MONITORING"
      : obtenerEstadoPreliminar(
          "match",
          puntaje
        );


  return crearResultadoBase({
    estrategia:
      "match",

    direccion,

    puntaje,

    estado,

    razones: [
      `En los últimos ${cantidad} ticks, el número ${digito} apareció ${frecuencia} veces.`,
      `Frecuencia observada: ${porcentaje.toFixed(1)}%.`
    ],

    advertencias: [
      "Matches es experimental.",
      "La repetición pasada de un número no garantiza su siguiente aparición."
    ],

    componentes: {
      frecuencia,
      porcentaje
    },

    metadata: {
      digito,
      frecuencia,
      porcentaje,
      cantidad,

      ventanaEvaluacionTicks:
        configuracion
          .ventanaEvaluacionTicks,

      aptaParaConfirmacion:
        direccion === "MATCH" &&
        puntaje >=
          configuracion
            .puntajeConfirmado &&
        frecuenciaSuficiente
    }
  });
}


/* =====================================================
11. GENERADOR GENERAL
===================================================== */

export function generarPrediccion({
  estrategia = "rise_fall",
  resumen
} = {}) {
  if (!resumen) {
    return crearResultadoMonitoreo(
      estrategia,
      "El resumen técnico todavía no está disponible."
    );
  }

  switch (estrategia) {
    case "even_odd":
      return evaluarEvenOdd(
        resumen
      );

    case "over_under":
      return evaluarOverUnder(
        resumen
      );

    case "match":
      return evaluarMatch(
        resumen
      );

    case "rise_fall":
    default:
      return evaluarRiseFall(
        resumen
      );
  }
}


/* =====================================================
12. COMPARAR PREDICCIONES
===================================================== */

export function mismaPrediccion(
  anterior,
  nueva
) {
  if (
    !anterior ||
    !nueva
  ) {
    return false;
  }

  return Boolean(
    anterior.estrategia ===
      nueva.estrategia &&
    anterior.direccion ===
      nueva.direccion
  );
}


/* =====================================================
13. TEXTO PARA ANÁLISIS MANUAL
===================================================== */

export function crearTextoOperacion(
  resultado
) {
  if (!resultado) {
    return "Sin análisis disponible.";
  }

  if (
    resultado.direccion ===
    "WAIT"
  ) {
    return (
      `Sin entrada clara. ` +
      `Puntaje actual: ${resultado.puntaje}/100.`
    );
  }

  if (
    resultado.direccion ===
    "MATCH"
  ) {
    return (
      `Posible coincidencia con el número ` +
      `${resultado.metadata?.digito ?? "--"}. ` +
      `Puntaje actual: ${resultado.puntaje}/100.`
    );
  }

  return (
    `Posible ${resultado.nombreVoz}. ` +
    `Puntaje actual: ${resultado.puntaje}/100.`
  );
}


/* =====================================================
14. RESUMEN DEL PUNTAJE
===================================================== */

export function crearResumenPuntaje(
  resultado
) {
  if (!resultado) {
    return {
      puntaje: 0,
      nivel: "NO DATA",
      descripcion:
        "Sin predicción disponible."
    };
  }

  const clasificacion =
    clasificarPuntaje(
      resultado.puntaje,
      resultado.estrategia
    );

  return {
    puntaje:
      resultado.puntaje,

    nivel:
      clasificacion.nivel,

    descripcion:
      clasificacion.descripcion,

    direccion:
      resultado.direccion,

    estrategia:
      resultado.nombreEstrategia,

    aptaParaConfirmacion:
      Boolean(
        resultado.metadata
          ?.aptaParaConfirmacion
      )
  };
}


/*
=========================================================
FIN DEL ARCHIVO js/prediction.js
TRADING ANALYST PRO MR
=========================================================
*/
