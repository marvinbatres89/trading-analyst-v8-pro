/*
=========================================================
TRADING ANALYST V8 PRO
Archivo: js/indicators.js

Responsabilidad:
- Calcular indicadores técnicos.
- Analizar tendencia, RSI, momentum y volatilidad.
- Calcular promedios móviles.
- Detectar mercado lateral.
- Analizar flujo reciente de ticks.
- Calcular niveles de Fibonacci.
- Preparar un resumen técnico para prediction.js.
=========================================================
*/


/* =====================================================
1. UTILIDADES GENERALES
===================================================== */

export function limitarNumero(
  valor,
  minimo,
  maximo
) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return minimo;
  }

  return Math.max(
    minimo,
    Math.min(maximo, numero)
  );
}


export function calcularPromedio(
  valores
) {
  if (
    !Array.isArray(valores) ||
    valores.length === 0
  ) {
    return 0;
  }

  const datosValidos = valores.filter(
    Number.isFinite
  );

  if (datosValidos.length === 0) {
    return 0;
  }

  const suma = datosValidos.reduce(
    (acumulado, valor) =>
      acumulado + valor,
    0
  );

  return suma / datosValidos.length;
}


export function calcularDesviacionEstandar(
  valores
) {
  if (
    !Array.isArray(valores) ||
    valores.length < 2
  ) {
    return 0;
  }

  const datosValidos = valores.filter(
    Number.isFinite
  );

  if (datosValidos.length < 2) {
    return 0;
  }

  const promedio =
    calcularPromedio(datosValidos);

  const diferenciasCuadradas =
    datosValidos.map(
      (valor) =>
        Math.pow(
          valor - promedio,
          2
        )
    );

  return Math.sqrt(
    calcularPromedio(
      diferenciasCuadradas
    )
  );
}


export function calcularCambioPorcentual(
  valorInicial,
  valorFinal
) {
  if (
    !Number.isFinite(valorInicial) ||
    !Number.isFinite(valorFinal) ||
    valorInicial === 0
  ) {
    return 0;
  }

  return (
    (valorFinal - valorInicial) /
    valorInicial
  ) * 100;
}


export function calcularRango(
  valores
) {
  if (
    !Array.isArray(valores) ||
    valores.length === 0
  ) {
    return {
      minimo: 0,
      maximo: 0,
      amplitud: 0
    };
  }

  const datosValidos = valores.filter(
    Number.isFinite
  );

  if (datosValidos.length === 0) {
    return {
      minimo: 0,
      maximo: 0,
      amplitud: 0
    };
  }

  const minimo = Math.min(
    ...datosValidos
  );

  const maximo = Math.max(
    ...datosValidos
  );

  return {
    minimo,
    maximo,
    amplitud:
      maximo - minimo
  };
}


/* =====================================================
2. PROMEDIOS MÓVILES
===================================================== */

export function calcularSMA(
  precios,
  periodo
) {
  if (
    !Array.isArray(precios) ||
    precios.length === 0 ||
    !Number.isInteger(periodo) ||
    periodo <= 0
  ) {
    return null;
  }

  if (precios.length < periodo) {
    return null;
  }

  const ventana =
    precios.slice(-periodo);

  return calcularPromedio(
    ventana
  );
}


export function calcularEMA(
  precios,
  periodo
) {
  if (
    !Array.isArray(precios) ||
    precios.length === 0 ||
    !Number.isInteger(periodo) ||
    periodo <= 0
  ) {
    return null;
  }

  if (precios.length < periodo) {
    return null;
  }

  const multiplicador =
    2 / (periodo + 1);

  const datos =
    precios.slice(-periodo * 3);

  let ema =
    calcularPromedio(
      datos.slice(0, periodo)
    );

  for (
    let indice = periodo;
    indice < datos.length;
    indice++
  ) {
    ema =
      datos[indice] *
        multiplicador +
      ema *
        (1 - multiplicador);
  }

  return ema;
}


/* =====================================================
3. RSI
===================================================== */

