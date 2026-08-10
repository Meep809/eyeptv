const state = {
  channels: [],
  epg: new Map(),
  selected: null,
  demo: false,
  hours: 4
};

const $ = id => document.getElementById(id);
const now = () => new Date();

function fmtClock(d){
  return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
}
function fmtDate(d){
  return d.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"}).toUpperCase();
}
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function xmlText(el, tag){
  return el.querySelector(tag)?.textContent?.trim() || "";
}
function parseAttrs(line){
  const attrs={};
  for(const m of line.matchAll(/([A-Za-z0-9_-]+)="([^"]*)"/g)) attrs[m[1]]=m[2];
  return attrs;
}

async function fetchText(url){
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return await r.text();
}

function parseM3U(text, limit){
  const lines=text.split(/\r?\n/), out=[];
  let meta=null;
  for(const raw of lines){
    const line=raw.trim();
    if(line.startsWith("#EXTINF")){
      meta=parseAttrs(line);
      const comma=line.indexOf(",");
      meta.name=comma>=0?line.slice(comma+1).trim():(meta["tvg-name"]||"Channel");
    } else if(line && !line.startsWith("#") && meta){
      out.push({
        id:meta["tvg-id"]||meta["tvg-name"]||meta.name,
        name:meta.name,
        group:meta["group-title"]||"General",
        logo:meta["tvg-logo"]||"",
        url:line
      });
      meta=null;
      if(out.length>=limit) break;
    }
  }
  return out;
}

function parseXMLTV(text){
  const doc=new DOMParser().parseFromString(text,"application/xml");
  const map=new Map();
  for(const p of doc.querySelectorAll("programme")){
    const id=p.getAttribute("channel")||"";
    const start=parseXMLTVDate(p.getAttribute("start"));
    const stop=parseXMLTVDate(p.getAttribute("stop"));
    if(!id||!start||!stop) continue;
    const item={start,stop,title:xmlText(p,"title"),desc:xmlText(p,"desc")};
    if(!map.has(id)) map.set(id,[]);
    map.get(id).push(item);
  }
  for(const arr of map.values()) arr.sort((a,b)=>a.start-b.start);
  return map;
}

function parseXMLTVDate(s){
  if(!s) return null;
  const m=s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if(!m) return new Date(s);
  const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]));
  const tz=s.slice(14).trim();
  if(tz && /^[+-]\d{4}$/.test(tz)){
    const mins=(+tz.slice(1,3)*60 + +tz.slice(3));
    d.setUTCMinutes(d.getUTCMinutes() + (tz[0]==="+" ? -mins : mins));
  }
  return d;
}

function programsFor(ch, from, to){
  const arr=state.epg.get(ch.id)||state.epg.get(ch.name)||[];
  return arr.filter(p=>p.stop>from && p.start<to);
}

function renderClock(){
  $("clock").textContent=`${fmtDate(now())}  ${fmtClock(now())}`;
}
setInterval(renderClock,1000); renderClock();

function renderGuide(){
  const rows=$("guideRows"), head=$("timeHead");
  rows.innerHTML=""; head.innerHTML="";
  const from=new Date(); from.setMinutes(0,0,0);
  const to=new Date(from.getTime()+state.hours*3600000);
  const total=to-from;

  for(let h=0;h<=state.hours;h++){
    const x=(h*3600000/total)*100;
    const el=document.createElement("div");
    el.className="time-label"; el.style.left=x+"%"; el.textContent=fmtClock(new Date(from.getTime()+h*3600000));
    head.appendChild(el);
  }

  state.channels.forEach((ch,i)=>{
    const row=document.createElement("div"); row.className="guide-row";
    const cell=document.createElement("div"); cell.className="channel-cell";
    cell.innerHTML=`<div class="ch-number">${String(i+1).padStart(3,"0")}</div>
      <div class="ch-name" title="${esc(ch.name)}">${esc(ch.name)}</div>`;
    row.appendChild(cell);

    const programs=document.createElement("div"); programs.className="programs";
    const line=document.createElement("div"); line.className="nowline";
    line.style.left=((now()-from)/total*100)+"%"; programs.appendChild(line);

    const list=programsFor(ch,from,to);
    if(!list.length){
      const p=document.createElement("div"); p.className="program";
      p.style.left="0"; p.style.width="100%";
      p.innerHTML=`<div class="pt">${esc(ch.name)}</div><div class="ps">PROGRAM INFORMATION UNAVAILABLE</div>`;
      p.onclick=()=>selectChannel(ch);
      programs.appendChild(p);
    } else {
      list.forEach(pr=>{
        const left=Math.max(0,(pr.start-from)/total*100);
        const right=Math.min(100,(pr.stop-from)/total*100);
        const p=document.createElement("div"); p.className="program";
        p.style.left=left+"%"; p.style.width=Math.max(2,right-left)+"%";
        p.innerHTML=`<div class="pt">${esc(pr.title||"Untitled")}</div>
          <div class="ps">${esc(pr.desc||"")}</div>`;
        p.onclick=()=>selectChannel(ch,pr);
        programs.appendChild(p);
      });
    }
    row.appendChild(programs); rows.appendChild(row);
  });
}

