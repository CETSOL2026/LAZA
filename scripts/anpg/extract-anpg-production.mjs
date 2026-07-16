import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const monthSlugs = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const outputPath = resolve(
  process.argv[2] ?? 'database/sqlserver/evidence/anpg-oil-gas-production-2025-2026.json',
);

function normalizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style[\s\S]*?<\/style>/giu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&nbsp;|&#160;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&quot;/giu, '"')
    .replace(/&#8211;|&#x2013;/giu, '–')
    .replace(/&#8217;|&#x2019;/giu, '’')
    .replace(/[\s\u00a0]+/gu, ' ')
    .trim();
}

function integer(value) {
  if (value == null) return null;
  const digits = value.replace(/\D/gu, '');
  return digits ? Number(digits) : null;
}

function captureInteger(text, pattern, group = 1) {
  return integer(text.match(pattern)?.[group] ?? null);
}

function parsePage({ period, url, html }) {
  const text = normalizeHtml(html);
  const publishedAt = html.match(/property=["']article:published_time["']\s+content=["']([^"']+)/iu)?.[1]
    ?? html.match(/content=["']([^"']+)["']\s+property=["']article:published_time["']/iu)?.[1]
    ?? html.match(/["']datePublished["']\s*:\s*["']([^"']+)/iu)?.[1]
    ?? null;
  const oil = text.match(/A produção de petróleo[\s\S]{0,180}?foi de ([\d\s\u00a0.]+) barris\s*,?\s*correspondendo[\s\S]{0,100}?média diária de ([\d\s\u00a0.]+) barris de petróleo \(BOPD\)\s*,?\s*(?:contra(?: os)?|face aos) ([\d\s\u00a0.]+) BOPD previst/iu);
  const gas = text.match(/A produção de gás associado[\s\S]{0,160}?foi de ([\d\s\u00a0.]+) milhões de pés cúbicos\s*,?\s*correspondente[\s\S]{0,80}?média diária de ([\d\s\u00a0.]+) milhões de pés cúbicos \(MMSCFD\)/iu);
  const alng = text.match(/A fábrica ALNG produziu\s*:?[\s\S]{0,40}?([\d\s\u00a0.]+) barris de óleo equivalente \(BOE\)(?:\s*,?\s*(?:contra(?: os)?|superando a previsão de)\s+([\d\s\u00a0.]+) barris de óleo equivalente \(BOE\)(?: previst[oa]s?)?)?/iu);
  const alngContext = alng ? text.slice(alng.index, alng.index + 850) : '';
  const gasContextStart = gas?.index ?? text.indexOf('A produção de gás associado');
  const gasContext = gasContextStart >= 0 ? text.slice(gasContextStart, gasContextStart + 650) : '';

  if (!oil || !gas) {
    throw new Error(`${period}: mandatory oil or gas metrics were not parsed from ${url}`);
  }

  return {
    period,
    sourceUrl: url,
    publicationDate: publishedAt?.slice(0, 10) ?? null,
    contentSha256: createHash('sha256').update(html).digest('hex').toUpperCase(),
    contentSizeBytes: Buffer.byteLength(html),
    oilTotalBarrels: integer(oil[1]),
    oilActualBopd: integer(oil[2]),
    oilForecastBopd: integer(oil[3]),
    gasTotalMillionCubicFeet: integer(gas[1]),
    gasActualMmscfd: integer(gas[2]),
    gasReinjectedMmscfd: captureInteger(gasContext, /([\d\s\u00a0.]+) MMSCFD (?:foram?|foi) re-?injectad/iu),
    gasToAlngMmscfd: captureInteger(gasContext, /([\d\s\u00a0.]+) MMSCFD (?:foram?|foi)?\s*disponibilizad[oa]s?[\s\S]{0,35}?(?:fábrica )?ALNG/iu),
    gasToPowerMmscfd: captureInteger(gasContext, /([\d\s\u00a0.]+) MMSCFD (?:foram?|foi)?\s*(?:utilizad[oa]s? )?(?:para )?(?:a )?geração de energia/iu),
    alngActualBoe: integer(alng?.[1] ?? null),
    alngForecastBoe: integer(alng?.[2] ?? null),
    alngActualBoepd: captureInteger(alngContext, /média diária de ([\d\s\u00a0.]+) barris de óleo equivalente \(BOEPD\)/iu),
    alngLngBoepd: captureInteger(alngContext, /([\d\s\u00a0.]+) BOEPD (?:são )?de LNG/iu),
    alngPropaneBoepd: captureInteger(alngContext, /([\d\s\u00a0.]+) BOEPD de Propano/iu),
    alngButaneBoepd: captureInteger(alngContext, /([\d\s\u00a0.]+) BOEPD de Butano/iu),
    alngCondensateBoepd: captureInteger(alngContext, /([\d\s\u00a0.]+) BOEPD de Condensad/iu),
  };
}

function validate(rows) {
  const findings = [];
  const expectedPeriods = [];
  for (let year = 2025; year <= 2026; year += 1) {
    const lastMonth = year === 2026 ? 6 : 12;
    for (let month = 1; month <= lastMonth; month += 1) {
      expectedPeriods.push(`${year}-${String(month).padStart(2, '0')}`);
    }
  }

  const periods = rows.map((row) => row.period);
  if (JSON.stringify(periods) !== JSON.stringify(expectedPeriods)) {
    findings.push({ severity: 'CRITICAL', rule: 'CONTIGUOUS_MONTHS', message: 'Expected contiguous Jan 2025-Jun 2026 periods.' });
  }
  if (new Set(periods).size !== rows.length) {
    findings.push({ severity: 'CRITICAL', rule: 'UNIQUE_MONTH', message: 'Duplicate month detected.' });
  }

  for (const row of rows) {
    const [year, month] = row.period.split('-').map(Number);
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const oilDifference = Math.abs(row.oilTotalBarrels - row.oilActualBopd * days);
    const gasDifference = Math.abs(row.gasTotalMillionCubicFeet - row.gasActualMmscfd * days);
    const gasAllocated = row.gasReinjectedMmscfd + row.gasToAlngMmscfd + row.gasToPowerMmscfd;
    if (oilDifference > days) findings.push({ severity: 'HIGH', rule: 'OIL_DAILY_MONTHLY_RECONCILIATION', period: row.period, observed: oilDifference });
    if (gasDifference > days) findings.push({ severity: 'HIGH', rule: 'GAS_DAILY_MONTHLY_RECONCILIATION', period: row.period, observed: gasDifference });
    if (gasAllocated > row.gasActualMmscfd) {
      const documentedSourceException = ['2025-08', '2025-09'].includes(row.period);
      findings.push({
        severity: documentedSourceException ? 'MEDIUM' : 'HIGH',
        rule: 'GAS_ALLOCATION_LIMIT',
        period: row.period,
        observed: gasAllocated,
        publishedTotal: row.gasActualMmscfd,
        acceptedSourceException: documentedSourceException,
        message: documentedSourceException
          ? 'Official ANPG components exceed the published gas total; preserve source values and suppress residual calculation.'
          : 'Gas allocation components exceed the published total.',
      });
    }
    if (row.alngActualBoepd != null && [row.alngLngBoepd, row.alngPropaneBoepd, row.alngButaneBoepd, row.alngCondensateBoepd].every((v) => v != null)) {
      const productTotal = row.alngLngBoepd + row.alngPropaneBoepd + row.alngButaneBoepd + row.alngCondensateBoepd;
      if (Math.abs(productTotal - row.alngActualBoepd) > 2) findings.push({ severity: 'MEDIUM', rule: 'ALNG_PRODUCT_RECONCILIATION', period: row.period, observed: productTotal - row.alngActualBoepd });
    }
  }

  const criticalOrHigh = findings.filter((finding) => ['CRITICAL', 'HIGH'].includes(finding.severity));
  if (criticalOrHigh.length) {
    throw new Error(`ANPG validation failed: ${JSON.stringify(criticalOrHigh)}`);
  }
  return findings;
}

const rows = [];
for (let year = 2025; year <= 2026; year += 1) {
  const lastMonth = year === 2026 ? 6 : 12;
  for (let month = 1; month <= lastMonth; month += 1) {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const url = `https://anpg.co.ao/producao/resumo-mensal-sobre-a-producao-petrolifera-${monthSlugs[month - 1]}-${year}/`;
    const response = await fetch(url, { headers: { 'user-agent': 'LAZA-MVP-source-validation/1.0' } });
    if (!response.ok) throw new Error(`${period}: ANPG returned HTTP ${response.status}`);
    rows.push(parsePage({ period, url, html: await response.text() }));
  }
}

const findings = validate(rows);
const payload = {
  source: 'Agência Nacional de Petróleo, Gás e Biocombustíveis (ANPG)',
  sourceArchiveUrl: 'https://anpg.co.ao/producao/',
  extractedAt: new Date().toISOString(),
  grain: 'one official ANPG monthly publication per reference month',
  coverage: { firstPeriod: rows[0].period, lastPeriod: rows.at(-1).period, periods: rows.length },
  qualitySummary: {
    criticalFindings: findings.filter((finding) => finding.severity === 'CRITICAL').length,
    highFindings: findings.filter((finding) => finding.severity === 'HIGH').length,
    mediumFindings: findings.filter((finding) => finding.severity === 'MEDIUM').length,
    documentedMissingAlngDetailPeriods: rows.filter((row) => row.alngActualBoepd == null).map((row) => row.period),
  },
  findings,
  rows,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, coverage: payload.coverage, qualitySummary: payload.qualitySummary }, null, 2));
