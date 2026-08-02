/*
=========================================================
TRADING ANALYST PRO MR
Archivo: js/app.js

Responsabilidad:
- Conectar todos los módulos.
- Recibir ticks de Deriv.
- Ejecutar indicadores y predicciones.
- Administrar:
  SEARCHING
  VALIDATING
  PREPARE
  REVALIDATING
  EXECUTE NOW
  RESULT
- Activar el botón PREDICTION.
- Separar estadísticas por mercado y estrategia.
=========================================================
*/

import {
  derivAPI
} from "./deriv-api.js";

import {
  crearResumenTecnico
} from "./indicators.js";

import {
  generarPrediccion,
  clasificarPuntaje,
  crearTextoOperacion
} from "./prediction.js";

import {
  monitorOportunidades,
  ESTADOS_MONITOR
} from "./monitor.js";

import {
  asistenteVoz
} from "./voice.js";


/* =====================================================
1. CONFIGURACIÓN
===================================================== */

const CONFIGURACION = Object.freeze({
  version: "9.0.0-MR",

  maximoPrecios: 1000,
  maximoDigitos: 1000,

  maximoHistorial: 30,
  maximoRegistro: 80,

  intervaloAnalisisMilisegundos: 350,

  minimoTicksBotonPrediccion: 12,

  tiempoCapsulaManual: 4500,
  tiempoCapsulaPrepare: 5000,
  tiempoCapsulaRevalidacion: 3500,
  tiempoCapsulaConfirmada: 5000,
  tiempoCapsulaResultado: 4500
});


/* =====================================================
2. MERCADOS
===================================================== */

const MERCADOS = Object.freeze([
  {
    simbolo: "1HZ10V",
    nombre: "Volatility 10 (1s) Index",
    codigo: "10-1S"
  },
  {
    simbolo: "1HZ25V",
    nombre: "Volatility 25 (1s) Index",
    codigo: "25-1S"
  },
  {
    simbolo: "1HZ50V",
    nombre: "Volatility 50 (1s) Index",
    codigo: "50-1S"
  },
  {
    simbolo: "1HZ75V",
    nombre: "Volatility 75 (1s) Index",
    codigo: "75-1S"
  },
  {
    simbolo: "1HZ100V",
    nombre: "Volatility 100 (1s) Index",
    codigo: "100-1S"
  },
  {
    simbolo: "R_10",
    nombre: "Volatility 10 Index",
    codigo: "10"
  },
  {
    simbolo: "R_25",
    nombre: "Volatility 25 Index",
    codigo: "25"
  },
  {
    simbolo: "R_50",
    nombre: "Volatility 50 Index",
    codigo: "50"
  },
  {
    simbolo: "R_75",
    nombre: "Volatility 75 Index",
    codigo: "75"
  },
  {
    simbolo: "R_100",
    nombre: "Volatility 100 Index",
    codigo: "100"
  }
]);


/* =====================================================
3. ELEMENTOS
===================================================== */

function obtenerElemento(
  id,
  obligatorio = false
) {
  const elemento =
    document.getElementById(id);

  if (
    !elemento &&
    obligatorio
  ) {
    console.warn(
      `No se encontró el elemento #${id}`
    );
  }

  return elemento;
}


const interfaz = {
  estadoConexion:
    obtenerElemento("estadoConexion"),

  textoEstadoConexion:
    obtenerElemento("textoEstadoConexion"),

  estadoMotor:
    obtenerElemento("estadoMotor"),

  textoEstadoMotor:
    obtenerElemento("textoEstadoMotor"),

  estadoMonitoreo:
    obtenerElemento("estadoMonitoreo"),

  textoEstadoMonitoreo:
    obtenerElemento("textoEstadoMonitoreo"),

  estadoMemoria:
    obtenerElemento("estadoMemoria"),

  botonConectar:
    obtenerElemento("botonConectar"),

  botonDesconectar:
    obtenerElemento("botonDesconectar"),

  botonEncenderMotor:
    obtenerElemento("botonEncenderMotor"),

  botonPrediccion:
    obtenerElemento("botonPrediccion"),

  mensajeControl:
    obtenerElemento("mensajeControl"),

  botonAbrirMercados:
    obtenerElemento("botonAbrirMercados"),

  mercadoSeleccionado:
    obtenerElemento("mercadoSeleccionado"),

  simboloSeleccionado:
    obtenerElemento("simboloSeleccionado"),

  selectorEstrategia:
    obtenerElemento("selectorEstrategia"),

  selectorModo:
    obtenerElemento("selectorModo"),

  selectorHorizonte:
    obtenerElemento("selectorHorizonte"),

  panelMonitoreo:
    obtenerElemento("panelMonitoreo"),

  tituloMonitoreo:
    obtenerElemento("tituloMonitoreo"),

  detalleMonitoreo:
    obtenerElemento("detalleMonitoreo"),

  botonCancelarMonitoreo:
    obtenerElemento("botonCancelarMonitoreo"),

  nombreMercado:
    obtenerElemento("nombreMercado"),

  estadoDatos:
    obtenerElemento("estadoDatos"),

  precioActual:
    obtenerElemento("precioActual"),

  contadorTicks:
    obtenerElemento("contadorTicks"),

  ultimoDigito:
    obtenerElemento("ultimoDigito"),

  horaActualizacion:
    obtenerElemento("horaActualizacion"),

  cantidadDigitos:
    obtenerElemento("cantidadDigitos"),

  listaUltimosDigitos:
    obtenerElemento("listaUltimosDigitos"),

  textoProgreso:
    obtenerElemento("textoProgreso"),

  numeroProgreso:
    obtenerElemento("numeroProgreso"),

  barraMemoria:
    obtenerElemento("barraMemoria"),

  tendencia:
    obtenerElemento("tendencia"),

  detalleTendencia:
    obtenerElemento("detalleTendencia"),

  rsi:
    obtenerElemento("rsi"),

  detalleRsi:
    obtenerElemento("detalleRsi"),

  momentum:
    obtenerElemento("momentum"),

  detalleMomentum:
    obtenerElemento("detalleMomentum"),

  volatilidad:
    obtenerElemento("volatilidad"),

  detalleVolatilidad:
    obtenerElemento("detalleVolatilidad"),

  estadoFibonacci:
    obtenerElemento("estadoFibonacci"),

  detalleFibonacci:
    obtenerElemento("detalleFibonacci"),

  nivelFibonacciCercano:
    obtenerElemento("nivelFibonacciCercano"),

  maximoFibonacci:
    obtenerElemento("maximoFibonacci"),

  minimoFibonacci:
    obtenerElemento("minimoFibonacci"),

  distanciaFibonacci:
    obtenerElemento("distanciaFibonacci"),

  nivelesFibonacci:
    obtenerElemento("nivelesFibonacci"),

  panelSenal:
    obtenerElemento("panelSenal"),

  estadoPrediccion:
    obtenerElemento("estadoPrediccion"),

  tituloPrediccion:
    obtenerElemento("tituloPrediccion"),

  valorPrediccion:
    obtenerElemento("valorPrediccion"),

  puntajeSenal:
    obtenerElemento("puntajeSenal"),

  precisionObservada:
    obtenerElemento("precisionObservada"),

  barraPuntaje:
    obtenerElemento("barraPuntaje"),

  listaMotivos:
    obtenerElemento("listaMotivos"),

  mensajeOperacion:
    obtenerElemento("mensajeOperacion"),

  cuentaRegresiva:
    obtenerElemento("cuentaRegresiva"),

  botonNuevaSenal:
    obtenerElemento("botonNuevaSenal"),

  estadisticaIntentos:
    obtenerElemento("estadisticaIntentos"),

  estadisticaAciertos:
    obtenerElemento("estadisticaAciertos"),

  estadisticaFallos:
    obtenerElemento("estadisticaFallos"),

  estadisticaPrecision:
    obtenerElemento("estadisticaPrecision"),

  estadisticaRacha:
    obtenerElemento("estadisticaRacha"),

  botonReiniciarEstadisticas:
    obtenerElemento("botonReiniciarEstadisticas"),

  botonVoz:
    obtenerElemento("botonVoz"),

  selectorVoz:
    obtenerElemento("selectorVoz"),

  velocidadVoz:
    obtenerElemento("velocidadVoz"),

  valorVelocidad:
    obtenerElemento("valorVelocidad"),

  tonoVoz:
    obtenerElemento("tonoVoz"),

  valorTono:
    obtenerElemento("valorTono"),

  volumenVoz:
    obtenerElemento("volumenVoz"),

  valorVolumen:
    obtenerElemento("valorVolumen"),

  botonProbarVoz:
    obtenerElemento("botonProbarVoz"),

  historialSenales:
    obtenerElemento("historialSenales"),

  botonLimpiarHistorial:
    obtenerElemento("botonLimpiarHistorial"),

  registroActividad:
    obtenerElemento("registroActividad"),

  botonLimpiarRegistro:
    obtenerElemento("botonLimpiarRegistro"),

  dialogoMercados:
    obtenerElemento("dialogoMercados"),

  botonCerrarMercados:
    obtenerElemento("botonCerrarMercados"),

  listaMercados:
    obtenerElemento("listaMercados"),

  capsulaSenal:
    obtenerElemento("capsulaSenal"),

  estadoCapsula:
    obtenerElemento("estadoCapsula"),

  valorCapsula:
    obtenerElemento("valorCapsula"),

  detalleCapsula:
    obtenerElemento("detalleCapsula")
};