export function calcularRSI(
  precios,
  periodo = 14
) {
  if (
    !Array.isArray(precios) ||
    precios.length <
      periodo + 1
  ) {
    return null;
  }

  const datos =
    precios.slice(
      -(periodo + 1)
    );

  let ganancias = 0;
  let perdidas = 0;

  for (
    let indice = 1;
    indice < datos.length;
    indice++
  ) {
    const diferencia =
      datos[indice] -
      datos[indice - 1];

    if (diferencia > 0) {
      ganancias += diferencia;
    }

    if (diferencia < 0) {
      perdidas +=
        Math.abs(diferencia);
    }
  }

  const promedioGanancias =
    ganancias / periodo;

  const promedioPerdidas =
    perdidas / periodo;

  if (
    promedioGanancias === 0 &&
    promedioPerdidas === 0
  ) {
    return 50;
  }

  if (
    promedioPerdidas === 0
  ) {
    return 100;
  }

  const fuerzaRelativa =
    promedioGanancias /
    promedioPerdidas;

  return (
    100 -
    100 /
      (1 + fuerzaRelativa)
  );
}


export function interpretarRSI(
  rsi
) {
  if (!Number.isFinite(rsi)) {
    return {
      zona: "SIN DATOS",
      direccion: "NEUTRAL",
      fuerza: 0
    };
  }

  if (rsi >= 75) {
    return {
      zona: "SOBRECOMPRA FUERTE",
      direccion: "BEARISH",
      fuerza: 3
    };
  }

  if (rsi >= 68) {
    return {
      zona: "SOBRECOMPRA",
      direccion: "BEARISH",
      fuerza: 2
    };
  }

  if (rsi >= 56) {
    return {
      zona: "PRESIÓN ALCISTA",
      direccion: "BULLISH",
      fuerza: 2
    };
  }

  if (rsi <= 25) {
    return {
      zona: "SOBREVENTA FUERTE",
      direccion: "BULLISH",
      fuerza: 3
    };
  }

  if (rsi <= 32) {
    return {
      zona: "SOBREVENTA",
      direccion: "BULLISH",
      fuerza: 2
    };
  }

  if (rsi <= 44) {
    return {
      zona: "PRESIÓN BAJISTA",
      direccion: "BEARISH",
      fuerza: 2
    };
  }

  return {
    zona: "ZONA NEUTRAL",
    direccion: "NEUTRAL",
    fuerza: 0
  };
}


/* =====================================================
4. MOMENTUM
===================================================== */

export function calcularMomentum(
  precios,
  periodo = 5
) {
  if (
    !Array.isArray(precios) ||
    precios.length <
      periodo + 1
  ) {
    return {
      valor: 0,
      porcentaje: 0,
      direccion: "SIN DATOS",
      fuerza: 0
    };
  }

  const precioActual =
    precios[
      precios.length - 1
    ];

  const precioAnterior =
    precios[
      precios.length -
      1 -
      periodo
    ];

  const valor =
    precioActual -
    precioAnterior;

  const porcentaje =
    calcularCambioPorcentual(
      precioAnterior,
      precioActual
    );

  let direccion = "NEUTRAL";
  let fuerza = 0;

  if (valor > 0) {
    direccion = "POSITIVO";
  }

  if (valor < 0) {
    direccion = "NEGATIVO";
  }

  const magnitud =
    Math.abs(porcentaje);

  if (magnitud >= 0.08) {
    fuerza = 3;
  } else if (
    magnitud >= 0.03
  ) {
    fuerza = 2;
  } else if (
    magnitud > 0
  ) {
    fuerza = 1;
  }

  return {
    valor,
    porcentaje,
    direccion,
    fuerza
  };
}


/* =====================================================
5. TENDENCIA
===================================================== */

