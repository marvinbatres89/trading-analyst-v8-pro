/*
=========================================================
TRADING ANALYST V8 PRO
Archivo: js/app.js

VERSIÓN:
- Configuración bloqueada mientras el motor trabaja.
- Anuncio del mercado y estrategia al encender.
- Estado interno CANDIDATE.
- PREPARE más estable.
- CONFIRMED con ventana de ejecución.
- Monitoreo continuo.
=========================================================
*/

import { derivAPI } from "./deriv-api.js";

import {
  crearResumenTecnico
} from "./indicators.js";

import {
  generarPrediccion,
  clasificarPuntaje
} from "./prediction.js";

import {
  monitorOportunidades,
  ESTADOS_MONITOR
} from "./monitor.js";

import {
  asistenteVoz
} from "./voice.js";


/* =====================================================
1. CONFIGURACIÓN GENERAL
===================================================== */

const CONFIGURACION = Object.freeze({
  version: "8.1.0",

  maximoPrecios: 1000,
  maximoDigitos: 1000,
  maximoHistorial: 20,
  maximoRegistro: 70,

  intervaloAnalisisMilisegundos: 350,

  tiempoCapsulaPrepare: 5000,
  tiempoCapsulaConfirmada: 4500,
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


const ESTRATEGIAS_VOZ = Object.freeze({
  rise_fall: "Sube y Baja",
  even_odd: "Par e Impar",
  over_under: "Más de cuatro y Menos de cinco",
  match: "Coincidencia"
});


/* =====================================================
3. NOMBRES PARA LA VOZ
===================================================== */

function obtenerMercadoParaVoz(
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
    "Mercado seleccionado"
  );
}


function obtenerEstrategiaParaVoz(
  estrategia
) {
  return (
    ESTRATEGIAS_VOZ[
      estrategia
    ] ||
    "estrategia seleccionada"
  );
}


/* =====================================================
4. ELEMENTOS DE LA INTERFAZ
===================================================== */

function obtenerElemento(
  id,
  obligatorio = true
) {
  const elemento =
    document.getElementById(id);

  if (
    !elemento &&
    obligatorio
  ) {
    console.warn(
      `No se encontró el elemento: ${id}`
    );
  }

  return elemento;
}


const interfaz = {
  estadoConexion:
    obtenerElemento("estadoConexion"),

  textoEstadoConexion:
    obtenerElemento(
      "textoEstadoConexion"
    ),

  estadoMotor:
    obtenerElemento("estadoMotor"),

  textoEstadoMotor:
    obtenerElemento(
      "textoEstadoMotor"
    ),

  estadoMonitoreo:
    obtenerElemento(
      "estadoMonitoreo"
    ),

  textoEstadoMonitoreo:
    obtenerElemento(
      "textoEstadoMonitoreo"
    ),

  estadoMemoria:
    obtenerElemento("estadoMemoria"),

  botonConectar:
    obtenerElemento("botonConectar"),

  botonDesconectar:
    obtenerElemento(
      "botonDesconectar"
    ),

  botonEncenderMotor:
    obtenerElemento(
      "botonEncenderMotor"
    ),

  botonPrediccion:
    obtenerElemento(
      "botonPrediccion"
    ),

  mensajeControl:
    obtenerElemento("mensajeControl"),

  botonAbrirMercados:
    obtenerElemento(
      "botonAbrirMercados"
    ),

  mercadoSeleccionado:
    obtenerElemento(
      "mercadoSeleccionado"
    ),

  simboloSeleccionado:
    obtenerElemento(
      "simboloSeleccionado"
    ),

  selectorEstrategia:
    obtenerElemento(
      "selectorEstrategia"
    ),

  selectorModo:
    obtenerElemento("selectorModo"),

  selectorHorizonte:
    obtenerElemento(
      "selectorHorizonte"
    ),

  panelMonitoreo:
    obtenerElemento("panelMonitoreo"),

  tituloMonitoreo:
    obtenerElemento("tituloMonitoreo"),

  detalleMonitoreo:
    obtenerElemento(
      "detalleMonitoreo"
    ),

  botonCancelarMonitoreo:
    obtenerElemento(
      "botonCancelarMonitoreo"
    ),

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
    obtenerElemento(
      "horaActualizacion"
    ),

  cantidadDigitos:
    obtenerElemento("cantidadDigitos"),

  listaUltimosDigitos:
    obtenerElemento(
      "listaUltimosDigitos"
    ),

  textoProgreso:
    obtenerElemento("textoProgreso"),

  numeroProgreso:
    obtenerElemento("numeroProgreso"),

  barraMemoria:
    obtenerElemento("barraMemoria"),

  tendencia:
    obtenerElemento("tendencia"),

  detalleTendencia:
    obtenerElemento(
      "detalleTendencia"
    ),

  rsi:
    obtenerElemento("rsi"),

  detalleRsi:
    obtenerElemento("detalleRsi"),

  momentum:
    obtenerElemento("momentum"),

  detalleMomentum:
    obtenerElemento(
      "detalleMomentum"
    ),

  volatilidad:
    obtenerElemento("volatilidad"),

  detalleVolatilidad:
    obtenerElemento(
      "detalleVolatilidad"
    ),

  estadoFibonacci:
    obtenerElemento(
      "estadoFibonacci"
    ),

  detalleFibonacci:
    obtenerElemento(
      "detalleFibonacci"
    ),

  nivelFibonacciCercano:
    obtenerElemento(
      "nivelFibonacciCercano"
    ),

  maximoFibonacci:
    obtenerElemento(
      "maximoFibonacci"
    ),

  minimoFibonacci:
    obtenerElemento(
      "minimoFibonacci"
    ),

  distanciaFibonacci:
    obtenerElemento(
      "distanciaFibonacci"
    ),

  nivelesFibonacci:
    obtenerElemento(
      "nivelesFibonacci"
    ),

  panelSenal:
    obtenerElemento("panelSenal"),

  estadoPrediccion:
    obtenerElemento(
      "estadoPrediccion"
    ),

  tituloPrediccion:
    obtenerElemento(
      "tituloPrediccion"
    ),

  valorPrediccion:
    obtenerElemento(
      "valorPrediccion"
    ),

  puntajeSenal:
    obtenerElemento("puntajeSenal"),

  precisionObservada:
    obtenerElemento(
      "precisionObservada"
    ),

  barraPuntaje:
    obtenerElemento("barraPuntaje"),

  listaMotivos:
    obtenerElemento("listaMotivos"),

  mensajeOperacion:
    obtenerElemento(
      "mensajeOperacion"
    ),

  cuentaRegresiva:
    obtenerElemento(
      "cuentaRegresiva"
    ),

  botonNuevaSenal:
    obtenerElemento(
      "botonNuevaSenal"
    ),

  estadisticaIntentos:
    obtenerElemento(
      "estadisticaIntentos"
    ),

  estadisticaAciertos:
    obtenerElemento(
      "estadisticaAciertos"
    ),

  estadisticaFallos:
    obtenerElemento(
      "estadisticaFallos"
    ),

  estadisticaPrecision:
    obtenerElemento(
      "estadisticaPrecision"
    ),

  estadisticaRacha:
    obtenerElemento(
      "estadisticaRacha"
    ),

  botonReiniciarEstadisticas:
    obtenerElemento(
      "botonReiniciarEstadisticas"
    ),

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
    obtenerElemento(
      "historialSenales"
    ),

  botonLimpiarHistorial:
    obtenerElemento(
      "botonLimpiarHistorial"
    ),

  registroActividad:
    obtenerElemento(
      "registroActividad"
    ),

  botonLimpiarRegistro:
    obtenerElemento(
      "botonLimpiarRegistro"
    ),

  dialogoMercados:
    obtenerElemento(
      "dialogoMercados"
    ),

  botonCerrarMercados:
    obtenerElemento(
      "botonCerrarMercados"
    ),

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
5. ESTADO GENERAL
===================================================== */

const estado = {
  conectado: false,
  motorEncendido: false,

  simbolo: "1HZ100V",

  mercado:
    "Volatility 100 (1s) Index",

  estrategia: "rise_fall",
  modo: "fast",
  horizonte: "10s",

  precios: [],
  digitos: [],

  ticksRecibidos: 0,

  ultimoPrecio: null,
  precioAnterior: null,

  ultimoPrecioFormateado:
    "--",

  ultimoPipSize: null,

  resumenTecnico: null,
  ultimaPrediccion: null,

  ultimoAnalisisEn: 0,

  senalActiva: null,

  historial: [],

  estadisticas: {
    intentos: 0,
    aciertos: 0,
    fallos: 0,
    racha: 0
  }
};


let temporizadorCapsula = null;

let temporizadorCuentaRegresiva =
  null;


/* =====================================================
6. UTILIDADES
===================================================== */

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
  const texto =
    String(
      precioFormateado || ""
    );

  for (
    let indice =
      texto.length - 1;
    indice >= 0;
    indice--
  ) {
    const caracter =
      texto.charAt(indice);

    if (
      caracter >= "0" &&
      caracter <= "9"
    ) {
      return Number(caracter);
    }
  }

  return null;
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
7. BLOQUEAR CONFIGURACIÓN
===================================================== */

function bloquearConfiguracion(
  bloquear
) {
  interfaz.botonAbrirMercados.disabled =
    bloquear;

  interfaz.selectorEstrategia.disabled =
    bloquear;

  interfaz.selectorModo.disabled =
    bloquear;

  interfaz.selectorHorizonte.disabled =
    bloquear;

  interfaz.botonAbrirMercados.setAttribute(
    "aria-disabled",
    String(bloquear)
  );

  interfaz.botonAbrirMercados.style.opacity =
    bloquear
      ? "0.55"
      : "1";

  interfaz.botonAbrirMercados.style.cursor =
    bloquear
      ? "not-allowed"
      : "pointer";
}


/* =====================================================
8. CONEXIÓN
===================================================== */

function actualizarEstadoConexion(
  nuevoEstado,
  texto
) {
  interfaz.estadoConexion.className =
    `estado-item ${nuevoEstado}`;

  interfaz.textoEstadoConexion.textContent =
    texto;

  estado.conectado =
    nuevoEstado === "live";

  interfaz.botonConectar.disabled =
    nuevoEstado === "live" ||
    nuevoEstado === "connecting";

  interfaz.botonDesconectar.disabled =
    nuevoEstado !== "live";

  interfaz.botonEncenderMotor.disabled =
    nuevoEstado !== "live";

  if (
    nuevoEstado !== "live"
  ) {
    apagarMotor(false);
  }
}


function conectar() {
  const mercado =
    obtenerMercado(
      estado.simbolo
    );

  registrarActividad(
    `Conectando con ${mercado.nombre}.`
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
9. MOTOR
===================================================== */

function actualizarEstadoMotor() {
  interfaz.estadoMotor.className =
    estado.motorEncendido
      ? "estado-item motor-encendido"
      : "estado-item motor-apagado";

  interfaz.textoEstadoMotor.textContent =
    estado.motorEncendido
      ? "ON"
      : "OFF";

  interfaz.botonEncenderMotor.classList.toggle(
    "encendido",
    estado.motorEncendido
  );

  interfaz.botonEncenderMotor.innerHTML =
    estado.motorEncendido
      ? "<span>■</span> STOP ENGINE"
      : "<span>⚡</span> START ENGINE";

  interfaz.botonPrediccion.disabled =
    !estado.conectado ||
    !estado.motorEncendido;

  bloquearConfiguracion(
    estado.motorEncendido
  );
}


function encenderMotor() {
  if (!estado.conectado) {
    registrarActividad(
      "Primero debe conectar la herramienta.",
      "advertencia"
    );

    return;
  }

  estado.motorEncendido = true;

  actualizarEstadoMotor();

  monitorOportunidades.establecerContexto({
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

  interfaz.mensajeControl.textContent =
    "Motor encendido. Buscando una entrada estable.";

  registrarActividad(
    "Motor de análisis encendido.",
    "exito"
  );

  const mercadoVoz =
    obtenerMercadoParaVoz(
      estado.simbolo
    );

  const estrategiaVoz =
    obtenerEstrategiaParaVoz(
      estado.estrategia
    );

  asistenteVoz.hablarSecuencia(
    [
      "Motor de análisis encendido.",
      `${mercadoVoz}.`,
      `Estrategia ${estrategiaVoz}.`,
      "Buscando entrada."
    ],
    {
      reemplazar: true,
      pausa: 380
    }
  );
}


function apagarMotor(
  anunciar = true
) {
  estado.motorEncendido = false;
  estado.senalActiva = null;

  detenerCuentaRegresiva();

  monitorOportunidades.detener(
    "Motor de análisis apagado."
  );

  actualizarEstadoMotor();

  interfaz.mensajeControl.textContent =
    estado.conectado
      ? "La herramienta está conectada. Configure el mercado y encienda el motor."
      : "Conecte la herramienta y después encienda el motor.";

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
10. SELECTOR DE MERCADOS
===================================================== */

function construirListaMercados() {
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

      interfaz.listaMercados.appendChild(
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
      .showModal === "function"
  ) {
    interfaz.dialogoMercados
      .showModal();
  } else {
    interfaz.dialogoMercados
      .setAttribute(
        "open",
        ""
      );
  }
}


function cerrarMercados() {
  if (
    typeof interfaz.dialogoMercados
      .close === "function"
  ) {
    interfaz.dialogoMercados.close();
  } else {
    interfaz.dialogoMercados
      .removeAttribute("open");
  }
}


function seleccionarMercado(
  mercado
) {
  cerrarMercados();

  if (
    estado.motorEncendido
  ) {
    registrarActividad(
      "Apague el motor antes de cambiar el mercado.",
      "advertencia"
    );

    return;
  }

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

  interfaz.mercadoSeleccionado.textContent =
    mercado.nombre;

  interfaz.simboloSeleccionado.textContent =
    mercado.simbolo;

  interfaz.nombreMercado.textContent =
    mercado.nombre;

  limpiarDatosMercado();

  monitorOportunidades.establecerContexto({
    simbolo:
      estado.simbolo,

    mercado:
      estado.mercado
  });

  registrarActividad(
    `Mercado seleccionado: ${mercado.nombre}.`
  );

  if (estado.conectado) {
    derivAPI.cambiarSimbolo(
      estado.simbolo
    );
  }
}


/* =====================================================
11. LIMPIAR DATOS
===================================================== */

function limpiarDatosMercado() {
  estado.precios = [];
  estado.digitos = [];

  estado.ticksRecibidos = 0;

  estado.ultimoPrecio = null;
  estado.precioAnterior = null;

  estado.ultimoPrecioFormateado =
    "--";

  estado.resumenTecnico = null;
  estado.ultimaPrediccion = null;
  estado.senalActiva = null;

  interfaz.precioActual.textContent =
    "--";

  interfaz.precioActual.className =
    "precio-actual";

  interfaz.contadorTicks.textContent =
    "0";

  interfaz.ultimoDigito.textContent =
    "--";

  interfaz.horaActualizacion.textContent =
    "--";

  interfaz.estadoDatos.textContent =
    "NO DATA";

  interfaz.estadoDatos.className =
    "insignia-datos";

  interfaz.listaUltimosDigitos.innerHTML =
    '<span class="mensaje-vacio">Esperando datos</span>';

  actualizarMemoria();
  limpiarIndicadores();
  mostrarEstadoInicialSenal();
}


/* =====================================================
12. RECEPCIÓN DE TICKS
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
    Number(tick.precio);

  if (
    !Number.isFinite(precio)
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
    Number.isInteger(digito)
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

  estado.precioAnterior =
    estado.ultimoPrecio;

  estado.ultimoPrecio =
    precio;

  estado.ultimoPrecioFormateado =
    precioFormateado;

  estado.ultimoPipSize =
    tick.pipSize;

  interfaz.precioActual.textContent =
    precioFormateado;

  interfaz.contadorTicks.textContent =
    String(
      estado.ticksRecibidos
    );

  interfaz.ultimoDigito.textContent =
    Number.isInteger(digito)
      ? String(digito)
      : "--";

  interfaz.horaActualizacion.textContent =
    obtenerHora(tick.epoch);

  interfaz.estadoDatos.textContent =
    "LIVE DATA";

  interfaz.estadoDatos.className =
    "insignia-datos live";

  mostrarUltimosDigitos();
  actualizarMemoria();

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
  interfaz.precioActual.classList.remove(
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
    interfaz.precioActual.classList.add(
      "sube"
    );
  }

  if (
    precio <
    estado.ultimoPrecio
  ) {
    interfaz.precioActual.classList.add(
      "baja"
    );
  }
}


/* =====================================================
13. MEMORIA Y ÚLTIMOS DÍGITOS
===================================================== */

function actualizarMemoria() {
  const cantidad =
    estado.precios.length;

  const maximo =
    CONFIGURACION.maximoPrecios;

  const porcentaje =
    Math.min(
      100,
      (
        cantidad /
        maximo
      ) * 100
    );

  const texto =
    `${cantidad} / ${maximo}`;

  interfaz.estadoMemoria.textContent =
    texto;

  interfaz.numeroProgreso.textContent =
    texto;

  interfaz.barraMemoria.style.width =
    `${porcentaje}%`;

  interfaz.textoProgreso.textContent =
    estado.conectado
      ? "LIVE MARKET MEMORY"
      : "WAITING CONNECTION";
}


function mostrarUltimosDigitos() {
  const ultimos =
    estado.digitos.slice(-20);

  interfaz.cantidadDigitos.textContent =
    String(
      ultimos.length
    );

  interfaz.listaUltimosDigitos.innerHTML =
    "";

  if (
    ultimos.length === 0
  ) {
    interfaz.listaUltimosDigitos.innerHTML =
      '<span class="mensaje-vacio">Esperando datos</span>';

    return;
  }

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

      interfaz.listaUltimosDigitos.appendChild(
        elemento
      );
    }
  );

  interfaz.listaUltimosDigitos.scrollLeft =
    interfaz.listaUltimosDigitos
      .scrollWidth;
}


/* =====================================================
14. ANÁLISIS
===================================================== */

function analizarMercado(
  forzar = false
) {
  if (
    !estado.motorEncendido
  ) {
    return null;
  }

  const momentoActual =
    Date.now();

  if (
    !forzar &&
    momentoActual -
      estado.ultimoAnalisisEn <
      CONFIGURACION
        .intervaloAnalisisMilisegundos
  ) {
    return null;
  }

  estado.ultimoAnalisisEn =
    momentoActual;

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

  const prediccion =
    generarPrediccion({
      estrategia:
        estado.estrategia,

      resumen:
        estado.resumenTecnico
    });

  estado.ultimaPrediccion =
    prediccion;

  mostrarPuntajeEnMonitoreo(
    prediccion
  );

  monitorOportunidades.procesar(
    prediccion
  );

  return prediccion;
}


/* =====================================================
15. INDICADORES
===================================================== */

function limpiarIndicadores() {
  interfaz.tendencia.textContent =
    "--";

  interfaz.detalleTendencia.textContent =
    "Esperando datos";

  interfaz.rsi.textContent =
    "--";

  interfaz.detalleRsi.textContent =
    "Esperando datos";

  interfaz.momentum.textContent =
    "--";

  interfaz.detalleMomentum.textContent =
    "Esperando datos";

  interfaz.volatilidad.textContent =
    "--";

  interfaz.detalleVolatilidad.textContent =
    "Esperando datos";

  limpiarFibonacci();
}


function mostrarIndicadores(
  resumen
) {
  if (!resumen) {
    return;
  }

  interfaz.tendencia.textContent =
    resumen.tendencia.direccion;

  interfaz.detalleTendencia.textContent =
    `Cambio: ${resumen.tendencia
      .cambioPorcentual
      .toFixed(4)}%`;

  interfaz.rsi.textContent =
    Number.isFinite(resumen.rsi)
      ? resumen.rsi.toFixed(1)
      : "--";

  interfaz.detalleRsi.textContent =
    resumen.interpretacionRsi
      .zona;

  interfaz.momentum.textContent =
    resumen.momentum.direccion;

  interfaz.detalleMomentum.textContent =
    `${resumen.momentum
      .porcentaje
      .toFixed(4)}%`;

  interfaz.volatilidad.textContent =
    `${resumen.volatilidad
      .porcentaje
      .toFixed(4)}%`;

  interfaz.detalleVolatilidad.textContent =
    `Nivel ${resumen.volatilidad
      .nivel}`;

  mostrarFibonacci(
    resumen.fibonacci
  );
}


/* =====================================================
16. FIBONACCI
===================================================== */

function limpiarFibonacci() {
  interfaz.estadoFibonacci.textContent =
    "NO DATA";

  interfaz.detalleFibonacci.textContent =
    "Reuniendo precios para calcular los niveles.";

  interfaz.nivelFibonacciCercano.textContent =
    "--";

  interfaz.maximoFibonacci.textContent =
    "--";

  interfaz.minimoFibonacci.textContent =
    "--";

  interfaz.distanciaFibonacci.textContent =
    "--";

  interfaz.nivelesFibonacci
    .querySelectorAll("span")
    .forEach(
      (elemento) => {
        elemento.classList.remove(
          "activo"
        );
      }
    );
}


function mostrarFibonacci(
  fibonacci
) {
  if (
    !fibonacci ||
    !fibonacci.disponible
  ) {
    limpiarFibonacci();

    return;
  }

  interfaz.estadoFibonacci.textContent =
    fibonacci.estado;

  interfaz.detalleFibonacci.textContent =
    fibonacci.cercaDeNivel
      ? fibonacci.tipoZona
      : "El precio no está cerca de un nivel relevante.";

  interfaz.nivelFibonacciCercano.textContent =
    fibonacci.nivelCercano
      ? `${fibonacci.nivelCercano
          .porcentaje}%`
      : "--";

  interfaz.maximoFibonacci.textContent =
    formatearPrecio(
      fibonacci.maximo,
      estado.ultimoPipSize
    );

  interfaz.minimoFibonacci.textContent =
    formatearPrecio(
      fibonacci.minimo,
      estado.ultimoPipSize
    );

  interfaz.distanciaFibonacci.textContent =
    fibonacci.nivelCercano
      ? `${fibonacci.nivelCercano
          .distanciaPorcentual
          .toFixed(2)}%`
      : "--";

  interfaz.nivelesFibonacci
    .querySelectorAll("span")
    .forEach(
      (elemento) => {
        const nivel =
          Number(
            elemento.dataset.nivel
          );

        elemento.classList.toggle(
          "activo",
          Boolean(
            fibonacci.nivelCercano &&
            nivel ===
              fibonacci.nivelCercano
                .porcentaje
          )
        );
      }
    );
}


/* =====================================================
17. PANEL DE PREDICCIÓN
===================================================== */

function mostrarEstadoInicialSenal() {
  interfaz.panelSenal.className =
    "panel-senal monitoring";

  interfaz.estadoPrediccion.textContent =
    "MONITORING";

  interfaz.tituloPrediccion.textContent =
    "Esperando oportunidad";

  interfaz.valorPrediccion.textContent =
    "--";

  interfaz.puntajeSenal.textContent =
    "--";

  interfaz.barraPuntaje.style.width =
    "0%";

  interfaz.listaMotivos.innerHTML =
    "<li>El motor todavía no ha generado una señal.</li>";

  interfaz.mensajeOperacion.textContent =
    "Sin señal activa.";

  interfaz.cuentaRegresiva.textContent =
    "--";
}


function mostrarPuntajeEnMonitoreo(
  prediccion
) {
  if (!prediccion) {
    return;
  }

  const estadoMonitor =
    monitorOportunidades
      .obtenerEstado()
      .estado;

  if (
    [
      ESTADOS_MONITOR.CONFIRMED,
      ESTADOS_MONITOR.EXECUTING,
      ESTADOS_MONITOR.RESULT
    ].includes(estadoMonitor)
  ) {
    return;
  }

  interfaz.puntajeSenal.textContent =
    `${prediccion.puntaje}/100`;

  interfaz.barraPuntaje.style.width =
    `${prediccion.puntaje}%`;

  const clasificacion =
    clasificarPuntaje(
      prediccion.puntaje
    );

  interfaz.mensajeOperacion.textContent =
    `Signal Quality: ${clasificacion.nivel}`;
}


/* =====================================================
18. ESTADOS DEL MONITOR
===================================================== */

function manejarEstadoMonitor(
  datos
) {
  const estadoMonitor =
    datos.estado;

  interfaz.textoEstadoMonitoreo.textContent =
    estadoMonitor;

  interfaz.estadoMonitoreo.className =
    "estado-item";

  interfaz.panelMonitoreo.className =
    "panel-monitoreo";

  if (
    estadoMonitor ===
    ESTADOS_MONITOR.INACTIVE
  ) {
    interfaz.estadoMonitoreo.classList.add(
      "monitoreo-inactivo"
    );

    interfaz.panelMonitoreo.classList.add(
      "inactive"
    );

    interfaz.tituloMonitoreo.textContent =
      "MONITORING INACTIVE";
  }


  if (
    estadoMonitor ===
    ESTADOS_MONITOR.MONITORING
  ) {
    interfaz.estadoMonitoreo.classList.add(
      "monitoreo-activo"
    );

    interfaz.panelMonitoreo.classList.add(
      "monitoring"
    );

    interfaz.tituloMonitoreo.textContent =
      "SEARCHING ENTRY";
  }


  if (
    estadoMonitor ===
    ESTADOS_MONITOR.CANDIDATE
  ) {
    interfaz.estadoMonitoreo.classList.add(
      "monitoreo-activo"
    );

    interfaz.panelMonitoreo.classList.add(
      "monitoring"
    );

    interfaz.tituloMonitoreo.textContent =
      "VALIDATING ENTRY";

    interfaz.detalleMonitoreo.textContent =
      "Se detectó una posible oportunidad. Verificando estabilidad antes de mostrar la prealerta.";
  }


  if (
    estadoMonitor ===
    ESTADOS_MONITOR.PREPARE
  ) {
    interfaz.estadoMonitoreo.classList.add(
      "prepare"
    );

    interfaz.panelMonitoreo.classList.add(
      "prepare"
    );

    interfaz.tituloMonitoreo.textContent =
      "PREPARE";
  }


  if (
    estadoMonitor ===
    ESTADOS_MONITOR.CONFIRMED
  ) {
    interfaz.estadoMonitoreo.classList.add(
      "monitoreo-activo"
    );

    interfaz.panelMonitoreo.classList.add(
      "confirmed"
    );

    interfaz.tituloMonitoreo.textContent =
      "CONFIRMED";
  }


  if (
    estadoMonitor ===
    ESTADOS_MONITOR.CANCELLED
  ) {
    interfaz.estadoMonitoreo.classList.add(
      "prepare"
    );

    interfaz.panelMonitoreo.classList.add(
      "prepare"
    );

    interfaz.tituloMonitoreo.textContent =
      "OPPORTUNITY CANCELLED";
  }


  if (
    estadoMonitor !==
    ESTADOS_MONITOR.CANDIDATE
  ) {
    interfaz.detalleMonitoreo.textContent =
      datos.mensaje ||
      "Analizando el mercado.";
  }


  const puedeCancelar =
    estadoMonitor ===
      ESTADOS_MONITOR.PREPARE ||
    estadoMonitor ===
      ESTADOS_MONITOR.CONFIRMED;

  interfaz.botonCancelarMonitoreo.hidden =
    !puedeCancelar;
}


/* =====================================================
19. PREPARE
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

    estadoTexto: "PREPARE",

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

  asistenteVoz.anunciarPrepare(
    resultado
  );
}


/* =====================================================
20. CONFIRMED
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

    estadoTexto: "EXECUTE NOW",

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

  asistenteVoz.anunciarConfirmacion(
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
21. CANCELACIÓN
===================================================== */

function manejarCancelacion({
  motivo,
  resultado
}) {
  estado.senalActiva = null;

  detenerCuentaRegresiva();

  mostrarCapsula({
    tipo: "cancelled",

    estadoTexto: "CANCELLED",

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

  asistenteVoz.anunciarCancelacion(
    motivo
  );
}


/* =====================================================
22. RESULTADO
===================================================== */

function manejarResultado({
  acierto,
  resultado
}) {
  detenerCuentaRegresiva();

  mostrarResultadoFinal(
    acierto,
    resultado
  );

  actualizarEstadisticas(
    acierto
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

  asistenteVoz.anunciarResultado(
    acierto
  );

  estado.senalActiva = null;
}


/* =====================================================
23. MOSTRAR RESULTADOS
===================================================== */

function obtenerValorVisual(
  resultado
) {
  if (!resultado) {
    return "--";
  }

  if (
    resultado.direccion ===
      "MATCH" &&
    Number.isInteger(
      resultado.metadata?.digito
    )
  ) {
    return (
      `MATCH ` +
      resultado.metadata.digito
    );
  }

  return resultado.direccion;
}


function mostrarResultadoPanel(
  resultado,
  fase
) {
  const clase =
    fase === "CONFIRMED"
      ? "confirmed"
      : "prepare";

  interfaz.panelSenal.className =
    `panel-senal ${clase}`;

  interfaz.estadoPrediccion.textContent =
    fase;

  interfaz.tituloPrediccion.textContent =
    fase === "CONFIRMED"
      ? "Señal técnica confirmada"
      : "Posible oportunidad detectada";

  interfaz.valorPrediccion.textContent =
    obtenerValorVisual(
      resultado
    );

  interfaz.puntajeSenal.textContent =
    `${resultado.puntaje}/100`;

  interfaz.barraPuntaje.style.width =
    `${resultado.puntaje}%`;

  mostrarMotivos(
    resultado
  );

  interfaz.mensajeOperacion.textContent =
    fase === "CONFIRMED"
      ? "Ejecute la operación ahora."
      : "Prepare el bot y espere confirmación.";
}


function mostrarMotivos(
  resultado
) {
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

  if (
    mensajes.length === 0
  ) {
    mensajes.push(
      "Sin explicación disponible."
    );
  }

  mensajes.forEach(
    (texto) => {
      const elemento =
        document.createElement(
          "li"
        );

      elemento.textContent =
        texto;

      interfaz.listaMotivos.appendChild(
        elemento
      );
    }
  );
}


function mostrarResultadoFinal(
  acierto,
  resultado
) {
  interfaz.panelSenal.className =
    acierto
      ? "panel-senal success"
      : "panel-senal failed";

  interfaz.estadoPrediccion.textContent =
    acierto
      ? "RESULT: SUCCESS"
      : "RESULT: FAILED";

  interfaz.tituloPrediccion.textContent =
    acierto
      ? "La predicción fue acertada"
      : "La predicción no fue acertada";

  interfaz.valorPrediccion.textContent =
    obtenerValorVisual(
      resultado
    );

  interfaz.mensajeOperacion.textContent =
    "Señal finalizada. El monitoreo continuará automáticamente.";

  interfaz.cuentaRegresiva.textContent =
    acierto
      ? "✓"
      : "×";
}


/* =====================================================
24. EVALUAR SEÑAL
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
      resultado.metadata?.digito;

    const acierto =
      digito ===
      digitoEsperado;

    finalizarEvaluacion(
      acierto,
      {
        digitoResultado:
          digito,

        digitoEsperado
      }
    );

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
25. CUENTA REGRESIVA
===================================================== */

function obtenerSegundosHorizonte() {
  if (
    estado.horizonte === "1m"
  ) {
    return 60;
  }

  if (
    estado.horizonte === "5m"
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

  interfaz.cuentaRegresiva.textContent =
    String(segundos);

  temporizadorCuentaRegresiva =
    setInterval(
      () => {
        segundos--;

        interfaz.cuentaRegresiva.textContent =
          segundos >= 0
            ? String(segundos)
            : "0";

        if (
          [
            10,
            9,
            8,
            7,
            6,
            5,
            4,
            3,
            2,
            1,
            0
          ].includes(segundos)
        ) {
          asistenteVoz.anunciarConteo(
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
26. CÁPSULA
===================================================== */

function mostrarCapsula({
  tipo,
  estadoTexto,
  valor,
  detalle,
  duracion
}) {
  ocultarCapsula();

  interfaz.capsulaSenal.className =
    `capsula-senal ${tipo}`;

  interfaz.estadoCapsula.textContent =
    estadoTexto;

  interfaz.valorCapsula.textContent =
    valor;

  interfaz.detalleCapsula.textContent =
    detalle;

  interfaz.capsulaSenal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "capsula-abierta"
  );

  requestAnimationFrame(
    () => {
      interfaz.capsulaSenal.classList.add(
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

    temporizadorCapsula = null;
  }

  interfaz.capsulaSenal.classList.remove(
    "visible"
  );

  interfaz.capsulaSenal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "capsula-abierta"
  );
}


/* =====================================================
27. HISTORIAL
===================================================== */

function agregarHistorial(
  resultado
) {
  estado.historial.unshift({
    resultado,

    mercado:
      estado.mercado,

    hora:
      obtenerHora()
  });

  estado.historial =
    estado.historial.slice(
      0,
      CONFIGURACION.maximoHistorial
    );

  actualizarHistorial();
}


function actualizarHistorial() {
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
          ${obtenerValorVisual(
            registro.resultado
          )} ·
          ${registro.resultado.puntaje}/100
        </strong>

        <p>
          ${registro.mercado} ·
          ${registro.resultado.nombreEstrategia}
        </p>
      `;

      interfaz.historialSenales.appendChild(
        articulo
      );
    }
  );
}


/* =====================================================
28. ESTADÍSTICAS
===================================================== */

function actualizarEstadisticas(
  acierto
) {
  estado.estadisticas.intentos++;

  if (acierto) {
    estado.estadisticas.aciertos++;
    estado.estadisticas.racha++;
  } else {
    estado.estadisticas.fallos++;
    estado.estadisticas.racha = 0;
  }

  mostrarEstadisticas();
}


function mostrarEstadisticas() {
  const datos =
    estado.estadisticas;

  const precision =
    datos.intentos > 0
      ? (
          datos.aciertos /
          datos.intentos
        ) * 100
      : null;

  interfaz.estadisticaIntentos.textContent =
    String(datos.intentos);

  interfaz.estadisticaAciertos.textContent =
    String(datos.aciertos);

  interfaz.estadisticaFallos.textContent =
    String(datos.fallos);

  interfaz.estadisticaPrecision.textContent =
    precision === null
      ? "NO DATA"
      : `${precision.toFixed(1)}%`;

  interfaz.estadisticaRacha.textContent =
    String(datos.racha);

  interfaz.precisionObservada.textContent =
    datos.intentos === 0
      ? "0 / 20 TESTS"
      : `${datos.aciertos} / ${datos.intentos} TESTS`;
}


/* =====================================================
29. VOZ
===================================================== */

async function cargarSelectorVoces() {
  const voces =
    await asistenteVoz.esperarVoces();

  interfaz.selectorVoz.innerHTML =
    "";

  if (
    voces.length === 0
  ) {
    const opcion =
      document.createElement(
        "option"
      );

    opcion.textContent =
      "Voz predeterminada";

    interfaz.selectorVoz.appendChild(
      opcion
    );

    return;
  }

  const seleccionada =
    asistenteVoz
      .obtenerVozSeleccionada();

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

      if (
        seleccionada &&
        voz.name ===
          seleccionada.name &&
        voz.lang ===
          seleccionada.lang
      ) {
        opcion.selected = true;
      }

      interfaz.selectorVoz.appendChild(
        opcion
      );
    }
  );
}


function actualizarBotonVoz() {
  const activa =
    asistenteVoz.estaActiva();

  interfaz.botonVoz.textContent =
    activa
      ? "🔊"
      : "🔇";

  interfaz.botonVoz.classList.toggle(
    "voz-activa",
    activa
  );

  interfaz.botonVoz.setAttribute(
    "aria-pressed",
    String(activa)
  );
}


/* =====================================================
30. CONFIGURACIÓN
===================================================== */

function cambiarEstrategia() {
  if (
    estado.motorEncendido
  ) {
    return;
  }

  estado.estrategia =
    interfaz.selectorEstrategia.value;

  estado.senalActiva = null;

  monitorOportunidades.establecerContexto({
    estrategia:
      estado.estrategia
  });

  mostrarEstadoInicialSenal();

  registrarActividad(
    `Estrategia seleccionada: ${estado.estrategia}.`
  );
}


function cambiarModo() {
  if (
    estado.motorEncendido
  ) {
    return;
  }

  estado.modo =
    interfaz.selectorModo.value;

  monitorOportunidades.establecerContexto({
    modo:
      estado.modo
  });

  registrarActividad(
    `Modo seleccionado: ${estado.modo}.`
  );
}


function cambiarHorizonte() {
  if (
    estado.motorEncendido
  ) {
    return;
  }

  estado.horizonte =
    interfaz.selectorHorizonte.value;

  monitorOportunidades.establecerContexto({
    horizonte:
      estado.horizonte
  });

  registrarActividad(
    `Horizonte seleccionado: ${estado.horizonte}.`
  );
}


/* =====================================================
31. EVENTOS DE DERIV
===================================================== */

function configurarEventosDeriv() {
  derivAPI.al(
    "estado",
    (datos) => {
      actualizarEstadoConexion(
        datos.estado,
        datos.texto
      );

      asistenteVoz.anunciarConexion(
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
32. EVENTOS DEL MONITOR
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
33. EVENTOS DE INTERFAZ
===================================================== */

function configurarEventosInterfaz() {
  interfaz.botonConectar.addEventListener(
    "click",
    conectar
  );


  interfaz.botonDesconectar.addEventListener(
    "click",
    desconectar
  );


  interfaz.botonEncenderMotor.addEventListener(
    "click",
    alternarMotor
  );


  interfaz.botonPrediccion.addEventListener(
    "click",
    () => {
      analizarMercado(true);

      registrarActividad(
        "Análisis manual solicitado."
      );
    }
  );


  interfaz.botonAbrirMercados.addEventListener(
    "click",
    abrirMercados
  );


  interfaz.botonCerrarMercados.addEventListener(
    "click",
    cerrarMercados
  );


  interfaz.selectorEstrategia.addEventListener(
    "change",
    cambiarEstrategia
  );


  interfaz.selectorModo.addEventListener(
    "change",
    cambiarModo
  );


  interfaz.selectorHorizonte.addEventListener(
    "change",
    cambiarHorizonte
  );


  interfaz.botonCancelarMonitoreo.addEventListener(
    "click",
    () => {
      monitorOportunidades.cancelarOportunidad(
        "Oportunidad cancelada manualmente."
      );
    }
  );


  interfaz.botonVoz.addEventListener(
    "click",
    () => {
      asistenteVoz.alternar();

      actualizarBotonVoz();
    }
  );


  interfaz.selectorVoz.addEventListener(
    "change",
    () => {
      asistenteVoz.seleccionarVoz(
        interfaz.selectorVoz.value
      );
    }
  );


  interfaz.velocidadVoz.addEventListener(
    "input",
    () => {
      const valor =
        Number(
          interfaz.velocidadVoz.value
        );

      asistenteVoz.establecerVelocidad(
        valor
      );

      interfaz.valorVelocidad.textContent =
        `${valor.toFixed(2)}x`;
    }
  );


  interfaz.tonoVoz.addEventListener(
    "input",
    () => {
      const valor =
        Number(
          interfaz.tonoVoz.value
        );

      asistenteVoz.establecerTono(
        valor
      );

      interfaz.valorTono.textContent =
        valor.toFixed(1);
    }
  );


  interfaz.volumenVoz.addEventListener(
    "input",
    () => {
      const valor =
        Number(
          interfaz.volumenVoz.value
        );

      asistenteVoz.establecerVolumen(
        valor
      );

      interfaz.valorVolumen.textContent =
        `${Math.round(
          valor * 100
        )}%`;
    }
  );


  interfaz.botonProbarVoz.addEventListener(
    "click",
    () => {
      asistenteVoz.probarVoz();
    }
  );


  interfaz.botonLimpiarHistorial.addEventListener(
    "click",
    () => {
      estado.historial = [];

      actualizarHistorial();
    }
  );


  interfaz.botonLimpiarRegistro.addEventListener(
    "click",
    () => {
      interfaz.registroActividad.innerHTML =
        "";

      registrarActividad(
        "Registro limpiado."
      );
    }
  );


  interfaz.botonReiniciarEstadisticas.addEventListener(
    "click",
    () => {
      estado.estadisticas = {
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


  interfaz.botonNuevaSenal.addEventListener(
    "click",
    () => {
      mostrarEstadoInicialSenal();

      if (
        estado.motorEncendido
      ) {
        monitorOportunidades.iniciar();
      }
    }
  );
}


/* =====================================================
34. SERVICE WORKER
===================================================== */

async function registrarServiceWorker() {
  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  try {
    await navigator.serviceWorker.register(
      "./service-worker.js"
    );

    registrarActividad(
      "Service Worker registrado."
    );
  } catch (error) {
    registrarActividad(
      "No fue posible registrar el Service Worker.",
      "advertencia"
    );
  }
}


/* =====================================================
35. INICIAR APLICACIÓN
===================================================== */

async function iniciarAplicacion() {
  const mercado =
    obtenerMercado(
      estado.simbolo
    );

  estado.mercado =
    mercado.nombre;

  interfaz.mercadoSeleccionado.textContent =
    mercado.nombre;

  interfaz.simboloSeleccionado.textContent =
    mercado.simbolo;

  interfaz.nombreMercado.textContent =
    mercado.nombre;

  actualizarEstadoConexion(
    "offline",
    "OFFLINE"
  );

  actualizarEstadoMotor();
  limpiarDatosMercado();
  mostrarEstadisticas();
  actualizarHistorial();

  configurarEventosDeriv();
  configurarEventosMonitor();
  configurarEventosInterfaz();

  asistenteVoz.inicializar();

  await cargarSelectorVoces();

  actualizarBotonVoz();

  monitorOportunidades.establecerContexto({
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
    `Trading Analyst V${CONFIGURACION.version} iniciado.`,
    "exito"
  );

  registrarActividad(
    "Seleccione el mercado, la estrategia y presione CONNECT."
  );
}


/* =====================================================
36. CIERRE
===================================================== */

window.addEventListener(
  "beforeunload",
  () => {
    detenerCuentaRegresiva();
    ocultarCapsula();

    monitorOportunidades.destruir();
    asistenteVoz.destruir();
    derivAPI.desconectar();
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
TRADING ANALYST V8 PRO
=========================================================
*/