function selectChannel(ch,pr=null){
  state.selected=ch;
  $("nowChannel").textContent=`${String(state.channels.indexOf(ch)+1).padStart(3,"0")}  ${ch.name}`;
  $("nowTitle").textContent=pr?.title || ch.name;
  $("nowDesc").textContent=pr?.desc || `${ch.group||"General"} • ${ch.url}`;
  $("videoMessage").style.display="flex";
}

async function watch(){
  const ch=state.selected;
  if(!ch) return;
  const video=$("video");
  $("videoMessage").style.display="none";
  try{
    if(window.Hls && Hls.isSupported()){
      if(window.__hls) window.__hls.destroy();
      const hls=new Hls({enableWorker:true});
      window.__hls=hls;
      hls.loadSource(ch.url); hls.attachMedia(video);
      hls.on(Hls.Events.ERROR,(e,data)=>{
        if(data.fatal) $("videoMessage").textContent="STREAM ERROR / CORS / SOURCE UNAVAILABLE";
      });
    }else{
      video.src=ch.url;
    }
    await video.play();
  }catch(e){
    $("videoMessage").textContent="UNABLE TO PLAY THIS CHANNEL";
    $("videoMessage").style.display="flex";
    console.error(e);
  }
}

function demoChannels(){
  state.demo=true;
  state.channels=[
    ["001","LOCAL CABLE INFO"],["002","ABC"],["003","NBC"],["004","CBS"],
    ["005","FOX"],["006","PBS"],["007","ESPN"],["008","THE WEATHER CHANNEL"],
    ["009","CNN"],["010","TBS"],["011","TNT"],["012","USA"],
    ["013","DISNEY CHANNEL"],["014","NICKELODEON"],["015","CARTOON NETWORK"],
    ["016","SKYLINE3"],["017","COMMUNITY ACCESS"],["018","LOCAL WEATHER"]
  ].map(([n,name])=>({id:n,name,group:"Demo",url:""}));
  state.epg=new Map();
  const t=new Date(); t.setMinutes(0,0,0);
  state.channels.forEach((c,i)=>{
    const arr=[];
    for(let h=-1;h<8;h++){
      const s=new Date(t.getTime()+h*3600000);
      arr.push({start:s,stop:new Date(s.getTime()+3600000),
        title:["News","Local Forecast","Movie","SportsCenter","Tonight","Programming"][i%6],
        desc:"DEMO PROGRAM • SKYLINE DIGITAL CABLE"});
    }
    state.epg.set(c.id,arr);
  });
  $("status").textContent="DEMO GUIDE ACTIVE";
  $("count").textContent=`${state.channels.length} CHANNELS`;
  renderGuide();
  selectChannel(state.channels[0]);
}

async function loadGuide(){
  const m3u=$("m3uUrl").value.trim(), epg=$("epgUrl").value.trim();
  const limit=Math.max(1,Math.min(5000,+$("limit").value||120));
  $("status").textContent="LOADING M3U…";
  try{
    const m3utxt=await fetchText(m3u);
    state.channels=parseM3U(m3utxt,limit);
    $("status").textContent="LOADING EPG…";
    try{
      const epgtxt=await fetchText(epg);
      state.epg=parseXMLTV(epgtxt);
    }catch(e){
      console.warn("EPG unavailable:",e);
      state.epg=new Map();
    }
    $("status").textContent="GUIDE READY";
    $("count").textContent=`${state.channels.length} CHANNELS`;
    renderGuide();
    if(state.channels[0]) selectChannel(state.channels[0]);
  }catch(e){
    $("status").textContent="LOAD FAILED — TRY DEMO CHANNELS";
    $("count").textContent=e.message;
    console.error(e);
  }
}

$("loadBtn").onclick=loadGuide;
$("demoBtn").onclick=demoChannels;
$("watchBtn").onclick=watch;
$("video").addEventListener("loadedmetadata",()=>{$("videoMessage").style.display="none"});
demoChannels();
