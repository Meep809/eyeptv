const S={channels:[],selected:null,epg:new Map(),day:0,hls:null,bannerTimer:null};
const $=id=>document.getElementById(id);
const demoNames=["LOCAL CABLE INFO","ABC","NBC","CBS","FOX","PBS","ESPN","THE WEATHER CHANNEL","CNN","TBS","TNT","USA NETWORK","DISNEY CHANNEL","NICKELODEON","CARTOON NETWORK","SKYLINE3","LOCAL WEATHER","COMMUNITY ACCESS"];
const demoTitles=["News","Local Forecast","Movie","SportsCenter","Tonight","Programming","Late Night","Weather Update"];

function clock(){let d=new Date();$("clock").textContent=d.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"}).toUpperCase()+"  "+d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});}
setInterval(clock,1000);clock();

function makeDemo(){
 S.channels=demoNames.map((name,i)=>({id:String(i+1).padStart(3,"0"),name,url:"",group:"Demo"}));
 S.epg=new Map();
 const base=new Date();base.setMinutes(0,0,0);base.setHours(base.getHours()-1);
 S.channels.forEach((c,i)=>{let a=[];for(let h=0;h<12;h++){let st=new Date(base.getTime()+h*3600000);a.push({start:st,stop:new Date(st.getTime()+3600000),title:demoTitles[(i+h)%demoTitles.length],desc:"EyePTV demonstration programming"});}S.epg.set(c.id,a);});
 $("status").textContent="DEMO GUIDE";render();select(S.channels[0],S.epg.get(S.channels[0].id)[1]);
}
function timeLabel(d){return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});}
function currentBlock(ch){
 let a=S.epg.get(ch.id)||[];let n=new Date();return a.find(x=>x.start<=n&&x.stop>n)||a.find(x=>x.stop>n)||a[0];
}
function render(){
 const g=$("guide");g.innerHTML="";
 let base=new Date();base.setHours(base.getHours()+S.day,0,0,0);base.setMinutes(0,0,0);
 let tr=document.createElement("div");tr.className="time-row";
 tr.innerHTML="<div class='time-cell'>CH</div>";
 for(let h=0;h<6;h++){let x=new Date(base.getTime()+h*3600000);tr.innerHTML+=`<div class="time-cell">${timeLabel(x)}</div>`}
 g.appendChild(tr);
 $("dayLabel").textContent=S.day===0?"TODAY":S.day>0?new Date(base).toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"}).toUpperCase():"PREVIOUS DAY";
 S.channels.forEach((ch,i)=>{
  let row=document.createElement("div");row.className="channel-row";
  let c=document.createElement("div");c.className="ch";c.innerHTML=`<div class="chnum">${String(i+1).padStart(3,"0")}</div><div class="chname">${esc(ch.name)}</div>`;row.appendChild(c);
  let arr=S.epg.get(ch.id)||[];
  for(let h=0;h<6;h++){
   let st=new Date(base.getTime()+h*3600000),pr=arr.find(p=>p.start<=st&&p.stop>st)||arr.find(p=>p.start>=st);
   let p=document.createElement("div");p.className="program";
   if(pr){p.innerHTML=`<div class="pname">${esc(pr.title)}</div><div class="ptime">${timeLabel(pr.start)} – ${timeLabel(pr.stop)}</div>`;p.onclick=()=>select(ch,pr);}
   else{p.innerHTML="<div class='pname'>No information</div>";p.onclick=()=>select(ch,null);}
   if(pr&&pr.start<=new Date()&&pr.stop>new Date())p.classList.add("now");
   row.appendChild(p);
  }
  g.appendChild(row);
 });
}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function select(ch,pr){
 S.selected={ch,pr};
 let n=String(S.channels.indexOf(ch)+1).padStart(3,"0");
 $("channelNo").textContent=n;$("channelName").textContent=ch.name;$("programName").textContent=pr?.title||"No program information";
 document.querySelectorAll(".program").forEach(x=>x.classList.remove("selected"));
 if(ch.url) playPreview(ch.url);
}
function playPreview(url){
 if(!url)return;
 $("previewPlaceholder").style.display="none";
 let v=$("video");
 if(S.hls){S.hls.destroy();S.hls=null;}
 if(window.Hls&&Hls.isSupported()){S.hls=new Hls();S.hls.loadSource(url);S.hls.attachMedia(v);}
 else v.src=url;
 v.play().catch(()=>{});
}
function watchFull(){
 if(!S.selected)return;
 let {ch,pr}=S.selected,n=String(S.channels.indexOf(ch)+1).padStart(3,"0");
 $("fullscreen").classList.add("active");$("fullNo").textContent=n;$("fullChannel").textContent=ch.name;
 $("fullProgram").textContent=pr?.title||"No program information";$("fullDesc").textContent=pr?.desc||"";
 $("channelBanner").style.opacity="1";clearTimeout(S.bannerTimer);S.bannerTimer=setTimeout(()=>$("channelBanner").style.opacity="0",4500);
 let fv=$("fullVideo");
 if(ch.url){
   if(window.Hls&&Hls.isSupported()){let h=new Hls();h.loadSource(ch.url);h.attachMedia(fv);fv.play().catch(()=>{});S.fullHls=h;}
   else{fv.src=ch.url;fv.play().catch(()=>{});}
 }else{$("fullBlack").style.background="radial-gradient(circle,#182d45 0,#000 70%)";}
}
function exitFull(){
 $("fullscreen").classList.remove("active");$("fullVideo").pause();
 if(S.fullHls){S.fullHls.destroy();S.fullHls=null;}
}
$("watch").onclick=watchFull;
$("fullscreen").onclick=e=>{if(e.target.id==="fullscreen")exitFull();}
$("prevDay").onclick=()=>{S.day=Math.max(-2,S.day-1);render();}
$("nextDay").onclick=()=>{S.day=Math.min(2,S.day+1);render();}
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"||e.key.toLowerCase()==="g"){exitFull();return;}
 if(e.key==="Enter"){if($("fullscreen").classList.contains("active"))return;watchFull();return;}
 if(e.key==="ArrowUp"&&!S.selected){select(S.channels[0],currentBlock(S.channels[0]));}
});
makeDemo();
