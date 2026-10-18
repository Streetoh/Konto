import type {
  OcrResultPayload,
  OcrTextLine,
  TransaccionImportada,
  DiccionarioReglas,
  GastoFijo,
  CategoriaVariable,
} from '../types';

/**
 * Palabras clave bancarias que identifican redondeos, huchas y transferencias
 * a cuentas secundarias de ahorro (ej. "Rahakoguja" en Swedbank).
 */
const KEYWORDS_REDONDEO = [
  'rahakoguja',
  'kogumispension',
  'microahorro',
  'redondeo',
  'hucha',
  'vault',
  'secondary',
  'saastukonto',
  'säästukonto',
  'oma konto',
  'rounding',
  'hucha virtual',
  'ahorro automatico',
  'ahorro automático',
  'traspaso propio',
  'cuenta ahorro',
  'cuenta secundaria',
];

/**
 * Normaliza texto eliminando acentos y espacios extra para comparaciones robustas.
 */
export function normalizarTexto(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Detecta si una transacción corresponde a un redondeo / microahorro hacia la cuenta secundaria.
 */
export function esRedondeoHaciaSecundaria(
  comercio: string,
  monto: number,
  nombreTitular?: string
): { esRedondeo: boolean; motivo?: string } {
  const normComercio = normalizarTexto(comercio);
  const normTitular = normalizarTexto(nombreTitular || 'daniel jesus requena gorrin');

  // 1. Coincidencia con palabras clave de hucha/redondeo bancario
  for (const kw of KEYWORDS_REDONDEO) {
    if (normComercio.includes(kw)) {
      return {
        esRedondeo: true,
        motivo: `Ahorro automático detectado ("${kw}")`,
      };
    }
  }

  // 2. Si coincide con el nombre completo del titular
  if (normTitular.length >= 3 && normComercio.includes(normTitular)) {
    return {
      esRedondeo: true,
      motivo: `Traspaso a cuenta secundaria (${nombreTitular || 'Titular'})`,
    };
  }

  // 3. Comprobar si contiene al menos 2 partes principales del nombre (ej. "daniel" y "requena")
  const partesTitular = normTitular.split(/\s+/).filter((p) => p.length >= 3);
  if (partesTitular.length >= 2) {
    const coincidencias = partesTitular.filter((p) => normComercio.includes(p)).length;
    if (coincidencias >= 2) {
      return {
        esRedondeo: true,
        motivo: `Traspaso a cuenta secundaria (${nombreTitular || 'Titular'})`,
      };
    }
  }

  // 4. Si el monto es un microgasto menor a 1.00 EUR (ej. -0.15, -0.42 EUR) y coincide con alguna parte
  if (monto > 0 && monto < 1.0) {
    const coincideCualquiera = partesTitular.some((p) => normComercio.includes(p));
    if (coincideCualquiera) {
      return {
        esRedondeo: true,
        motivo: `Microahorro (< 1 €) a cuenta secundaria`,
      };
    }
  }

  return { esRedondeo: false };
}

export interface ReglaCoincidente {
  categoriaId?: string;
  palabraClave?: string;
  aliasComercio?: string;
  gastoFijoId?: string;
}

/**
 * Busca si un comercio coincide con alguna regla del diccionario,
 * soportando tanto categorías como alias de nombre comercial y vinculación a gasto fijo.
 */
export function buscarReglaDiccionario(
  comercio: string,
  reglas: DiccionarioReglas
): ReglaCoincidente {
  const normComercio = normalizarTexto(comercio);
  const entries = Object.entries(reglas).sort((a, b) => b[0].length - a[0].length);

  for (const [palabraClave, val] of entries) {
    if (normComercio.includes(normalizarTexto(palabraClave))) {
      if (typeof val === 'string') {
        return { categoriaId: val, palabraClave };
      } else if (val && typeof val === 'object') {
        return {
          categoriaId: val.categoriaId,
          palabraClave,
          aliasComercio: val.aliasComercio,
          gastoFijoId: val.gastoFijoId,
        };
      }
    }
  }
  return {};
}

/**
 * Busca si un comercio coincide con alguno de los gastos fijos mensuales configurados.
 */
export function buscarGastoFijoCoincidente(
  comercio: string,
  gastosFijos: GastoFijo[]
): GastoFijo | undefined {
  const normComercio = normalizarTexto(comercio);
  return gastosFijos.find((fijo) => {
    const normFijo = normalizarTexto(fijo.nombre);
    if (!normFijo || normFijo.length < 3) return false;
    return normComercio.includes(normFijo) || normFijo.includes(normComercio);
  });
}

/**
 * Normaliza y formatea una cadena de fecha bancaria a ISO 8601.
 * Entrada soportada: "16.10.2026 17:28", "16.10.2026, 17:28", "16/10/2026 17:28", etc.
 */
export function extraerFechaHoraBancaria(texto: string): string {
  const ahora = new Date();
  const yearActual = ahora.getFullYear();

  // Caso: DD.MM.YYYY o DD/MM/YYYY con hora opcional
  const matchCompleto = texto.match(
    /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:[,\s]+(\d{1,2}):(\d{2}))?/
  );
  if (matchCompleto) {
    const dia = parseInt(matchCompleto[1], 10);
    const mes = parseInt(matchCompleto[2], 10) - 1;
    let anio = parseInt(matchCompleto[3], 10);
    if (anio < 100) anio += 2000;
    const hora = matchCompleto[4] ? parseInt(matchCompleto[4], 10) : 12;
    const min = matchCompleto[5] ? parseInt(matchCompleto[5], 10) : 0;
    const d = new Date(anio, mes, dia, hora, min, 0);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Caso: DD.MM con hora (sin año explícito)
  const matchDiaMes = texto.match(/(\d{1,2})[./-](\d{1,2})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
  if (matchDiaMes) {
    const dia = parseInt(matchDiaMes[1], 10);
    const mes = parseInt(matchDiaMes[2], 10) - 1;
    const hora = matchDiaMes[3] ? parseInt(matchDiaMes[3], 10) : 12;
    const min = matchDiaMes[4] ? parseInt(matchDiaMes[4], 10) : 0;
    const d = new Date(yearActual, mes, dia, hora, min, 0);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return ahora.toISOString();
}

/**
 * Reconstruye y alinea las líneas del extracto bancario.
 * Si provienen de Google ML Kit (con coordenadas espaciales), agrupa elementos de la misma altura horizontal.
 * Además, ignora completamente el indicador "Reserved".
 */
export function normalizarLineasExtracto(
  payload: OcrResultPayload | string
): string[] {
  // Limpieza previa del texto "Reserved" (solicitud explícita del usuario)
  const limpiarTextoReserved = (txt: string) =>
    txt.replace(/\bReserved\b/gi, '').trim();

  // Si es texto plano
  if (typeof payload === 'string') {
    return payload
      .split('\n')
      .map(limpiarTextoReserved)
      .filter((l) => l.length > 0 && !/^reserved$/i.test(l));
  }

  const rawLines = payload.lines || [];
  const conCoord = rawLines.filter(
    (l) => l.top !== undefined && l.left !== undefined && l.height !== undefined
  );

  if (conCoord.length >= 3) {
    // 1. Descartar líneas vacías o que solo contengan 'Reserved'
    const filtradas = conCoord.filter(
      (l) => !/^\s*reserved\s*$/i.test(l.text) && l.text.trim().length > 0
    );

    // 2. Ordenar verticalmente de arriba hacia abajo
    const ordenadas = [...filtradas].sort((a, b) => (a.top || 0) - (b.top || 0));

    // 3. Agrupar líneas que están en la misma franja horizontal (misma altura Y)
    interface FilaHorizontal {
      topPromedio: number;
      items: OcrTextLine[];
    }
    const filas: FilaHorizontal[] = [];

    for (const item of ordenadas) {
      const h = item.height || 26;
      const filaExistente = filas.find(
        (f) => Math.abs(f.topPromedio - (item.top || 0)) <= h * 0.65
      );

      if (filaExistente) {
        filaExistente.items.push(item);
        filaExistente.topPromedio = (filaExistente.topPromedio + (item.top || 0)) / 2;
      } else {
        filas.push({
          topPromedio: item.top || 0,
          items: [item],
        });
      }
    }

    // 4. En cada fila, ordenar de izquierda a derecha y unificar
    return filas
      .map((f) => {
        f.items.sort((a, b) => (a.left || 0) - (b.left || 0));
        return f.items
          .map((it) => limpiarTextoReserved(it.text))
          .filter((t) => t.length > 0)
          .join(' ');
      })
      .filter((l) => l.length > 0);
  }

  // Fallback sin coordenadas espaciales
  return rawLines
    .map((l) => limpiarTextoReserved(l.text))
    .filter((l) => l.length > 0 && !/^reserved$/i.test(l));
}

/**
 * Parsea el extracto bancario de Swedbank a partir del payload OCR o texto.
 * Estructura de la captura:
 *  - Izquierda: Nombre de la empresa (rojo en captura, puede tener 1 o 2 líneas)
 *  - Derecha: Cantidad pagada o recibida (verde en captura, ej: "-27.85 EUR")
 *  - Izquierda abajo: Fecha y hora en formato DD.MM.YYYY HH:mm (azul en captura)
 *  - Derecha abajo: "Reserved" (naranja en captura, ignorado completamente)
 */
export function parsearCapturaExtracto(
  payload: OcrResultPayload | string,
  reglas: DiccionarioReglas,
  gastosFijos: GastoFijo[],
  categorias: CategoriaVariable[],
  nombreTitular?: string
): TransaccionImportada[] {
  const lineas = normalizarLineasExtracto(payload);
  const defaultCategoriaId = categorias[0]?.id || 'cat-compras';

  // Regex para importe monetario: requiere EUR / € O signo explícito (+ o -) con decimales
  const amountRegex = /([−\-–+]\s*\d+(?:[.,]\d{1,2})?)\s*(?:EUR|€)?|(\d+(?:[.,]\d{1,2})?)\s*(?:EUR|€)/i;

  // Regex para fecha: DD.MM.YYYY o DD/MM/YYYY con hora
  const dateRegex = /(\d{1,2}[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?)/;

  const resultados: TransaccionImportada[] = [];

  interface TransaccionEnConstruccion {
    empresaPartes: string[];
    monto: number;
    tipo: 'gasto' | 'ingreso';
    fechaIso: string;
  }

  let txActual: TransaccionEnConstruccion | null = null;

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    // 1. Detectar si la línea es una Fecha (ej. "16.10.2026 17:28")
    // IMPORTANTE: Aseguramos que no contenga EUR/€ para no confundir importes
    const matchFecha = linea.match(dateRegex);
    const esLineaFecha = matchFecha && !linea.includes('EUR') && !linea.includes('€');

    if (esLineaFecha) {
      if (txActual) {
        txActual.fechaIso = extraerFechaHoraBancaria(matchFecha[0]);
        resultados.push(
          crearItemTransaccionImportada(
            txActual.empresaPartes.join(' '),
            txActual.monto,
            txActual.tipo,
            txActual.fechaIso,
            reglas,
            gastosFijos,
            defaultCategoriaId,
            nombreTitular
          )
        );
        txActual = null;
      }
      continue;
    }

    // 2. Detectar si la línea contiene un Importe Monetario (ej. "JOHVI MAKSIMARKET IDA-VIRUMAA -27.85 EUR" o "-1.74 EUR")
    const matchMonto = linea.match(amountRegex);
    if (matchMonto) {
      // Si ya teníamos una transacción previa pendiente de cerrar, cerrarla ahora
      if (txActual) {
        resultados.push(
          crearItemTransaccionImportada(
            txActual.empresaPartes.join(' '),
            txActual.monto,
            txActual.tipo,
            txActual.fechaIso,
            reglas,
            gastosFijos,
            defaultCategoriaId,
            nombreTitular
          )
        );
      }

      const matchTexto = matchMonto[0];
      const esIngreso = matchTexto.includes('+');
      const numLimpio = matchTexto.replace(/[^\d.,]/g, '').replace(',', '.');
      const numVal = parseFloat(numLimpio);

      // El nombre de la empresa en la misma línea es todo lo que queda al quitar el importe
      const parteNombre = linea.replace(matchTexto, '').trim();

      txActual = {
        empresaPartes: parteNombre ? [parteNombre] : [],
        monto: isNaN(numVal) ? 0 : Math.abs(numVal),
        tipo: esIngreso ? 'ingreso' : 'gasto',
        fechaIso: new Date().toISOString(),
      };
    } else if (txActual) {
      // 3. Línea intermedia de la empresa (ej. "000EE" o "LUXEMBOURG" que envuelven en 2 líneas)
      if (linea.length > 0) {
        txActual.empresaPartes.push(linea);
      }
    }
  }

  // Guardar última transacción si quedó abierta
  if (txActual) {
    resultados.push(
      crearItemTransaccionImportada(
        txActual.empresaPartes.join(' '),
        txActual.monto,
        txActual.tipo,
        txActual.fechaIso,
        reglas,
        gastosFijos,
        defaultCategoriaId,
        nombreTitular
      )
    );
  }

  return resultados;
}

/**
 * Crea el objeto final TransaccionImportada con todas sus propiedades evaluadas.
 */
function crearItemTransaccionImportada(
  comercioRaw: string,
  monto: number,
  tipo: 'gasto' | 'ingreso',
  fechaHora: string,
  reglas: DiccionarioReglas,
  gastosFijos: GastoFijo[],
  defaultCategoriaId: string,
  nombreTitular?: string
): TransaccionImportada {
  const comercio = limpiarNombreComercio(comercioRaw);

  // 1. Detección de redondeo a cuenta secundaria
  const redondeoInfo = esRedondeoHaciaSecundaria(comercio, monto, nombreTitular);

  // 2. Coincidencia con Diccionario (incluyendo alias y enlace a gasto fijo)
  const reglaDiccionario = buscarReglaDiccionario(comercio, reglas);

  // Si la regla tiene un alias comercial (ej. "VIRUMAA" -> "COOP"), usarlo como nombre visible
  const comercioFinal = reglaDiccionario.aliasComercio || comercio;

  // 3. Coincidencia con Gastos Fijos (por regla explícita en diccionario o por coincidencia de nombre)
  let gastoFijo: GastoFijo | undefined;
  if (reglaDiccionario.gastoFijoId) {
    gastoFijo = gastosFijos.find((f) => f.id === reglaDiccionario.gastoFijoId);
  }
  if (!gastoFijo) {
    gastoFijo =
      buscarGastoFijoCoincidente(comercioFinal, gastosFijos) ||
      buscarGastoFijoCoincidente(comercio, gastosFijos);
  }

  const id = `import_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Por defecto, si es un redondeo a cuenta secundaria, se descarta (incluir = false)
  const incluir = !redondeoInfo.esRedondeo;

  return {
    id,
    incluir,
    comercio: comercioFinal,
    monto,
    tipo,
    fechaHora,
    categoriaId: reglaDiccionario.categoriaId || defaultCategoriaId,
    esRedondeoSecundario: redondeoInfo.esRedondeo,
    motivoDescarte: redondeoInfo.motivo,
    coincidenciaDiccionario: reglaDiccionario.palabraClave,
    gastoFijoDetectado: gastoFijo
      ? {
          id: gastoFijo.id,
          nombre: gastoFijo.nombre,
          monto: gastoFijo.importeTotal,
          marcarPagado: true,
        }
      : undefined,
    guardarEnDiccionario: false,
  };
}

/**
 * Limpia nombres de comercios eliminando sufijos bancarios irrelevantes o caracteres residuales.
 */
function limpiarNombreComercio(nombre: string): string {
  let limpio = nombre
    .replace(/\bReserved\b/gi, '')
    .replace(/^[\s\-–•*]+/, '')
    .replace(/[\s\-–•*]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Si tiene prefijos comunes
  limpio = limpio
    .replace(/^(compra con tarjeta|pago con tarjeta|card payment|purchase at|pos purchase)\s*:\s*/i, '')
    .trim();

  return limpio || 'Movimiento bancario';
}

/**
 * Utilidad para comprimir y redimensionar una imagen antes de enviarla al reconocedor OCR
 * (optimiza velocidad y consumo de memoria a menos de 400KB).
 */
export async function redimensionarImagenParaOcr(
  fileOrBlob: Blob,
  maxDimension = 1400
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Calidad 0.92 para nitidez óptima de texto y números
        const base64 = canvas.toDataURL('image/jpeg', 0.92);
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}
