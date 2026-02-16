function parseQuantityValue(value){
  const raw = (value || '').toString().trim();
  if (!raw) return NaN;
  if (/^\d+(\.\d+)?$/.test(raw)) return parseFloat(raw);
  const simple = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (simple){
    const den = Number(simple[2]);
    return den ? Number(simple[1]) / den : NaN;
  }
  const mixed = raw.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed){
    const den = Number(mixed[3]);
    return den ? Number(mixed[1]) + (Number(mixed[2]) / den) : NaN;
  }
  return NaN;
}

function parseCurrencyValue(value){
  const clean = (value || '').toString().replace(/,/g, '').trim();
  if (clean === '') return NaN;
  const num = Number(clean);
  return Number.isFinite(num) ? num : NaN;
}

function formatCurrencyValue(value){
  if (!Number.isFinite(value)) return '';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeSchoolId(value){
  const digits = (value || '').toString().replace(/\D+/g, '');
  return digits.slice(0, 12);
}

function normalizeDateYMD(value){
  const raw = (value || '').toString().trim();
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function normalizeDateTimeISO(value){
  const raw = (value || '').toString().trim();
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function normalizeProfileKeyValue(value){
  return (value || '').toString().trim();
}

function escapeHTML(value){
  return (value ?? '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeICSKey(value){
  return (value || '').toString().trim().toLowerCase();
}