export function calcularPendienteLineal(
  valores
) {
  if (
    !Array.isArray(valores) ||
    valores.length < 3
  ) {
    return 0;
  }

  const datosValidos =
    valores.filter(
      Number.isFinite
    );

  const cantidad =
    datosValidos.length;

  if (cantidad < 3) {
    return 0;
  }

  const promedioX =
    (cantidad - 1) / 2;

  const promedioY =
    calcularPromedio(
      datosValidos
    );

  let numerador = 0;
  let denominador = 0;

  for (
    let indice = 0;
    indice < cantidad;
    indice++
  ) {
    const diferenciaX =
      indice - promedioX;

    numerador +=
      diferenciaX *
      (
        datosValidos[indice] -
        promedioY
      );

    denominador +=
      Math.pow(
        diferenciaX,
        2
      );
  }

  if (denominador === 0) {
    return 0;
  }

  return (
    numerador /
    denominador
  );
}


export function calcularTendencia(
  precios,
  ventana = 30
) {
  if (
    !Array.isArray(precios) ||
    precios.length < 6
  ) {
    return {
      direccion: "SIN DATOS",
      fuerza: 0,
      pendiente: 0,
      cambioPorcentual: 0,
      emaRapida: null,
      emaLenta: null,
      lateral: true
    };
  }

  const cantidad =
    Math.min(
      ventana,
      precios.length
    );

  const recientes =
    precios.slice(-cantidad);

  const pendiente =
    calcularPendienteLineal(
      recientes
    );

  const precioInicial =
    recientes[0];

  const precioFinal =
    recientes[
      recientes.length - 1
    ];

  const cambioPorcentual =
    calcularCambioPorcentual(
      precioInicial,
      precioFinal
    );

  const emaRapida =
    calcularEMA(
      precios,
      Math.min(
        8,
        Math.max(
          3,
          Math.floor(
            cantidad / 4
          )
        )
      )
    );

  const emaLenta =
    calcularEMA(
      precios,
      Math.min(
        21,
        Math.max(
          6,
          Math.floor(
            cantidad / 2
          )
        )
      )
    );

  const promedioPrecio =
    calcularPromedio(
      recientes
    );

  const pendienteNormalizada =
    promedioPrecio !== 0
      ? (
          pendiente /
          promedioPrecio
        ) * 100
      : 0;

  const magnitud =
    Math.abs(
      cambioPorcentual
    );

  let direccion = "LATERAL";
  let fuerza = 0;

  const confirmacionAlcista =
    Number.isFinite(
      emaRapida
    ) &&
    Number.isFinite(
      emaLenta
    ) &&
    emaRapida >
      emaLenta;

  const confirmacionBajista =
    Number.isFinite(
      emaRapida
    ) &&
    Number.isFinite(
      emaLenta
    ) &&
    emaRapida <
      emaLenta;

  if (
    cambioPorcentual > 0 &&
    pendienteNormalizada > 0 &&
    confirmacionAlcista
  ) {
    direccion = "ALCISTA";
  }

  if (
    cambioPorcentual < 0 &&
    pendienteNormalizada < 0 &&
    confirmacionBajista
  ) {
    direccion = "BAJISTA";
  }

  if (magnitud >= 0.10) {
    fuerza = 3;
  } else if (
    magnitud >= 0.04
  ) {
    fuerza = 2;
  } else if (
    magnitud > 0.01
  ) {
    fuerza = 1;
  }

  const lateral =
    direccion === "LATERAL" ||
    magnitud < 0.01;

  return {
    direccion,
    fuerza,
    pendiente,
    pendienteNormalizada,
    cambioPorcentual,
    emaRapida,
    emaLenta,
    lateral
  };
}


/* =====================================================
6. VOLATILIDAD
===================================================== */

export function calcularVolatilidad(
  precios,
  ventana = 30
) {
  if (
    !Array.isArray(precios) ||
    precios.length < 5
  ) {
    return {
      valor: 0,
      porcentaje: 0,
      nivel: "SIN DATOS",
      estabilidad: 0
    };
  }

  const cantidad =
    Math.min(
      ventana,
      precios.length
    );

  const recientes =
    precios.slice(-cantidad);

  const promedio =
    calcularPromedio(
      recientes
    );

  const desviacion =
    calcularDesviacionEstandar(
      recientes
    );

  const porcentaje =
    promedio !== 0
      ? (
          desviacion /
          promedio
        ) * 100
      : 0;

  let nivel = "BAJA";
  let estabilidad = 3;

  if (porcentaje >= 0.12) {
    nivel = "MUY ALTA";
    estabilidad = 0;
  } else if (
    porcentaje >= 0.07
  ) {
    nivel = "ALTA";
    estabilidad = 1;
  } else if (
    porcentaje >= 0.025
  ) {
    nivel = "MEDIA";
    estabilidad = 2;
  }

  return {
    valor: desviacion,
    porcentaje,
    nivel,
    estabilidad
  };
}


