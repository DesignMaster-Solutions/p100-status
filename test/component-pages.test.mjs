import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeFeed} from '../tools/feed-probe.mjs';
import {componentPages} from '../tools/component-pages.mjs';
const at = '2026-10-31T15:00:00Z';
const provider = {id:'cloudflare',url:'https://www.cloudflarestatus.com/api/v2/summary.json'};
const feed = (components=[], incidents=[]) => ({...normalizeFeed(provider,{status:{indicator:'none'},components,incidents},at),page:102});
const bounds = pages => {
  for (const p of pages) {
    assert.equal(p.rows.length,24);
    for (const row of p.rows) { assert.equal(row.length,40); assert.match(row,/^[ -~]{40}$/); }
    assert.equal(p.page,102);
  }
  assert.equal(new Set(pages.map(p=>p.key)).size,pages.length);
};
test('real snapshot preserves all 481 components, with all 67 affected first',async()=>{
  const payload=JSON.parse(await readFile(new URL('../fixtures/live/cloudflare.json',import.meta.url)));
  const input={...normalizeFeed(provider,payload,at),page:102};
  const before=JSON.stringify(input);
  const pages=componentPages(input);
  bounds(pages);
  const items=pages.flatMap(p=>p.items).filter(i=>i.kind==='component' && i.part===1);
  assert.equal(items.length,481);
  assert.equal(new Set(items.map(i=>i.id)).size,481);
  assert.ok(items.slice(0,67).every(i=>i.status!=='operational'));
  assert.ok(items.slice(67).every(i=>i.status==='operational'));
  assert.equal(JSON.stringify(input),before);
  assert.equal(pages[0].counts.affected,67);
});
test('long names and incidents continue without losing text or originals',()=>{
  const name='A'.repeat(2700);
  const pages=componentPages(feed([{id:'a',name,status:'major_outage'}],[{id:'incident',name:'Z'.repeat(1900)}]));
  bounds(pages);
  for(const [kind,id,value] of [['component','a',name],['incident','incident','Z'.repeat(1900)]]) {
    const chunks=pages.flatMap(p=>p.items).filter(i=>i.kind===kind && i.id===id);
    assert.equal(chunks.map(i=>i.text).join(''),value);
    assert.ok(chunks.every(i=>i.original===value));
  }
});
test('unavailable, unknown and stale are never all clear; timestamps retained',()=>{
  const unavailable={provider:'cloudflare',page:102,state:'unavailable',label:'NO SIGNAL',green:false,retrievedAt:null};
  for (const input of [unavailable,{...feed(),state:'stale',green:false,label:'STALE'},{...feed(),indicator:'unknown',green:false,label:'UNKNOWN'}]) {
    const pages=componentPages(input); bounds(pages);
    assert.equal(pages[0].green,false);
    assert.ok(pages[0].rows.join('\n').includes(input.label));
    assert.equal(pages[0].retrievedAt,input.retrievedAt);
  }
});
test('missing incident data remains distinct from zero incidents',()=>{
  const known=componentPages(feed());
  const unknown=componentPages({...feed(),incidents:null,incidentsAvailability:'unknown',green:false});
  assert.match(known[0].rows.join('\n'),/Incidents: 0/);
  assert.match(unknown[0].rows.join('\n'),/Incidents: UNKNOWN/);
});
test('deterministic generated Unicode/control/HTML cases stay in ASCII cells',()=>{
  let seed=100; const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const chars=['é','😀','\n','\x1b','\t','中','<script>','\u202e','Z',' '];
  for(let run=0;run<100;run++){
    const components=Array.from({length:rand()%50},(_,i)=>({id:String(i),status:i%2?'operational':'unknown',name:Array.from({length:rand()%150},()=>chars[rand()%chars.length]).join('')}));
    const input=feed(components); const pages=componentPages(input);
    bounds(pages);assert.deepEqual(componentPages(input),pages);
    assert.equal(pages.flatMap(p=>p.items).filter(i=>i.kind==='component'&&i.part===1).length,components.length);
  }
});
test('duplicate or missing component IDs retain each input record',()=>{
  const pages=componentPages(feed([{id:'dup',name:'First',status:'operational'},{id:'dup',name:'Second',status:'major_outage'}]));
  assert.equal(pages.flatMap(p=>p.items).filter(i=>i.part===1).length,2);
});
