import test from 'node:test';
import assert from 'node:assert/strict';
import {deskPages} from '../tools/component-pages.mjs';
import {createPagesService} from '../tools/pages-api.mjs';
const feeds=[{provider:'github',page:101,state:'success',green:true,label:'OPERATIONAL',source:'https://status.test/api',retrievedAt:'2026-11-01T04:00:00Z',ageSeconds:12},
 {provider:'cloudflare',page:102,state:'stale',green:false,label:'STALE',source:'https://other.test/api',retrievedAt:'2026-11-01T03:59:00Z',ageSeconds:72},
 {provider:'openai',page:103,state:'unavailable',green:false,source:'https://third.test/api',retrievedAt:null,ageSeconds:null}];
test('index keeps vendor destinations and real freshness even on failure',()=>{
 const before=JSON.stringify(feeds); const [index,about]=deskPages(feeds);
 assert.equal(index.page,100); assert.equal(about.page,199);
 assert.deepEqual(index.entries.map(e=>e.page),[101,102,103]);
 assert.deepEqual(index.entries.map(e=>e.label),['OPERATIONAL','STALE','NO SIGNAL']);
 assert.equal(index.entries[1].retrievedAt,feeds[1].retrievedAt);
 assert.equal(index.entries[2].ageSeconds,null);
 assert.equal(index.green,false); assert.equal(JSON.stringify(feeds),before);
 assert.match(index.rows.join('\n'),/72s/); assert.match(index.rows.join('\n'),/NEVER/);
 assert.match(about.rows.join('\n'),/Not active monitoring/);
 assert.deepEqual(about.sources.map(s=>s.url),feeds.map(f=>f.source));
 for(const p of [index,about]){assert.equal(p.rows.length,24); for(const r of p.rows) assert.match(r,/^[ -~]{40}$/);}
});
test('empty, unknown and misleading success states never signal all clear',()=>{
 for(const input of [[],[{...feeds[0],green:false,label:'UNKNOWN'}],[{...feeds[0],state:'stale',green:true}]])
  assert.equal(deskPages(input)[0].green,false);
 assert.equal(deskPages([feeds[0]])[0].green,true);
});
test('index rejects duplicate destinations and overflow instead of hiding vendors',()=>{
 assert.throws(()=>deskPages([feeds[0],feeds[0]]),/page/i);
 assert.throws(()=>deskPages([{...feeds[0],page:100}]),/page/i);
 assert.throws(()=>deskPages(Array.from({length:7},(_,i)=>({...feeds[0],page:101+i}))),/six/i);
});
test('HTTP service adds navigation without changing existing component pages',async()=>{
 const service=createPagesService([{id:'github',url:'https://status.test'}],{fetcher:async()=>Response.json({status:{indicator:'none'},components:[],incidents:[]})});
 const result=await service.read();
 assert.deepEqual(result.navigation.map(p=>p.page),[100,199]);
 assert.deepEqual(result.pages.map(p=>p.page),[101]);
});

test('upstream NONE cannot conceal incomplete or affected data on index',()=>{
 const [index]=deskPages([{...feeds[0],label:'NONE',green:false}]);
 assert.equal(index.entries[0].label,'CHECK DETAILS');
 assert.equal(deskPages([{...feeds[0],label:'NONE'}])[0].entries[0].label,'OPERATIONAL');
});