/* =====================================================
4. ESTADO GENERAL
===================================================== */

const estado = {
  conectado: false,
  motorEncendido: false,

  simbolo: "1HZ100V",
  mercado: "Volatility 100 (1s) Index",

  estrategia: "rise_fall",
  modo: "fast",
  horizonte: "10s",

  precios: [],
  digitos: [],

  ticksRecibidos: 0,

  ultimoPrecio: null,
  ultimoPipSize: null,

  ultimoAnalisisEn: 0,

  resumenTecnico: null,
  ultimaPrediccion: null,

  senalActiva: null,

  historial: [],

  estadisticas: {}
};


let temporizadorCapsula = null;
let temporizadorCuentaRegresiva = null;


/* =====================================================
5. UTILIDADES DE INTERFAZ
===================================================== */

function establecerTexto(
  elemento,
  texto
) {
  if (elemento) {
    elemento.textContent =
      String(texto);
  }
}


function establecerClase(
  elemento,
  clase
) {
  if (elemento) {
    elemento.className =
      clase;
  }
}


function obtenerHora(
  epoch = null
) {
  const fecha =
    Number.isFinite(epoch)
      ? new Date(epoch * 1000)
      : new Date();

  return fecha.toLocaleTimeString(
    "es-SV",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );
}


function obtenerMercado(
  simbolo
) {
  return (
    MERCADOS.find(
      (mercado) =>
        mercado.simbolo === simbolo
    ) ||
    MERCADOS[0]
  );
}


function limitarLista(
  lista,
  maximo
) {
  while (
    lista.length > maximo
  ) {
    lista.shift();
  }
}


function formatearPrecio(
  precio,
  pipSize
) {
  if (
    !Number.isFinite(precio)
  ) {
    return "--";
  }

  const decimales =
    Number.isInteger(pipSize) &&
    pipSize >= 0 &&
    pipSize <= 10
      ? pipSize
      : 2;

  return precio.toFixed(
    decimales
  );
}


function obtenerUltimoDigito(
  precioFormateado
) {
  const coincidencia =
    String(
      precioFormateado
    ).match(
      /(\d)(?!.*\d)/
    );

  return coincidencia
    ? Number(coincidencia[1])
    : null;
}


function registrarActividad(
  mensaje,
  tipo = "normal"
) {
  if (
    !interfaz.registroActividad
  ) {
    return;
  }

  const linea =
    document.createElement("p");

  linea.textContent =
    `[${obtenerHora()}] ${mensaje}`;

  if (
    [
      "exito",
      "advertencia",
      "error"
    ].includes(tipo)
  ) {
    linea.classList.add(tipo);
  }

  interfaz.registroActividad.prepend(
    linea
  );

  while (
    interfaz.registroActividad
      .children.length >
    CONFIGURACION.maximoRegistro
  ) {
    interfaz.registroActividad
      .lastElementChild
      ?.remove();
  }
}


/* =====================================================
6. ESTADÍSTICAS SEPARADAS
===================================================== */

function obtenerClaveEstadistica() {
  return [
    estado.simbolo,
    estado.estrategia,
    estado.modo,
    estado.horizonte
  ].join("|");
}


function obtenerEstadisticaActual() {
  const clave =
    obtenerClaveEstadistica();

  if (
    !estado.estadisticas[
      clave
    ]
  ) {
    estado.estadisticas[
      clave
    ] = {
      intentos: 0,
      aciertos: 0,
      fallos: 0,
      racha: 0
    };
  }

  return estado.estadisticas[
    clave
  ];
}


function mostrarEstadisticas() {
  const datos =
    obtenerEstadisticaActual();

  const precision =
    datos.intentos > 0
      ? (
          datos.aciertos /
          datos.intentos
        ) * 100
      : null;

  establecerTexto(
    interfaz.estadisticaIntentos,
    datos.intentos
  );

  establecerTexto(
    interfaz.estadisticaAciertos,
    datos.aciertos
  );

  establecerTexto(
    interfaz.estadisticaFallos,
    datos.fallos
  );

  establecerTexto(
    interfaz.estadisticaPrecision,
    precision === null
      ? "NO DATA"
      : `${precision.toFixed(1)}%`
  );

  establecerTexto(
    interfaz.estadisticaRacha,
    datos.racha
  );

  establecerTexto(
    interfaz.precisionObservada,
    datos.intentos > 0
      ? `${datos.aciertos} / ${datos.intentos} TESTS`
      : "0 / 0 TESTS"
  );
}


/* =====================================================
7. CONEXIÓN
===================================================== */

function actualizarEstadoConexion(
  nuevoEstado,
  texto
) {
  establecerClase(
    interfaz.estadoConexion,
    `estado-item ${nuevoEstado}`
  );

  establecerTexto(
    interfaz.textoEstadoConexion,
    texto
  );

  estado.conectado =
    nuevoEstado === "live";

  if (
    interfaz.botonConectar
  ) {
    interfaz.botonConectar.disabled =
      nuevoEstado === "live" ||
      nuevoEstado === "connecting";
  }

  if (
    interfaz.botonDesconectar
  ) {
    interfaz.botonDesconectar.disabled =
      nuevoEstado !== "live";
  }

  if (
    interfaz.botonEncenderMotor
  ) {
    interfaz.botonEncenderMotor.disabled =
      nuevoEstado !== "live";
  }

  if (
    nuevoEstado !== "live" &&
    estado.motorEncendido
  ) {
    apagarMotor(false);
  }
}


function conectar() {
  registrarActividad(
    `Conectando con ${estado.mercado}.`
  );

  derivAPI.conectar(
    estado.simbolo
  );
}


function desconectar() {
  apagarMotor(false);

  derivAPI.desconectar();
}


/* =====================================================
8. BLOQUEAR CONFIGURACIÓN
===================================================== */

