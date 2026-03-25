// utils.js — Shared utility functions
/* globals: getVal, getRadio, formatNumber, toggleVisible, toProperCase, formatIdNumber, toTitleCase */

function getVal(id) {
  return (document.getElementById(id)?.value || '').trim();
}

function getRadio(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || '';
}

// Format a number string with thousand separators, preserving decimals
function formatNumber(val) {
  if (!val) return val;
  // Remove existing commas/spaces to normalise
  const cleaned = val.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return val; // not a number, return as-is
  // Format with thousand separators and up to 2 decimal places
  return num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toggleVisible(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('visible', show);
}

function toProperCase(str) {
  if (!str) return str;
  return str.toLowerCase().replace(/(?:^|\s|,\s*)\S/g, c => c.toUpperCase())
            .replace(/\bPo\b/gi, 'PO').replace(/\bP\.o\./gi, 'P.O.');
}

// ── ID NUMBER FORMATTING (SA: 000000 0000 00 0) ──
function formatIdNumber(el) {
  const raw = el.value.replace(/\s/g, '');
  if (!/^\d*$/.test(raw)) { el.value = raw.replace(/\D/g, ''); return; }
  let formatted = '';
  for (let i = 0; i < raw.length && i < 13; i++) {
    if (i === 6 || i === 10 || i === 12) formatted += ' ';
    formatted += raw[i];
  }
  const cursor = el.selectionStart;
  el.value = formatted;
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}
