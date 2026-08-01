/*
=========================================================
TRADING ANALYST V8 PRO
Archivo: js/prediction.js

VERSIÓN:
Motor de puntuación técnica progresiva.

Responsabilidad:
- Recibir el resumen de indicators.js.
- Calcular Signal Score.
- Combinar tendencia, RSI, momentum, volatilidad,
  flujo de ticks, mercado lateral y Fibonacci.
- Evaluar Rise/Fall, Even/Odd, Over/Under y Match.
- Entregar resultados al monitor sin lanzar señales
  directamente.
=========================================================
*/

import {
  limitarNumero,
  resumenTecnicoValido
} from "./indicators.js";


/* =====================================================
1. CONFIGURACIÓN GENERAL
===================================================== */

export const CONFIGURACION_PREDICCION =
  Object.freeze({
    puntajeCandidata: 58,
    puntajePrepare: 68,
    puntajeConfirmado: 80,
    puntajeMuyFuerte: 90,

    diferenciaMinimaRiseFall: 16,
    diferenciaMinimaDigitos: 14,

    minimoDigitosFast: 20,
    minimoDigitosComplete: 40,

    maximoPuntajeRiseFall: 100,
    maximoPuntajeEvenOdd: 84,
    maximoPuntajeOverUnder: 84,
    maximoPuntajeMatch: 78,

    penalizacionMercadoLateral: 18,
    penalizacionVolatilidadMuyAlta: 16,
    penalizacionContradiccion: 12
  });


/* =====================================================
2. NOMBRES
===================================================== */

export const NOMBRES_ESTRATEGIAS =
  Object.freeze({
    rise_fall: "Rise / Fall",
    even_odd: "Even / Odd",
    over_under: "Over / Under",
    match: "Match"
  });