function bloquearConfiguracion(
  bloquear
) {
  [
    interfaz.botonAbrirMercados,
    interfaz.selectorEstrategia,
    interfaz.selectorModo,
    interfaz.selectorHorizonte
  ]
    .filter(Boolean)
    .forEach(
      (elemento) => {
        elemento.disabled =
          bloquear;
      }
    );
}


/* =====================================================
9. MOTOR
===================================================== */

function actualizarEstadoMotor() {
  establecerClase(
    interfaz.estadoMotor,
    estado.motorEncendido
      ? "estado-item motor-encendido"
      : "estado-item motor-apagado"
  );

  establecerTexto(
    interfaz.textoEstadoMotor,
    estado.motorEncendido
      ? "ON"
      : "OFF"
  );

  if (
    interfaz.botonEncenderMotor
  ) {
    interfaz.botonEncenderMotor
      .classList.toggle(
        "encendido",
        estado.motorEncendido
      );

    interfaz.botonEncenderMotor.innerHTML =
      estado.motorEncendido
        ? "<span>■</span> STOP ENGINE"
        : "<span>⚡</span> START ENGINE";
  }

  if (
    interfaz.botonPrediccion
  ) {
    interfaz.botonPrediccion.disabled =
      !estado.conectado ||
      !estado.motorEncendido ||
      estado.precios.length <
        CONFIGURACION
          .minimoTicksBotonPrediccion;
  }

  bloquearConfiguracion(
    estado.motorEncendido
  );
}


function encenderMotor() {
  if (
    !estado.conectado
  ) {
    registrarActividad(
      "Primero debe conectar la herramienta.",
      "advertencia"
    );

    return;
  }

  estado.motorEncendido =
    true;

  actualizarEstadoMotor();

  monitorOportunidades
    .establecerContexto({
      simbolo:
        estado.simbolo,

      mercado:
        estado.mercado,

      estrategia:
        estado.estrategia,

      modo:
        estado.modo,

      horizonte:
        estado.horizonte
    });

  monitorOportunidades.iniciar();

  establecerTexto(
    interfaz.mensajeControl,
    "Motor encendido. Buscando una entrada estable."
  );

  asistenteVoz.anunciarBusqueda({
    mercado:
      obtenerNombreMercadoParaVoz(
        estado.simbolo
      ),

    estrategia:
      estado.estrategia
  });

  registrarActividad(
    "Motor de análisis encendido.",
    "exito"
  );
}


function apagarMotor(
  anunciar = true
) {
  estado.motorEncendido =
    false;

  estado.senalActiva =
    null;

  detenerCuentaRegresiva();

  monitorOportunidades.detener(
    "Motor de análisis apagado."
  );

  actualizarEstadoMotor();

  establecerTexto(
    interfaz.mensajeControl,
    estado.conectado
      ? "Configure el mercado y encienda el motor."
      : "Conecte la herramienta y después encienda el motor."
  );

  if (anunciar) {
    asistenteVoz.anunciarMotor(
      false
    );
  }
}


function alternarMotor() {
  if (
    estado.motorEncendido
  ) {
    apagarMotor();
  } else {
    encenderMotor();
  }
}


/* =====================================================
10. NOMBRES PARA VOZ
===================================================== */

function obtenerNombreMercadoParaVoz(
  simbolo
) {
  const nombres = {
    "1HZ10V":
      "Volatilidad 10 de un segundo",

    "1HZ25V":
      "Volatilidad 25 de un segundo",

    "1HZ50V":
      "Volatilidad 50 de un segundo",

    "1HZ75V":
      "Volatilidad 75 de un segundo",

    "1HZ100V":
      "Volatilidad 100 de un segundo",

    "R_10":
      "Volatilidad 10 Index",

    "R_25":
      "Volatilidad 25 Index",

    "R_50":
      "Volatilidad 50 Index",

    "R_75":
      "Volatilidad 75 Index",

    "R_100":
      "Volatilidad 100 Index"
  };

  return (
    nombres[simbolo] ||
    estado.mercado
  );
}


/* =====================================================
11. MERCADOS
===================================================== */

function construirListaMercados() {
  if (
    !interfaz.listaMercados
  ) {
    return;
  }

  interfaz.listaMercados.innerHTML =
    "";

  MERCADOS.forEach(
    (mercado) => {
      const boton =
        document.createElement(
          "button"
        );

      boton.type = "button";

      boton.className =
        "opcion-mercado";

      if (
        mercado.simbolo ===
        estado.simbolo
      ) {
        boton.classList.add(
          "activo"
        );
      }

      boton.innerHTML = `
        <span class="codigo-mercado">
          ${mercado.codigo}
        </span>

        <div>
          <strong>
            ${mercado.nombre}
          </strong>

          <small>
            ${mercado.simbolo}
          </small>
        </div>
      `;

      boton.addEventListener(
        "click",
        () => {
          seleccionarMercado(
            mercado
          );
        }
      );

      interfaz.listaMercados
        .appendChild(
          boton
        );
    }
  );
}


function abrirMercados() {
  if (
    estado.motorEncendido
  ) {
    registrarActividad(
      "Apague el motor antes de cambiar el mercado.",
      "advertencia"
    );

    return;
  }

  construirListaMercados();

  if (
    typeof interfaz.dialogoMercados
      ?.showModal === "function"
  ) {
    interfaz.dialogoMercados
      .showModal();
  }
}


function cerrarMercados() {
  if (
    typeof interfaz.dialogoMercados
      ?.close === "function"
  ) {
    interfaz.dialogoMercados.close();
  }
}


function seleccionarMercado(
  mercado
) {
  cerrarMercados();

  if (
    !mercado ||
    mercado.simbolo ===
      estado.simbolo
  ) {
    return;
  }

  estado.simbolo =
    mercado.simbolo;

  estado.mercado =
    mercado.nombre;

  establecerTexto(
    interfaz.mercadoSeleccionado,
    mercado.nombre
  );

  establecerTexto(
    interfaz.simboloSeleccionado,
    mercado.simbolo
  );

  establecerTexto(
    interfaz.nombreMercado,
    mercado.nombre
  );

  limpiarDatosMercado();
  mostrarEstadisticas();

  monitorOportunidades
    .establecerContexto({
      simbolo:
        mercado.simbolo,

      mercado:
        mercado.nombre
    });

  if (
    estado.conectado
  ) {
    derivAPI.cambiarSimbolo(
      mercado.simbolo
    );
  }

  registrarActividad(
    `Mercado seleccionado: ${mercado.nombre}.`
  );
}


/* =====================================================
12. LIMPIAR DATOS
===================================================== */

function limpiarDatosMercado() {
  estado.precios = [];
  estado.digitos = [];

  estado.ticksRecibidos = 0;

  estado.ultimoPrecio = null;
  estado.ultimoPipSize = null;

  estado.resumenTecnico = null;
  estado.ultimaPrediccion = null;
  estado.senalActiva = null;

  establecerTexto(
    interfaz.precioActual,
    "--"
  );

  establecerTexto(
    interfaz.contadorTicks,
    "0"
  );

  establecerTexto(
    interfaz.ultimoDigito,
    "--"
  );

  establecerTexto(
    interfaz.horaActualizacion,
    "--"
  );

  establecerTexto(
    interfaz.estadoDatos,
    "NO DATA"
  );

  if (
    interfaz.listaUltimosDigitos
  ) {
    interfaz.listaUltimosDigitos.innerHTML =
      '<span class="mensaje-vacio">Esperando datos</span>';
  }

  actualizarMemoria();
  mostrarEstadoInicialSenal();
  actualizarEstadoMotor();
}