/* =====================================================
7. FLUJO DE TICKS
===================================================== */

export function calcularFlujoTicks(
  precios,
  ventana = 12
) {
  if (
    !Array.isArray(precios) ||
    precios.length < 3
  ) {
    return {
      subidas: 0,
      bajadas: 0,
      iguales: 0,
      balance: 0,
      direccion: "SIN DATOS",
      fuerza: 0
    };
  }

  const cantidad =
    Math.min(
      ventana,
      precios.length
    );

  const recientes =
    precios.slice(-cantidad);

  let subidas = 0;
  let bajadas = 0;
  let iguales = 0;

  for (
    let indice = 1;
    indice < recientes.length;
    indice++
  ) {
    if (
      recientes[indice] >
      recientes[indice - 1]
    ) {
      subidas++;
    } else if (
      recientes[indice] <
      recientes[indice - 1]
    ) {
      bajadas++;
    } else {
      iguales++;
    }
  }

  const movimientos =
    subidas + bajadas;

  const balance =
    movimientos > 0
      ? (
          subidas -
          bajadas
        ) /
        movimientos
      : 0;

  let direccion = "NEUTRAL";
  let fuerza = 0;

  if (balance >= 0.18) {
    direccion = "ALCISTA";
  }

  if (balance <= -0.18) {
    direccion = "BAJISTA";
  }

  const magnitud =
    Math.abs(balance);

  if (magnitud >= 0.60) {
    fuerza = 3;
  } else if (
    magnitud >= 0.35
  ) {
    fuerza = 2;
  } else if (
    magnitud >= 0.18
  ) {
    fuerza = 1;
  }

  return {
    subidas,
    bajadas,
    iguales,
    balance,
    direccion,
    fuerza
  };
}


/* =====================================================
8. MERCADO LATERAL
===================================================== */

export function detectarMercadoLateral(
  precios,
  ventana = 30
) {
  if (
    !Array.isArray(precios) ||
    precios.length < 8
  ) {
    return {
      lateral: true,
      confianza: 0,
      razon:
        "No existen suficientes datos."
    };
  }

  const cantidad =
    Math.min(
      ventana,
      precios.length
    );

  const recientes =
    precios.slice(-cantidad);

  const rango =
    calcularRango(
      recientes
    );

  const promedio =
    calcularPromedio(
      recientes
    );

  const rangoPorcentual =
    promedio !== 0
      ? (
          rango.amplitud /
          promedio
        ) * 100
      : 0;

  const tendencia =
    calcularTendencia(
      recientes,
      cantidad
    );

  const flujo =
    calcularFlujoTicks(
      recientes,
      cantidad
    );

  const lateral =
    rangoPorcentual < 0.045 &&
    Math.abs(
      tendencia.cambioPorcentual
    ) < 0.025 &&
    Math.abs(
      flujo.balance
    ) < 0.25;

  let confianza = 0;

  if (lateral) {
    confianza = 70;

    if (
      rangoPorcentual <
      0.025
    ) {
      confianza += 15;
    }

    if (
      Math.abs(
        flujo.balance
      ) < 0.10
    ) {
      confianza += 10;
    }
  }

  return {
    lateral,
    confianza:
      limitarNumero(
        confianza,
        0,
        100
      ),
    rangoPorcentual,
    razon: lateral
      ? "El precio se mantiene dentro de un rango reducido."
      : "El mercado muestra desplazamiento direccional."
  };
}


/* =====================================================
9. FIBONACCI
===================================================== */

