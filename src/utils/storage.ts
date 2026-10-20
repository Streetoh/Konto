import type {
  ConfiguracionMensual,
  GastoFijo,
  CategoriaVariable,
  TransaccionVariable,
  DiccionarioReglas,
  ReglaMapeo,
  NotificacionCruda,
  EstadoHucha,
  CicloCerrado,
} from '../types';

const STORAGE_KEYS = {
  CONFIG: 'konto_config_v2',
  GASTOS_FIJOS: 'konto_gastos_fijos_v2',
  CATEGORIAS: 'konto_categorias_v2',
  TRANSACCIONES: 'konto_transacciones_v2',
  DICCIONARIO: 'konto_diccionario_v1',
  NOTIFICACIONES_CRUDAS: 'konto_notificaciones_crudas_v1',
  HUCHA: 'konto_hucha_v1',
  RACHA_VERDE: 'konto_racha_v1',
  HISTORIAL_CICLOS: 'konto_historial_ciclos_v1',
};

const getCurrentYearMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const DEFAULT_CONFIG: ConfiguracionMensual = {
  nombreApp: 'Konto',
  nombreTitular: 'DANIEL JESUS REQUENA GORRIN',
  mesActual: getCurrentYearMonth(),
  ingresosMensuales: 880,
  objetivoAhorro: 180,
  diaInicioCiclo: 10,
};

export const DEFAULT_GASTOS_FIJOS: GastoFijo[] = [
  {
    id: 'fijo-comunidad-hariduse',
    nombre: 'Comunidad Hariduse 8',
    importeTotal: 135, // Temporada actual de frío/invierno (120-150 € invierno / 30-35 € verano)
    frecuenciaMeses: 1,
    modoCalculo: 'prorrateado',
    tocaEsteMes: true,
    pagado: false,
  },
];

export const DEFAULT_CATEGORIAS: CategoriaVariable[] = [
  {
    id: 'cat-supermercado',
    nombre: 'Supermercado',
    icono: 'ShoppingCart',
    color: 'emerald',
    presupuesto: 240,
  },
  {
    id: 'cat-restaurantes',
    nombre: 'Restaurantes',
    icono: 'Utensils',
    color: 'amber',
    presupuesto: 50,
  },
  {
    id: 'cat-ocio',
    nombre: 'Ocio',
    icono: 'Gamepad2',
    color: 'purple',
    presupuesto: 40,
  },
  {
    id: 'cat-transporte',
    nombre: 'Transporte',
    icono: 'Car',
    color: 'blue',
    presupuesto: 35,
  },
  {
    id: 'cat-compras',
    nombre: 'Compras / Otros',
    icono: 'ShoppingBag',
    color: 'teal',
    presupuesto: 35,
  },
];

// Diccionario inteligente de reglas inicial según comercios habituales y aliasing
export const DEFAULT_DICCIONARIO: DiccionarioReglas = {
  'VIRUMAA': {
    categoriaId: 'cat-supermercado',
    aliasComercio: 'COOP',
  },
  'HARIDUSE TN 8 KÜ': {
    categoriaId: 'cat-compras',
    aliasComercio: 'Comunidad Hariduse 8',
    gastoFijoId: 'fijo-comunidad-hariduse',
  },
  'HARIDUSE': {
    categoriaId: 'cat-compras',
    aliasComercio: 'Comunidad Hariduse 8',
    gastoFijoId: 'fijo-comunidad-hariduse',
  },
  'JÕHVI VALD': {
    categoriaId: 'cat-compras',
    aliasComercio: 'Tasas Jõhvi Vald',
    gastoFijoId: 'fijo-comunidad-hariduse',
  },
  'JOHVI VALD': {
    categoriaId: 'cat-compras',
    aliasComercio: 'Tasas Jõhvi Vald',
    gastoFijoId: 'fijo-comunidad-hariduse',
  },
  'JÕHVI LINN': {
    categoriaId: 'cat-compras',
    aliasComercio: 'Tasas Jõhvi Linn',
    gastoFijoId: 'fijo-comunidad-hariduse',
  },
  'JOHVI LINN': {
    categoriaId: 'cat-compras',
    aliasComercio: 'Tasas Jõhvi Linn',
    gastoFijoId: 'fijo-comunidad-hariduse',
  },
  'MAKSIMARKET': {
    categoriaId: 'cat-supermercado',
    aliasComercio: 'Coop Maksimarket',
  },
  'MAXIMA': {
    categoriaId: 'cat-supermercado',
    aliasComercio: 'Maxima',
  },
  'COOP': {
    categoriaId: 'cat-supermercado',
    aliasComercio: 'COOP',
  },
  'SELVER': {
    categoriaId: 'cat-supermercado',
    aliasComercio: 'Selver',
  },
  'PRISMA': {
    categoriaId: 'cat-supermercado',
    aliasComercio: 'Prisma',
  },
  'RIMI': {
    categoriaId: 'cat-supermercado',
    aliasComercio: 'Rimi',
  },
  'LIDL': {
    categoriaId: 'cat-supermercado',
    aliasComercio: 'Lidl',
  },
  'AMAZON': {
    categoriaId: 'cat-compras',
    aliasComercio: 'Amazon',
  },
  'STEAMGAMES': {
    categoriaId: 'cat-ocio',
    aliasComercio: 'Steam Games',
  },
  'GOOGLE': {
    categoriaId: 'cat-compras',
    aliasComercio: 'Google',
  },
  'BOLT': {
    categoriaId: 'cat-transporte',
    aliasComercio: 'Bolt',
  },
  'CIRCLE K': {
    categoriaId: 'cat-transporte',
    aliasComercio: 'Circle K',
  },
  'NESTE': {
    categoriaId: 'cat-transporte',
    aliasComercio: 'Neste',
  },
  'WOLT': {
    categoriaId: 'cat-restaurantes',
    aliasComercio: 'Wolt',
  },
  'SPOTIFY': {
    categoriaId: 'cat-ocio',
    aliasComercio: 'Spotify',
  },
};

