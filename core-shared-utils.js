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

function normalizeDateFormatPreference(value){
  const raw = (value || '').toString().trim().toLowerCase();
  const supported = ['yyyy-mm-dd', 'mm/dd/yyyy', 'dd/mm/yyyy', 'mmm-dd-yyyy'];
  return supported.includes(raw) ? raw : 'yyyy-mm-dd';
}

function getDateFormatPreference(){
  const preferred = (typeof currentUser !== 'undefined' && currentUser?.preferences?.dateFormat)
    ? currentUser.preferences.dateFormat
    : '';
  return normalizeDateFormatPreference(preferred);
}

function parseDateDisplayValue(value){
  if (value instanceof Date){
    return Number.isFinite(value.getTime()) ? new Date(value.getTime()) : null;
  }
  const raw = (value || '').toString().trim();
  if (!raw) return null;
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd){
    const year = Number(ymd[1]);
    const month = Number(ymd[2]) - 1;
    const day = Number(ymd[3]);
    const parsedYmd = new Date(year, month, day);
    if (Number.isFinite(parsedYmd.getTime())) return parsedYmd;
  }
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatDateForDisplay(value, fallback = '-'){
  const raw = (value ?? '').toString().trim();
  if (!raw && !(value instanceof Date)) return fallback;
  const parsed = parseDateDisplayValue(value);
  if (!parsed){
    const normalized = normalizeDateYMD(raw);
    return normalized || raw || fallback;
  }
  const year = String(parsed.getFullYear());
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const mode = getDateFormatPreference();
  if (mode === 'mm/dd/yyyy') return `${month}/${day}/${year}`;
  if (mode === 'dd/mm/yyyy') return `${day}/${month}/${year}`;
  if (mode === 'mmm-dd-yyyy'){
    return parsed.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
  }
  return `${year}-${month}-${day}`;
}

function formatDateTimeForDisplay(value, fallback = '-'){
  const raw = (value ?? '').toString().trim();
  if (!raw && !(value instanceof Date)) return fallback;
  const parsed = parseDateDisplayValue(value);
  if (!parsed) return raw || fallback;
  const datePart = formatDateForDisplay(parsed, fallback);
  const timePart = parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} ${timePart}`;
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