export function calcularFibonacci(
  precios,
  ventana = 60
) {
  if (
    !Array.isArray(precios) ||
    precios.length < 12
  ) {
    return {
      disponible: false,
      estado: "SIN DATOS",
      niveles: [],
      nivelCercano: null,
      maximo: null,
      minimo: null,
      direccionBase:
        "SIN DATOS"
    };
  }

  const cantidad =
    Math.min(
      ventana,
      precios.length
    );

  const recientes =
    precios.slice(-cantidad);

  const maximo =
    Math.max(...recientes);

  const minimo =
    Math.min(...recientes);

  const precioActual =
    recientes[
      recientes.length - 1
    ];

  const amplitud =
    maximo - minimo;

  if (
    !Number.isFinite(
      amplitud
    ) ||
    amplitud <= 0
  ) {
    return {
      disponible: false,
      estado: "RANGO INVÁLIDO",
      niveles: [],
      nivelCercano: null,
      maximo,
      minimo,
      direccionBase:
        "LATERAL"
    };
  }

  const tercio =
    Math.max(
      3,
      Math.floor(
        recientes.length / 3
      )
    );

  const promedioInicial =
    calcularPromedio(
      recientes.slice(
        0,
        tercio
      )
    );

  const promedioFinal =
    calcularPromedio(
      recientes.slice(
        -tercio
      )
    );

  let direccionBase =
    "LATERAL";

  if (
    promedioFinal >
    promedioInicial
  ) {
    direccionBase =
      "ALCISTA";
  }

  if (
    promedioFinal <
    promedioInicial
  ) {
    direccionBase =
      "BAJISTA";
  }

  const proporciones = [
    23.6,
    38.2,
    50,
    61.8,
    78.6
  ];

  const niveles =
    proporciones.map(
      (porcentaje) => {
        const decimal =
          porcentaje / 100;

        const precioNivel =
          direccionBase ===
          "BAJISTA"
            ? minimo +
              amplitud *
                decimal
            : maximo -
              amplitud *
                decimal;

        const distancia =
          Math.abs(
            precioActual -
            precioNivel
          );

        const distanciaPorcentual =
          (
            distancia /
            amplitud
          ) * 100;

        return {
          porcentaje,
          precio: precioNivel,
          distancia,
          distanciaPorcentual
        };
      }
    );

  niveles.sort(
    (a, b) =>
      a.distancia -
      b.distancia
  );

  const nivelCercano =
    niveles[0];

  const cercaDeNivel =
    nivelCercano
      .distanciaPorcentual <=
    7.5;

  let estado =
    "SIN CONFIRMACIÓN";

  let tipoZona =
    "NEUTRAL";

  if (cercaDeNivel) {
    estado =
      "ZONA FIBONACCI";

    if (
      direccionBase ===
      "ALCISTA"
    ) {
      tipoZona =
        "POSIBLE SOPORTE";
    }

    if (
      direccionBase ===
      "BAJISTA"
    ) {
      tipoZona =
        "POSIBLE RESISTENCIA";
    }
  }

  return {
    disponible: true,
    estado,
    tipoZona,
    niveles,
    nivelCercano,
    maximo,
    minimo,
    precioActual,
    amplitud,
    direccionBase,
    cercaDeNivel
  };
}


/* =====================================================
10. ESTADÍSTICAS DE DÍGITOS
===================================================== */

export function contarDigitos(
  digitos
) {
  const conteo =
    Array(10).fill(0);

  if (!Array.isArray(digitos)) {
    return conteo;
  }

  digitos.forEach(
    (digito) => {
      if (
        Number.isInteger(
          digito
        ) &&
        digito >= 0 &&
        digito <= 9
      ) {
        conteo[digito]++;
      }
    }
  );

  return conteo;
}