export const DEFAULT_TRANSACCIONES: TransaccionVariable[] = [];

export const loadConfig = (): ConfiguracionMensual => {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.CONFIG) ||
      localStorage.getItem('margen_config_v1');
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    const isOldDefault = parsed.ingresosMensuales === 2200 && parsed.objetivoAhorro === 400;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      nombreApp: parsed.nombreApp === 'Margen' ? 'Konto' : (parsed.nombreApp || 'Konto'),
      nombreTitular: parsed.nombreTitular || 'DANIEL JESUS REQUENA GORRIN',
      ingresosMensuales: isOldDefault ? 880 : (Number(parsed.ingresosMensuales) || 880),
      objetivoAhorro: isOldDefault ? 180 : (Number(parsed.objetivoAhorro) || 180),
      diaInicioCiclo: parsed.diaInicioCiclo ? Number(parsed.diaInicioCiclo) : 10,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const saveConfig = (config: ConfiguracionMensual): void => {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
};

export const loadGastosFijos = (): GastoFijo[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GASTOS_FIJOS);
    if (!raw) return DEFAULT_GASTOS_FIJOS;
    const fijos: GastoFijo[] = JSON.parse(raw);
    if (fijos.length === 0) return DEFAULT_GASTOS_FIJOS;
    // Migración automática del valor erróneo anterior de 285 € a 135 € (invierno actual)
    return fijos.map((f) =>
      f.id === 'fijo-comunidad-hariduse' && (f.importeTotal === 285 || f.importeTotal === 260 || f.importeTotal === 310)
        ? { ...f, importeTotal: 135 }
        : f
    );
  } catch {
    return DEFAULT_GASTOS_FIJOS;
  }
};

export const saveGastosFijos = (gastos: GastoFijo[]): void => {
  localStorage.setItem(STORAGE_KEYS.GASTOS_FIJOS, JSON.stringify(gastos));
};

export const loadCategorias = (): CategoriaVariable[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIAS);
    if (!raw) return DEFAULT_CATEGORIAS;
    const cats: CategoriaVariable[] = JSON.parse(raw);

    // Separar automáticamente Restaurantes y Ocio si estaban fusionados
    const tieneOcio = cats.some((c) => c.id === 'cat-ocio');
    if (!tieneOcio) {
      const catRest = cats.find((c) => c.id === 'cat-restaurantes');
      if (catRest) {
        catRest.nombre = 'Restaurantes';
        if (catRest.presupuesto === 150) catRest.presupuesto = 50;
      }
      cats.push({
        id: 'cat-ocio',
        nombre: 'Ocio',
        icono: 'Gamepad2',
        color: 'purple',
        presupuesto: 40,
      });

      // Ajustar presupuestos base a las proporciones reales si estaban en valores por defecto
      const catSup = cats.find((c) => c.id === 'cat-supermercado');
      if (catSup && catSup.presupuesto === 350) catSup.presupuesto = 240;
      const catTrans = cats.find((c) => c.id === 'cat-transporte');
      if (catTrans && catTrans.presupuesto === 100) catTrans.presupuesto = 35;
      const catComp = cats.find((c) => c.id === 'cat-compras');
      if (catComp && catComp.presupuesto === 150) catComp.presupuesto = 35;

      saveCategorias(cats);
    }

    return cats;
  } catch {
    return DEFAULT_CATEGORIAS;
  }
};

