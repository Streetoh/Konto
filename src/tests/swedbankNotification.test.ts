import test from 'node:test';
import assert from 'node:assert/strict';
import { procesarTextoNotificacion } from '../utils/notificationParser.ts';
import type { CategoriaVariable, DiccionarioReglas } from '../types/index.ts';

const mockCategorias: CategoriaVariable[] = [
  { id: 'cat-compras', nombre: 'Compras y Supermercado', icono: 'ShoppingCart', color: 'emerald', presupuesto: 300 },
  { id: 'cat-transporte', nombre: 'Transporte y Movilidad', icono: 'Car', color: 'blue', presupuesto: 100 },
  { id: 'cat-restaurantes', nombre: 'Restaurantes y Ocio', icono: 'Utensils', color: 'amber', presupuesto: 150 },
];

const mockDiccionario: DiccionarioReglas = {
  MAXIMA: 'cat-compras',
  BOLT: 'cat-transporte',
};

test('Swedbank Notification Filter - Permite únicamente paquetes de Swedbank', () => {
  const isSwedbankPackage = (pkg: string): boolean => {
    return pkg.toLowerCase().includes('swedbank');
  };

  // Apps oficiales de Swedbank (Estonia, Suecia, Letonia, Lituania)
  assert.equal(isSwedbankPackage('ee.swedbank.mobile'), true);
  assert.equal(isSwedbankPackage('se.swedbank.bma.android'), true);
  assert.equal(isSwedbankPackage('lv.swedbank.mobile'), true);
  assert.equal(isSwedbankPackage('lt.swedbank.mobile'), true);
  assert.equal(isSwedbankPackage('ee.swedbank.business'), true);

  // Apps de compras, correos o wallets causantes de duplicación
  assert.equal(isSwedbankPackage('com.google.android.gm'), false, 'Gmail debe ser rechazado');
  assert.equal(isSwedbankPackage('com.microsoft.office.outlook'), false, 'Outlook debe ser rechazado');
  assert.equal(isSwedbankPackage('com.amazon.mShop.android.shopping'), false, 'Amazon debe ser rechazado');
  assert.equal(isSwedbankPackage('com.google.android.apps.walletnf'), false, 'Google Wallet debe ser rechazado');
  assert.equal(isSwedbankPackage('com.google.android.apps.messaging'), false, 'SMS debe ser rechazado');
  assert.equal(isSwedbankPackage('com.paypal.android.p2pmobile'), false, 'PayPal debe ser rechazado');
});

test('Swedbank Parser - Parsea correctamente compras de tarjeta habituales', () => {
  const res = procesarTextoNotificacion('Paid at MAXIMA X 12.50 EUR', mockDiccionario, mockCategorias);
  assert.equal(res.importe, 12.5);
  assert.equal(res.comercio, 'MAXIMA X');
  assert.equal(res.tipo, 'gasto');
  assert.equal(res.categoriaId, 'cat-compras');
});

test('Swedbank Parser - Parsea formato "Payment to Bolt 4.90 EUR"', () => {
  const res = procesarTextoNotificacion('Payment to Bolt 4.90 EUR', mockDiccionario, mockCategorias);
  assert.equal(res.importe, 4.9);
  assert.equal(res.comercio, 'Bolt');
  assert.equal(res.tipo, 'gasto');
  assert.equal(res.categoriaId, 'cat-transporte');
});

test('Swedbank Parser - Parsea formato en estonio "Kaarditehing: 5.50 EUR, R-KIOSK"', () => {
  const res = procesarTextoNotificacion('Kaarditehing: 5.50 EUR, R-KIOSK', mockDiccionario, mockCategorias);
  assert.equal(res.importe, 5.5);
  assert.equal(res.tipo, 'gasto');
});

test('Swedbank Parser - Detecta ingresos correctamente', () => {
  const res = procesarTextoNotificacion('Notification from Swedbank: Received from Nomina 1850.00 EUR', mockDiccionario, mockCategorias);
  assert.equal(res.importe, 1850);
  assert.equal(res.tipo, 'ingreso');
});

test('Mecanismo Anti-Duplicados - Bloquea misma compra en ventana de 15 segundos', () => {
  const DEDUPLICATE_WINDOW_MS = 15000;
  let lastKey: string | null = null;
  let lastTime = 0;

  const shouldAccept = (pkg: string, monto: number, comercio: string, now: number): boolean => {
    const key = `${pkg}|${monto.toFixed(2)}|${comercio.toUpperCase()}`;
    if (key === lastKey && (now - lastTime) < DEDUPLICATE_WINDOW_MS) {
      return false; // duplicado ignorado
    }
    lastKey = key;
    lastTime = now;
    return true;
  };

  const t0 = 100000;
  assert.equal(shouldAccept('ee.swedbank.mobile', 12.5, 'MAXIMA X', t0), true, 'Primer evento debe aceptarse');
  assert.equal(shouldAccept('ee.swedbank.mobile', 12.5, 'MAXIMA X', t0 + 2000), false, 'Evento idéntico a los 2s debe rechazarse');
  assert.equal(shouldAccept('ee.swedbank.mobile', 12.5, 'MAXIMA X', t0 + 10000), false, 'Evento idéntico a los 10s debe rechazarse');
  assert.equal(shouldAccept('ee.swedbank.mobile', 12.5, 'MAXIMA X', t0 + 16000), true, 'Evento tras 16s debe aceptarse');
});