export function calcularEstadisticasDigitos(
  digitos,
  ventana = 100
) {
  if (
    !Array.isArray(digitos) ||
    digitos.length === 0
  ) {
    return {
      cantidad: 0,
      conteo:
        Array(10).fill(0),
      pares: 0,
      impares: 0,
      bajos: 0,
      altos: 0,
      porcentajePares: 0,
      porcentajeImpares: 0,
      porcentajeBajos: 0,
      porcentajeAltos: 0,
      digitoCaliente: null,
      digitoFrio: null
    };
  }

  const recientes =
    digitos.slice(-ventana);

  const conteo =
    contarDigitos(
      recientes
    );

  const pares =
    recientes.filter(
      (digito) =>
        digito % 2 === 0
    ).length;

  const impares =
    recientes.length -
    pares;

  const bajos =
    recientes.filter(
      (digito) =>
        digito <= 4
    ).length;

  const altos =
    recientes.length -
    bajos;

  let digitoCaliente = 0;
  let digitoFrio = 0;

  for (
    let digito = 1;
    digito <= 9;
    digito++
  ) {
    if (
      conteo[digito] >
      conteo[digitoCaliente]
    ) {
      digitoCaliente =
        digito;
    }

    if (
      conteo[digito] <
      conteo[digitoFrio]
    ) {
      digitoFrio =
        digito;
    }
  }

  const cantidad =
    recientes.length;

  return {
    cantidad,
    conteo,
    pares,
    impares,
    bajos,
    altos,

    porcentajePares:
      cantidad > 0
        ? (
            pares /
            cantidad
          ) * 100
        : 0,

    porcentajeImpares:
      cantidad > 0
        ? (
            impares /
            cantidad
          ) * 100
        : 0,

    porcentajeBajos:
      cantidad > 0
        ? (
            bajos /
            cantidad
          ) * 100
        : 0,

    porcentajeAltos:
      cantidad > 0
        ? (
            altos /
            cantidad
          ) * 100
        : 0,

    digitoCaliente,
    frecuenciaCaliente:
      conteo[
        digitoCaliente
      ],

    digitoFrio,
    frecuenciaFria:
      conteo[
        digitoFrio
      ]
  };
}


/* =====================================================
11. FUERZA TÉCNICA
===================================================== */

