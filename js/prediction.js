/*
=========================================================
TRADING ANALYST V8 PRO
Archivo: js/prediction.js

Responsabilidad:
- Interpretar el resumen técnico.
- Calcular Signal Score.
- Generar PREPARE y CONFIRMED.
- Evaluar Rise/Fall, Even/Odd, Over/Under y Match.
- Evitar señales cuando la evidencia sea débil.
=========================================================
*/

import {
  limitarNumero,
  resumenTecnicoValido
} from "./indicators.js";


/* =====================================================
1. CONFIGURACIÓN DEL MOTOR
===================================================== */

export const CONFIGURACION_PREDICCION = Object.freeze({
  puntajePrepare: 68,
  puntajeConfirmado: 80,
  puntajeMuyFuerte: 90,

  diferenciaMinimaRiseFall: 18,
  diferenciaMinimaDigitos: 14,

  minimoDigitosFast: 20,
  minimoDigitosComplete: 40,

  maximoPuntaje: 100
});


/* =====================================================
2. NOMBRES Y TRADUCCIONES
===================================================== */

export const NOMBRES_ESTRATEGIAS = Object.freeze({
  rise_fall: "Rise / Fall",
  even_odd: "Even / Odd",
  over_under: "Over / Under",
  match: "Match"
});


export const NOMBRES_VOZ = Object.freeze({
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
3. RESULTADOS BASE
===================================================== */

function crearResultadoBase({
  estrategia,
  direccion = "WAIT",
  puntaje = 0,
  estado = "MONITORING",
  razones = [],
  advertencias = [],
  metadata = {}
}) {
  return {
    estrategia,
    nombreEstrategia:
      NOMBRES_ESTRATEGIAS[estrategia] ||
      estrategia,

    direccion,
    nombreVoz:
      NOMBRES_VOZ[direccion] ||
      direccion,

    puntaje: Math.round(
      limitarNumero(
        puntaje,
        0,
        CONFIGURACION_PREDICCION.maximoPuntaje
      )
    ),

    estado,
    ejecutable:
      estado === "CONFIRMED",

    razones,
    advertencias,

    metadata,

    creadoEn:
      Date.now()
  };
}


export function crearResultadoMonitoreo(
  estrategia,
  mensaje =
    "El motor continúa buscando una configuración válida."
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
4. CLASIFICACIÓN DEL PUNTAJE
===================================================== */

export function clasificarPuntaje(
  puntaje
) {
  const valor =
    limitarNumero(
      Number(puntaje) || 0,
      0,
      100
    );

  if (
    valor >=
    CONFIGURACION_PREDICCION.puntajeMuyFuerte
  ) {
    return {
      nivel: "VERY STRONG",
      color: "verde",
      prioridad: 4
    };
  }

  if (
    valor >=
    CONFIGURACION_PREDICCION.puntajeConfirmado
  ) {
    return {
      nivel: "STRONG",
      color: "verde",
      prioridad: 3
    };
  }

  if (
    valor >=
    CONFIGURACION_PREDICCION.puntajePrepare
  ) {
    return {
      nivel: "PREPARE",
      color: "amarillo",
      prioridad: 2
    };
  }

  if (valor >= 55) {
    return {
      nivel: "MONITORING",
      color: "azul",
      prioridad: 1
    };
  }

  return {
    nivel: "NO TRADE",
    color: "rojo",
    prioridad: 0
  };
}


/* =====================================================
5. ESTADO SEGÚN PUNTAJE
===================================================== */

function calcularEstadoPorPuntaje(
  puntaje,
  condicionConfirmada = false
) {
  if (
    puntaje >=
      CONFIGURACION_PREDICCION.puntajeConfirmado &&
    condicionConfirmada
  ) {
    return "CONFIRMED";
  }

  if (
    puntaje >=
    CONFIGURACION_PREDICCION.puntajePrepare
  ) {
    return "PREPARE";
  }

  return "MONITORING";
}


/* =====================================================
6. RISE / FALL
===================================================== */

export function evaluarRiseFall(
  resumen
) {
  if (!resumenTecnicoValido(resumen)) {
    return crearResultadoMonitoreo(
      "rise_fall",
      "Todavía no existen suficientes datos técnicos."
    );
  }

  const {
    tendencia,
    rsi,
    interpretacionRsi,
    momentum,
    volatilidad,
    flujoCorto,
    flujoMedio,
    mercadoLateral,
    fibonacci,
    fuerzaTecnica
  } = resumen;

  let bullish = 0;
  let bearish = 0;

  const razonesBullish = [];
  const razonesBearish = [];
  const advertencias = [];

  /*
  -------------------------------------------------------
  TENDENCIA
  -------------------------------------------------------
  */

  if (
    tendencia.direccion ===
    "ALCISTA"
  ) {
    const puntos =
      17 +
      tendencia.fuerza * 4;

    bullish += puntos;

    razonesBullish.push(
      `Tendencia alcista confirmada con fuerza ${tendencia.fuerza}.`
    );
  }

  if (
    tendencia.direccion ===
    "BAJISTA"
  ) {
    const puntos =
      17 +
      tendencia.fuerza * 4;

    bearish += puntos;

    razonesBearish.push(
      `Tendencia bajista confirmada con fuerza ${tendencia.fuerza}.`
    );
  }

  if (tendencia.lateral) {
    advertencias.push(
      "La tendencia permanece lateral."
    );
  }

  /*
  -------------------------------------------------------
  RSI
  -------------------------------------------------------
  */

  if (
    interpretacionRsi.direccion ===
    "BULLISH"
  ) {
    bullish +=
      11 +
      interpretacionRsi.fuerza * 4;

    razonesBullish.push(
      `RSI ${rsi.toFixed(1)} en ${interpretacionRsi.zona.toLowerCase()}.`
    );
  }

  if (
    interpretacionRsi.direccion ===
    "BEARISH"
  ) {
    bearish +=
      11 +
      interpretacionRsi.fuerza * 4;

    razonesBearish.push(
      `RSI ${rsi.toFixed(1)} en ${interpretacionRsi.zona.toLowerCase()}.`
    );
  }

  if (
    interpretacionRsi.direccion ===
    "NEUTRAL"
  ) {
    advertencias.push(
      `RSI ${rsi.toFixed(1)} en zona neutral.`
    );
  }

  /*
  -------------------------------------------------------
  MOMENTUM
  -------------------------------------------------------
  */

  if (
    momentum.direccion ===
    "POSITIVO"
  ) {
    bullish +=
      12 +
      momentum.fuerza * 4;

    razonesBullish.push(
      `Momentum positivo de ${momentum.porcentaje.toFixed(4)}%.`
    );
  }

  if (
    momentum.direccion ===
    "NEGATIVO"
  ) {
    bearish +=
      12 +
      momentum.fuerza * 4;

    razonesBearish.push(
      `Momentum negativo de ${momentum.porcentaje.toFixed(4)}%.`
    );
  }

  /*
  -------------------------------------------------------
  FLUJO DE TICKS
  -------------------------------------------------------
  */

  if (
    flujoCorto.direccion ===
    "ALCISTA"
  ) {
    bullish +=
      9 +
      flujoCorto.fuerza * 3;

    razonesBullish.push(
      "El flujo corto de ticks favorece la subida."
    );
  }

  if (
    flujoCorto.direccion ===
    "BAJISTA"
  ) {
    bearish +=
      9 +
      flujoCorto.fuerza * 3;

    razonesBearish.push(
      "El flujo corto de ticks favorece la bajada."
    );
  }

  if (
    flujoMedio.direccion ===
    "ALCISTA"
  ) {
    bullish +=
      6 +
      flujoMedio.fuerza * 2;
  }

  if (
    flujoMedio.direccion ===
    "BAJISTA"
  ) {
    bearish +=
      6 +
      flujoMedio.fuerza * 2;
  }

  /*
  -------------------------------------------------------
  FIBONACCI
  -------------------------------------------------------
  */

  if (
    fibonacci.disponible &&
    fibonacci.cercaDeNivel
  ) {
    if (
      fibonacci.direccionBase ===
      "ALCISTA"
    ) {
      bullish += 10;

      razonesBullish.push(
        `Precio cerca del nivel Fibonacci ${fibonacci.nivelCercano.porcentaje}%, posible soporte.`
      );
    }

    if (
      fibonacci.direccionBase ===
      "BAJISTA"
    ) {
      bearish += 10;

      razonesBearish.push(
        `Precio cerca del nivel Fibonacci ${fibonacci.nivelCercano.porcentaje}%, posible resistencia.`
      );
    }
  }

  /*
  -------------------------------------------------------
  VOLATILIDAD
  -------------------------------------------------------
  */

  if (
    volatilidad.nivel ===
    "BAJA"
  ) {
    bullish += 3;
    bearish += 3;
  }

  if (
    volatilidad.nivel ===
    "MUY ALTA"
  ) {
    bullish -= 10;
    bearish -= 10;

    advertencias.push(
      "La volatilidad muy alta reduce la estabilidad de la señal."
    );
  }

  /*
  -------------------------------------------------------
  MERCADO LATERAL
  -------------------------------------------------------
  */

  if (
    mercadoLateral.lateral
  ) {
    bullish -= 12;
    bearish -= 12;

    advertencias.push(
      "El mercado presenta comportamiento lateral."
    );
  }

  bullish =
    limitarNumero(
      bullish,
      0,
      100
    );

  bearish =
    limitarNumero(
      bearish,
      0,
      100
    );

  const diferencia =
    Math.abs(
      bullish -
      bearish
    );

  let direccion = "WAIT";
  let puntaje = 0;
  let razones = [];

  if (bullish > bearish) {
    direccion = "RISE";
    puntaje = bullish;
    razones = razonesBullish;
  }

  if (bearish > bullish) {
    direccion = "FALL";
    puntaje = bearish;
    razones = razonesBearish;
  }

  const coincidenciaPrincipal =
    direccion === "RISE"
      ? (
          tendencia.direccion === "ALCISTA" &&
          momentum.direccion === "POSITIVO" &&
          flujoCorto.direccion === "ALCISTA"
        )
      : direccion === "FALL"
        ? (
            tendencia.direccion === "BAJISTA" &&
            momentum.direccion === "NEGATIVO" &&
            flujoCorto.direccion === "BAJISTA"
          )
        : false;

  const diferenciaValida =
    diferencia >=
    CONFIGURACION_PREDICCION
      .diferenciaMinimaRiseFall;

  const condicionConfirmada =
    coincidenciaPrincipal &&
    diferenciaValida &&
    !mercadoLateral.lateral &&
    volatilidad.nivel !==
      "MUY ALTA";

  const estado =
    calcularEstadoPorPuntaje(
      puntaje,
      condicionConfirmada
    );

  if (
    !diferenciaValida
  ) {
    advertencias.push(
      "La diferencia entre presión alcista y bajista todavía es insuficiente."
    );
  }

  if (
    razones.length === 0
  ) {
    razones.push(
      "Los indicadores todavía no presentan una dirección clara."
    );
  }

  return crearResultadoBase({
    estrategia:
      "rise_fall",

    direccion:
      estado === "MONITORING"
        ? "WAIT"
        : direccion,

    puntaje,
    estado,

    razones,
    advertencias,

    metadata: {
      bullish,
      bearish,
      diferencia,
      fuerzaTecnica
    }
  });
}


/* =====================================================
7. EVEN / ODD
===================================================== */

export function evaluarEvenOdd(
  resumen
) {
  const estadisticas =
    resumen?.estadisticasDigitos;

  if (
    !estadisticas ||
    estadisticas.cantidad <
      CONFIGURACION_PREDICCION
        .minimoDigitosFast
  ) {
    return crearResultadoMonitoreo(
      "even_odd",
      "Todavía no existen suficientes últimos dígitos."
    );
  }

  const {
    cantidad,
    pares,
    impares,
    porcentajePares,
    porcentajeImpares
  } = estadisticas;

  const diferencia =
    Math.abs(
      porcentajePares -
      porcentajeImpares
    );

  let direccion =
    porcentajePares >
    porcentajeImpares
      ? "EVEN"
      : "ODD";

  const dominante =
    Math.max(
      porcentajePares,
      porcentajeImpares
    );

  let puntaje =
    48 +
    diferencia * 1.7;

  if (cantidad >= 50) {
    puntaje += 4;
  }

  puntaje =
    limitarNumero(
      puntaje,
      0,
      82
    );

  const condicionConfirmada =
    diferencia >=
    CONFIGURACION_PREDICCION
      .diferenciaMinimaDigitos;

  const estado =
    calcularEstadoPorPuntaje(
      puntaje,
      condicionConfirmada
    );

  const razones = [
    `Pares observados: ${pares} de ${cantidad}.`,
    `Impares observados: ${impares} de ${cantidad}.`,
    `Distribución dominante: ${dominante.toFixed(1)}%.`
  ];

  const advertencias = [
    "Esta estrategia analiza frecuencias históricas y no garantiza el siguiente dígito."
  ];

  if (!condicionConfirmada) {
    advertencias.push(
      "La distribución entre pares e impares está demasiado equilibrada."
    );
  }

  return crearResultadoBase({
    estrategia:
      "even_odd",

    direccion:
      estado === "MONITORING"
        ? "WAIT"
        : direccion,

    puntaje,
    estado,

    razones,
    advertencias,

    metadata: {
      porcentajePares,
      porcentajeImpares,
      diferencia
    }
  });
}


/* =====================================================
8. OVER / UNDER
===================================================== */

export function evaluarOverUnder(
  resumen
) {
  const estadisticas =
    resumen?.estadisticasDigitos;

  if (
    !estadisticas ||
    estadisticas.cantidad <
      CONFIGURACION_PREDICCION
        .minimoDigitosFast
  ) {
    return crearResultadoMonitoreo(
      "over_under",
      "Todavía no existen suficientes últimos dígitos."
    );
  }

  const {
    cantidad,
    bajos,
    altos,
    porcentajeBajos,
    porcentajeAltos
  } = estadisticas;

  const diferencia =
    Math.abs(
      porcentajeBajos -
      porcentajeAltos
    );

  let direccion =
    porcentajeAltos >
    porcentajeBajos
      ? "OVER"
      : "UNDER";

  const dominante =
    Math.max(
      porcentajeAltos,
      porcentajeBajos
    );

  let puntaje =
    48 +
    diferencia * 1.7;

  if (cantidad >= 50) {
    puntaje += 4;
  }

  puntaje =
    limitarNumero(
      puntaje,
      0,
      82
    );

  const condicionConfirmada =
    diferencia >=
    CONFIGURACION_PREDICCION
      .diferenciaMinimaDigitos;

  const estado =
    calcularEstadoPorPuntaje(
      puntaje,
      condicionConfirmada
    );

  const razones = [
    `Dígitos entre 0 y 4: ${bajos} de ${cantidad}.`,
    `Dígitos entre 5 y 9: ${altos} de ${cantidad}.`,
    `Grupo dominante: ${dominante.toFixed(1)}%.`
  ];

  const advertencias = [
    "La frecuencia histórica no garantiza el resultado del siguiente tick."
  ];

  if (!condicionConfirmada) {
    advertencias.push(
      "La diferencia entre dígitos altos y bajos todavía es insuficiente."
    );
  }

  return crearResultadoBase({
    estrategia:
      "over_under",

    direccion:
      estado === "MONITORING"
        ? "WAIT"
        : direccion,

    puntaje,
    estado,

    razones,
    advertencias,

    metadata: {
      porcentajeBajos,
      porcentajeAltos,
      diferencia
    }
  });
}


/* =====================================================
9. MATCH
===================================================== */

export function evaluarMatch(
  resumen
) {
  const estadisticas =
    resumen?.estadisticasDigitos;

  if (
    !estadisticas ||
    estadisticas.cantidad < 30
  ) {
    return crearResultadoMonitoreo(
      "match",
      "Todavía no existen suficientes últimos dígitos para Match."
    );
  }

  const {
    cantidad,
    digitoCaliente,
    frecuenciaCaliente
  } = estadisticas;

  const porcentaje =
    (
      frecuenciaCaliente /
      cantidad
    ) * 100;

  const excesoSobreEsperado =
    porcentaje - 10;

  let puntaje =
    45 +
    excesoSobreEsperado * 2.3;

  if (
    frecuenciaCaliente >= 5
  ) {
    puntaje += 5;
  }

  puntaje =
    limitarNumero(
      puntaje,
      0,
      76
    );

  const condicionConfirmada =
    porcentaje >= 22 &&
    frecuenciaCaliente >= 4;

  const estado =
    calcularEstadoPorPuntaje(
      puntaje,
      condicionConfirmada
    );

  const direccion =
    estado === "MONITORING"
      ? "WAIT"
      : "MATCH";

  const razones = [
    `El dígito ${digitoCaliente} apareció ${frecuenciaCaliente} veces.`,
    `Frecuencia observada: ${porcentaje.toFixed(1)}%.`,
    `Muestra analizada: ${cantidad} ticks.`
  ];

  const advertencias = [
    "Match es una estrategia experimental basada en frecuencia.",
    "Un dígito frecuente puede dejar de aparecer en cualquier momento."
  ];

  if (!condicionConfirmada) {
    advertencias.push(
      "Ningún dígito destaca lo suficiente para confirmar una señal."
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

    metadata: {
      digito:
        digitoCaliente,
      frecuencia:
        frecuenciaCaliente,
      porcentaje
    }
  });
}


/* =====================================================
10. EVALUADOR GENERAL
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
11. COMPARACIÓN ENTRE RESULTADOS
===================================================== */

export function mismaPrediccion(
  resultadoAnterior,
  resultadoNuevo
) {
  if (
    !resultadoAnterior ||
    !resultadoNuevo
  ) {
    return false;
  }

  return (
    resultadoAnterior.estrategia ===
      resultadoNuevo.estrategia &&
    resultadoAnterior.direccion ===
      resultadoNuevo.direccion &&
    resultadoAnterior.estado ===
      resultadoNuevo.estado
  );
}


/* =====================================================
12. CONFIRMACIÓN EN VARIOS CICLOS
===================================================== */

export function crearConfirmador({
  ciclosPrepare = 2,
  ciclosConfirmacion = 3
} = {}) {
  let direccionActual = null;
  let repeticiones = 0;

  function reiniciar() {
    direccionActual = null;
    repeticiones = 0;
  }

  function procesar(
    resultado
  ) {
    if (
      !resultado ||
      resultado.direccion ===
        "WAIT"
    ) {
      reiniciar();

      return {
        ...resultado,
        estado:
          "MONITORING",
        repeticiones: 0
      };
    }

    if (
      resultado.direccion ===
      direccionActual
    ) {
      repeticiones++;
    } else {
      direccionActual =
        resultado.direccion;

      repeticiones = 1;
    }

    let estado =
      "MONITORING";

    if (
      repeticiones >=
      ciclosPrepare
    ) {
      estado = "PREPARE";
    }

    if (
      repeticiones >=
        ciclosConfirmacion &&
      resultado.puntaje >=
        CONFIGURACION_PREDICCION
          .puntajeConfirmado
    ) {
      estado = "CONFIRMED";
    }

    return {
      ...resultado,
      estado,
      ejecutable:
        estado ===
        "CONFIRMED",
      repeticiones
    };
  }

  return {
    procesar,
    reiniciar,

    obtenerEstado() {
      return {
        direccionActual,
        repeticiones
      };
    }
  };
}


/* =====================================================
13. TEXTO DE OPERACIÓN
===================================================== */

export function crearTextoOperacion(
  resultado
) {
  if (!resultado) {
    return "Sin resultado disponible.";
  }

  if (
    resultado.estado ===
    "MONITORING"
  ) {
    return "Buscando una oportunidad más sólida.";
  }

  if (
    resultado.estado ===
    "PREPARE"
  ) {
    return (
      `Posible ${resultado.direccion}. ` +
      "Prepare el bot y espere confirmación."
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

  if (
    resultado.estado ===
    "CANCELLED"
  ) {
    return "La oportunidad perdió confirmación.";
  }

  return "Esperando nueva señal.";
}


/*
=========================================================
FIN DEL ARCHIVO js/prediction.js
TRADING ANALYST V8 PRO
=========================================================
*/