/* =====================================================
13. TICKS
===================================================== */

function procesarTick(
  tick
) {
  if (
    !tick ||
    tick.simbolo !==
      estado.simbolo
  ) {
    return;
  }

  const precio =
    Number(
      tick.precio
    );

  if (
    !Number.isFinite(
      precio
    )
  ) {
    return;
  }

  const precioFormateado =
    formatearPrecio(
      precio,
      tick.pipSize
    );

  const digito =
    obtenerUltimoDigito(
      precioFormateado
    );

  estado.ticksRecibidos++;

  estado.precios.push(
    precio
  );

  limitarLista(
    estado.precios,
    CONFIGURACION.maximoPrecios
  );

  if (
    Number.isInteger(
      digito
    )
  ) {
    estado.digitos.push(
      digito
    );

    limitarLista(
      estado.digitos,
      CONFIGURACION.maximoDigitos
    );
  }

  mostrarMovimientoPrecio(
    precio
  );

  estado.ultimoPrecio =
    precio;

  estado.ultimoPipSize =
    tick.pipSize;

  establecerTexto(
    interfaz.precioActual,
    precioFormateado
  );

  establecerTexto(
    interfaz.contadorTicks,
    estado.ticksRecibidos
  );

  establecerTexto(
    interfaz.ultimoDigito,
    Number.isInteger(digito)
      ? digito
      : "--"
  );

  establecerTexto(
    interfaz.horaActualizacion,
    obtenerHora(tick.epoch)
  );

  establecerTexto(
    interfaz.estadoDatos,
    "LIVE DATA"
  );

  interfaz.estadoDatos
    ?.classList.add(
      "live"
    );

  mostrarUltimosDigitos();
  actualizarMemoria();
  actualizarEstadoMotor();

  evaluarSenalActiva(
    precio,
    digito
  );

  if (
    estado.motorEncendido
  ) {
    analizarMercado();
  }
}


function mostrarMovimientoPrecio(
  precio
) {
  if (
    !interfaz.precioActual
  ) {
    return;
  }

  interfaz.precioActual
    .classList.remove(
      "sube",
      "baja"
    );

  if (
    !Number.isFinite(
      estado.ultimoPrecio
    )
  ) {
    return;
  }

  if (
    precio >
    estado.ultimoPrecio
  ) {
    interfaz.precioActual
      .classList.add(
        "sube"
      );
  }

  if (
    precio <
    estado.ultimoPrecio
  ) {
    interfaz.precioActual
      .classList.add(
        "baja"
      );
  }
}


/* =====================================================
14. MEMORIA Y DÍGITOS
===================================================== */

function actualizarMemoria() {
  const cantidad =
    estado.precios.length;

  const porcentaje =
    Math.min(
      100,
      (
        cantidad /
        CONFIGURACION.maximoPrecios
      ) * 100
    );

  establecerTexto(
    interfaz.estadoMemoria,
    `${cantidad} / ${CONFIGURACION.maximoPrecios}`
  );

  establecerTexto(
    interfaz.numeroProgreso,
    `${cantidad} / ${CONFIGURACION.maximoPrecios}`
  );

  if (
    interfaz.barraMemoria
  ) {
    interfaz.barraMemoria.style.width =
      `${porcentaje}%`;
  }

  establecerTexto(
    interfaz.textoProgreso,
    estado.conectado
      ? "LIVE MARKET MEMORY"
      : "WAITING CONNECTION"
  );
}


function mostrarUltimosDigitos() {
  if (
    !interfaz.listaUltimosDigitos
  ) {
    return;
  }

  const ultimos =
    estado.digitos.slice(-20);

  establecerTexto(
    interfaz.cantidadDigitos,
    ultimos.length
  );

  interfaz.listaUltimosDigitos
    .innerHTML = "";

  ultimos.forEach(
    (digito, indice) => {
      const elemento =
        document.createElement(
          "span"
        );

      elemento.className =
        "digito-item";

      elemento.textContent =
        String(digito);

      if (
        indice ===
        ultimos.length - 1
      ) {
        elemento.classList.add(
          "actual"
        );
      }

      interfaz.listaUltimosDigitos
        .appendChild(
          elemento
        );
    }
  );
}


/* =====================================================
15. ANÁLISIS
===================================================== */

function analizarMercado(
  forzar = false
) {
  if (
    !estado.motorEncendido
  ) {
    return null;
  }

  const momento =
    Date.now();

  if (
    !forzar &&
    momento -
      estado.ultimoAnalisisEn <
      CONFIGURACION
        .intervaloAnalisisMilisegundos
  ) {
    return null;
  }

  estado.ultimoAnalisisEn =
    momento;

  estado.resumenTecnico =
    crearResumenTecnico({
      precios:
        estado.precios,

      digitos:
        estado.digitos,

      modo:
        estado.modo
    });

  mostrarIndicadores(
    estado.resumenTecnico
  );

  estado.ultimaPrediccion =
    generarPrediccion({
      estrategia:
        estado.estrategia,

      resumen:
        estado.resumenTecnico
    });

  mostrarPuntajeActual(
    estado.ultimaPrediccion
  );

  monitorOportunidades.procesar(
    estado.ultimaPrediccion
  );

  return estado.ultimaPrediccion;
}


/* =====================================================
16. BOTÓN PREDICTION
===================================================== */

function ejecutarAnalisisManual() {
  const resultado =
    analizarMercado(true);

  if (!resultado) {
    mostrarCapsula({
      tipo: "cancelled",
      estadoTexto: "MANUAL ANALYSIS",
      valor: "NO DATA",
      detalle:
        "Todavía no hay suficientes datos.",
      duracion:
        CONFIGURACION
          .tiempoCapsulaManual
    });

    asistenteVoz
      .anunciarAnalisisManual(
        null
      );

    return;
  }

  mostrarCapsula({
    tipo:
      resultado.direccion ===
        "WAIT"
        ? "cancelled"
        : "prepare",

    estadoTexto:
      "MANUAL ANALYSIS",

    valor:
      obtenerValorVisual(
        resultado
      ),

    detalle:
      crearTextoOperacion(
        resultado
      ),

    duracion:
      CONFIGURACION
        .tiempoCapsulaManual
  });

  mostrarMotivos(
    resultado
  );

  establecerTexto(
    interfaz.tituloPrediccion,
    "Resultado del análisis manual"
  );

  establecerTexto(
    interfaz.valorPrediccion,
    obtenerValorVisual(
      resultado
    )
  );

  establecerTexto(
    interfaz.mensajeOperacion,
    crearTextoOperacion(
      resultado
    )
  );

  asistenteVoz
    .anunciarAnalisisManual(
      resultado
    );

  registrarActividad(
    `Análisis manual: ${crearTextoOperacion(resultado)}`
  );
}


/* =====================================================
17. INDICADORES
===================================================== */

function mostrarIndicadores(
  resumen
) {
  if (!resumen) {
    return;
  }

  establecerTexto(
    interfaz.tendencia,
    resumen.tendencia
      ?.direccion || "--"
  );

  establecerTexto(
    interfaz.detalleTendencia,
    `Cambio: ${Number(
      resumen.tendencia
        ?.cambioPorcentual || 0
    ).toFixed(4)}%`
  );

  establecerTexto(
    interfaz.rsi,
    Number.isFinite(
      resumen.rsi
    )
      ? resumen.rsi.toFixed(1)
      : "--"
  );

  establecerTexto(
    interfaz.detalleRsi,
    resumen.interpretacionRsi
      ?.zona || "Sin datos"
  );

  establecerTexto(
    interfaz.momentum,
    resumen.momentum
      ?.direccion || "--"
  );

  establecerTexto(
    interfaz.detalleMomentum,
    `${Number(
      resumen.momentum
        ?.porcentaje || 0
    ).toFixed(4)}%`
  );

  establecerTexto(
    interfaz.volatilidad,
    `${Number(
      resumen.volatilidad
        ?.porcentaje || 0
    ).toFixed(4)}%`
  );

  establecerTexto(
    interfaz.detalleVolatilidad,
    `Nivel ${
      resumen.volatilidad
        ?.nivel || "--"
    }`
  );

  mostrarFibonacci(
    resumen.fibonacci
  );
}