export function calcularFuerzaTecnica(
  analisis
) {
  if (
    !analisis ||
    typeof analisis !==
      "object"
  ) {
    return {
      bullish: 0,
      bearish: 0,
      neutral: 100
    };
  }

  let bullish = 0;
  let bearish = 0;

  const {
    tendencia,
    rsi,
    momentum,
    volatilidad,
    flujoCorto,
    flujoMedio,
    fibonacci
  } = analisis;

  if (
    tendencia?.direccion ===
    "ALCISTA"
  ) {
    bullish +=
      16 +
      tendencia.fuerza * 4;
  }

  if (
    tendencia?.direccion ===
    "BAJISTA"
  ) {
    bearish +=
      16 +
      tendencia.fuerza * 4;
  }

  const interpretacionRsi =
    interpretarRSI(rsi);

  if (
    interpretacionRsi
      .direccion ===
    "BULLISH"
  ) {
    bullish +=
      12 +
      interpretacionRsi.fuerza *
        4;
  }

  if (
    interpretacionRsi
      .direccion ===
    "BEARISH"
  ) {
    bearish +=
      12 +
      interpretacionRsi.fuerza *
        4;
  }

  if (
    momentum?.direccion ===
    "POSITIVO"
  ) {
    bullish +=
      10 +
      momentum.fuerza * 4;
  }

  if (
    momentum?.direccion ===
    "NEGATIVO"
  ) {
    bearish +=
      10 +
      momentum.fuerza * 4;
  }

  if (
    flujoCorto?.direccion ===
    "ALCISTA"
  ) {
    bullish +=
      7 +
      flujoCorto.fuerza * 3;
  }

  if (
    flujoCorto?.direccion ===
    "BAJISTA"
  ) {
    bearish +=
      7 +
      flujoCorto.fuerza * 3;
  }

  if (
    flujoMedio?.direccion ===
    "ALCISTA"
  ) {
    bullish +=
      5 +
      flujoMedio.fuerza * 2;
  }

  if (
    flujoMedio?.direccion ===
    "BAJISTA"
  ) {
    bearish +=
      5 +
      flujoMedio.fuerza * 2;
  }

  if (
    volatilidad?.nivel ===
    "BAJA"
  ) {
    bullish += 3;
    bearish += 3;
  }

  if (
    volatilidad?.nivel ===
    "MUY ALTA"
  ) {
    bullish -= 8;
    bearish -= 8;
  }

  if (
    fibonacci?.cercaDeNivel
  ) {
    if (
      fibonacci
        .direccionBase ===
      "ALCISTA"
    ) {
      bullish += 8;
    }

    if (
      fibonacci
        .direccionBase ===
      "BAJISTA"
    ) {
      bearish += 8;
    }
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

  const neutral =
    limitarNumero(
      100 -
      Math.max(
        bullish,
        bearish
      ),
      0,
      100
    );

  return {
    bullish,
    bearish,
    neutral,
    diferencia:
      Math.abs(
        bullish -
        bearish
      )
  };
}


/* =====================================================
12. RESUMEN TÉCNICO COMPLETO
===================================================== */

export function crearResumenTecnico({
  precios = [],
  digitos = [],
  modo = "fast"
} = {}) {
  const configuracion =
    modo === "complete"
      ? {
          periodoRSI: 14,
          ventanaTendencia: 60,
          periodoMomentum: 10,
          ventanaVolatilidad: 60,
          flujoCorto: 12,
          flujoMedio: 30,
          ventanaFibonacci: 120,
          ventanaDigitos: 100
        }
      : {
          periodoRSI: 8,
          ventanaTendencia: 30,
          periodoMomentum: 5,
          ventanaVolatilidad: 30,
          flujoCorto: 8,
          flujoMedio: 20,
          ventanaFibonacci: 60,
          ventanaDigitos: 50
        };

  const tendencia =
    calcularTendencia(
      precios,
      configuracion
        .ventanaTendencia
    );

  const rsi =
    calcularRSI(
      precios,
      configuracion
        .periodoRSI
    );

  const momentum =
    calcularMomentum(
      precios,
      configuracion
        .periodoMomentum
    );

  const volatilidad =
    calcularVolatilidad(
      precios,
      configuracion
        .ventanaVolatilidad
    );

  const flujoCorto =
    calcularFlujoTicks(
      precios,
      configuracion
        .flujoCorto
    );

  const flujoMedio =
    calcularFlujoTicks(
      precios,
      configuracion
        .flujoMedio
    );

  const mercadoLateral =
    detectarMercadoLateral(
      precios,
      configuracion
        .ventanaTendencia
    );

  const fibonacci =
    calcularFibonacci(
      precios,
      configuracion
        .ventanaFibonacci
    );

  const estadisticasDigitos =
    calcularEstadisticasDigitos(
      digitos,
      configuracion
        .ventanaDigitos
    );

  const fuerzaTecnica =
    calcularFuerzaTecnica({
      tendencia,
      rsi,
      momentum,
      volatilidad,
      flujoCorto,
      flujoMedio,
      fibonacci
    });

  const listo =
    precios.length >=
    (
      modo === "complete"
        ? 30
        : 12
    );

  return {
    listo,
    modo,
    cantidadPrecios:
      precios.length,
    cantidadDigitos:
      digitos.length,

    tendencia,
    rsi,
    interpretacionRsi:
      interpretarRSI(rsi),

    momentum,
    volatilidad,
    flujoCorto,
    flujoMedio,
    mercadoLateral,
    fibonacci,
    estadisticasDigitos,
    fuerzaTecnica,

    actualizadoEn:
      Date.now()
  };
}


/* =====================================================
13. VALIDACIÓN BÁSICA DEL RESUMEN
===================================================== */

export function resumenTecnicoValido(
  resumen
) {
  return Boolean(
    resumen &&
    resumen.listo &&
    resumen.tendencia &&
    resumen.momentum &&
    resumen.volatilidad &&
    Number.isFinite(
      resumen.rsi
    )
  );
}


/*
=========================================================
FIN DEL ARCHIVO js/indicators.js
TRADING ANALYST V8 PRO
=========================================================
*/
