export type ModoCalculoGastoFijo = 'prorrateado' | 'mes_cobro';

export interface ConfiguracionMensual {
  nombreApp: string;
  mesActual: string; // formato "YYYY-MM" (ej. "2026-10")
  ingresosMensuales: number;
  objetivoAhorro: number;
  diaInicioCiclo: number; // Día del mes en que empieza el ciclo de nómina (1-28, por defecto 10)
  nombreTitular?: string; // Nombre completo para identificar transferencias a cuentas secundarias / redondeos
}

export interface CicloFechas {
  fechaInicio: Date;
  fechaFin: Date;
  diasTotalesCiclo: number;
  diaEnCiclo: number;
  diasRestantesCiclo: number;
  porcentajeCicloTranscurrido: number;
  etiquetaRango: string; // "10 Oct – 9 Nov"
  etiquetaCompleta: string; // "Ciclo: 10 Oct – 9 Nov • Quedan X días"
}

export interface GastoFijo {
  id: string;
  nombre: string;
  importeTotal: number;
  frecuenciaMeses: number; // 1 mensual, 2 bimestral, 3 trimestral, 6 semestral, 12 anual, etc.
  modoCalculo: ModoCalculoGastoFijo;
  tocaEsteMes: boolean; // Indica si en este ciclo toca pagar
  pagado: boolean;
  fechaRenovacion?: string; // Fecha ISO del próximo cobro o fin de prueba gratuita (ej. "2026-10-24")
  avisoCancelar?: boolean; // Marca si el usuario quiere cancelar o revisar esta suscripción antes de renovar
  importeAnterior?: number; // Importe anterior registrado para alertar de subidas de precio / inflación
}

export type CategoriaIcono =
  | 'ShoppingCart'
  | 'Utensils'
  | 'Car'
  | 'ShoppingBag'
  | 'HeartPulse'
  | 'Gamepad2'
  | 'Home'
  | 'Coffee'
  | 'Plane'
  | 'Tag';

export type CategoriaColor = 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'teal';

export interface CategoriaVariable {
  id: string;
  nombre: string;
  icono: CategoriaIcono;
  color: CategoriaColor;
  presupuesto: number;
}

export interface TransaccionVariable {
  id: string;
  fecha: string; // ISO string
  importe: number;
  tipo: 'gasto' | 'ingreso';
  comercio: string;
  categoriaId: string;
  confirmado: boolean;
  origenNotificacion?: boolean;
}

export interface ReglaMapeo {
  categoriaId: string;
  aliasComercio?: string; // Nombre amigable (ej. "COOP" para "VIRUMAA")
  gastoFijoId?: string; // Gasto fijo asociado (ej. "fijo-comunidad" para "HARIDUSE TN 8 KÜ")
}

export type DiccionarioReglas = Record<string, string | ReglaMapeo>;

export interface ResultadoParserNotificacion {
  importe: number;
  tipo: 'gasto' | 'ingreso';
  comercio: string;
  categoriaId: string;
  categoriaSugerida: boolean;
  palabraClaveCoincidente?: string;
  rawText: string;
}

export interface NotificacionCruda {
  id: string;
  timestamp: string;
  texto: string;
  packageName?: string;
}

export interface OcrTextLine {
  text: string;
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
}

export interface OcrResultPayload {
  fullText: string;
  lines: OcrTextLine[];
  imageWidth?: number;
  imageHeight?: number;
}

export interface TransaccionImportada {
  id: string;
  incluir: boolean;
  comercio: string;
  monto: number;
  tipo: 'gasto' | 'ingreso';
  fechaHora: string; // ISO string
  categoriaId: string;
  esRedondeoSecundario: boolean;
  motivoDescarte?: string;
  coincidenciaDiccionario?: string;
  gastoFijoDetectado?: {
    id: string;
    nombre: string;
    monto: number;
    marcarPagado: boolean;
  };
  guardarEnDiccionario?: boolean;
}

export interface MovimientoHucha {
  id: string;
  fecha: string; // ISO string
  tipo: 'ingreso' | 'retirada';
  importe: number;
  concepto: string;
  ciclo?: string; // Formato "YYYY-MM" (ej. "2026-10")
  fechaDiaReferencia?: string; // "YYYY-MM-DD" del día cuyo sobrante se guardó
  esAutomatico?: boolean; // Marca si fue generado por el rollover automático nocturno
}

export interface EstadoHucha {
  saldo: number;
  historial: MovimientoHucha[];
  diasRolloverEjecutados?: string[]; // Fechas "YYYY-MM-DD" ya evaluadas al cierre del día
  autoRolloverHabilitado?: boolean; // Activar/desactivar guardado automático nocturno
}

export interface ComercioResumen {
  nombre: string;
  total: number;
  visitas: number;
}

export interface CategoriaResumenCierre {
  nombre: string;
  gastado: number;
  presupuesto: number;
  desviacion: number;
}

export interface CicloCerrado {
  id: string;
  mes: string; // "2026-10"
  etiquetaRango: string; // "10 Sep - 09 Oct 2026"
  fechaInicio: string; // ISO
  fechaFin: string; // ISO
  cerradoEn: string; // ISO
  ingresosTotales: number;
  gastosFijosTotales: number;
  gastoVariableTotal: number;
  ahorroObjetivo: number;
  ahorroRealConseguido: number;
  diasGastoCero: number;
  diasVerdes: number;
  topComercio?: ComercioResumen;
  categoriaMejor?: CategoriaResumenCierre;
  categoriaPeor?: CategoriaResumenCierre;
}

export type TabType = 'inicio' | 'analisis' | 'fijos' | 'ajustes';

export interface GastoDetectadoPayload {
  id: string;
  importe: number;
  comercio: string;
  categoriaId: string;
  categoriaNombre: string;
  rawText: string;
  packageName?: string;
  confirmado?: boolean;
}

declare global {
  interface Window {
    onBankNotificationReceived?: (
      title?: string,
      text?: string,
      packageName?: string
    ) => void;
    onKontoExpenseDetected?: (data: GastoDetectadoPayload) => void;
    onKontoNotificationConfirmed?: (txId: string) => void;
    onKontoOpenModifyCategory?: (txId: string) => void;
    onKontoBatchConfirmTransactions?: (txIds: string[]) => void;
    onPermissionStatusChecked?: (granted: boolean) => void;
    onOcrResult?: (data: OcrResultPayload) => void;
    onOcrError?: (error: string) => void;
    onKontoShortcutTriggered?: (action: string) => void;
    onKontoCheckRollover?: () => void;
    AndroidBridge?: {
      openNotificationSettings?: () => void;
      isNotificationAccessGranted?: () => boolean;
      isNotificationPermissionGranted?: () => boolean;
      recognizeTextFromBase64?: (base64Data: string) => void;
      shareBackup?: (jsonContent: string, fileName: string) => void;
      copyToClipboard?: (text: string) => void;
      downloadJsonFile?: (fileName: string, jsonContent: string) => void;
      requestIgnoreBatteryOptimizations?: () => void;
      openAppInfoSettings?: () => void;
      vibrate?: (ms: number) => void;
      syncCategoriesAndDictionary?: (categoriesJson: string, dictionaryJson: string) => void;
      showRolloverNotification?: (importe: number, diasTexto: string) => void;
    };
  }
}