function mostrarFibonacci(
  fibonacci
) {
  if (
    !fibonacci ||
    !fibonacci.disponible
  ) {
    establecerTexto(
      interfaz.estadoFibonacci,
      "NO DATA"
    );

    establecerTexto(
      interfaz.detalleFibonacci,
      "Reuniendo precios."
    );

    establecerTexto(
      interfaz.nivelFibonacciCercano,
      "--"
    );

    establecerTexto(
      interfaz.maximoFibonacci,
      "--"
    );

    establecerTexto(
      interfaz.minimoFibonacci,
      "--"
    );

    establecerTexto(
      interfaz.distanciaFibonacci,
      "--"
    );

    return;
  }

  establecerTexto(
    interfaz.estadoFibonacci,
    fibonacci.estado
  );

  establecerTexto(
    interfaz.detalleFibonacci,
    fibonacci.cercaDeNivel
      ? fibonacci.tipoZona
      : "Sin nivel cercano."
  );

  establecerTexto(
    interfaz.nivelFibonacciCercano,
    fibonacci.nivelCercano
      ? `${fibonacci.nivelCercano.porcentaje}%`
      : "--"
  );

  establecerTexto(
    interfaz.maximoFibonacci,
    formatearPrecio(
      fibonacci.maximo,
      estado.ultimoPipSize
    )
  );

  establecerTexto(
    interfaz.minimoFibonacci,
    formatearPrecio(
      fibonacci.minimo,
      estado.ultimoPipSize
    )
  );

  establecerTexto(
    interfaz.distanciaFibonacci,
    fibonacci.nivelCercano
      ? `${fibonacci.nivelCercano.distanciaPorcentual.toFixed(2)}%`
      : "--"
  );
}


/* =====================================================
18. PUNTAJE
===================================================== */

function mostrarPuntajeActual(
  resultado
) {
  if (!resultado) {
    return;
  }

  establecerTexto(
    interfaz.puntajeSenal,
    `${resultado.puntaje}/100`
  );

  if (
    interfaz.barraPuntaje
  ) {
    interfaz.barraPuntaje.style.width =
      `${resultado.puntaje}%`;
  }

  const clasificacion =
    clasificarPuntaje(
      resultado.puntaje,
      resultado.estrategia
    );

  establecerTexto(
    interfaz.mensajeOperacion,
    `Signal Quality: ${clasificacion.nivel}`
  );
}


/* =====================================================
19. VALOR VISUAL
===================================================== */

function obtenerValorVisual(
  resultado
) {
  if (!resultado) {
    return "--";
  }

  if (
    resultado.direccion ===
    "MATCH"
  ) {
    const numero =
      resultado.metadata
        ?.digito;

    return (
      `MATCHES ${numero ?? ""}`
    ).trim();
  }

  return resultado.direccion;
}


/* =====================================================
20. PANEL DE SEÑAL
===================================================== */

function mostrarEstadoInicialSenal() {
  establecerClase(
    interfaz.panelSenal,
    "panel-senal monitoring"
  );

  establecerTexto(
    interfaz.estadoPrediccion,
    "MONITORING"
  );

  establecerTexto(
    interfaz.tituloPrediccion,
    "Esperando oportunidad"
  );

  establecerTexto(
    interfaz.valorPrediccion,
    "--"
  );

  establecerTexto(
    interfaz.puntajeSenal,
    "--"
  );

  if (
    interfaz.barraPuntaje
  ) {
    interfaz.barraPuntaje.style.width =
      "0%";
  }

  establecerTexto(
    interfaz.mensajeOperacion,
    "Sin señal activa."
  );

  establecerTexto(
    interfaz.cuentaRegresiva,
    "--"
  );

  if (
    interfaz.listaMotivos
  ) {
    interfaz.listaMotivos.innerHTML =
      "<li>El motor todavía no ha generado una señal.</li>";
  }
}


function mostrarResultadoPanel(
  resultado,
  fase
) {
  const clase =
    fase === "CONFIRMED"
      ? "confirmed"
      : "prepare";

  establecerClase(
    interfaz.panelSenal,
    `panel-senal ${clase}`
  );

  establecerTexto(
    interfaz.estadoPrediccion,
    fase
  );

  establecerTexto(
    interfaz.tituloPrediccion,
    fase === "CONFIRMED"
      ? "Señal técnica confirmada"
      : fase === "REVALIDATING"
        ? "Revalidando entrada"
        : "Posible oportunidad detectada"
  );

  establecerTexto(
    interfaz.valorPrediccion,
    obtenerValorVisual(
      resultado
    )
  );

  establecerTexto(
    interfaz.puntajeSenal,
    `${resultado.puntaje}/100`
  );

  if (
    interfaz.barraPuntaje
  ) {
    interfaz.barraPuntaje.style.width =
      `${resultado.puntaje}%`;
  }

  mostrarMotivos(
    resultado
  );

  establecerTexto(
    interfaz.mensajeOperacion,
    fase === "CONFIRMED"
      ? "Ejecute la operación ahora."
      : fase === "REVALIDATING"
        ? "Espere la confirmación final."
        : "Prepare el bot y espere confirmación."
  );
}


function mostrarMotivos(
  resultado
) {
  if (
    !interfaz.listaMotivos
  ) {
    return;
  }

  interfaz.listaMotivos.innerHTML =
    "";

  const mensajes = [
    ...(resultado.razones || []),

    ...(resultado.advertencias || [])
      .map(
        (texto) =>
          `⚠ ${texto}`
      )
  ];

  mensajes.forEach(
    (texto) => {
      const elemento =
        document.createElement(
          "li"
        );

      elemento.textContent =
        texto;

      interfaz.listaMotivos
        .appendChild(
          elemento
        );
    }
  );
}


/* =====================================================
21. ESTADOS DEL MONITOR
===================================================== */

function manejarEstadoMonitor(
  datos
) {
  const estadoMonitor =
    datos.estado;

  establecerTexto(
    interfaz.textoEstadoMonitoreo,
    estadoMonitor
  );

  establecerClase(
    interfaz.estadoMonitoreo,
    "estado-item"
  );

  establecerClase(
    interfaz.panelMonitoreo,
    "panel-monitoreo"
  );

  const titulos = {
    INACTIVE:
      "MONITORING INACTIVE",

    MONITORING:
      "SEARCHING ENTRY",

    CANDIDATE:
      "VALIDATING ENTRY",

    PREPARE:
      "PREPARE",

    REVALIDATING:
      "REVALIDATING",

    CONFIRMED:
      "CONFIRMED",

    EXECUTING:
      "EXECUTE NOW",

    RESULT:
      "RESULT",

    CANCELLED:
      "OPPORTUNITY CANCELLED"
  };

  establecerTexto(
    interfaz.tituloMonitoreo,
    titulos[
      estadoMonitor
    ] ||
    estadoMonitor
  );

  establecerTexto(
    interfaz.detalleMonitoreo,
    datos.mensaje ||
    "Analizando el mercado."
  );

  if (
    interfaz.panelMonitoreo
  ) {
    if (
      [
        ESTADOS_MONITOR.PREPARE,
        ESTADOS_MONITOR.REVALIDATING
      ].includes(
        estadoMonitor
      )
    ) {
      interfaz.panelMonitoreo
        .classList.add(
          "prepare"
        );
    } else if (
      [
        ESTADOS_MONITOR.CONFIRMED,
        ESTADOS_MONITOR.EXECUTING
      ].includes(
        estadoMonitor
      )
    ) {
      interfaz.panelMonitoreo
        .classList.add(
          "confirmed"
        );
    } else {
      interfaz.panelMonitoreo
        .classList.add(
          "monitoring"
        );
    }
  }

  if (
    interfaz.botonCancelarMonitoreo
  ) {
    interfaz.botonCancelarMonitoreo.hidden =
      ![
        ESTADOS_MONITOR.PREPARE,
        ESTADOS_MONITOR.REVALIDATING,
        ESTADOS_MONITOR.CONFIRMED,
        ESTADOS_MONITOR.EXECUTING
      ].includes(
        estadoMonitor
      );
  }
}


