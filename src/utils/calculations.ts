import type {
  GastoFijo,
  TransaccionVariable,
  CategoriaVariable,
  CicloFechas,
  EstadoHucha,
} from '../types';

export interface ResumenFinanciero {
  ingresosMensuales: number;
  ingresosExtraCiclo: number;
  objetivoAhorro: number;
  impactoGastosFijos: number;
  totalDesembolsoRealFijos: number; // lo que sale del banco en este ciclo
  totalFijosPagados: number;
  totalFijosPendientes: number;
  presupuestoVariableTotal: number;
  gastadoVariableAcumulado: number;
  disponibleMensualRestante: number;
  disponibleHoy: number; // Métrica Reina Safe-to-Spend
  asignacionDiariaHoy: number; // Límite diario asignado para hoy
  gastadoHoy: number; // Gasto acumulado hoy
  netoHuchaCiclo: number; // Aportado a la hucha en este ciclo
  netoHuchaHoy: number; // Aportado a la hucha hoy
  saldoHuchaTotal?: number;
  diasTotalesCiclo: number;
  diaEnCiclo: number;
  diasRestantesCiclo: number;
  porcentajeCicloTranscurrido: number;
  porcentajePresupuestoGastado: number;
  estadoRitmoPresupuesto: 'verde' | 'ambar' | 'rojo';
  ciclo: CicloFechas;

  // Aliases de compatibilidad
  diasTotalesMes: number;
  diaActual: number;
  diasRestantes: number;
  porcentajeMesTranscurrido: number;
}

/**
 * Calcula el impacto mensual/ciclo individual de un gasto fijo
 */
export const calcularImpactoMensualGastoFijo = (gasto: GastoFijo): number => {
  if (gasto.modoCalculo === 'prorrateado') {
    const frec = Math.max(1, gasto.frecuenciaMeses || 1);
    return gasto.importeTotal / frec;
  }
  // modo 'mes_cobro'
  return gasto.tocaEsteMes ? gasto.importeTotal : 0;
};

/**
 * Obtiene el ciclo activo actual según el día de hoy y el diaInicioCiclo
 */
export const obtenerCicloActivoHoy = (diaInicioCiclo = 10): string => {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth() + 1; // 1-12
  const day = hoy.getDate();

  if (day >= diaInicioCiclo) {
    return `${year}-${String(month).padStart(2, '0')}`;
  } else {
    // Si hoy es día < diaInicioCiclo, el ciclo activo actual arrancó el mes anterior
    const mesAnterior = new Date(year, month - 2, 1);
    const mYear = mesAnterior.getFullYear();
    const mMonth = String(mesAnterior.getMonth() + 1).padStart(2, '0');
    return `${mYear}-${mMonth}`;
  }
};

/**
 * Calcula las fechas exactas y métricas temporales de un ciclo de cobro personalizado (del día X al X)
 */