export const NOMBRES_VOZ =
  Object.freeze({
    RISE: "Sube",
    FALL: "Baja",
    EVEN: "Par",
    ODD: "Impar",
    OVER: "Más de cuatro",
    UNDER: "Menos de cinco",
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


function redondear(
  valor,
  decimales = 2
) {
  const factor =
    10 ** decimales;

  return (
    Math.round(
      numeroSeguro(valor) *
      factor
    ) / factor
  );
}


function agregarRazon(
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


function agregarAdvertencia(
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
  const puntajeLimitado =
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
      puntajeLimitado,

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
  puntaje
) {
  const valor =
    limitarNumero(
      numeroSeguro(puntaje),
      0,
      100
    );

  if (
    valor >=
    CONFIGURACION_PREDICCION
      .puntajeMuyFuerte
  ) {
    return {
      nivel: "VERY STRONG",
      descripcion:
        "Coincidencia técnica muy fuerte.",
      prioridad: 5
    };
  }

  if (
    valor >=
    CONFIGURACION_PREDICCION
      .puntajeConfirmado
  ) {
    return {
      nivel: "STRONG",
      descripcion:
        "La configuración puede ser validada por el monitor.",
      prioridad: 4
    };
  }

  if (
    valor >=
    CONFIGURACION_PREDICCION
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
    CONFIGURACION_PREDICCION
      .puntajeCandidata
  ) {
    return {
      nivel: "CANDIDATE",
      descripcion:
        "Configuración preliminar en validación.",
      prioridad: 2
    };
  }

  if (valor >= 45) {
    return {
      nivel: "MONITORING",
      descripcion:
        "Señal insuficiente para preparar una entrada.",
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
  puntaje
) {
  if (
    puntaje >=
    CONFIGURACION_PREDICCION
      .puntajeConfirmado
  ) {
    /*
    El monitor será quien confirme después de varios ciclos.
    */
    return "PREPARE";
  }

  if (
    puntaje >=
    CONFIGURACION_PREDICCION
      .puntajePrepare
  ) {
    return "PREPARE";
  }

  if (
    puntaje >=
    CONFIGURACION_PREDICCION
      .puntajeCandidata
  ) {
    return "CANDIDATE";
  }

  return "MONITORING";
}


/* =====================================================
7. PUNTOS DE TENDENCIA
===================================================== */

function evaluarTendencia(
  tendencia
) {
  const resultado = {
    bullish: 0,
    bearish: 0,
    razonesBullish: [],
    razonesBearish: [],
    advertencias: []
  };

  if (!tendencia) {
    agregarAdvertencia(
      resultado.advertencias,
      "La tendencia todavía no está disponible."
    );

    return resultado;
  }

  if (
    tendencia.direccion ===
    "ALCISTA"
  ) {
    const puntos =
      16 +
      numeroSeguro(
        tendencia.fuerza
      ) * 4;

    resultado.bullish +=
      puntos;

    agregarRazon(
      resultado.razonesBullish,
      `La tendencia reciente es alcista con fuerza ${tendencia.fuerza}.`
    );
  }

  if (
    tendencia.direccion ===
    "BAJISTA"
  ) {
    const puntos =
      16 +
      numeroSeguro(
        tendencia.fuerza
      ) * 4;

    resultado.bearish +=
      puntos;

    agregarRazon(
      resultado.razonesBearish,
      `La tendencia reciente es bajista con fuerza ${tendencia.fuerza}.`
    );
  }

  if (
    tendencia.direccion ===
      "LATERAL" ||
    tendencia.lateral
  ) {
    agregarAdvertencia(
      resultado.advertencias,
      "La tendencia todavía presenta comportamiento lateral."
    );
  }

  return resultado;
}


/* =====================================================
8. PUNTOS DE RSI
===================================================== */

function evaluarRSI(
  rsi,
  interpretacionRsi
) {
  const resultado = {
    bullish: 0,
    bearish: 0,
    razonesBullish: [],
    razonesBearish: [],
    advertencias: []
  };

  if (
    !Number.isFinite(rsi) ||
    !interpretacionRsi
  ) {
    agregarAdvertencia(
      resultado.advertencias,
      "Todavía no existen suficientes datos para interpretar el RSI."
    );

    return resultado;
  }

  const fuerza =
    numeroSeguro(
      interpretacionRsi.fuerza
    );

  if (
    interpretacionRsi.direccion ===
    "BULLISH"
  ) {
    resultado.bullish +=
      10 +
      fuerza * 4;

    agregarRazon(
      resultado.razonesBullish,
      `RSI ${rsi.toFixed(1)} en ${String(
        interpretacionRsi.zona
      ).toLowerCase()}.`
    );
  }

  if (
    interpretacionRsi.direccion ===
    "BEARISH"
  ) {
    resultado.bearish +=
      10 +
      fuerza * 4;

    agregarRazon(
      resultado.razonesBearish,
      `RSI ${rsi.toFixed(1)} en ${String(
        interpretacionRsi.zona
      ).toLowerCase()}.`
    );
  }

  if (
    interpretacionRsi.direccion ===
    "NEUTRAL"
  ) {
    agregarAdvertencia(
      resultado.advertencias,
      `RSI ${rsi.toFixed(1)} en zona neutral.`
    );
  }

  /*
  RSI extremo: puede representar agotamiento.
  Se reduce ligeramente la presión de continuación.
  */
  if (rsi >= 78) {
    resultado.bullish -= 5;

    agregarAdvertencia(
      resultado.advertencias,
      "El RSI se encuentra muy alto y podría existir agotamiento alcista."
    );
  }

  if (rsi <= 22) {
    resultado.bearish -= 5;

    agregarAdvertencia(
      resultado.advertencias,
      "El RSI se encuentra muy bajo y podría existir agotamiento bajista."
    );
  }

  return resultado;
}


/* =====================================================
9. PUNTOS DE MOMENTUM
===================================================== */

function evaluarMomentum(
  momentum
) {
  const resultado = {
    bullish: 0,
    bearish: 0,
    razonesBullish: [],
    razonesBearish: [],
    advertencias: []
  };

  if (!momentum) {
    agregarAdvertencia(
      resultado.advertencias,
      "El momentum todavía no está disponible."
    );

    return resultado;
  }

  const fuerza =
    numeroSeguro(
      momentum.fuerza
    );

  if (
    momentum.direccion ===
    "POSITIVO"
  ) {
    resultado.bullish +=
      12 +
      fuerza * 4;

    agregarRazon(
      resultado.razonesBullish,
      `El momentum es positivo: ${numeroSeguro(
        momentum.porcentaje
      ).toFixed(4)}%.`
    );
  }

  if (
    momentum.direccion ===
    "NEGATIVO"
  ) {
    resultado.bearish +=
      12 +
      fuerza * 4;

    agregarRazon(
      resultado.razonesBearish,
      `El momentum es negativo: ${numeroSeguro(
        momentum.porcentaje
      ).toFixed(4)}%.`
    );
  }

  if (
    momentum.direccion ===
    "NEUTRAL"
  ) {
    agregarAdvertencia(
      resultado.advertencias,
      "El momentum no presenta una dirección clara."
    );
  }

  return resultado;
}


/* =====================================================
10. PUNTOS DEL FLUJO DE TICKS
===================================================== */

function evaluarFlujoTicks(
  flujoCorto,
  flujoMedio
) {
  const resultado = {
    bullish: 0,
    bearish: 0,
    razonesBullish: [],
    razonesBearish: [],
    advertencias: []
  };

  if (flujoCorto) {
    if (
      flujoCorto.direccion ===
      "ALCISTA"
    ) {
      resultado.bullish +=
        9 +
        numeroSeguro(
          flujoCorto.fuerza
        ) * 3;

      agregarRazon(
        resultado.razonesBullish,
        `El flujo corto registra ${flujoCorto.subidas} subidas y ${flujoCorto.bajadas} bajadas.`
      );
    }

    if (
      flujoCorto.direccion ===
      "BAJISTA"
    ) {
      resultado.bearish +=
        9 +
        numeroSeguro(
          flujoCorto.fuerza
        ) * 3;

      agregarRazon(
        resultado.razonesBearish,
        `El flujo corto registra ${flujoCorto.bajadas} bajadas y ${flujoCorto.subidas} subidas.`
      );
    }
  }

  if (flujoMedio) {
    if (
      flujoMedio.direccion ===
      "ALCISTA"
    ) {
      resultado.bullish +=
        6 +
        numeroSeguro(
          flujoMedio.fuerza
        ) * 2;

      agregarRazon(
        resultado.razonesBullish,
        "El flujo medio también favorece la subida."
      );
    }

    if (
      flujoMedio.direccion ===
      "BAJISTA"
    ) {
      resultado.bearish +=
        6 +
        numeroSeguro(
          flujoMedio.fuerza
        ) * 2;

      agregarRazon(
        resultado.razonesBearish,
        "El flujo medio también favorece la bajada."
      );
    }
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
    resultado.bullish -=
      CONFIGURACION_PREDICCION
        .penalizacionContradiccion;

    resultado.bearish -=
      CONFIGURACION_PREDICCION
        .penalizacionContradiccion;

    agregarAdvertencia(
      resultado.advertencias,
      "El flujo corto y el flujo medio no coinciden."
    );
  }

  return resultado;
}


/* =====================================================
11. PUNTOS DE FIBONACCI
===================================================== */

function evaluarFibonacci(
  fibonacci
) {
  const resultado = {
    bullish: 0,
    bearish: 0,
    razonesBullish: [],
    razonesBearish: [],
    advertencias: []
  };

  if (
    !fibonacci ||
    !fibonacci.disponible
  ) {
    agregarAdvertencia(
      resultado.advertencias,
      "Fibonacci todavía no dispone de suficientes precios."
    );

    return resultado;
  }

  if (
    !fibonacci.cercaDeNivel ||
    !fibonacci.nivelCercano
  ) {
    agregarAdvertencia(
      resultado.advertencias,
      "El precio no está cerca de una zona Fibonacci relevante."
    );

    return resultado;
  }

  const nivel =
    fibonacci.nivelCercano
      .porcentaje;

  let puntos = 8;

  if (
    nivel === 50 ||
    nivel === 61.8
  ) {
    puntos = 14;
  } else if (
    nivel === 38.2 ||
    nivel === 78.6
  ) {
    puntos = 11;
  }

  if (
    fibonacci.direccionBase ===
    "ALCISTA"
  ) {
    resultado.bullish +=
      puntos;

    agregarRazon(
      resultado.razonesBullish,
      `El precio está cerca del nivel Fibonacci ${nivel}%, posible zona de soporte.`
    );
  }

  if (
    fibonacci.direccionBase ===
    "BAJISTA"
  ) {
    resultado.bearish +=
      puntos;

    agregarRazon(
      resultado.razonesBearish,
      `El precio está cerca del nivel Fibonacci ${nivel}%, posible zona de resistencia.`
    );
  }

  return resultado;
}


/* =====================================================
12. VOLATILIDAD
===================================================== */

function evaluarVolatilidad(
  volatilidad
) {
  const resultado = {
    ajusteBullish: 0,
    ajusteBearish: 0,
    razones: [],
    advertencias: []
  };

  if (!volatilidad) {
    agregarAdvertencia(
      resultado.advertencias,
      "La volatilidad todavía no está disponible."
    );

    return resultado;
  }

  if (
    volatilidad.nivel ===
    "BAJA"
  ) {
    resultado.ajusteBullish += 3;
    resultado.ajusteBearish += 3;

    agregarRazon(
      resultado.razones,
      "La volatilidad se mantiene estable."
    );
  }

  if (
    volatilidad.nivel ===
    "MEDIA"
  ) {
    resultado.ajusteBullish += 1;
    resultado.ajusteBearish += 1;

    agregarRazon(
      resultado.razones,
      "La volatilidad se encuentra en un nivel medio."
    );
  }

  if (
    volatilidad.nivel ===
    "ALTA"
  ) {
    resultado.ajusteBullish -= 6;
    resultado.ajusteBearish -= 6;

    agregarAdvertencia(
      resultado.advertencias,
      "La volatilidad alta reduce la estabilidad de la predicción."
    );
  }

  if (
    volatilidad.nivel ===
    "MUY ALTA"
  ) {
    resultado.ajusteBullish -=
      CONFIGURACION_PREDICCION
        .penalizacionVolatilidadMuyAlta;

    resultado.ajusteBearish -=
      CONFIGURACION_PREDICCION
        .penalizacionVolatilidadMuyAlta;

    agregarAdvertencia(
      resultado.advertencias,
      "La volatilidad muy alta impide confirmar una entrada estable."
    );
  }

  return resultado;
}


/* =====================================================
13. MERCADO LATERAL
===================================================== */

function evaluarMercadoLateral(
  mercadoLateral
) {
  if (
    !mercadoLateral ||
    !mercadoLateral.lateral
  ) {
    return {
      penalizacion: 0,
      advertencias: []
    };
  }

  return {
    penalizacion:
      CONFIGURACION_PREDICCION
        .penalizacionMercadoLateral,

    advertencias: [
      "El mercado se encuentra lateral y reduce la calidad de la entrada."
    ]
  };
}


/* =====================================================
14. COMBINAR EVALUACIONES
===================================================== */

function combinarEvaluacionesRiseFall(
  evaluaciones
) {
  const combinado = {
    bullish: 0,
    bearish: 0,
    razonesBullish: [],
    razonesBearish: [],
    advertencias: [],
    componentes: {}
  };

  evaluaciones.forEach(
    ({
      nombre,
      resultado
    }) => {
      if (!resultado) return;

      combinado.bullish +=
        numeroSeguro(
          resultado.bullish
        );

      combinado.bearish +=
        numeroSeguro(
          resultado.bearish
        );

      combinado.bullish +=
        numeroSeguro(
          resultado.ajusteBullish
        );

      combinado.bearish +=
        numeroSeguro(
          resultado.ajusteBearish
        );

      if (
        Array.isArray(
          resultado.razonesBullish
        )
      ) {
        combinado.razonesBullish.push(
          ...resultado.razonesBullish
        );
      }

      if (
        Array.isArray(
          resultado.razonesBearish
        )
      ) {
        combinado.razonesBearish.push(
          ...resultado.razonesBearish
        );
      }

      if (
        Array.isArray(
          resultado.razones
        )
      ) {
        combinado.razonesBullish.push(
          ...resultado.razones
        );

        combinado.razonesBearish.push(
          ...resultado.razones
        );
      }

      if (
        Array.isArray(
          resultado.advertencias
        )
      ) {
        combinado.advertencias.push(
          ...resultado.advertencias
        );
      }

      combinado.componentes[nombre] =
        resultado;
    }
  );

  return combinado;
}


/* =====================================================
15. RISE / FALL
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

  const evaluacionTendencia =
    evaluarTendencia(
      resumen.tendencia
    );

  const evaluacionRsi =
    evaluarRSI(
      resumen.rsi,
      resumen.interpretacionRsi
    );

  const evaluacionMomentum =
    evaluarMomentum(
      resumen.momentum
    );

  const evaluacionFlujo =
    evaluarFlujoTicks(
      resumen.flujoCorto,
      resumen.flujoMedio
    );

  const evaluacionFibonacci =
    evaluarFibonacci(
      resumen.fibonacci
    );

  const evaluacionVolatilidad =
    evaluarVolatilidad(
      resumen.volatilidad
    );

  const lateral =
    evaluarMercadoLateral(
      resumen.mercadoLateral
    );

  const combinado =
    combinarEvaluacionesRiseFall([
      {
        nombre: "tendencia",
        resultado:
          evaluacionTendencia
      },
      {
        nombre: "rsi",
        resultado:
          evaluacionRsi
      },
      {
        nombre: "momentum",
        resultado:
          evaluacionMomentum
      },
      {
        nombre: "flujo",
        resultado:
          evaluacionFlujo
      },
      {
        nombre: "fibonacci",
        resultado:
          evaluacionFibonacci
      },
      {
        nombre: "volatilidad",
        resultado:
          evaluacionVolatilidad
      }
    ]);

  combinado.bullish -=
    lateral.penalizacion;

  combinado.bearish -=
    lateral.penalizacion;

  combinado.advertencias.push(
    ...lateral.advertencias
  );

  combinado.bullish =
    limitarNumero(
      combinado.bullish,
      0,
      CONFIGURACION_PREDICCION
        .maximoPuntajeRiseFall
    );

  combinado.bearish =
    limitarNumero(
      combinado.bearish,
      0,
      CONFIGURACION_PREDICCION
        .maximoPuntajeRiseFall
    );

  const diferencia =
    Math.abs(
      combinado.bullish -
      combinado.bearish
    );

  let direccion = "WAIT";
  let puntaje = 0;
  let razones = [];

  if (
    combinado.bullish >
    combinado.bearish
  ) {
    direccion = "RISE";
    puntaje =
      combinado.bullish;
    razones =
      combinado.razonesBullish;
  }

  if (
    combinado.bearish >
    combinado.bullish
  ) {
    direccion = "FALL";
    puntaje =
      combinado.bearish;
    razones =
      combinado.razonesBearish;
  }

  const coincidenciaRise =
    direccion === "RISE" &&
    resumen.tendencia.direccion ===
      "ALCISTA" &&
    resumen.momentum.direccion ===
      "POSITIVO" &&
    resumen.flujoCorto.direccion ===
      "ALCISTA";

  const coincidenciaFall =
    direccion === "FALL" &&
    resumen.tendencia.direccion ===
      "BAJISTA" &&
    resumen.momentum.direccion ===
      "NEGATIVO" &&
    resumen.flujoCorto.direccion ===
      "BAJISTA";

  const coincidenciaPrincipal =
    coincidenciaRise ||
    coincidenciaFall;

  const diferenciaValida =
    diferencia >=
    CONFIGURACION_PREDICCION
      .diferenciaMinimaRiseFall;

  const volatilidadAceptable =
    resumen.volatilidad.nivel !==
    "MUY ALTA";

  const noLateral =
    !resumen.mercadoLateral
      .lateral;

  if (
    !coincidenciaPrincipal
  ) {
    puntaje -=
      CONFIGURACION_PREDICCION
        .penalizacionContradiccion;

    agregarAdvertencia(
      combinado.advertencias,
      "Tendencia, momentum y flujo corto todavía no coinciden completamente."
    );
  }

  if (
    !diferenciaValida
  ) {
    puntaje -= 8;

    agregarAdvertencia(
      combinado.advertencias,
      "La diferencia entre presión alcista y bajista todavía es reducida."
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
      CONFIGURACION_PREDICCION
        .puntajeCandidata ||
    !diferenciaValida
  ) {
    direccion = "WAIT";
  }

  const estado =
    direccion === "WAIT"
      ? "MONITORING"
      : obtenerEstadoPreliminar(
          puntaje
        );

  const aptaParaConfirmacion =
    Boolean(
      direccion !== "WAIT" &&
      puntaje >=
        CONFIGURACION_PREDICCION
          .puntajeConfirmado &&
      coincidenciaPrincipal &&
      diferenciaValida &&
      volatilidadAceptable &&
      noLateral
    );

  if (
    razones.length === 0
  ) {
    razones = [
      "Los indicadores todavía no presentan una dirección suficientemente clara."
    ];
  }

  return crearResultadoBase({
    estrategia:
      "rise_fall",

    direccion,

    puntaje,

    estado,

    razones,

    advertencias:
      combinado.advertencias,

    componentes: {
      tendencia:
        evaluacionTendencia,

      rsi:
        evaluacionRsi,

      momentum:
        evaluacionMomentum,

      flujo:
        evaluacionFlujo,

      fibonacci:
        evaluacionFibonacci,

      volatilidad:
        evaluacionVolatilidad,

      mercadoLateral:
        lateral
    },

    metadata: {
      bullish:
        Math.round(
          combinado.bullish
        ),

      bearish:
        Math.round(
          combinado.bearish
        ),

      diferencia:
        Math.round(
          diferencia
        ),

      coincidenciaPrincipal,
      diferenciaValida,
      volatilidadAceptable,
      noLateral,
      aptaParaConfirmacion
    }
  });
}


/* =====================================================
16. EVEN / ODD
===================================================== */

export function evaluarEvenOdd(
  resumen
) {
  const estadisticas =
    resumen?.estadisticasDigitos;

  const minimo =
    resumen?.modo === "complete"
      ? CONFIGURACION_PREDICCION
          .minimoDigitosComplete
      : CONFIGURACION_PREDICCION
          .minimoDigitosFast;

  if (
    !estadisticas ||
    estadisticas.cantidad <
      minimo
  ) {
    return crearResultadoMonitoreo(
      "even_odd",
      `Se necesitan al menos ${minimo} últimos dígitos para analizar Even / Odd.`
    );
  }

  const cantidad =
    estadisticas.cantidad;

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
    porcentajePares >
      porcentajeImpares
      ? "EVEN"
      : "ODD";

  const porcentajeDominante =
    Math.max(
      porcentajePares,
      porcentajeImpares
    );

  let puntaje =
    42 +
    diferencia * 1.8;

  if (cantidad >= 50) {
    puntaje += 4;
  }

  if (cantidad >= 80) {
    puntaje += 3;
  }

  /*
  Penalización si la diferencia es demasiado pequeña.
  */
  if (
    diferencia <
    CONFIGURACION_PREDICCION
      .diferenciaMinimaDigitos
  ) {
    puntaje -= 12;
  }

  puntaje =
    limitarNumero(
      puntaje,
      0,
      CONFIGURACION_PREDICCION
        .maximoPuntajeEvenOdd
    );

  let direccion =
    direccionDominante;

  if (
    puntaje <
      CONFIGURACION_PREDICCION
        .puntajeCandidata ||
    diferencia <
      CONFIGURACION_PREDICCION
        .diferenciaMinimaDigitos
  ) {
    direccion = "WAIT";
  }

  const estado =
    direccion === "WAIT"
      ? "MONITORING"
      : obtenerEstadoPreliminar(
          puntaje
        );

  const razones = [
    `En los últimos ${cantidad} ticks se observaron ${estadisticas.pares} dígitos pares.`,
    `Se observaron ${estadisticas.impares} dígitos impares.`,
    `El grupo dominante representa ${porcentajeDominante.toFixed(1)}%.`
  ];

  const advertencias = [
    "Even / Odd depende del siguiente último dígito; la frecuencia histórica no garantiza el próximo resultado."
  ];

  if (
    direccion === "WAIT"
  ) {
    agregarAdvertencia(
      advertencias,
      "La diferencia entre pares e impares todavía no es suficiente."
    );
  }

  return crearResultadoBase({
    estrategia:
      "even_odd",

    direccion,

    puntaje,

    estado,

    razones,

    advertencias,

    componentes: {
      pares:
        porcentajePares,

      impares:
        porcentajeImpares
    },

    metadata: {
      cantidad,
      porcentajePares,
      porcentajeImpares,
      diferencia,
      dominante:
        direccionDominante,

      aptaParaConfirmacion:
        direccion !== "WAIT" &&
        puntaje >=
          CONFIGURACION_PREDICCION
            .puntajeConfirmado &&
        diferencia >=
          CONFIGURACION_PREDICCION
            .diferenciaMinimaDigitos
    }
  });
}


/* =====================================================
17. OVER / UNDER
===================================================== */

export function evaluarOverUnder(
  resumen
) {
  const estadisticas =
    resumen?.estadisticasDigitos;

  const minimo =
    resumen?.modo === "complete"
      ? CONFIGURACION_PREDICCION
          .minimoDigitosComplete
      : CONFIGURACION_PREDICCION
          .minimoDigitosFast;

  if (
    !estadisticas ||
    estadisticas.cantidad <
      minimo
  ) {
    return crearResultadoMonitoreo(
      "over_under",
      `Se necesitan al menos ${minimo} últimos dígitos para analizar Over / Under.`
    );
  }

  const cantidad =
    estadisticas.cantidad;

  const porcentajeBajos =
    numeroSeguro(
      estadisticas
        .porcentajeBajos
    );

  const porcentajeAltos =
    numeroSeguro(
      estadisticas
        .porcentajeAltos
    );

  const diferencia =
    Math.abs(
      porcentajeBajos -
      porcentajeAltos
    );

  const direccionDominante =
    porcentajeAltos >
      porcentajeBajos
      ? "OVER"
      : "UNDER";

  const porcentajeDominante =
    Math.max(
      porcentajeAltos,
      porcentajeBajos
    );

  let puntaje =
    42 +
    diferencia * 1.8;

  if (cantidad >= 50) {
    puntaje += 4;
  }

  if (cantidad >= 80) {
    puntaje += 3;
  }

  if (
    diferencia <
    CONFIGURACION_PREDICCION
      .diferenciaMinimaDigitos
  ) {
    puntaje -= 12;
  }

  puntaje =
    limitarNumero(
      puntaje,
      0,
      CONFIGURACION_PREDICCION
        .maximoPuntajeOverUnder
    );

  let direccion =
    direccionDominante;

  if (
    puntaje <
      CONFIGURACION_PREDICCION
        .puntajeCandidata ||
    diferencia <
      CONFIGURACION_PREDICCION
        .diferenciaMinimaDigitos
  ) {
    direccion = "WAIT";
  }

  const estado =
    direccion === "WAIT"
      ? "MONITORING"
      : obtenerEstadoPreliminar(
          puntaje
        );

  const razones = [
    `En los últimos ${cantidad} ticks hubo ${estadisticas.bajos} dígitos entre 0 y 4.`,
    `Hubo ${estadisticas.altos} dígitos entre 5 y 9.`,
    `El grupo dominante representa ${porcentajeDominante.toFixed(1)}%.`
  ];

  const advertencias = [
    "Over / Under depende del próximo último dígito y no puede garantizarse con frecuencias anteriores."
  ];

  if (
    direccion === "WAIT"
  ) {
    agregarAdvertencia(
      advertencias,
      "La diferencia entre dígitos altos y bajos todavía no es suficiente."
    );
  }

  return crearResultadoBase({
    estrategia:
      "over_under",

    direccion,

    puntaje,

    estado,

    razones,

    advertencias,

    componentes: {
      bajos:
        porcentajeBajos,

      altos:
        porcentajeAltos
    },

    metadata: {
      cantidad,
      porcentajeBajos,
      porcentajeAltos,
      diferencia,
      dominante:
        direccionDominante,

      aptaParaConfirmacion:
        direccion !== "WAIT" &&
        puntaje >=
          CONFIGURACION_PREDICCION
            .puntajeConfirmado &&
        diferencia >=
          CONFIGURACION_PREDICCION
            .diferenciaMinimaDigitos
    }
  });
}


/* =====================================================
18. MATCH
===================================================== */

export function evaluarMatch(
  resumen
) {
  const estadisticas =
    resumen?.estadisticasDigitos;

  const minimo = 30;

  if (
    !estadisticas ||
    estadisticas.cantidad <
      minimo
  ) {
    return crearResultadoMonitoreo(
      "match",
      `Se necesitan al menos ${minimo} últimos dígitos para analizar Match.`
    );
  }

  const cantidad =
    estadisticas.cantidad;

  const digito =
    estadisticas
      .digitoCaliente;

  const frecuencia =
    estadisticas
      .frecuenciaCaliente;

  const porcentaje =
    cantidad > 0
      ? (
          frecuencia /
          cantidad
        ) * 100
      : 0;

  const exceso =
    porcentaje - 10;

  let puntaje =
    40 +
    Math.max(
      0,
      exceso
    ) * 2.1;

  if (frecuencia >= 5) {
    puntaje += 5;
  }

  if (
    porcentaje <
    17
  ) {
    puntaje -= 10;
  }

  puntaje =
    limitarNumero(
      puntaje,
      0,
      CONFIGURACION_PREDICCION
        .maximoPuntajeMatch
    );

  const frecuenciaSuficiente =
    frecuencia >= 4 &&
    porcentaje >= 17;

  let direccion =
    frecuenciaSuficiente &&
    puntaje >=
      CONFIGURACION_PREDICCION
        .puntajeCandidata
      ? "MATCH"
      : "WAIT";

  const estado =
    direccion === "WAIT"
      ? "MONITORING"
      : obtenerEstadoPreliminar(
          puntaje
        );

  const razones = [
    `En los últimos ${cantidad} ticks, el dígito ${digito} apareció ${frecuencia} veces.`,
    `Su frecuencia observada es ${porcentaje.toFixed(1)}%.`
  ];

  const advertencias = [
    "Match es experimental y la repetición pasada de un dígito no garantiza su siguiente aparición."
  ];

  if (
    direccion === "WAIT"
  ) {
    agregarAdvertencia(
      advertencias,
      "Ningún dígito destaca lo suficiente para preparar una entrada."
    );
  }

  return crearResultadoBase({
    estrategia:
      "match",

    direccion,

    puntaje,

    estado,

    razones,

    advertencias,

    componentes: {
      frecuencia,
      porcentaje
    },

    metadata: {
      digito,
      frecuencia,
      porcentaje,
      cantidad,

      aptaParaConfirmacion:
        direccion === "MATCH" &&
        puntaje >=
          CONFIGURACION_PREDICCION
            .puntajeConfirmado &&
        frecuenciaSuficiente
    }
  });
}


/* =====================================================
19. GENERADOR GENERAL
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
20. COMPARAR RESULTADOS
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
21. TEXTO PARA PANTALLA
===================================================== */

export function crearTextoOperacion(
  resultado
) {
  if (!resultado) {
    return "Sin resultado disponible.";
  }

  const clasificacion =
    clasificarPuntaje(
      resultado.puntaje
    );

  if (
    resultado.direccion ===
    "WAIT"
  ) {
    return (
      "Buscando una configuración más sólida. " +
      `Signal Quality: ${clasificacion.nivel}.`
    );
  }

  if (
    resultado.estado ===
    "CANDIDATE"
  ) {
    return (
      `Posible ${resultado.direccion} en validación. ` +
      `Signal Score: ${resultado.puntaje}/100.`
    );
  }

  if (
    resultado.estado ===
    "PREPARE"
  ) {
    return (
      `Posible ${resultado.direccion}. ` +
      "Prepare la operación y espere confirmación."
    );
  }

  if (
    resultado.estado ===
    "CONFIRMED"
  ) {
    return (
      `${resultado.direccion} confirmado. ` +
      "Ejecute la operación ahora."
    );
  }

  return (
    `Signal Score: ${resultado.puntaje}/100.`
  );
}


/* =====================================================
22. RESUMEN DEL PUNTAJE
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
      resultado.puntaje
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
TRADING ANALYST V8 PRO
=========================================================
*/