/* =====================================================
22. PREPARE
===================================================== */

function manejarPrepare({
  resultado
}) {
  mostrarResultadoPanel(
    resultado,
    "PREPARE"
  );

  mostrarCapsula({
    tipo: "prepare",

    estadoTexto:
      "PREPARE",

    valor:
      obtenerValorVisual(
        resultado
      ),

    detalle:
      "Prepare el bot y espere confirmación.",

    duracion:
      CONFIGURACION
        .tiempoCapsulaPrepare
  });

  asistenteVoz
    .anunciarPrepare(
      resultado
    );
}


/* =====================================================
23. REVALIDATING
===================================================== */

function manejarRevalidacion({
  resultado
}) {
  mostrarResultadoPanel(
    resultado,
    "REVALIDATING"
  );

  mostrarCapsula({
    tipo: "prepare",

    estadoTexto:
      "REVALIDATING",

    valor:
      obtenerValorVisual(
        resultado
      ),

    detalle:
      "Validando la señal con los últimos ticks.",

    duracion:
      CONFIGURACION
        .tiempoCapsulaRevalidacion
  });

  asistenteVoz
    .anunciarRevalidacion(
      resultado
    );
}


/* =====================================================
24. CONFIRMACIÓN
===================================================== */

function manejarConfirmacion({
  resultado
}) {
  estado.senalActiva = {
    resultado,

    precioReferencia:
      estado.ultimoPrecio,

    tickReferencia:
      estado.ticksRecibidos,

    creadaEn:
      Date.now(),

    evaluada: false
  };

  mostrarResultadoPanel(
    resultado,
    "CONFIRMED"
  );

  mostrarCapsula({
    tipo: "confirmed",

    estadoTexto:
      "EXECUTE NOW",

    valor:
      obtenerValorVisual(
        resultado
      ),

    detalle:
      "Señal revalidada con el mercado actual.",

    duracion:
      CONFIGURACION
        .tiempoCapsulaConfirmada
  });

  asistenteVoz
    .anunciarConfirmacion(
      resultado
    );

  monitorOportunidades
    .marcarEjecutando();

  iniciarCuentaRegresiva(
    resultado
  );

  agregarHistorial(
    resultado
  );
}


/* =====================================================
25. CANCELACIÓN
===================================================== */

function manejarCancelacion({
  motivo,
  resultado
}) {
  estado.senalActiva =
    null;

  detenerCuentaRegresiva();

  mostrarCapsula({
    tipo: "cancelled",

    estadoTexto:
      "CANCELLED",

    valor:
      resultado
        ? obtenerValorVisual(
            resultado
          )
        : "WAIT",

    detalle:
      motivo ||
      "La oportunidad perdió confirmación.",

    duracion: 3200
  });

  asistenteVoz
    .anunciarCancelacion(
      motivo
    );
}


/* =====================================================
26. RESULTADO
===================================================== */

function manejarResultado({
  acierto,
  resultado
}) {
  detenerCuentaRegresiva();

  const estadistica =
    obtenerEstadisticaActual();

  estadistica.intentos++;

  if (acierto) {
    estadistica.aciertos++;
    estadistica.racha++;
  } else {
    estadistica.fallos++;
    estadistica.racha = 0;
  }

  mostrarEstadisticas();

  establecerClase(
    interfaz.panelSenal,
    acierto
      ? "panel-senal success"
      : "panel-senal failed"
  );

  establecerTexto(
    interfaz.estadoPrediccion,
    acierto
      ? "RESULT: SUCCESS"
      : "RESULT: FAILED"
  );

  establecerTexto(
    interfaz.tituloPrediccion,
    acierto
      ? "La predicción fue acertada"
      : "La predicción no fue acertada"
  );

  establecerTexto(
    interfaz.valorPrediccion,
    obtenerValorVisual(
      resultado
    )
  );

  establecerTexto(
    interfaz.cuentaRegresiva,
    acierto
      ? "✓"
      : "×"
  );

  mostrarCapsula({
    tipo:
      acierto
        ? "success"
        : "failed",

    estadoTexto:
      acierto
        ? "SUCCESS"
        : "FAILED",

    valor:
      obtenerValorVisual(
        resultado
      ),

    detalle:
      acierto
        ? "Predicción acertada."
        : "Predicción no acertada.",

    duracion:
      CONFIGURACION
        .tiempoCapsulaResultado
  });

  asistenteVoz
    .anunciarResultado(
      acierto
    );

  estado.senalActiva =
    null;
}


/* =====================================================
27. EVALUAR SEÑAL
===================================================== */

function evaluarSenalActiva(
  precio,
  digito
) {
  const senal =
    estado.senalActiva;

  if (
    !senal ||
    senal.evaluada
  ) {
    return;
  }

  const resultado =
    senal.resultado;

  const ticksTranscurridos =
    estado.ticksRecibidos -
    senal.tickReferencia;


  if (
    resultado.estrategia ===
      "even_odd" &&
    ticksTranscurridos >= 1
  ) {
    const esPar =
      digito % 2 === 0;

    const acierto =
      resultado.direccion ===
        "EVEN"
        ? esPar
        : !esPar;

    finalizarEvaluacion(
      acierto,
      {
        digitoResultado:
          digito
      }
    );

    return;
  }


  if (
    resultado.estrategia ===
      "over_under" &&
    ticksTranscurridos >= 1
  ) {
    const esOver =
      digito >= 5;

    const acierto =
      resultado.direccion ===
        "OVER"
        ? esOver
        : !esOver;

    finalizarEvaluacion(
      acierto,
      {
        digitoResultado:
          digito
      }
    );

    return;
  }


  if (
    resultado.estrategia ===
      "match" &&
    ticksTranscurridos >= 1
  ) {
    const digitoEsperado =
      resultado.metadata
        ?.digito;

    const ventanaMaxima =
      resultado.metadata
        ?.ventanaEvaluacionTicks ||
      5;

    if (
      digito ===
      digitoEsperado
    ) {
      finalizarEvaluacion(
        true,
        {
          digitoResultado:
            digito,

          ticksTranscurridos
        }
      );

      return;
    }

    if (
      ticksTranscurridos >=
      ventanaMaxima
    ) {
      finalizarEvaluacion(
        false,
        {
          digitoResultado:
            digito,

          digitoEsperado,

          ticksTranscurridos
        }
      );
    }

    return;
  }


  if (
    resultado.estrategia ===
    "rise_fall"
  ) {
    const segundos =
      obtenerSegundosHorizonte();

    const tiempoTranscurrido =
      Date.now() -
      senal.creadaEn;

    if (
      tiempoTranscurrido >=
      segundos * 1000
    ) {
      const acierto =
        resultado.direccion ===
          "RISE"
          ? precio >
            senal.precioReferencia
          : precio <
            senal.precioReferencia;

      finalizarEvaluacion(
        acierto,
        {
          precioInicial:
            senal.precioReferencia,

          precioFinal:
            precio
        }
      );
    }
  }
}