export const saveCategorias = (categorias: CategoriaVariable[]): void => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(categorias));
};

export const loadTransacciones = (): TransaccionVariable[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACCIONES);
    if (!raw) return DEFAULT_TRANSACCIONES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_TRANSACCIONES;
  }
};

export const saveTransacciones = (txs: TransaccionVariable[]): void => {
  localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(txs));
};

export const loadDiccionario = (): DiccionarioReglas => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DICCIONARIO);
    if (!raw) return DEFAULT_DICCIONARIO;
    const parsed = JSON.parse(raw);
    const merged: DiccionarioReglas = { ...DEFAULT_DICCIONARIO };

    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === 'string') {
        const def = DEFAULT_DICCIONARIO[key];
        if (def && typeof def === 'object') {
          merged[key] = {
            ...def,
            categoriaId: val,
          };
        } else {
          merged[key] = val;
        }
      } else {
        merged[key] = val as ReglaMapeo;
      }
    }
    return merged;
  } catch {
    return DEFAULT_DICCIONARIO;
  }
};

export const saveDiccionario = (dicc: DiccionarioReglas): void => {
  localStorage.setItem(STORAGE_KEYS.DICCIONARIO, JSON.stringify(dicc));
};

export const DEFAULT_NOTIFICACIONES_CRUDAS: NotificacionCruda[] = [];

export const loadNotificacionesCrudas = (): NotificacionCruda[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICACIONES_CRUDAS);
    if (!raw) return DEFAULT_NOTIFICACIONES_CRUDAS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_NOTIFICACIONES_CRUDAS;
  }
};

export const saveNotificacionesCrudas = (items: NotificacionCruda[]): void => {
  localStorage.setItem(STORAGE_KEYS.NOTIFICACIONES_CRUDAS, JSON.stringify(items.slice(0, 10)));
};

export const DEFAULT_HUCHA: EstadoHucha = {
  saldo: 0,
  historial: [],
  diasRolloverEjecutados: [],
  autoRolloverHabilitado: true,
};

export const loadHucha = (): EstadoHucha => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HUCHA);
    if (!raw) return DEFAULT_HUCHA;
    const parsed = JSON.parse(raw);
    return {
      saldo: Number(parsed.saldo) || 0,
      historial: Array.isArray(parsed.historial) ? parsed.historial : [],
      diasRolloverEjecutados: Array.isArray(parsed.diasRolloverEjecutados)
        ? parsed.diasRolloverEjecutados
        : [],
      autoRolloverHabilitado:
        typeof parsed.autoRolloverHabilitado === 'boolean'
          ? parsed.autoRolloverHabilitado
          : true,
    };
  } catch {
    return DEFAULT_HUCHA;
  }
};

export const saveHucha = (hucha: EstadoHucha): void => {
  localStorage.setItem(STORAGE_KEYS.HUCHA, JSON.stringify(hucha));
};

export const loadRacha = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RACHA_VERDE);
    if (raw === null) return 0;
    const num = parseInt(raw, 10);
    return isNaN(num) ? 0 : Math.max(0, num);
  } catch {
    return 0;
  }
};

export const saveRacha = (racha: number): void => {
  localStorage.setItem(STORAGE_KEYS.RACHA_VERDE, String(Math.max(0, Math.floor(racha))));
};

