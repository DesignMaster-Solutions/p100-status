// Codex-built data pagination reference, not a Kiro artifact or browser renderer.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {normalizeFeed} from './feed-probe.mjs';

const severity = {major_outage:0, partial_outage:1, degraded_performance:2, under_maintenance:3, unknown:4, operational:5};
const codes = {major_outage:'MAJ', partial_outage:'PAR', degraded_performance:'DEG', under_maintenance:'MNT', unknown:'UNK', operational:' OK'};
// Printable ASCII means one character is one grid cell. Originals remain in data.
const ascii = text => String(text ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[\x00-\x1f\x7f]/g,' ').replace(/[^\x20-\x7e]/gu,'?');
const row = text => ascii(text).slice(0,40).padEnd(40,' ');
const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;

export function componentPages(feed) {
  if (!Number.isInteger(feed.page) || feed.page < 101 || feed.page > 198) throw new Error('Invalid base page');
  const components = [...(feed.components ?? [])].sort((a,b) =>
    (severity[a.status] ?? 4) - (severity[b.status] ?? 4) || compare(a.id,b.id));
  const incidentsKnown = feed.incidentsAvailability === 'known';
  const incidents = incidentsKnown ? (feed.incidents ?? []) : [];
  const counts = {components:components.length,affected:components.filter(c=>c.status!=='operational').length,
    incidents:incidentsKnown?incidents.length:null};
  const items=[];
  const add = (kind,record,index) => {
    const original=String(record.name ?? '(untitled)');
    const text=ascii(original) || '(unnamed)';
    const chunks=text.match(/.{1,36}/g);
    chunks.forEach((text,i)=>items.push({kind,id:String(record.id ?? `${kind}-${index}`),
      status:kind==='component'?(record.status ?? 'unknown'):'incident',original,text,part:i+1,parts:chunks.length}));
  };
  // Incidents first, then affected components, then healthy components.
  incidents.forEach((record,index)=>add('incident',record,index));
  components.forEach((record,index)=>add('component',record,index));
  const total=Math.max(1,Math.ceil(items.length/18));
  const pages=[];
  for(let offset=0;offset<total;offset++) {
    const section=items.slice(offset*18,(offset+1)*18);
    const content=section.map(item=>row(`${item.kind==='incident'?'INC':codes[item.status]??'UNK'} ${item.text}`));
    while(content.length<18) content.push(row(''));
    const label=feed.state==='unavailable'?'NO SIGNAL':feed.state==='stale'?'STALE':feed.label??'UNKNOWN';
    pages.push({page:feed.page,key:`${feed.page}/${offset+1}`,subpage:offset+1,total,
      state:feed.state,green:feed.state==='success'&&feed.green===true,counts,
      source:feed.source??null,retrievedAt:feed.retrievedAt??null,items:section,
      rows:[row(`P${feed.page} ${feed.provider} ${offset+1}/${total}`),row(label),
        row(`Components: ${counts.components} Affected: ${counts.affected}`),
        row(`Incidents: ${counts.incidents??'UNKNOWN'}`),...content,
        row(`Fetched ${feed.retrievedAt??'NEVER'}`),row('INC incident | MAJ PAR DEG MNT UNK OK')],
    });
  }
  return pages;
}

// Navigation is separate from vendor pages so existing API consumers stay compatible.
export function deskPages(feeds) {
  if(feeds.length>6) throw new Error('The desk supports at most six providers');
  const seen=new Set();
  const entries=feeds.map(feed=>{
    if(!Number.isInteger(feed.page)||feed.page<101||feed.page>198||seen.has(feed.page))
      throw new Error('Invalid or duplicate vendor page');
    seen.add(feed.page);
    return {page:feed.page,provider:feed.provider,state:feed.state,
      label:feed.state==='unavailable'?'NO SIGNAL':feed.state==='stale'?'STALE':feed.label==='NONE'?(feed.green===true?'OPERATIONAL':'CHECK DETAILS'):feed.label??'UNKNOWN',
      green:feed.state==='success'&&feed.green===true,source:feed.source??null,
      retrievedAt:feed.retrievedAt??null,ageSeconds:feed.ageSeconds??null};
  });
  const make=(page,title,lines,extra)=>{
    const rows=[row(`P${page} ${title}`),...lines.map(row)];
    if(rows.length>23) throw new Error('Desk page overflow');
    while(rows.length<23) rows.push(row(''));
    rows.push(row('100 Index | 101-106 Vendor | 199 About'));
    return {page,key:`${page}/1`,subpage:1,total:1,rows,...extra};
  };
  const indexLines=['Vendor status, not customer uptime',''];
  for(const e of entries) {
    indexLines.push(`${e.page} ${ascii(e.provider).slice(0,18)} ${e.label}`);
    indexLines.push(`    Source age: ${e.ageSeconds===null?'NEVER':`${e.ageSeconds}s`}`);
    indexLines.push('');
  }
  if(!entries.length) indexLines.push('NO SOURCES - status unknown');
  const sources=entries.map(e=>({page:e.page,provider:e.provider,url:e.source,retrievedAt:e.retrievedAt}));
  const aboutLines=['Public vendor reports only.','Not active monitoring or an SLA.','No claim about your customer uptime.',
    'NO SIGNAL = request/schema failed.','STALE = last successful source data.','UNKNOWN does not mean operational.',
    'Age is time since retrieval, not','time since the vendor last changed.','Missing incidents are not zero.',
    'Full source URLs accompany this page.',''];
  sources.forEach(s=>aboutLines.push(`${s.page} ${s.provider}: source in metadata`));
  return [make(100,'SERVICE INDEX',indexLines,{entries,green:entries.length>0&&entries.every(e=>e.green)}),
    make(199,'SOURCES AND LIMITS',aboutLines,{sources,green:false})];
}

async function main() {
  if(process.argv.length!==2) throw new Error('Usage: node tools/component-pages.mjs (historical fixtures only)');
  const providers=JSON.parse(await readFile(new URL('../fixtures/manifest.json',import.meta.url)));
  const results=[];
  for(const [index,p] of providers.entries()) {
    const payload=JSON.parse(await readFile(new URL(`../${p.file}`,import.meta.url)));
    const pages=componentPages({...normalizeFeed(p,payload,p.captured_at),page:101+index});
    results.push({provider:p.id,basePage:pages[0].page,subpages:pages.length,counts:pages[0].counts,
      coveredComponents:pages.flatMap(p=>p.items).filter(i=>i.kind==='component'&&i.part===1).length,
      firstPage:pages[0].rows});
  }
  console.log(JSON.stringify({mode:'historical-fixtures',results},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
