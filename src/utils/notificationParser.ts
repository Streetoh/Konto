import type {
  CategoriaVariable,
  DiccionarioReglas,
  ResultadoParserNotificacion,
} from '../types';

/**
 * Parser inteligente de notificaciones bancarias ajustado con alta precisión para Swedbank y bancos españoles
 */
export const procesarTextoNotificacion = (
  textoRaw: string,
  diccionario: DiccionarioReglas,
  categorias: CategoriaVariable[]
): ResultadoParserNotificacion => {
  let texto = textoRaw.trim();

  // 1. Limpieza de prefijos habituales de Swedbank y aplicaciones bancarias
  const prefijosBancarios = [
    /^notification from swedbank[:.]?\s*/i,
    /^swedbank notification[:.]?\s*/i,
    /^swedbank[:.]?\s*/i,
    /^notificación de tu banco[:.]?\s*/i,
    /^aviso bancario[:.]?\s*/i,
    /^banco[:.]?\s*/i,
  ];

  for (const prefijo of prefijosBancarios) {
    texto = texto.replace(prefijo, '').trim();
  }

  const lower = texto.toLowerCase();

  // 2. Detección de Tipo ('ingreso' vs 'gasto')
  const patronesIngreso = [
    'received from',
    'received',
    'credited with',
    'credited',
    'laekumine',
    'recibido',
    'recibida',
    'ingreso',
    'abono',
    'nomina',
    'nómina',
    'salary',
    'transferencia a tu favor',
  ];

  const esIngreso =
    patronesIngreso.some((p) => lower.includes(p)) ||
    (texto.includes('+') && !lower.includes('paid') && !lower.includes('pago') && !lower.includes('compra'));

  const tipo: 'gasto' | 'ingreso' = esIngreso ? 'ingreso' : 'gasto';

  // 3. Extracción de Importe Numérico
  // Soporta formatos: "14.80 EUR", "14,80 EUR", "14.80€", "1500.00 EUR", "$25.00", "24.50"
  let importe = 0;
  let matchImporteTexto = '';

  const regexImporteConMoneda =
    /(?:[+-])?\s*(?:EUR|€|\$)?\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:EUR|€|\$)/i;
  const match1 = texto.match(regexImporteConMoneda);

  if (match1 && match1[1]) {
    matchImporteTexto = match1[0];
    const normalizado = match1[1].replace(',', '.');
    importe = Math.abs(parseFloat(normalizado)) || 0;
  } else {
    // Buscar cualquier número con 2 decimales
    const regexNumero = /(?:[+-])?\s*(\d{1,6}[.,]\d{2})/i;
    const match2 = texto.match(regexNumero);
    if (match2 && match2[1]) {
      matchImporteTexto = match2[0];
      const normalizado = match2[1].replace(',', '.');
      importe = Math.abs(parseFloat(normalizado)) || 0;
    } else {
      // Fallback a número entero
      const regexEntero = /(\d{1,6})/i;
      const match3 = texto.match(regexEntero);
      if (match3 && match3[1]) {
        matchImporteTexto = match3[0];
        importe = Math.abs(parseFloat(match3[1])) || 0;
      }
    }
  }

  // 4. Extracción de Nombre del Comercio con reglas prioritarias Swedbank
  let comercioExtraido = '';

  // Conectores que introducen directamente el comercio/destinatario:
  // "paid at", "paid to", "received from", "credited with ... from", "payment of ... to", "en ", "from "
  const patronesConectores = [
    /(?:paid at|makstud kohas)\s+(.+)$/i,
    /(?:paid to|makse saajale|payment to)\s+(.+)$/i,
    /(?:payment of [^,.]+ to)\s+(.+)$/i,
    /(?:received from|saadud saatjalt)\s+(.+)$/i,
    /(?:credited with [^,.]+ from)\s+(.+)$/i,
    /(?:\bfrom\b)\s+(.+)$/i,
    /(?:\ben\b)\s+(.+)$/i,
    /(?:\bto\b)\s+(.+)$/i,
    /(?:pago con tarjeta en|compra en)\s+(.+)$/i,
  ];

  for (const patron of patronesConectores) {
    const match = texto.match(patron);
    if (match && match[1]) {
      comercioExtraido = match[1].trim();
      break;
    }
  }

  // Si no coincidió con ningún conector específico, usar la limpieza general
  if (!comercioExtraido) {
    let fallback = texto;
    if (matchImporteTexto) {
      fallback = fallback.replace(matchImporteTexto, ' ');
    }

    const palabrasABorrar = [
      /notification from swedbank[:.]?/gi,
      /swedbank[:.]?/gi,
      /pago con tarjeta de/gi,
      /compra con tarjeta de/gi,
      /pago con tarjeta/gi,
      /compra con tarjeta/gi,
      /uus kaardimakse[:.]?/gi,
      /kaarditehing[:.]?/gi,
      /teade: laekumine/gi,
      /transferencia recibida/gi,
      /card payment/gi,
      /payment of/gi,
      /paid at/gi,
      /paid to/gi,
      /purchase at/gi,
      /received from/gi,
      /account credited with/gi,
      /\bEUR\b/gi,
      /€/g,
      /\$/g,
    ];

    for (const regex of palabrasABorrar) {
      fallback = fallback.replace(regex, ' ');
    }
    comercioExtraido = fallback;
  }

  // Limpieza fina de comillas dobles/simples, puntos finales y espacios
  let comercioLimpio = comercioExtraido
    .replace(/^["'«»“‘]+|["'«»”’]+$/g, '') // comillas al inicio o final
    .replace(/^[\s,.:;_\-+/()]+|[\s,.:;_\-+/()]+$/g, '') // puntuación en extremos
    .replace(/["'«»“”]/g, '') // cualquier comilla interna suelta
    .replace(/\s+/g, ' ')
    .trim();

  // Si tras la limpieza quedó vacío
  if (!comercioLimpio) {
    comercioLimpio = tipo === 'ingreso' ? 'Ingreso Bancario' : 'Comercio Swedbank';
  }

  // 5. Coincidencia con el Diccionario Inteligente (Mayúsculas)
  const textoParaBuscar = `${comercioLimpio} ${textoRaw}`.toUpperCase();
  let categoriaIdEncontrada: string | undefined;
  let palabraClaveCoincidente: string | undefined;

  // Buscar claves ordenadas por longitud descendente para que "CIRCLE K" coincida antes que "K"
  const clavesOrdenadas = Object.keys(diccionario).sort(
    (a, b) => b.length - a.length
  );

  for (const clave of clavesOrdenadas) {
    const claveUpper = clave.trim().toUpperCase();
    if (!claveUpper) continue;

    if (textoParaBuscar.includes(claveUpper)) {
      const val = diccionario[clave];
      if (typeof val === 'string') {
        categoriaIdEncontrada = val;
      } else if (val && typeof val === 'object') {
        categoriaIdEncontrada = val.categoriaId;
        if (val.aliasComercio) {
          comercioLimpio = val.aliasComercio;
        }
      }
      palabraClaveCoincidente = claveUpper;
      break;
    }
  }

  // Categoría por defecto si no se encontró en diccionario
  const categoriaDefault =
    categorias.find((c) => c.id === 'cat-compras') ||
    categorias[categorias.length - 1] ||
    categorias[0];

  const categoriaFinal = categoriaIdEncontrada || categoriaDefault.id;
  const categoriaSugerida = Boolean(categoriaIdEncontrada);

  return {
    importe,
    tipo,
    comercio: comercioLimpio,
    categoriaId: categoriaFinal,
    categoriaSugerida,
    palabraClaveCoincidente,
    rawText: textoRaw,
  };
};

/**
 * Normaliza y extrae la palabra clave principal de un comercio para autoaprendizaje
 */
export const extraerPalabraClaveParaAprender = (nombreComercio: string): string => {
  const partes = nombreComercio
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2);

  if (partes.length >= 2) {
    return `${partes[0]} ${partes[1]}`;
  }
  return partes[0] || nombreComercio.toUpperCase().trim();
};
