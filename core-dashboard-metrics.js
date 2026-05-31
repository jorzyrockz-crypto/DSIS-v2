function recordHasMissingData(record){
  if (!record) return false;
  if (!(record.fund || '').trim()) return true;
  if (!(record.signatories?.issuedBy?.name || '').trim() || !(record.signatories?.receivedBy?.name || '').trim()) return true;
  const items = Array.isArray(record.items) ? record.items : [];
  if (!items.length) return true;
  return items.some((it) => {
    const desc = (it.desc || '').toString().trim();
    const itemNo = (it.itemNo || '').toString().trim();
    const unit = (it.unit || '').toString().trim();
    const qty = (it.qtyText ?? it.qty ?? '').toString().trim();
    return !desc || !itemNo || !unit || !qty;
  });
}

function renderDashboardStatusBars(rows){
  const host = document.getElementById('dashStatusBars');
  if (!host) return;
  const max = Math.max(1, ...rows.map((r) => r.value || 0));
  host.innerHTML = rows.map((r) => {
    const pct = Math.max(4, Math.round(((r.value || 0) / max) * 100));
    return `<div class="dash-bar-row"><span class="dash-bar-label">${escapeHTML(r.label)}</span><span class="dash-bar-track"><span class="dash-bar-fill ${escapeHTML(r.tone)}" style="width:${pct}%"></span></span><span class="dash-bar-val">${r.value}</span></div>`;
  }).join('');
}

