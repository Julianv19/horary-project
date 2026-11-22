// Utilidad mínima para generar CSV compatible con Excel (es): separador ';'
// y BOM UTF-8 para que se vean bien los acentos.

export function campo(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function fila(valores) {
  return valores.map(campo).join(';');
}

// Une filas (arrays) en un documento CSV con BOM inicial.
export function documento(filas) {
  return '﻿' + filas.map((f) => (Array.isArray(f) ? fila(f) : f)).join('\r\n');
}

export default { campo, fila, documento };
