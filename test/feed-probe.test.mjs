import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeFeed, probeAll } from '../tools/feed-probe.mjs';
const fixture = async id => JSON.parse(await readFile(new URL(`../fixtures/live/${id}.json`, import.meta.url)));
const at = '2026-10-31T15:00:00Z';
const now = '2026-10-31T15:05:00Z';
const provider = { id: 'github', url: 'https://example.test/status' };
test('Cloudflare retains every affected component despite zero incidents', async () => {
  const result = normalizeFeed(provider, await fixture('cloudflare'), at);
  assert.equal(result.indicator, 'major');
  assert.equal(result.components.length, 481);
  assert.equal(result.affected.length, 67);
  assert.equal(result.incidents.length, 0);
  assert.equal(result.green, false);
});
test('missing incidents remain unknown while OpenAI components survive', async () => {
  const result = normalizeFeed(provider, await fixture('openai'), at);
  assert.equal(result.incidentsAvailability, 'unknown');
  assert.equal(result.incidents, null);
  assert.equal(result.components.length, 25);
});
test('empty incidents are explicitly known', async () => {
  const result = normalizeFeed(provider, await fixture('github'), at);
  assert.equal(result.incidentsAvailability, 'known');
  assert.deepEqual(result.incidents, []);
});
test('unknown overall or component statuses never become green', () => {
  for (const payload of [
    { status: { indicator: 'new_vendor_value' }, components: [], incidents: [] },
    { status: { indicator: 'none' }, components: [{id:'a', name:'A', status:'new_value'}], incidents: [] },
    { components: [], incidents: [] },
  ]) {
    const result = normalizeFeed(provider, payload, at);
    assert.equal(result.green, false);
  }
});
test('malformed successful body is not a healthy empty provider', () => {
  for (const payload of [null, [], {}, {status:{indicator:'none'},components:'oops'}, {status:{indicator:'none'},components:[null]}]) {
    assert.throws(() => normalizeFeed(provider, payload, at), /Invalid/);
  }
});
test('failed request preserves other providers and stable pages', async () => {
  const payload = await fixture('github');
  const results = await probeAll([provider, {id:'second',url:'https://example.test/second'}], {
    now: () => new Date(now), fetcher: async url => {
      if (url === provider.url) throw new Error('timeout');
      return new Response(JSON.stringify(payload));
    },
  });
  assert.equal(results[0].state, 'unavailable');
  assert.equal(results[0].label, 'NO SIGNAL');
  assert.equal(results[0].green, false);
  assert.equal(results[0].page, 101);
  assert.equal(results[1].state, 'success');
  assert.equal(results[1].page, 102);
});
test('failed refresh retains original successful timestamp with stale age', async () => {
  const cached = normalizeFeed(provider, await fixture('github'), at);
  const [result] = await probeAll([provider], {
    cached: {github: cached}, now: () => new Date(now), fetcher: async () => {throw new Error('offline');},
  });
  assert.equal(result.state, 'stale');
  assert.equal(result.green, false);
  assert.equal(result.retrievedAt, at);
  assert.equal(result.ageSeconds, 300);
  assert.equal(result.error, 'offline');
});
test('HTTP error and invalid JSON both fail visibly', async () => {
  for (const response of [new Response('denied', {status:403}), new Response('<html>error</html>')]) {
    const [result] = await probeAll([provider], {fetcher: async () => response});
    assert.equal(result.state, 'unavailable');
    assert.equal(result.green, false);
    assert.ok(result.error);
  }
});
test('timeout aborts a pending fetch', async () => {
  const [result] = await probeAll([provider], {timeoutMs: 15, fetcher: (_url, {signal}) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {once:true});
  })});
  assert.equal(result.state, 'unavailable');
  assert.match(result.error, /timeout/i);
});
test('an active incident prevents an all-clear even if overall indicator is none', () => {
  const result = normalizeFeed(provider, {status:{indicator:'none'}, components:[], incidents:[{id:'incident',name:'Delayed delivery'}]}, at);
  assert.equal(result.green, false);
  assert.equal(result.incidents.length, 1);
});
test('cache from another source or future timestamp cannot rescue a failure', async () => {
  const base = normalizeFeed(provider, await fixture('github'), at);
  for (const previous of [{...base, source:'https://wrong.test'}, {...base,retrievedAt:'2099-01-01T00:00:00Z'}]) {
    const [result] = await probeAll([provider], {cached:{github:previous}, now:()=>new Date(now), fetcher:async()=>{throw new Error('offline');}});
    assert.equal(result.state, 'unavailable');
  }
});