function parseDashboardDate(value){
  const parsed = new Date((value || '').toString());
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function toDashboardNumber(value){
  const n = Number((value ?? '').toString().trim());
  return Number.isFinite(n) ? n : 0;
}

function endOfQuarterFrom(date){
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
}

function buildDashboardQuarterBuckets(count = 4){
  const safeCount = Math.max(2, Number(count) || 4);
  const now = new Date();
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
  const buckets = [];
  for (let i = safeCount - 1; i >= 0; i--){
    const start = new Date(quarterStart.getFullYear(), quarterStart.getMonth() - (i * 3), 1);
    buckets.push({
      start,
      end: endOfQuarterFrom(start)
    });
  }
  return buckets;
}

function formatQuarterLabel(dateValue){
  const date = dateValue instanceof Date ? dateValue : parseDashboardDate(dateValue);
  if (!date) return 'previous quarter';
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

function getQuarterComparisonLabels(referenceDate = new Date()){
  const base = referenceDate instanceof Date ? referenceDate : parseDashboardDate(referenceDate) || new Date();
  const quarterStartMonth = Math.floor(base.getMonth() / 3) * 3;
  const currentQuarterStart = new Date(base.getFullYear(), quarterStartMonth, 1);
  const previousQuarterStart = new Date(currentQuarterStart.getFullYear(), currentQuarterStart.getMonth() - 3, 1);
  return {
    current: formatQuarterLabel(currentQuarterStart),
    previous: formatQuarterLabel(previousQuarterStart)
  };
}

function monthsUntilAtDate(targetDate, referenceDate){
  const target = targetDate instanceof Date ? targetDate : parseDashboardDate(targetDate);
  const reference = referenceDate instanceof Date ? referenceDate : parseDashboardDate(referenceDate);
  if (!target || !reference) return null;
  const yearDiff = target.getFullYear() - reference.getFullYear();
  const monthDiff = target.getMonth() - reference.getMonth();
  const dayAdj = target.getDate() < reference.getDate() ? -1 : 0;
  return (yearDiff * 12) + monthDiff + dayAdj;
}

function classifyEULItemAtDate(record, item, referenceDate){
  const issued = parseDashboardDate(record?.issuedDate || '');
  const eulYears = Number((item?.eul ?? '').toString().trim());
  if (!issued || !Number.isFinite(eulYears) || eulYears <= 0) return 'ok';
  const expiry = new Date(issued);
  expiry.setFullYear(expiry.getFullYear() + eulYears);
  const monthsLeft = monthsUntilAtDate(expiry, referenceDate);
  if (monthsLeft === null) return 'ok';
  if (monthsLeft < 0) return 'past';
  if (monthsLeft <= 3) return 'near';
  return 'ok';
}

function resolveRecordCreatedAtMs(record){
  const candidateValues = [];
  if (typeof normalizeRecordLineage === 'function'){
    const lineage = normalizeRecordLineage(record?._lineage || record?.lineage);
    const versions = Array.isArray(lineage?.versions) ? lineage.versions : [];
    versions.forEach((version) => {
      if (version?.at) candidateValues.push(version.at);
    });
  }
  candidateValues.push(record?._statusMeta?.at);
  candidateValues.push(record?.createdAt);
  candidateValues.push(record?.issuedDate);

  let earliestMs = Number.POSITIVE_INFINITY;
  candidateValues.forEach((value) => {
    const parsed = parseDashboardDate(value);
    if (!parsed) return;
    earliestMs = Math.min(earliestMs, parsed.getTime());
  });
  return Number.isFinite(earliestMs) ? earliestMs : Date.now();
}

function resolveSupplyHistoryContext(suppliesRecords){
  const normalizeStockNo = (value) => (value || '').toString().trim().toLowerCase();
  const rows = Array.isArray(suppliesRecords) ? suppliesRecords : [];
  let historyMapRaw = {};
  try {
    const parsed = loadLocalJSON('icsSuppliesHistoryByStockNo', {});
    historyMapRaw = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    historyMapRaw = {};
  }
  const timelineByStock = {};
  const createdAtByStock = {};

  rows.forEach((row) => {
    const key = normalizeStockNo(row?.stockNo || '');
    if (!key) return;
    const sourceRows = Array.isArray(historyMapRaw[key])
      ? historyMapRaw[key]
      : (Array.isArray(row?.history) ? row.history : []);
    const stampedRows = sourceRows
      .map((entry, index) => {
        const parsed = parseDashboardDate(entry?.at || entry?.date || row?.date || '');
        return {
          entry: entry && typeof entry === 'object' ? entry : {},
          timeMs: parsed ? parsed.getTime() : Date.now(),
          index
        };
      })
      .sort((a, b) => {
        if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
        return a.index - b.index;
      });

    let runningBalance = 0;
    const timeline = stampedRows.map((rowEntry) => {
      const receiptQty = Math.max(0, toDashboardNumber(rowEntry.entry?.receiptQty));
      const issuedQty = Math.max(0, toDashboardNumber(rowEntry.entry?.issuedQty));
      const explicitBalance = Number((rowEntry.entry?.balanceQty ?? '').toString().trim());
      runningBalance = Math.max(0, runningBalance + receiptQty - issuedQty);
      const normalizedBalance = Number.isFinite(explicitBalance) ? Math.max(0, explicitBalance) : runningBalance;
      runningBalance = normalizedBalance;
      return {
        timeMs: rowEntry.timeMs,
        balance: normalizedBalance
      };
    });

    if (!timeline.length){
      const fallbackDate = parseDashboardDate(row?.date || '');
      timeline.push({
        timeMs: fallbackDate ? fallbackDate.getTime() : Date.now(),
        balance: Math.max(0, toDashboardNumber(row?.balanceQty))
      });
    }

    timelineByStock[key] = timeline;
    createdAtByStock[key] = timeline[0].timeMs;
  });

  return { timelineByStock, createdAtByStock };
}

function computeLowStockSuppliesAtDate(suppliesRecords, context, referenceDate){
  const atDate = referenceDate instanceof Date ? referenceDate : parseDashboardDate(referenceDate);
  if (!atDate) return 0;
  const atMs = atDate.getTime();
  const normalizeStockNo = (value) => (value || '').toString().trim().toLowerCase();
  const timelineByStock = context?.timelineByStock || {};
  const createdAtByStock = context?.createdAtByStock || {};
  const rows = Array.isArray(suppliesRecords) ? suppliesRecords : [];

  let lowStockCount = 0;
  rows.forEach((row) => {
    const key = normalizeStockNo(row?.stockNo || '');
    if (!key) return;
    const createdAtMs = Number(createdAtByStock[key]);
    if (Number.isFinite(createdAtMs) && createdAtMs > atMs) return;

    const reorderPoint = Math.max(0, toDashboardNumber(row?.reorderPoint));
    let balance = Math.max(0, toDashboardNumber(row?.balanceQty));
    const timeline = Array.isArray(timelineByStock[key]) ? timelineByStock[key] : [];

    for (let i = timeline.length - 1; i >= 0; i--){
      const point = timeline[i];
      if (!point || !Number.isFinite(point.timeMs) || point.timeMs > atMs) continue;
      balance = Math.max(0, toDashboardNumber(point.balance));
      break;
    }

    if (balance <= 0 || (reorderPoint > 0 && balance <= reorderPoint)){
      lowStockCount += 1;
    }
  });

  return lowStockCount;
}

function buildDashboardKpiSeries(records, suppliesRecords, suppliesContext, quarterCount = 4){
  const rows = Array.isArray(records) ? records : [];
  const stockRows = Array.isArray(suppliesRecords) ? suppliesRecords : [];
  const buckets = buildDashboardQuarterBuckets(quarterCount);
  const recordsWithMeta = rows.map((record) => ({
    record,
    createdAtMs: resolveRecordCreatedAtMs(record),
    totalValue: Number(computeRecordMetrics(record).totalValue) || 0,
    items: Array.isArray(record?.items) ? record.items : []
  }));

  const createdAtByStock = suppliesContext?.createdAtByStock || {};
  const supplyCreatedRows = stockRows
    .map((row) => {
      const key = (row?.stockNo || '').toString().trim().toLowerCase();
      const createdAtMs = Number(createdAtByStock[key]);
      return {
        key,
        createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : Date.now()
      };
    })
    .filter((row) => !!row.key);

  const series = {
    records: [],
    supplies: [],
    lowStock: [],
    within: [],
    outside: [],
    asset: []
  };

  buckets.forEach((bucket) => {
    const endDate = bucket.end;
    const endMs = endDate.getTime();
    let totalRecords = 0;
    let withinCount = 0;
    let outsideCount = 0;
    let totalAssetValue = 0;

    recordsWithMeta.forEach((entry) => {
      if (entry.createdAtMs > endMs) return;
      totalRecords += 1;
      totalAssetValue += entry.totalValue;
      entry.items.forEach((item) => {
        const code = classifyEULItemAtDate(entry.record, item, endDate);
        if (code === 'past') outsideCount += 1;
        else withinCount += 1;
      });
    });

    const totalSupplies = supplyCreatedRows.reduce((sum, row) => (row.createdAtMs <= endMs ? sum + 1 : sum), 0);
    const lowStockCount = computeLowStockSuppliesAtDate(stockRows, suppliesContext, endDate);

    series.records.push(totalRecords);
    series.supplies.push(totalSupplies);
    series.lowStock.push(lowStockCount);
    series.within.push(withinCount);
    series.outside.push(outsideCount);
    series.asset.push(totalAssetValue);
  });

  return series;
}

function renderDashboardKpiSparkline(svgId, values, options = {}){
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const points = Array.isArray(values) && values.length ? values : [0, 0];
  const numeric = points.map((value) => Number.isFinite(Number(value)) ? Number(value) : 0);
  const labels = Array.isArray(options.labels) ? options.labels : [];
  const isRiskMetric = !!options.isRiskMetric;
  const isCurrency = !!options.isCurrency;
  const width = 160;
  const height = 46;
  const padX = 8;
  const padTop = 4;
  const padBottom = 10;
  const maxValue = Math.max(...numeric);
  const minValue = Math.min(...numeric);
  const range = Math.max(1, maxValue - minValue);
  const stepX = numeric.length > 1 ? (width - (padX * 2)) / (numeric.length - 1) : 0;
  const chartBottom = height - padBottom;
  const chartHeight = chartBottom - padTop;
  const formatValue = (value) => isCurrency ? formatDashboardCompactNumber(value) : String(Math.round(value));
  const coords = numeric.map((value, index) => {
    const ratio = (value - minValue) / range;
    return {
      x: padX + (index * stepX),
      y: chartBottom - (ratio * chartHeight),
      value
    };
  });
  const currentLabel = labels[labels.length - 1] || formatQuarterLabel(new Date());
  const titleText = `${options.title || 'KPI trend'}: ${numeric.map((value, index) => `${labels[index] || `Point ${index + 1}`}: ${formatValue(value)}`).join(', ')}`;

  if (isRiskMetric){
    const barGap = 8;
    const usableWidth = width - (padX * 2);
    const barWidth = Math.max(12, (usableWidth - (barGap * (numeric.length - 1))) / numeric.length);
    const maxRisk = Math.max(1, maxValue);
    const bars = numeric.map((value, index) => {
      const barHeight = Math.max(value > 0 ? 4 : 2, Math.round((value / maxRisk) * chartHeight));
      const x = padX + (index * (barWidth + barGap));
      const y = chartBottom - barHeight;
      const label = escapeHTML(labels[index] || `Point ${index + 1}`);
      const safeValue = escapeHTML(formatValue(value));
      const isCurrent = index === numeric.length - 1 ? ' is-current' : '';
      return `<rect class="dash-kpi-risk-bar${isCurrent}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="3"><title>${label}: ${safeValue}</title></rect>`;
    }).join('');
    const ticks = numeric.map((value, index) => {
      const x = padX + (index * (barWidth + barGap)) + (barWidth / 2);
      return `<circle class="dash-kpi-spark-dot${index === numeric.length - 1 ? ' is-current' : ''}" cx="${x.toFixed(2)}" cy="${chartBottom.toFixed(2)}" r="2"><title>${escapeHTML(labels[index] || `Point ${index + 1}`)}: ${escapeHTML(formatValue(value))}</title></circle>`;
    }).join('');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = `<title>${escapeHTML(titleText)}</title><line class="dash-kpi-spark-baseline" x1="${padX}" y1="${chartBottom}" x2="${width - padX}" y2="${chartBottom}"></line>${bars}${ticks}<text class="dash-kpi-spark-label" x="${width - padX}" y="${height - 1}" text-anchor="end">${escapeHTML(currentLabel)}</text>`;
    return;
  }

  const linePoints = coords.map((coord) => `${coord.x.toFixed(2)},${coord.y.toFixed(2)}`).join(' ');
  const first = coords[0];
  const last = coords[coords.length - 1];
  const areaPath = `M ${first.x.toFixed(2)} ${chartBottom.toFixed(2)} L ${coords.map((coord) => `${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`).join(' L ')} L ${last.x.toFixed(2)} ${chartBottom.toFixed(2)} Z`;
  const dots = coords.map((coord, index) => `<circle class="dash-kpi-spark-dot${index === coords.length - 1 ? ' is-current' : ''}" cx="${coord.x.toFixed(2)}" cy="${coord.y.toFixed(2)}" r="${index === coords.length - 1 ? '3.3' : '2.4'}"><title>${escapeHTML(labels[index] || `Point ${index + 1}`)}: ${escapeHTML(formatValue(coord.value))}</title></circle>`).join('');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.innerHTML = `<title>${escapeHTML(titleText)}</title><line class="dash-kpi-spark-baseline" x1="${padX}" y1="${chartBottom}" x2="${width - padX}" y2="${chartBottom}"></line><path class="dash-kpi-spark-fill" d="${areaPath}"></path><polyline class="dash-kpi-spark-line" points="${linePoints}"></polyline>${dots}<text class="dash-kpi-spark-label" x="${width - padX}" y="${height - 1}" text-anchor="end">${escapeHTML(currentLabel)}</text>`;
}

function formatDashboardCompactNumber(value){
  const abs = Math.abs(Number(value) || 0);
  if (abs >= 1000000000) return `${(abs / 1000000000).toFixed(1).replace(/\.0$/, '')}b`;
  if (abs >= 1000000) return `${(abs / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
  if (abs >= 1000) return `${(abs / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(abs));
}

function formatDashboardTrendDelta(delta, options = {}){
  const safeDelta = Number.isFinite(Number(delta)) ? Number(delta) : 0;
  const signed = safeDelta > 0 ? '+' : (safeDelta < 0 ? '-' : '');
  if (options.isCurrency){
    return `${signed}P${formatDashboardCompactNumber(Math.abs(safeDelta))}`;
  }
  return `${signed}${Math.round(Math.abs(safeDelta))}`;
}

function computeDashboardTrendPct(currentValue, previousValue){
  const current = Number.isFinite(Number(currentValue)) ? Number(currentValue) : 0;
  const previous = Number.isFinite(Number(previousValue)) ? Number(previousValue) : 0;
  if (Math.abs(previous) < 1e-9){
    if (Math.abs(current) < 1e-9) return 0;
    return 100;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function setDashboardKpiTrend(trendId, currentValue, previousValue, options = {}){
  const el = document.getElementById(trendId);
  if (!el) return;
  const current = Number.isFinite(Number(currentValue)) ? Number(currentValue) : 0;
  const previous = Number.isFinite(Number(previousValue)) ? Number(previousValue) : 0;
  const safeDelta = current - previous;
  const isRiskMetric = !!options.isRiskMetric;
  const preferStableLabel = !!options.preferStableLabel;
  const periodLabel = ((options.periodLabel || 'previous quarter').toString().trim() || 'previous quarter');
  const pct = computeDashboardTrendPct(current, previous);
  const signedPct = pct > 0 ? `+${pct}%` : `${pct}%`;

  let directionClass = 'is-flat';
  let toneClass = 'is-neutral';
  let stableClass = '';
  let text = `No change vs ${periodLabel} (0%)`;

  if (safeDelta > 0){
    directionClass = 'is-up';
    toneClass = isRiskMetric ? 'is-bad' : 'is-good';
    if (Math.abs(previous) < 1e-9){
      text = `${formatDashboardTrendDelta(safeDelta, { isCurrency: !!options.isCurrency })} new vs ${periodLabel}`;
    } else {
      text = `\u2191 ${formatDashboardTrendDelta(safeDelta, { isCurrency: !!options.isCurrency })} vs ${periodLabel} (${signedPct})`;
    }
  } else if (safeDelta < 0){
    directionClass = 'is-down';
    toneClass = isRiskMetric ? 'is-good' : 'is-bad';
    text = `\u2193 ${formatDashboardTrendDelta(safeDelta, { isCurrency: !!options.isCurrency })} vs ${periodLabel} (${signedPct})`;
  } else {
    if (preferStableLabel){
      text = 'Stable';
      stableClass = 'is-stable';
    } else {
      text = `\u2192 0 vs ${periodLabel} (0%)`;
    }
  }

  el.textContent = text;
  el.className = `dash-kpi-trend ${directionClass} ${toneClass} ${stableClass}`.trim();
}

function initDashboardView(){
  const records = loadLocalJSON('icsRecords', []);
  const parRecords = loadLocalJSON('parRecords', []);
  const suppliesRecords = loadLocalJSON('icsSuppliesRecords', []);
  const archived = getArchivedItems();
  const recent = getAuditLogs().slice().reverse().slice(0, 8);

  let totalItems = 0;
  let dueSoon = 0;
  let pastDue = 0;
  let totalDep = 0;
  let totalValue = 0;
  let missingSignatoryCount = 0;
  let pendingInspection = 0;
  let missingRecordCount = 0;
  let missingFundCluster = 0;
  let incompleteItems = 0;
  let itemsWithoutInspection = 0;
  const riskItems = [];
  const toSupplyQty = (value) => {
    const qty = Number((value ?? '').toString().trim());
    return Number.isFinite(qty) ? qty : 0;
  };
  const totalSupplies = Array.isArray(suppliesRecords) ? suppliesRecords.length : 0;
  const suppliesContext = resolveSupplyHistoryContext(suppliesRecords);
  const lowStockSupplies = (Array.isArray(suppliesRecords) ? suppliesRecords : []).filter((row) => {
    const balance = toSupplyQty(row?.balanceQty);
    const reorderPoint = toSupplyQty(row?.reorderPoint);
    return balance <= 0 || (reorderPoint > 0 && balance <= reorderPoint);
  }).length;
  records.forEach((r) => {
    const m = computeRecordMetrics(r);
    totalItems += m.totalItems;
    dueSoon += m.dueSoon;
    pastDue += m.pastDue;
    totalDep += m.depreciatedValue;
    totalValue += m.totalValue;

    const iss = r.signatories?.issuedBy?.name || '';
    const rec = r.signatories?.receivedBy?.name || '';
    if (!iss || !rec) missingSignatoryCount += 1;
    if (!(r.fund || '').trim()) missingFundCluster += 1;
    (r.items || []).forEach((it) => {
      const s = classifyEULItem(r, it);
      if (s.code !== 'ok'){
        const insp = Array.isArray(it.inspections) ? it.inspections : [];
        if (!insp.length) pendingInspection += 1;
        riskItems.push({
          icsNo: r.icsNo || '',
          itemNo: it.itemNo || '',
          desc: it.desc || '',
          status: s.status,
          code: s.code
        });
      }
      const desc = (it.desc || '').toString().trim();
      const itemNo = (it.itemNo || '').toString().trim();
      const unit = (it.unit || '').toString().trim();
      const qty = (it.qtyText ?? it.qty ?? '').toString().trim();
      if (!desc || !itemNo || !unit || !qty) incompleteItems += 1;
      const inspAll = Array.isArray(it.inspections) ? it.inspections : [];
      if (!inspAll.length) itemsWithoutInspection += 1;
    });
    if (recordHasMissingData(r)) missingRecordCount += 1;
  });

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const applyValueTicker = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const raw = (el.textContent || '').toString().trim();
    el.classList.remove('value-scroll', 'is-overflow');
    el.style.removeProperty('--ticker-distance');
    el.style.removeProperty('--ticker-duration');
    el.textContent = raw;
    if (!raw) return;
    el.classList.add('value-scroll');
    const track = document.createElement('span');
    track.className = 'value-scroll-track';
    track.textContent = raw;
    el.textContent = '';
    el.appendChild(track);
    requestAnimationFrame(() => {
      const overflow = track.scrollWidth > el.clientWidth + 2;
      if (!overflow) return;
      const distance = Math.max(track.scrollWidth - el.clientWidth, 0);
      const duration = Math.max(6, distance / 26);
      el.style.setProperty('--ticker-distance', `${distance}px`);
      el.style.setProperty('--ticker-duration', `${duration}s`);
      el.classList.add('is-overflow');
    });
  };
  set('dashKpiRecords', String(records.length));
  set('dashKpiSupplies', String(totalSupplies));
  set('dashKpiLowStock', String(lowStockSupplies));
  set('dashKpiItems', String(totalItems));
  set('dashKpiDue', String(dueSoon));
  set('dashKpiPast', String(pastDue));
  set('dashKpiArchived', String(archived.length));
  set('dashKpiDep', formatCurrencyValue(totalDep) || '0.00');
  set('dashKpiWithin', String(Math.max(totalItems - pastDue, 0)));
  set('dashKpiOutside', String(pastDue));
  set('dashKpiAsset', formatCurrencyValue(totalValue) || '0.00');
  const kpiSeries = buildDashboardKpiSeries(records, suppliesRecords, suppliesContext, 4);
  const getCurrentPrevious = (series) => {
    const list = Array.isArray(series) ? series : [];
    if (!list.length) return { current: 0, previous: 0 };
    const current = Number(list[list.length - 1]) || 0;
    const previous = Number(list[list.length - 2]) || 0;
    return { current, previous };
  };
  const recordsSeries = getCurrentPrevious(kpiSeries.records);
  const suppliesSeries = getCurrentPrevious(kpiSeries.supplies);
  const lowStockSeries = getCurrentPrevious(kpiSeries.lowStock);
  const outsideSeries = getCurrentPrevious(kpiSeries.outside);
  const assetSeries = getCurrentPrevious(kpiSeries.asset);
  const quarterLabels = getQuarterComparisonLabels(new Date());
  const sparkLabels = buildDashboardQuarterBuckets(4).map((bucket) => formatQuarterLabel(bucket.start));
  setDashboardKpiTrend('dashKpiRecordsTrend', recordsSeries.current, recordsSeries.previous, { isRiskMetric: false, periodLabel: quarterLabels.previous });
  setDashboardKpiTrend('dashKpiSuppliesTrend', suppliesSeries.current, suppliesSeries.previous, { isRiskMetric: false, periodLabel: quarterLabels.previous });
  setDashboardKpiTrend('dashKpiLowStockTrend', lowStockSeries.current, lowStockSeries.previous, { isRiskMetric: true, preferStableLabel: true, periodLabel: quarterLabels.previous });
  setDashboardKpiTrend('dashKpiOutsideTrend', outsideSeries.current, outsideSeries.previous, { isRiskMetric: true, periodLabel: quarterLabels.previous });
  setDashboardKpiTrend('dashKpiAssetTrend', assetSeries.current, assetSeries.previous, { isRiskMetric: false, isCurrency: true, periodLabel: quarterLabels.previous });
  renderDashboardKpiSparkline('dashKpiRecordsSpark', kpiSeries.records, { labels: sparkLabels, title: 'Total ICS records' });
  renderDashboardKpiSparkline('dashKpiSuppliesSpark', kpiSeries.supplies, { labels: sparkLabels, title: 'Total supplies' });
  renderDashboardKpiSparkline('dashKpiLowStockSpark', kpiSeries.lowStock, { labels: sparkLabels, title: 'Low stock supplies', isRiskMetric: true });
  renderDashboardKpiSparkline('dashKpiOutsideSpark', kpiSeries.outside, { labels: sparkLabels, title: 'Outside EUL', isRiskMetric: true });
  renderDashboardKpiSparkline('dashKpiAssetSpark', kpiSeries.asset, { labels: sparkLabels, title: 'Total asset value', isCurrency: true });
  applyValueTicker('dashKpiAsset');
  setTimeout(() => applyValueTicker('dashKpiAsset'), 80);
  setTimeout(() => applyValueTicker('dashKpiAsset'), 260);
  if (!window.__dashAssetTickerResizeBound){
    let dashTickerResizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(dashTickerResizeTimer);
      dashTickerResizeTimer = setTimeout(() => applyValueTicker('dashKpiAsset'), 90);
    });
    window.__dashAssetTickerResizeBound = true;
  }
  set('dashMiniBookValue', formatCurrencyValue(totalValue) || '0.00');
  set('dashMiniAvgItems', records.length ? (totalItems / records.length).toFixed(1) : '0');
  const healthyItems = Math.max(totalItems - dueSoon - pastDue, 0);
  const healthPct = totalItems ? Math.round((healthyItems / totalItems) * 100) : 100;
  set('dashMiniHealth', `${healthPct}%`);
  const healthScore = document.getElementById('dashHealthScore');
  if (healthScore){
    healthScore.textContent = healthPct >= 85 ? 'Healthy' : (healthPct >= 65 ? 'Watch' : 'Critical');
  }
  renderDashboardStatusBars([
    { label: 'Healthy', value: healthyItems, tone: 'ok' },
    { label: 'Due <3m', value: dueSoon, tone: 'near' },
    { label: 'Past EUL', value: pastDue, tone: 'past' },
    { label: 'Archived', value: archived.length, tone: 'archive' }
  ]);
  const healthNote = document.getElementById('dashHealthNote');
  if (healthNote){
    healthNote.textContent = `Health score is based on active items not yet due or past EUL (${healthyItems} of ${totalItems}).`;
  }
  const withinPct = totalItems ? Math.round((Math.max(totalItems - pastDue, 0) / totalItems) * 100) : 100;
  const outsidePct = totalItems ? Math.round((pastDue / totalItems) * 100) : 0;
  const lowStockPct = totalSupplies ? Math.round((lowStockSupplies / totalSupplies) * 100) : 0;
  const complianceScoreRaw = Math.round((withinPct * 0.7) + ((100 - lowStockPct) * 0.3));
  const complianceScore = Math.max(0, Math.min(100, Number.isFinite(complianceScoreRaw) ? complianceScoreRaw : 0));
  set('dashComplianceWithinPct', `${withinPct}%`);
  set('dashComplianceOutsidePct', `${outsidePct}%`);
  set('dashComplianceLowStockPct', `${lowStockPct}%`);
  set('dashComplianceScore', `${complianceScore}/100`);
  const withinBar = document.getElementById('dashComplianceWithinBar');
  const outsideBar = document.getElementById('dashComplianceOutsideBar');
  const lowStockBar = document.getElementById('dashComplianceLowStockBar');
  if (withinBar) withinBar.style.width = `${Math.max(0, Math.min(100, withinPct))}%`;
  if (outsideBar) outsideBar.style.width = `${Math.max(0, Math.min(100, outsidePct))}%`;
  if (lowStockBar) lowStockBar.style.width = `${Math.max(0, Math.min(100, lowStockPct))}%`;
  const complianceBadge = document.getElementById('dashComplianceBadge');
  const complianceTip = document.getElementById('dashComplianceTip');
  const highestRiskPct = Math.max(outsidePct, lowStockPct);
  if (complianceBadge){
    if (highestRiskPct >= 30){
      complianceBadge.textContent = 'Needs review';
      complianceBadge.className = 'dash-compliance-badge danger';
    } else if (highestRiskPct >= 15){
      complianceBadge.textContent = 'Watch';
      complianceBadge.className = 'dash-compliance-badge warn';
    } else {
      complianceBadge.textContent = 'Stable';
      complianceBadge.className = 'dash-compliance-badge ok';
    }
  }
  if (complianceTip){
    const parts = [];
    if (pastDue) parts.push(`${pastDue} outside-EUL item(s)`);
    if (lowStockSupplies) parts.push(`${lowStockSupplies} low-stock supplies`);
    complianceTip.textContent = parts.length
      ? `Priority: Review ${parts.join(' and ')}.`
      : 'Healthy baseline: no outside-EUL or low-stock supply alerts.';
  }

  const attention = [
    `Past EUL items: ${pastDue}`,
    `Items due within 3 months: ${dueSoon}`,
    `Pending inspections (EUL action list): ${pendingInspection}`,
    `Not approved disposals in archive: ${archived.filter((a) => a.disposal?.status !== 'approved').length}`,
    `Records with missing signatories: ${missingSignatoryCount}`
  ];
  const attEl = document.getElementById('dashAttentionList');
  if (attEl) attEl.innerHTML = attention.map((x) => `<li>${x}</li>`).join('');

  const setChip = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setChip('dashChipAll', `All (${dueSoon + pastDue})`);
  setChip('dashChipNear', `Due < 3m (${dueSoon})`);
  setChip('dashChipPast', `Past EUL (${pastDue})`);
  setChip('dashChipArchived', `Archived (${archived.length})`);
  setChip('dashChipMissing', `Missing Data (${missingRecordCount})`);

  const note = document.getElementById('dashDataNote');
  if (note){
    note.textContent = `Book Value: ${formatCurrencyValue(totalValue) || '0.00'} | Data refreshed: ${new Date().toLocaleString()}`;
  }
  const backupNote = document.getElementById('dashBackupNote');
  if (backupNote){
    const lastBackup = localStorage.getItem('icsLastFullBackupAt');
    const lastImport = localStorage.getItem('icsLastImportAt');
    backupNote.textContent = `Last full backup: ${lastBackup ? new Date(lastBackup).toLocaleString() : 'Never'} | Last import: ${lastImport ? new Date(lastImport).toLocaleString() : 'Never'}`;
  }

  const recEl = document.getElementById('dashRecentList');
  if (recEl){
    recEl.innerHTML = recent.length
      ? recent.map((n) => `<li><strong>${escapeHTML(n.type || 'info')}</strong> - ${escapeHTML(n.detail || '')} <span class="dash-note">(${escapeHTML(n.time || '')})</span></li>`).join('')
      : '<li>No recent activity yet.</li>';
  }

  const healthRows = [
    ['Missing Fund Cluster', missingFundCluster],
    ['Missing Signatories', missingSignatoryCount],
    ['Incomplete Item Rows', incompleteItems],
    ['Items Without Inspection Log', itemsWithoutInspection]
  ];
  const healthEl = document.getElementById('dashHealthRows');
  if (healthEl){
    healthEl.innerHTML = healthRows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  }

  riskItems.sort((a, b) => {
    const rank = (x) => x.code === 'past' ? 0 : 1;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return (a.icsNo || '').localeCompare(b.icsNo || '');
  });
  const riskEl = document.getElementById('dashRiskRows');
  if (riskEl){
    const topRisk = riskItems.slice(0, 10);
    riskEl.innerHTML = topRisk.length
      ? topRisk.map((r, i) => `<tr><td>${i + 1}</td><td><button class="ics-link-btn" data-action="openICSDetailsByKey" data-arg1="${escapeHTML(r.icsNo)}" data-arg2="${escapeHTML(r.itemNo)}">${escapeHTML(r.icsNo)}</button></td><td>${escapeHTML(r.itemNo)}</td><td>${escapeHTML(r.desc)}</td><td><span class="risk-badge ${r.code === 'past' ? 'danger' : 'warn'}">${escapeHTML(r.status)}</span></td></tr>`).join('')
      : '<tr><td colspan="5" class="empty-cell">No risk items right now.</td></tr>';
  }

  hydrateRecentIcsActivityCards(records, parRecords, suppliesRecords);

  const dashNoteSync = document.getElementById('dashNoteSync');
  if (dashNoteSync){
    const lastBackup = localStorage.getItem('icsLastFullBackupAt');
    const lastImport = localStorage.getItem('icsLastImportAt');
    const backupText = lastBackup ? new Date(lastBackup).toLocaleString() : 'Never';
    const importText = lastImport ? new Date(lastImport).toLocaleString() : 'Never';
    dashNoteSync.textContent = `Last full backup: ${backupText} | Last import: ${importText}.`;
  }
  const mismatchCount = records.reduce((sum, r) => sum + (verifyRecordLineage(r || {}).ok ? 0 : 1), 0);
  const dashNoteIntegrity = document.getElementById('dashNoteIntegrity');
  if (dashNoteIntegrity){
    dashNoteIntegrity.textContent = mismatchCount
      ? `${mismatchCount} record(s) need lineage review before formal export/reporting.`
      : 'Traceability metadata is ready for exports and reporting.';
  }
  const dashNoteReminders = document.getElementById('dashNoteReminders');
  if (dashNoteReminders){
    if (pastDue && lowStockSupplies){
      dashNoteReminders.textContent = `Review ${pastDue} outside-EUL item(s) and ${lowStockSupplies} low-stock supplies.`;
    } else if (pastDue){
      dashNoteReminders.textContent = `Review ${pastDue} outside-EUL item(s) in Action Center.`;
    } else if (lowStockSupplies){
      dashNoteReminders.textContent = `Review ${lowStockSupplies} low-stock supplies in Supplies view.`;
    } else {
      dashNoteReminders.textContent = 'No outside-EUL or low-stock alerts at the moment.';
    }
  }

  const emptyHint = document.getElementById('dashEmptyHint');
  if (emptyHint) emptyHint.style.display = (records.length + parRecords.length + totalSupplies) ? 'none' : 'block';
}