export const calcularFechasCiclo = (
  mesCicloStr: string,
  diaInicioCiclo = 10
): CicloFechas => {
  const [yearStr, monthStr] = mesCicloStr.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(monthStr, 10) || new Date().getMonth() + 1; // 1-12

  const safeDia = Math.max(1, Math.min(28, diaInicioCiclo || 10));

  // Fecha inicio del ciclo: día safeDia del mesCiclo a las 00:00:00.000
  const fechaInicio = new Date(year, month - 1, safeDia, 0, 0, 0, 0);

  // Fecha fin del ciclo: día seguro (safeDia - 1) del mes siguiente a las 23:59:59.999
  // Ej: si safeDia = 10, fin es el día 9 del mes siguiente a las 23:59:59
  const fechaFin = new Date(year, month, safeDia - 1, 23, 59, 59, 999);

  // Calculamos la duración exacta en días
  const msPorDia = 1000 * 60 * 60 * 24;
  const inicioMediodia = new Date(year, month - 1, safeDia, 12, 0, 0);
  const finMediodia = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate(), 12, 0, 0);
  const diasTotalesCiclo = Math.round((finMediodia.getTime() - inicioMediodia.getTime()) / msPorDia) + 1;

  const hoy = new Date();
  const hoyMediodia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12, 0, 0);

  let diaEnCiclo = 1;
  let diasRestantesCiclo = diasTotalesCiclo;

  if (hoyMediodia.getTime() < inicioMediodia.getTime()) {
    // Ciclo futuro
    diaEnCiclo = 1;
    diasRestantesCiclo = diasTotalesCiclo;
  } else if (hoyMediodia.getTime() > finMediodia.getTime()) {
    // Ciclo pasado
    diaEnCiclo = diasTotalesCiclo;
    diasRestantesCiclo = 1; // Mínimo 1 para evitar división entre cero en vistas históricas
  } else {
    // Ciclo actualmente en curso
    const diff = Math.round((hoyMediodia.getTime() - inicioMediodia.getTime()) / msPorDia) + 1;
    diaEnCiclo = Math.max(1, Math.min(diasTotalesCiclo, diff));
    diasRestantesCiclo = Math.max(1, diasTotalesCiclo - diaEnCiclo + 1);
  }

  const porcentajeCicloTranscurrido = Math.min(
    100,
    Math.max(0, (diaEnCiclo / diasTotalesCiclo) * 100)
  );

  const formatoDiaMes = (d: Date) => {
    const dia = d.getDate();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dia} ${meses[d.getMonth()]}`;
  };

  const etiquetaRango = `${formatoDiaMes(fechaInicio)} – ${formatoDiaMes(fechaFin)}`;
  const etiquetaCompleta = `Ciclo: ${etiquetaRango} • Quedan ${diasRestantesCiclo} días`;

  return {
    fechaInicio,
    fechaFin,
    diasTotalesCiclo,
    diaEnCiclo,
    diasRestantesCiclo,
    porcentajeCicloTranscurrido,
    etiquetaRango,
    etiquetaCompleta,
  };
};

/**
 * Evalúa el color de ritmo:
 * - Menor o igual al % del ciclo: verde esmeralda
 * - Supera el % del ciclo pero <= 90%: ámbar
 * - Supera el 90%: rojo
 */
export const obtenerColorRitmo = (
  porcentajeGastado: number,
  porcentajeCicloTranscurrido: number
): 'verde' | 'ambar' | 'rojo' => {
  if (porcentajeGastado > 90) {
    return 'rojo';
  }
  if (porcentajeGastado <= porcentajeCicloTranscurrido) {
    return 'verde';
  }
  return 'ambar';
};

/**
 * Motor de cálculo general del Dashboard adaptado a ciclo de nómina
 */
export const calcularResumenFinanciero = (
  ingresosMensuales: number,
  objetivoAhorro: number,
  gastosFijos: GastoFijo[],
  transacciones: TransaccionVariable[],
  mesCicloStr: string,
  diaInicioCiclo = 10,
  hucha?: EstadoHucha
): ResumenFinanciero => {
  // 1. Datos temporales del ciclo
  const ciclo = calcularFechasCiclo(mesCicloStr, diaInicioCiclo);

  // 2. Impacto de Gastos Fijos en este ciclo
  const impactoGastosFijos = gastosFijos.reduce(
    (acc, g) => acc + calcularImpactoMensualGastoFijo(g),
    0
  );

  // Desembolso bancario real de fijos en este ciclo
  const totalDesembolsoRealFijos = gastosFijos.reduce(
    (acc, g) => acc + (g.tocaEsteMes ? g.importeTotal : 0),
    0
  );

  const totalFijosPagados = gastosFijos.reduce(
    (acc, g) => acc + (g.tocaEsteMes && g.pagado ? g.importeTotal : 0),
    0
  );

  const totalFijosPendientes = Math.max(0, totalDesembolsoRealFijos - totalFijosPagados);

  // 3. Filtrar transacciones del ciclo actual (entre fechaInicio y fechaFin)
  const inicioTimestamp = ciclo.fechaInicio.getTime();
  const finTimestamp = ciclo.fechaFin.getTime();

  const transaccionesCiclo = transacciones.filter((tx) => {
    if (!tx.fecha) return false;
    const txTime = new Date(tx.fecha).getTime();
    return txTime >= inicioTimestamp && txTime <= finTimestamp;
  });

  // Ingresos extra registrados en este ciclo
  const ingresosExtraCiclo = transaccionesCiclo
    .filter((tx) => tx.tipo === 'ingreso')
    .reduce((acc, tx) => acc + (Number(tx.importe) || 0), 0);

  // 4. Movimientos y aportaciones a la Hucha Konto en este ciclo
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0).getTime();
  const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999).getTime();

  const movimientosHucha = hucha?.historial || [];
  const movimientosHuchaCiclo = movimientosHucha.filter((m) => {
    if (m.ciclo) return m.ciclo === mesCicloStr;
    if (!m.fecha) return false;
    const t = new Date(m.fecha).getTime();
    return t >= inicioTimestamp && t <= finTimestamp;
  });

  const aportadoHuchaCiclo = movimientosHuchaCiclo
    .filter((m) => m.tipo === 'ingreso')
    .reduce((acc, m) => acc + (Number(m.importe) || 0), 0);

  const retiradoHuchaCiclo = movimientosHuchaCiclo
    .filter((m) => m.tipo === 'retirada')
    .reduce((acc, m) => acc + (Number(m.importe) || 0), 0);

  const netoHuchaCiclo = Math.max(0, aportadoHuchaCiclo - retiradoHuchaCiclo);

  // Aportaciones/retiradas estrictamente hoy
  const aportadoHuchaHoy = movimientosHuchaCiclo
    .filter((m) => {
      if (m.tipo !== 'ingreso') return false;
      const t = new Date(m.fecha).getTime();
      return t >= inicioHoy && t <= finHoy;
    })
    .reduce((acc, m) => acc + (Number(m.importe) || 0), 0);

  const retiradoHuchaHoy = movimientosHuchaCiclo
    .filter((m) => {
      if (m.tipo !== 'retirada') return false;
      const t = new Date(m.fecha).getTime();
      return t >= inicioHoy && t <= finHoy;
    })
    .reduce((acc, m) => acc + (Number(m.importe) || 0), 0);

  const netoHuchaHoy = aportadoHuchaHoy - retiradoHuchaHoy;
  const netoHuchaAntesDeHoy = Math.max(0, netoHuchaCiclo - Math.max(0, netoHuchaHoy));

  // 5. Presupuesto Variable Total = (Ingresos Mensuales + Ingresos Extra) - Impacto Fijos - Objetivo de Ahorro - Aportado a Hucha
  const presupuestoVariableTotal =
    ingresosMensuales + ingresosExtraCiclo - impactoGastosFijos - objetivoAhorro - netoHuchaCiclo;

  const gastadoVariableAcumulado = transaccionesCiclo
    .filter((tx) => tx.tipo === 'gasto')
    .reduce((acc, tx) => acc + (Number(tx.importe) || 0), 0);

  // 6. Gastos realizados estrictamente hoy vs días anteriores dentro del ciclo
  const gastadoHoy = transaccionesCiclo
    .filter((tx) => {
      if (tx.tipo !== 'gasto') return false;
      const t = new Date(tx.fecha).getTime();
      return t >= inicioHoy && t <= finHoy;
    })
    .reduce((acc, tx) => acc + (Number(tx.importe) || 0), 0);

  const gastadoAntesDeHoy = transaccionesCiclo
    .filter((tx) => tx.tipo === 'gasto' && new Date(tx.fecha).getTime() < inicioHoy)
    .reduce((acc, tx) => acc + (Number(tx.importe) || 0), 0);

  // 7. Disponible Mensual/Ciclo Restante
  const disponibleMensualRestante = presupuestoVariableTotal - gastadoVariableAcumulado;

  // 8. MÉTRICA REINA "Disponible Hoy (Safe-to-Spend)"
  // Presupuesto que estaba disponible al comenzar el día de hoy dividido entre los días restantes del ciclo
  const presupuestoAlInicioDeHoy =
    ingresosMensuales +
    ingresosExtraCiclo -
    impactoGastosFijos -
    objetivoAhorro -
    netoHuchaAntesDeHoy -
    gastadoAntesDeHoy;

  const asignacionDiariaHoy = presupuestoAlInicioDeHoy / ciclo.diasRestantesCiclo;

  // Disponible restante para gastar HOY = asignación calculada para hoy menos lo gastado hoy menos lo guardado en la hucha hoy
  const disponibleHoy = asignacionDiariaHoy - gastadoHoy - netoHuchaHoy;

  const porcentajePresupuestoGastado =
    presupuestoVariableTotal > 0
      ? (gastadoVariableAcumulado / presupuestoVariableTotal) * 100
      : gastadoVariableAcumulado > 0
      ? 100
      : 0;

  const estadoRitmoPresupuesto = obtenerColorRitmo(
    porcentajePresupuestoGastado,
    ciclo.porcentajeCicloTranscurrido
  );

  return {
    ingresosMensuales,
    ingresosExtraCiclo,
    objetivoAhorro,
    impactoGastosFijos,
    totalDesembolsoRealFijos,
    totalFijosPagados,
    totalFijosPendientes,
    presupuestoVariableTotal,
    gastadoVariableAcumulado,
    disponibleMensualRestante,
    disponibleHoy,
    asignacionDiariaHoy,
    gastadoHoy,
    netoHuchaCiclo,
    netoHuchaHoy,
    saldoHuchaTotal: hucha?.saldo ?? 0,
    diasTotalesCiclo: ciclo.diasTotalesCiclo,
    diaEnCiclo: ciclo.diaEnCiclo,
    diasRestantesCiclo: ciclo.diasRestantesCiclo,
    porcentajeCicloTranscurrido: ciclo.porcentajeCicloTranscurrido,
    porcentajePresupuestoGastado,
    estadoRitmoPresupuesto,
    ciclo,
    // Aliases
    diasTotalesMes: ciclo.diasTotalesCiclo,
    diaActual: ciclo.diaEnCiclo,
    diasRestantes: ciclo.diasRestantesCiclo,
    porcentajeMesTranscurrido: ciclo.porcentajeCicloTranscurrido,
  };
};

/**
 * Calcula o verifica la racha de días verdes en el ciclo
 */
export const calcularRachaDiasVerdes = (
  transacciones: TransaccionVariable[],
  ciclo: CicloFechas,
  asignacionDiariaHoy: number,
  rachaAlmacenada = 0
): number => {
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0).getTime();

  let rachaCalculada = 0;
  for (let d = 1; d < ciclo.diaEnCiclo; d++) {
    const fechaDia = new Date(ciclo.fechaInicio);
    fechaDia.setDate(fechaDia.getDate() + (d - 1));
    const inicioDia = new Date(fechaDia.getFullYear(), fechaDia.getMonth(), fechaDia.getDate(), 0, 0, 0, 0).getTime();
    const finDia = new Date(fechaDia.getFullYear(), fechaDia.getMonth(), fechaDia.getDate(), 23, 59, 59, 999).getTime();

    if (inicioDia >= inicioHoy) break;

    const gastadoEnDia = transacciones
      .filter((tx) => {
        if (tx.tipo !== 'gasto') return false;
        const t = new Date(tx.fecha).getTime();
        return t >= inicioDia && t <= finDia;
      })
      .reduce((sum, tx) => sum + (Number(tx.importe) || 0), 0);

    if (gastadoEnDia <= asignacionDiariaHoy * 1.05) {
      rachaCalculada++;
    } else {
      rachaCalculada = 0;
    }
  }

  return Math.max(rachaCalculada, rachaAlmacenada);
};

/**
 * Calcula el gasto y progreso de cada categoría para el ciclo activo
 */
export const calcularProgresoCategorias = (
  categorias: CategoriaVariable[],
  transacciones: TransaccionVariable[],
  ciclo: CicloFechas
) => {
  const inicioTimestamp = ciclo.fechaInicio.getTime();
  const finTimestamp = ciclo.fechaFin.getTime();

  const transaccionesCiclo = transacciones.filter((tx) => {
    if (!tx.fecha) return false;
    const txTime = new Date(tx.fecha).getTime();
    return txTime >= inicioTimestamp && txTime <= finTimestamp && tx.tipo === 'gasto';
  });

  return categorias.map((cat) => {
    const gastado = transaccionesCiclo
      .filter((tx) => tx.categoriaId === cat.id)
      .reduce((acc, tx) => acc + (Number(tx.importe) || 0), 0);

    const porcentajeGastado =
      cat.presupuesto > 0 ? (gastado / cat.presupuesto) * 100 : gastado > 0 ? 100 : 0;

    const restante = cat.presupuesto - gastado;
    const estadoRitmo = obtenerColorRitmo(porcentajeGastado, ciclo.porcentajeCicloTranscurrido);

    return {
      ...cat,
      gastado,
      restante,
      porcentajeGastado,
      estadoRitmo,
    };
  });
};

/**
 * Formateador de moneda en euros (€)
 */
export const formatearMoneda = (
  valor: number,
  mostrarSigno = false,
  decimales = 2
): string => {
  if (isNaN(valor)) return '0,00 €';
  const formateado = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);

  if (mostrarSigno && valor > 0) {
    return `+${formateado}`;
  }
  return formateado;
};

/**
 * Formatear fecha legible para transacciones recientes
 */
export const formatearFechaMovimiento = (fechaIso: string): string => {
  try {
    const fecha = new Date(fechaIso);
    const hoy = new Date();
    const esHoy =
      fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear();

    const ayer = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const esAyer =
      fecha.getDate() === ayer.getDate() &&
      fecha.getMonth() === ayer.getMonth() &&
      fecha.getFullYear() === ayer.getFullYear();

    if (esHoy) return 'Hoy';
    if (esAyer) return 'Ayer';

    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return 'Fecha';
  }
};

/**
 * Obtener nombre del ciclo legible (ej: "Octubre 2026")
 */
export const formatearMesLegible = (mesAnoStr: string): string => {
  const [year, month] = mesAnoStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  const nombreMes = date.toLocaleDateString('es-ES', { month: 'long' });
  return `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${year}`;
};
