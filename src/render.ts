// The teletext client, inline (no build step). renderHtml embeds the pages JSON
// so the first paint needs no extra round-trip; the client also re-fetches
// /api/pages to refresh. Provider text is written with textContent only.

import type { BuildResult } from './pages.js';

export function renderHtml(result: BuildResult): string {
  const data = JSON.stringify(result).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>P100 DMS-TXT</title>
<style>
  :root{
    /* The 8 teletext colours */
    --tt-black:#000; --tt-red:#f00; --tt-green:#0f0; --tt-yellow:#ff0;
    --tt-blue:#00f; --tt-magenta:#f0f; --tt-cyan:#0ff; --tt-white:#fff;
    --cell: 2.1vmin;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;height:100%;background:#111;color:var(--tt-white);
    font-family:"Cascadia Mono",Menlo,Consolas,"Courier New",monospace;}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:1.2vmin;padding:1.5vmin;min-height:100vh;}
  .set{position:relative;background:#000;border-radius:1.2vmin;
    padding:1.6vmin;box-shadow:0 0 0 1.2vmin #0a0a0a,0 0 6vmin rgba(0,255,0,.08);}
  /* 40x24 grid rendered as fixed-width rows; scales via --cell */
  .screen{position:relative;font-size:var(--cell);line-height:1.12;
    letter-spacing:0;white-space:pre;background:#000;overflow:hidden;}
  .row{display:block;height:1.12em;}
  .row.dh{transform:scaleY(2);transform-origin:top;height:2.24em;font-weight:700;
    color:var(--tt-cyan);}
  .c-header{color:var(--tt-cyan);}
  .c-green{color:var(--tt-green);} .c-red{color:var(--tt-red);}
  .c-yellow{color:var(--tt-yellow);} .c-cyan{color:var(--tt-cyan);}
  .c-white{color:var(--tt-white);} .c-blue{color:var(--tt-blue);}
  .c-magenta{color:var(--tt-magenta);}
  .flash{animation:flash 0.8s steps(1) infinite;}
  @keyframes flash{50%{opacity:0.15;}}
  /* CRT scanlines + faint flicker overlay */
  .screen::after{content:"";position:absolute;inset:0;pointer-events:none;
    background:repeating-linear-gradient(to bottom,
      rgba(0,0,0,0) 0,rgba(0,0,0,0) 2px,rgba(0,0,0,.28) 3px,rgba(0,0,0,0) 4px);
    animation:flicker 6s infinite;}
  @keyframes flicker{0%,100%{opacity:.9;}48%{opacity:.75;}52%{opacity:1;}}
  .logo{display:flex;gap:.6vmin;align-items:center;margin-bottom:.6vmin;}
  .logo pre{margin:0;font-size:calc(var(--cell)*.8);line-height:1;color:var(--tt-yellow);}
  .logo .sub{color:var(--tt-green);font-size:calc(var(--cell)*.9);}
  .bar{display:flex;gap:.8vmin;flex-wrap:wrap;justify-content:center;max-width:46ch;}
  button{font:inherit;font-size:calc(var(--cell)*.9);border:0.2vmin solid #444;
    background:#1a1a1a;color:var(--tt-white);border-radius:.6vmin;
    padding:.8vmin 1.2vmin;min-width:3.4ch;cursor:pointer;}
  button:focus-visible{outline:.3vmin solid var(--tt-yellow);outline-offset:.2vmin;}
  button.red{border-color:var(--tt-red);} button.green{border-color:var(--tt-green);}
  button.yellow{border-color:var(--tt-yellow);} button.cyan{border-color:var(--tt-cyan);}
  .entry{color:var(--tt-cyan);min-height:1.4em;font-size:calc(var(--cell)*.95);}
  .err{color:var(--tt-red);}
  .hint{color:#888;font-size:calc(var(--cell)*.8);max-width:46ch;text-align:center;}
  @media (max-width:420px){ :root{--cell:4.2vw;} }
  @media (prefers-reduced-motion: reduce){
    .flash{animation:none;opacity:1;}
    .screen::after{animation:none;opacity:.5;}
  }
</style>
</head>
<body>
  <div class="logo" aria-hidden="true">
    <pre>█▀█ ▄█ █▀█ █▀█
█▀▀ ░█ █▄█ █▄█</pre>
    <span class="sub">DMS-TXT</span>
  </div>
  <div class="set">
    <div class="screen" id="screen" role="img" aria-label="Teletext page"></div>
  </div>
  <div class="entry" id="entry" aria-live="polite">PAGE ___</div>
  <div class="bar" id="remote" aria-label="Teletext remote">
    <button class="red" data-key="red" title="Index (100)">RED 100</button>
    <button class="green" data-key="green" title="Previous subpage">GRN &lt;</button>
    <button class="yellow" data-key="yellow" title="Next subpage">YEL &gt;</button>
    <button class="cyan" data-key="cyan" title="About (199)">CYN 199</button>
  </div>
  <div class="bar" id="keypad" aria-label="Number keys"></div>
  <p class="hint">Type a page number (100, 101-106, 199). Backspace edits, Escape clears.
     Red=index, Green/Yellow=subpages, Cyan=about.</p>

<script>
(function(){
  "use strict";
  var DATA = ${data};
  var screenEl = document.getElementById('screen');
  var entryEl = document.getElementById('entry');
  var pages = {};        // "102/2" -> page
  var byBase = {};        // 102 -> [subpage keys sorted]
  var order = [];         // base page numbers in display order
  var current = 100, sub = 1, buffer = "";

  function index(result){
    pages = {}; byBase = {}; order = [];
    result.pages.forEach(function(p){
      pages[p.key] = p;
      (byBase[p.page] = byBase[p.page] || []).push(p);
      if(order.indexOf(p.page) === -1) order.push(p.page);
    });
    Object.keys(byBase).forEach(function(b){
      byBase[b].sort(function(a,c){return a.subpage - c.subpage;});
    });
  }

  function colourFor(line){
    if(/MAJOR|MAJ |NO SIGNAL|CRITICAL/.test(line)) return 'c-red';
    if(/STALE|UNKNOWN|UNK |MINOR|PAR |DEG /.test(line)) return 'c-yellow';
    if(/ OK |OPERATIONAL|NONE/.test(line)) return 'c-green';
    return 'c-white';
  }

  function draw(page){
    screenEl.textContent = '';
    // Grid row 0 is rendered as the live double-height header (clock).
    // Rows 1..23 are the page body. Total visible lines stay at 24.
    var header = document.createElement('span');
    header.className = 'row dh';
    screenEl.appendChild(header);
    for(var i=1;i<page.rows.length;i++){
      var span = document.createElement('span');
      span.className = 'row ' + colourFor(page.rows[i]);
      if(page.flashing && /MAJOR/.test(page.rows[i])) span.className += ' flash';
      span.textContent = page.rows[i];
      screenEl.appendChild(span);
    }
    updateHeader(header);
    screenEl.setAttribute('aria-label', 'Teletext page ' + page.key + ' ' + page.rows.join(' ').trim());
    screenEl._header = header;
  }

  function pad(n){return (n<10?'0':'')+n;}
  var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function updateHeader(el){ el.textContent = headerText(); }
  function headerText(){
    var d = new Date();
    var stamp = DAYS[d.getDay()]+' '+pad(d.getDate())+' '+MON[d.getMonth()]+' '
      +pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
    return ('P'+current+' P100 DMS-TXT  '+stamp).slice(0,40);
  }
  function tick(){
    if(screenEl._header) screenEl._header.textContent = headerText();
  }

  function show(base, wantSub){
    var list = byBase[base];
    if(!list || !list.length){ error('NO SUCH PAGE'); return; }
    current = base;
    sub = Math.min(Math.max(1, wantSub||1), list.length);
    draw(list[sub-1]);
    entryEl.className = 'entry';
    entryEl.textContent = 'PAGE '+base+(list.length>1?('  '+sub+'/'+list.length):'');
  }
  function error(msg){
    entryEl.className = 'entry err';
    entryEl.textContent = msg;
  }

  function feedDigit(d){
    buffer = (buffer + d).slice(-3);
    entryEl.className='entry';
    entryEl.textContent = 'PAGE '+buffer.padEnd(3,'_');
    if(buffer.length===3){
      var n = parseInt(buffer,10);
      buffer='';
      if(byBase[n]) show(n,1); else error('NO SUCH PAGE '+n);
    }
  }

  function handleKey(k){
    if(k==='red') return show(100,1);
    if(k==='cyan') return show(199,1);
    if(k==='green') return show(current, sub-1);
    if(k==='yellow') return show(current, sub+1);
  }

  document.addEventListener('keydown', function(e){
    if(e.key>='0' && e.key<='9'){ feedDigit(e.key); e.preventDefault(); }
    else if(e.key==='Backspace'){ buffer=buffer.slice(0,-1);
      entryEl.className='entry'; entryEl.textContent='PAGE '+buffer.padEnd(3,'_'); e.preventDefault(); }
    else if(e.key==='Escape'){ buffer=''; entryEl.className='entry'; entryEl.textContent='PAGE ___'; }
    else if(e.key==='ArrowLeft'){ show(current, sub-1); }
    else if(e.key==='ArrowRight'){ show(current, sub+1); }
  });

  // On-screen number keypad 0-9.
  var keypad = document.getElementById('keypad');
  for(var n=0;n<=9;n++){
    (function(v){
      var b=document.createElement('button');
      b.textContent=String(v); b.setAttribute('aria-label','Digit '+v);
      b.addEventListener('click', function(){ feedDigit(String(v)); });
      keypad.appendChild(b);
    })(n);
  }
  document.getElementById('remote').addEventListener('click', function(e){
    var t = e.target.closest('button'); if(t) handleKey(t.getAttribute('data-key'));
  });

  async function refresh(){
    try{
      var r = await fetch('/api/pages', {headers:{'accept':'application/json'}});
      if(r.ok){ index(await r.json()); var keep=current, ks=sub; index_rerender(keep,ks); }
    }catch(_){ /* keep last good render */ }
  }
  function index_rerender(base, s){ if(byBase[base]) show(base, s); }

  index(DATA);
  show(100,1);
  setInterval(tick, 1000);
  tick();
  setInterval(refresh, 60000);
})();
</script>
</body>
</html>`;
}
