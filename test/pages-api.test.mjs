import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createPagesService, createPagesServer} from '../tools/pages-api.mjs';
const providers=[{id:'one',url:'https://one.test/status'},{id:'two',url:'https://two.test/status'}];
const payload={components:[{id:'a',name:'API',status:'operational'}],incidents:[],status:{indicator:'none'}};
const epoch=Date.parse('2026-10-31T20:00:00Z');
function setup() {
  let time=epoch,calls=0,fail=false;
  const service=createPagesService(providers,{now:()=>new Date(time),fetcher:async url=>{
    calls++; if(fail && url===providers[0].url) throw new Error('network offline');
    return Response.json(payload);
  }});
  return {service,setTime:n=>time=epoch+n,fail:()=>fail=true,calls:()=>calls};
}
test('cache hit preserves fetch time and updates source age, refresh at TTL',async()=>{
 const s=setup(); const first=await s.service.read(); s.setTime(59000);
 const hit=await s.service.read(); assert.equal(s.calls(),2); assert.equal(hit.feeds[0].retrievedAt,first.feeds[0].retrievedAt);
 assert.equal(hit.feeds[0].ageSeconds,59); assert.equal(hit.cache,'hit');
 s.setTime(60000); await s.service.read(); assert.equal(s.calls(),4);
});
test('concurrent cold requests share a single refresh',async()=>{
 const s=setup(); const results=await Promise.all(Array.from({length:25},()=>s.service.read()));
 assert.equal(s.calls(),2); assert.ok(results.every(r=>r.feeds.length===2));
});
test('failure retains old timestamp, is never green, and expires stale data',async()=>{
 const s=setup(); await s.service.read(); s.fail(); s.setTime(60000);
 const failed=await s.service.read(); assert.equal(failed.feeds[0].state,'stale');
 assert.equal(failed.feeds[0].retrievedAt,new Date(epoch).toISOString()); assert.equal(failed.feeds[0].green,false);
 assert.equal(failed.feeds[1].state,'success'); assert.equal(failed.pages[0].rows[1].trim(),'STALE');
 s.setTime(64000); await s.service.read(); assert.equal(s.calls(),4);
 s.setTime(65000); await s.service.read(); assert.equal(s.calls(),6);
 s.setTime(900001); const expired=await s.service.read(); assert.equal(expired.feeds[0].state,'unavailable');
 assert.equal(expired.feeds[0].retrievedAt,null); assert.equal(expired.feeds[1].state,'success');
});
test('returned results cannot corrupt the cache for later clients',async()=>{
 const s=setup(); const result=await s.service.read(); result.feeds[0].components.length=0;
 assert.equal((await s.service.read()).feeds[0].components.length,1);
});
test('HTTP routes reject arbitrary sources and writes before fetching',async t=>{
 const s=setup(); const server=createPagesServer(s.service); server.listen(0,'127.0.0.1'); await once(server,'listening');
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 assert.equal((await fetch(base+'/missing')).status,404);
 assert.equal((await fetch(base+'/api/pages?url=https://evil.test')).status,400);
 assert.equal((await fetch(base+'/api/pages',{method:'POST'})).status,405); assert.equal(s.calls(),0);
 const response=await fetch(base+'/api/pages'); assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.json(); assert.equal(body.mode,'live-reference'); assert.equal(body.pages.length,2);
 assert.ok(body.pages.every(p=>p.rows.length===24));
});
test('all failed sources are HTTP 503 with explicit unavailable data',async t=>{
 const service=createPagesService(providers,{fetcher:async()=>{throw new Error('offline')}});
 const server=createPagesServer(service); server.listen(0,'127.0.0.1'); await once(server,'listening');
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/pages`);
 assert.equal(response.status,503); const body=await response.json();
 assert.ok(body.feeds.every(f=>f.state==='unavailable' && !f.green));
});