function finalizarEvaluacion(
  acierto,
  datos = {}
) {
  if (
    !estado.senalActiva
  ) {
    return;
  }

  estado.senalActiva.evaluada =
    true;

  monitorOportunidades
    .registrarResultado({
      acierto,
      datos
    });
}


/* =====================================================
28. CUENTA REGRESIVA
===================================================== */

function obtenerSegundosHorizonte() {
  if (
    estado.horizonte ===
    "1m"
  ) {
    return 60;
  }

  if (
    estado.horizonte ===
    "5m"
  ) {
    return 300;
  }

  return 10;
}


function iniciarCuentaRegresiva(
  resultado
) {
  detenerCuentaRegresiva();

  let segundos =
    resultado.estrategia ===
      "rise_fall"
      ? obtenerSegundosHorizonte()
      : 10;

  establecerTexto(
    interfaz.cuentaRegresiva,
    segundos
  );

  temporizadorCuentaRegresiva =
    setInterval(
      () => {
        segundos--;

        establecerTexto(
          interfaz.cuentaRegresiva,
          Math.max(
            0,
            segundos
          )
        );

        if (
          [
            5,
            3,
            2,
            1
          ].includes(
            segundos
          )
        ) {
          asistenteVoz
            .anunciarConteo(
              segundos
            );
        }

        if (
          segundos <= 0
        ) {
          detenerCuentaRegresiva();
        }
      },
      1000
    );
}


function detenerCuentaRegresiva() {
  if (
    temporizadorCuentaRegresiva
  ) {
    clearInterval(
      temporizadorCuentaRegresiva
    );

    temporizadorCuentaRegresiva =
      null;
  }
}


/* =====================================================
29. CÁPSULA
===================================================== */

function mostrarCapsula({
  tipo,
  estadoTexto,
  valor,
  detalle,
  duracion
}) {
  ocultarCapsula();

  if (
    !interfaz.capsulaSenal
  ) {
    return;
  }

  interfaz.capsulaSenal.className =
    `capsula-senal ${tipo}`;

  establecerTexto(
    interfaz.estadoCapsula,
    estadoTexto
  );

  establecerTexto(
    interfaz.valorCapsula,
    valor
  );

  establecerTexto(
    interfaz.detalleCapsula,
    detalle
  );

  interfaz.capsulaSenal
    .setAttribute(
      "aria-hidden",
      "false"
    );

  document.body
    .classList.add(
      "capsula-abierta"
    );

  requestAnimationFrame(
    () => {
      interfaz.capsulaSenal
        .classList.add(
          "visible"
        );
    }
  );

  temporizadorCapsula =
    setTimeout(
      ocultarCapsula,
      duracion
    );
}


function ocultarCapsula() {
  if (
    temporizadorCapsula
  ) {
    clearTimeout(
      temporizadorCapsula
    );

    temporizadorCapsula =
      null;
  }

  interfaz.capsulaSenal
    ?.classList.remove(
      "visible"
    );

  interfaz.capsulaSenal
    ?.setAttribute(
      "aria-hidden",
      "true"
    );

  document.body
    .classList.remove(
      "capsula-abierta"
    );
}


/* =====================================================
30. HISTORIAL
===================================================== */

function agregarHistorial(
  resultado
) {
  estado.historial.unshift({
    hora:
      obtenerHora(),

    mercado:
      estado.mercado,

    estrategia:
      resultado.nombreEstrategia,

    valor:
      obtenerValorVisual(
        resultado
      ),

    puntaje:
      resultado.puntaje
  });

  estado.historial =
    estado.historial.slice(
      0,
      CONFIGURACION.maximoHistorial
    );

  mostrarHistorial();
}


function mostrarHistorial() {
  if (
    !interfaz.historialSenales
  ) {
    return;
  }

  interfaz.historialSenales.innerHTML =
    "";

  if (
    estado.historial.length === 0
  ) {
    interfaz.historialSenales.innerHTML =
      '<p class="mensaje-vacio">Todavía no se han generado señales.</p>';

    return;
  }

  estado.historial.forEach(
    (registro) => {
      const articulo =
        document.createElement(
          "article"
        );

      articulo.className =
        "historial-item";

      articulo.innerHTML = `
        <strong>
          ${registro.hora} ·
          ${registro.valor} ·
          ${registro.puntaje}/100
        </strong>

        <p>
          ${registro.mercado} ·
          ${registro.estrategia}
        </p>
      `;

      interfaz.historialSenales
        .appendChild(
          articulo
        );
    }
  );
}


/* =====================================================
31. VOZ
===================================================== */

async function cargarSelectorVoces() {
  if (
    !interfaz.selectorVoz
  ) {
    return;
  }

  const voces =
    await asistenteVoz
      .esperarVoces();

  interfaz.selectorVoz.innerHTML =
    "";

  voces.forEach(
    (voz) => {
      const opcion =
        document.createElement(
          "option"
        );

      opcion.value =
        `${voz.name}|${voz.lang}`;

      opcion.textContent =
        `${voz.name} · ${voz.lang}`;

      interfaz.selectorVoz
        .appendChild(
          opcion
        );
    }
  );
}


function actualizarBotonVoz() {
  if (
    !interfaz.botonVoz
  ) {
    return;
  }

  const activa =
    asistenteVoz.estaActiva();

  interfaz.botonVoz.textContent =
    activa
      ? "🔊"
      : "🔇";

  interfaz.botonVoz
    .classList.toggle(
      "voz-activa",
      activa
    );
}


/* =====================================================
32. CAMBIOS DE CONFIGURACIÓN
===================================================== */

function cambiarEstrategia() {
  estado.estrategia =
    interfaz.selectorEstrategia
      ?.value ||
    "rise_fall";

  monitorOportunidades
    .establecerContexto({
      estrategia:
        estado.estrategia
    });

  mostrarEstadoInicialSenal();
  mostrarEstadisticas();

  registrarActividad(
    `Estrategia seleccionada: ${estado.estrategia}.`
  );
}


function cambiarModo() {
  estado.modo =
    interfaz.selectorModo
      ?.value ||
    "fast";

  monitorOportunidades
    .establecerContexto({
      modo:
        estado.modo
    });

  mostrarEstadisticas();

  registrarActividad(
    `Modo seleccionado: ${estado.modo}.`
  );
}


function cambiarHorizonte() {
  estado.horizonte =
    interfaz.selectorHorizonte
      ?.value ||
    "10s";

  monitorOportunidades
    .establecerContexto({
      horizonte:
        estado.horizonte
    });

  mostrarEstadisticas();

  registrarActividad(
    `Horizonte seleccionado: ${estado.horizonte}.`
  );
}


/* =====================================================
33. EVENTOS DERIV
===================================================== */

function configurarEventosDeriv() {
  derivAPI.al(
    "estado",
    (datos) => {
      actualizarEstadoConexion(
        datos.estado,
        datos.texto
      );

      asistenteVoz
        .anunciarConexion(
          datos.estado
        );

      registrarActividad(
        `Estado de conexión: ${datos.texto}.`,
        datos.estado === "live"
          ? "exito"
          : "normal"
      );
    }
  );

  derivAPI.al(
    "tick",
    procesarTick
  );

  derivAPI.al(
    "error",
    (datos) => {
      registrarActividad(
        datos.mensaje,
        "error"
      );
    }
  );

  derivAPI.al(
    "diagnostico",
    (datos) => {
      registrarActividad(
        `[Deriv] ${datos.mensaje}`,
        datos.tipo
      );
    }
  );
}


