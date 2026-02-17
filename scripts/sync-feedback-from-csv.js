const fs = require('node:fs');
const path = require('node:path');

const CONFIG_PATH = path.join(process.cwd(), 'feedback', 'google-form.config.json');
const OUTPUT_PATH = path.join(process.cwd(), 'feedback', 'feedback.json');

function parseCsv(text){
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1){
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes){
      if (ch === '"' && next === '"'){
        cell += '"';
        i += 1;
      } else if (ch === '"'){
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"'){
      inQuotes = true;
      continue;
    }
    if (ch === ','){
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\n'){
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (ch === '\r'){
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((v) => (v || '').trim() !== '')){
    rows.push(row);
  }
  return rows;
}

function getValue(record, key){
  const raw = record?.[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

async function main(){
  if (!fs.existsSync(CONFIG_PATH)){
    throw new Error(`Missing config file: ${CONFIG_PATH}`);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const csvUrl = String(config?.csvUrl || '').trim();
  if (!csvUrl || csvUrl.includes('PASTE_YOUR_GOOGLE_SHEET_CSV_URL_HERE')){
    throw new Error('feedback/google-form.config.json is not configured. Set csvUrl to a published Google Sheet CSV URL.');
  }

  const response = await fetch(csvUrl, { cache: 'no-store' });
  if (!response.ok){
    throw new Error(`Failed to fetch CSV (${response.status}) from ${csvUrl}`);
  }
  const csvText = await response.text();
  const rows = parseCsv(csvText);
  if (!rows.length){
    throw new Error('CSV feed is empty.');
  }

  const headers = rows[0].map((h) => String(h || '').trim());
  const map = config?.fieldMap || {};
  const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c || '').trim() !== ''));
  const maxItems = Number.isFinite(Number(config?.maxItems)) ? Number(config.maxItems) : 500;

  const items = dataRows.map((cells, idx) => {
    const record = {};
    headers.forEach((h, i) => {
      record[h] = String(cells[i] || '').trim();
    });
    return {
      id: idx + 1,
      timestamp: getValue(record, map.timestamp),
      category: getValue(record, map.category),
      summary: getValue(record, map.summary),
      details: getValue(record, map.details),
      app_version: getValue(record, map.app_version),
      browser: getValue(record, map.browser),
      contact: getValue(record, map.contact)
    };
  }).reverse().slice(0, maxItems);

  const payload = {
    generated_at: new Date().toISOString(),
    source: String(config?.source || 'google_form_csv'),
    csv_url: csvUrl,
    count: items.length,
    items
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  process.stdout.write(`Synced ${items.length} feedback item(s)\n`);
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