export const loadHistorialCiclos = (): CicloCerrado[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORIAL_CICLOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveHistorialCiclos = (ciclos: CicloCerrado[]): void => {
  localStorage.setItem(STORAGE_KEYS.HISTORIAL_CICLOS, JSON.stringify(ciclos));
};

export const generarCiclosEjemplo = (): CicloCerrado[] => {
  return [
    {
      id: 'ciclo-demo-2026-06',
      mes: '2026-06',
      etiquetaRango: '10 Jun – 09 Jul 2026',
      fechaInicio: '2026-06-10T00:00:00.000Z',
      fechaFin: '2026-07-09T23:59:59.999Z',
      cerradoEn: '2026-07-09T22:30:00.000Z',
      ingresosTotales: 880,
      gastosFijosTotales: 135,
      gastoVariableTotal: 485,
      ahorroObjetivo: 180,
      ahorroRealConseguido: 260,
      diasGastoCero: 9,
      diasVerdes: 22,
      topComercio: {
        nombre: 'COOP',
        total: 215.4,
        visitas: 17,
      },
      categoriaMejor: {
        nombre: 'Ocio',
        gastado: 24,
        presupuesto: 40,
        desviacion: -16,
      },
      categoriaPeor: {
        nombre: 'Restaurantes',
        gastado: 58,
        presupuesto: 50,
        desviacion: 8,
      },
    },
    {
      id: 'ciclo-demo-2026-07',
      mes: '2026-07',
      etiquetaRango: '10 Jul – 09 Ago 2026',
      fechaInicio: '2026-07-10T00:00:00.000Z',
      fechaFin: '2026-08-09T23:59:59.999Z',
      cerradoEn: '2026-08-09T23:00:00.000Z',
      ingresosTotales: 880,
      gastosFijosTotales: 135,
      gastoVariableTotal: 535,
      ahorroObjetivo: 180,
      ahorroRealConseguido: 210,
      diasGastoCero: 7,
      diasVerdes: 19,
      topComercio: {
        nombre: 'SELVER',
        total: 198.5,
        visitas: 14,
      },
      categoriaMejor: {
        nombre: 'Transporte',
        gastado: 22,
        presupuesto: 35,
        desviacion: -13,
      },
      categoriaPeor: {
        nombre: 'Supermercado',
        gastado: 265,
        presupuesto: 240,
        desviacion: 25,
      },
    },
    {
      id: 'ciclo-demo-2026-08',
      mes: '2026-08',
      etiquetaRango: '10 Ago – 09 Sep 2026',
      fechaInicio: '2026-08-10T00:00:00.000Z',
      fechaFin: '2026-09-09T23:59:59.999Z',
      cerradoEn: '2026-09-09T21:45:00.000Z',
      ingresosTotales: 930,
      gastosFijosTotales: 135,
      gastoVariableTotal: 450,
      ahorroObjetivo: 180,
      ahorroRealConseguido: 345,
      diasGastoCero: 13,
      diasVerdes: 26,
      topComercio: {
        nombre: 'COOP',
        total: 232.0,
        visitas: 16,
      },
      categoriaMejor: {
        nombre: 'Supermercado',
        gastado: 210,
        presupuesto: 240,
        desviacion: -30,
      },
      categoriaPeor: {
        nombre: 'Compras / Otros',
        gastado: 38,
        presupuesto: 35,
        desviacion: 3,
      },
    },
    {
      id: 'ciclo-demo-2026-09',
      mes: '2026-09',
      etiquetaRango: '10 Sep – 09 Oct 2026',
      fechaInicio: '2026-09-10T00:00:00.000Z',
      fechaFin: '2026-10-09T23:59:59.999Z',
      cerradoEn: '2026-10-09T23:15:00.000Z',
      ingresosTotales: 880,
      gastosFijosTotales: 135,
      gastoVariableTotal: 495,
      ahorroObjetivo: 180,
      ahorroRealConseguido: 250,
      diasGastoCero: 8,
      diasVerdes: 23,
      topComercio: {
        nombre: 'MAXIMA',
        total: 245.8,
        visitas: 18,
      },
      categoriaMejor: {
        nombre: 'Ocio',
        gastado: 28,
        presupuesto: 40,
        desviacion: -12,
      },
      categoriaPeor: {
        nombre: 'Restaurantes',
        gastado: 54,
        presupuesto: 50,
        desviacion: 4,
      },
    },
  ];
};

export const resetToDefaults = () => {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
  localStorage.setItem(STORAGE_KEYS.GASTOS_FIJOS, '[]');
  localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(DEFAULT_CATEGORIAS));
  localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, '[]');
  localStorage.setItem(STORAGE_KEYS.DICCIONARIO, JSON.stringify(DEFAULT_DICCIONARIO));
  localStorage.setItem(STORAGE_KEYS.NOTIFICACIONES_CRUDAS, '[]');
  localStorage.setItem(STORAGE_KEYS.HUCHA, JSON.stringify(DEFAULT_HUCHA));
  localStorage.setItem(STORAGE_KEYS.RACHA_VERDE, '0');
  localStorage.setItem(STORAGE_KEYS.HISTORIAL_CICLOS, '[]');
};
