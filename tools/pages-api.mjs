// Codex reference server, not a Cloudflare Worker or evidence of Kiro use.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {probeAll} from './feed-probe.mjs';
import {componentPages, deskPages} from './component-pages.mjs';

export function createPagesService(providers, {fetcher=fetch, now=()=>new Date(),
  ttlMs=60000, retryMs=5000, maxStaleMs=900000}={}) {
  // State belongs to one local server instance. Do not copy this into Worker globals.
  let feeds=null, nextRefresh=0, inFlight=null;
  const previous={};
  async function refresh() {
    const at=now().getTime();
    for(const [id,feed] of Object.entries(previous)) {
      const age=at-Date.parse(feed.retrievedAt);
      if(age<0 || age>maxStaleMs) delete previous[id];
    }
    const fresh=await probeAll(providers,{fetcher,now,cached:previous});
    for(const feed of fresh) if(feed.state==='success') previous[feed.provider]=feed;
    feeds=fresh;
    nextRefresh=now().getTime()+(feeds.every(f=>f.state==='success')?ttlMs:retryMs);
  }
  return {async read() {
    const cached=feeds!==null && now().getTime()<nextRefresh;
    if(!cached) {
      if(!inFlight) inFlight=refresh().finally(()=>{inFlight=null});
      await inFlight;
    }
    const at=now();
    const current=structuredClone(feeds).map(feed=>{
      const age=feed.retrievedAt===null?null:Math.max(0,Math.floor((at-Date.parse(feed.retrievedAt))/1000));
      if(feed.state==='stale' && at-Date.parse(feed.retrievedAt)>maxStaleMs) {
        return {provider:feed.provider,source:feed.source,page:feed.page,state:'unavailable',label:'NO SIGNAL',
          green:false,indicator:'unknown',retrievedAt:null,ageSeconds:null,error:'Last successful data expired'};
      }
      return {...feed,ageSeconds:age};
    });
    return {mode:'live-reference',checkedAt:at.toISOString(),cache:cached?'hit':'refresh',
      degraded:current.some(f=>f.state!=='success'),feeds:current,navigation:deskPages(current),pages:current.flatMap(componentPages)};
  }};
}

export function createPagesServer(service) {
  return createServer(async (req,res)=>{
    const send=(status,body,extra={})=>{
      res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff',...extra});
      res.end(JSON.stringify(body));
    };
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname!=='/api/pages') return send(404,{error:'Not found'});
      if(req.method!=='GET') return send(405,{error:'GET only'},{Allow:'GET'});
      if(url.search) return send(400,{error:'Query parameters are not supported; sources are fixed'});
      const body=await service.read();
      send(body.feeds.every(f=>f.state==='unavailable')?503:200,body);
    } catch(error) {
      console.error(JSON.stringify({event:'pages-api-error',message:String(error.message).slice(0,200)}));
      send(500,{error:'Unable to build status pages'});
    }
  });
}

async function main() {
  const providers=JSON.parse(await readFile(new URL('../fixtures/manifest.json',import.meta.url)));
  const port=Number(process.env.P100_PORT ?? 8789);
  if(!Number.isInteger(port)||port<0||port>65535) throw new Error('Invalid P100_PORT');
  const server=createPagesServer(createPagesService(providers));
  server.on('error',error=>{console.error(error.message);process.exitCode=1});
  server.listen(port,'127.0.0.1',()=>console.log(`P100 reference API: http://127.0.0.1:${server.address().port}/api/pages`));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  main().catch(error=>{console.error(error.message);process.exitCode=1});
}