/* =====================================================
34. EVENTOS MONITOR
===================================================== */

function configurarEventosMonitor() {
  monitorOportunidades.al(
    "estado",
    manejarEstadoMonitor
  );

  monitorOportunidades.al(
    "prepare",
    manejarPrepare
  );

  monitorOportunidades.al(
    "revalidando",
    manejarRevalidacion
  );

  monitorOportunidades.al(
    "confirmado",
    manejarConfirmacion
  );

  monitorOportunidades.al(
    "cancelado",
    manejarCancelacion
  );

  monitorOportunidades.al(
    "resultado",
    manejarResultado
  );

  monitorOportunidades.al(
    "diagnostico",
    (datos) => {
      registrarActividad(
        `[Monitor] ${datos.mensaje}`,
        datos.tipo
      );
    }
  );
}


/* =====================================================
35. EVENTOS DE INTERFAZ
===================================================== */

function configurarEventosInterfaz() {
  interfaz.botonConectar
    ?.addEventListener(
      "click",
      conectar
    );

  interfaz.botonDesconectar
    ?.addEventListener(
      "click",
      desconectar
    );

  interfaz.botonEncenderMotor
    ?.addEventListener(
      "click",
      alternarMotor
    );

  interfaz.botonPrediccion
    ?.addEventListener(
      "click",
      ejecutarAnalisisManual
    );

  interfaz.botonAbrirMercados
    ?.addEventListener(
      "click",
      abrirMercados
    );

  interfaz.botonCerrarMercados
    ?.addEventListener(
      "click",
      cerrarMercados
    );

  interfaz.selectorEstrategia
    ?.addEventListener(
      "change",
      cambiarEstrategia
    );

  interfaz.selectorModo
    ?.addEventListener(
      "change",
      cambiarModo
    );

  interfaz.selectorHorizonte
    ?.addEventListener(
      "change",
      cambiarHorizonte
    );

  interfaz.botonCancelarMonitoreo
    ?.addEventListener(
      "click",
      () => {
        monitorOportunidades
          .cancelarOportunidad(
            "Oportunidad cancelada manualmente."
          );
      }
    );

  interfaz.botonVoz
    ?.addEventListener(
      "click",
      () => {
        asistenteVoz.alternar();

        actualizarBotonVoz();
      }
    );

  interfaz.selectorVoz
    ?.addEventListener(
      "change",
      () => {
        asistenteVoz
          .seleccionarVoz(
            interfaz.selectorVoz
              .value
          );
      }
    );

  interfaz.velocidadVoz
    ?.addEventListener(
      "input",
      () => {
        const valor =
          Number(
            interfaz.velocidadVoz
              .value
          );

        asistenteVoz
          .establecerVelocidad(
            valor
          );

        establecerTexto(
          interfaz.valorVelocidad,
          `${valor.toFixed(2)}x`
        );
      }
    );

  interfaz.tonoVoz
    ?.addEventListener(
      "input",
      () => {
        const valor =
          Number(
            interfaz.tonoVoz
              .value
          );

        asistenteVoz
          .establecerTono(
            valor
          );

        establecerTexto(
          interfaz.valorTono,
          valor.toFixed(1)
        );
      }
    );

  interfaz.volumenVoz
    ?.addEventListener(
      "input",
      () => {
        const valor =
          Number(
            interfaz.volumenVoz
              .value
          );

        asistenteVoz
          .establecerVolumen(
            valor
          );

        establecerTexto(
          interfaz.valorVolumen,
          `${Math.round(
            valor * 100
          )}%`
        );
      }
    );

  interfaz.botonProbarVoz
    ?.addEventListener(
      "click",
      () => {
        asistenteVoz
          .probarVoz();
      }
    );

  interfaz.botonLimpiarHistorial
    ?.addEventListener(
      "click",
      () => {
        estado.historial = [];

        mostrarHistorial();
      }
    );

  interfaz.botonLimpiarRegistro
    ?.addEventListener(
      "click",
      () => {
        if (
          interfaz.registroActividad
        ) {
          interfaz.registroActividad
            .innerHTML = "";
        }
      }
    );

  interfaz.botonReiniciarEstadisticas
    ?.addEventListener(
      "click",
      () => {
        estado.estadisticas[
          obtenerClaveEstadistica()
        ] = {
          intentos: 0,
          aciertos: 0,
          fallos: 0,
          racha: 0
        };

        mostrarEstadisticas();

        registrarActividad(
          "Estadísticas reiniciadas."
        );
      }
    );

  interfaz.botonNuevaSenal
    ?.addEventListener(
      "click",
      () => {
        mostrarEstadoInicialSenal();

        if (
          estado.motorEncendido
        ) {
          monitorOportunidades
            .iniciar();
        }
      }
    );
}


/* =====================================================
36. SERVICE WORKER
===================================================== */

async function registrarServiceWorker() {
  if (
    !(
      "serviceWorker" in
      navigator
    )
  ) {
    return;
  }

  try {
    await navigator
      .serviceWorker
      .register(
        "./service-worker.js"
      );
  } catch (error) {
    registrarActividad(
      "No fue posible registrar el Service Worker.",
      "advertencia"
    );
  }
}


/* =====================================================
37. INICIAR
===================================================== */

async function iniciarAplicacion() {
  const mercado =
    obtenerMercado(
      estado.simbolo
    );

  estado.mercado =
    mercado.nombre;

  establecerTexto(
    interfaz.mercadoSeleccionado,
    mercado.nombre
  );

  establecerTexto(
    interfaz.simboloSeleccionado,
    mercado.simbolo
  );

  establecerTexto(
    interfaz.nombreMercado,
    mercado.nombre
  );

  const opcionMatches =
    interfaz.selectorEstrategia
      ?.querySelector(
        'option[value="match"]'
      );

  if (
    opcionMatches
  ) {
    opcionMatches.textContent =
      "Matches";
  }

  actualizarEstadoConexion(
    "offline",
    "OFFLINE"
  );

  actualizarEstadoMotor();
  limpiarDatosMercado();
  mostrarEstadisticas();
  mostrarHistorial();

  configurarEventosDeriv();
  configurarEventosMonitor();
  configurarEventosInterfaz();

  asistenteVoz.inicializar();

  await cargarSelectorVoces();

  actualizarBotonVoz();

  monitorOportunidades
    .establecerContexto({
      simbolo:
        estado.simbolo,

      mercado:
        estado.mercado,

      estrategia:
        estado.estrategia,

      modo:
        estado.modo,

      horizonte:
        estado.horizonte
    });

  await registrarServiceWorker();

  registrarActividad(
    `Trading Analyst Pro MR ${CONFIGURACION.version} iniciado.`,
    "exito"
  );

  registrarActividad(
    "Seleccione mercado y estrategia, conecte y encienda el motor."
  );
}


/* =====================================================
38. CIERRE
===================================================== */

window.addEventListener(
  "beforeunload",
  () => {
    detenerCuentaRegresiva();
    ocultarCapsula();

    monitorOportunidades
      .destruir();

    asistenteVoz
      .destruir();

    derivAPI
      .desconectar();
  }
);


if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarAplicacion
  );
} else {
  iniciarAplicacion();
}


/*
=========================================================
FIN DEL ARCHIVO js/app.js
TRADING ANALYST PRO MR
=========================================================
*/
