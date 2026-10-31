// Codex-built preflight prototype; this is not evidence of Kiro use.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const indicators = new Set(['none', 'minor', 'major', 'critical', 'maintenance']);
const componentStatuses = new Set(['operational', 'degraded_performance', 'partial_outage', 'major_outage', 'under_maintenance']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function normalizeFeed(provider, payload, retrievedAt) {
  if (!object(payload) || !Array.isArray(payload.components) ||
      !payload.components.every(c => object(c) && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.status === 'string')) {
    throw new Error('Invalid provider payload or components');
  }
  if (!Number.isFinite(Date.parse(retrievedAt))) throw new Error('Invalid retrieval timestamp');
  const indicator = indicators.has(payload.status?.indicator) ? payload.status.indicator : 'unknown';
  const components = payload.components.map(c => ({
    id: c.id, name: c.name, status: componentStatuses.has(c.status) ? c.status : 'unknown',
    rawStatus: c.status,
  }));
  const incidentsKnown = Array.isArray(payload.incidents) && payload.incidents.every(object);
  const affected = components.filter(c => c.status !== 'operational');
  return {
    provider: provider.id, source: provider.url, state: 'success',
    label: indicator === 'unknown' ? 'UNKNOWN' : indicator.toUpperCase(),
    indicator, components, affected,
    incidentsAvailability: incidentsKnown ? 'known' : 'unknown',
    incidents: incidentsKnown ? payload.incidents : null,
    retrievedAt, upstreamUpdatedAt: payload.page?.updated_at ?? null,
    // Missing incident data cannot establish an all-clear signal either.
    green: indicator === 'none' && affected.length === 0 && incidentsKnown && payload.incidents.length === 0,
  };
}

export async function probeAll(providers, {fetcher = fetch, now = () => new Date(), timeoutMs = 5000, cached = {}} = {}) {
  return Promise.all(providers.map(async (provider, index) => {
    const page = 101 + index;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('Provider timeout')), timeoutMs);
    try {
      const response = await fetcher(provider.url, {signal: controller.signal, headers: {'User-Agent':'P100-feed-probe/0.1', Accept:'application/json'}});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return {...normalizeFeed(provider, payload, now().toISOString()), page, ageSeconds:0};
    } catch (error) {
      const reason = String(error.message || error).slice(0, 200);
      const previous = cached[provider.id];
      const age = previous ? (now().getTime() - Date.parse(previous.retrievedAt)) / 1000 : NaN;
      if (previous?.provider === provider.id && previous.source === provider.url &&
          ['success', 'stale'].includes(previous.state) && Number.isFinite(age) && age >= 0) {
        return {...previous, page, state:'stale', label:'STALE', green:false, ageSeconds:Math.floor(age), error:reason};
      }
      return {provider:provider.id, source:provider.url, page, state:'unavailable', label:'NO SIGNAL', green:false,
        indicator:'unknown', retrievedAt:null, ageSeconds:null, error:reason};
    } finally {
      clearTimeout(timer);
    }
  }));
}

async function main() {
  const providers = JSON.parse(await readFile(new URL('../fixtures/manifest.json', import.meta.url)));
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--fixtures', '--live'].includes(args[0])) {
    throw new Error('Usage: node tools/feed-probe.mjs --fixtures|--live');
  }
  const historical = args[0] === '--fixtures';
  const feeds = historical ? await Promise.all(providers.map(async (p, i) => ({
    ...normalizeFeed(p, JSON.parse(await readFile(new URL(`../${p.file}`, import.meta.url))), p.captured_at), page:101+i,
  }))) : await probeAll(providers);
  process.stdout.write(JSON.stringify({mode:historical ? 'historical-fixtures' : 'live', checkedAt:new Date().toISOString(),
    providers:feeds.map(({components, affected, incidents, ...feed}) => ({...feed,
      componentCount:components?.length ?? null, affectedCount:affected?.length ?? null, incidentCount:incidents?.length ?? null,
    })),
  }, null, 2) + '\n');
  // Red vendor status is valid data; transport/schema failure is a failed smoke check.
  if (feeds.some(f => f.state !== 'success')) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {console.error(error.message); process.exitCode = 1;});
}
