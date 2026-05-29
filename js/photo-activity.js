const PA_C = document.getElementById('pa-canvas');
const paCtx = PA_C.getContext('2d');

const dailyMap = {};
DAILY_DATA.forEach(d => { dailyMap[d.date] = d.count; });
const monthlyTotals = {};
DAILY_DATA.forEach(d => {
  const m = d.date.slice(0, 7);
  monthlyTotals[m] = (monthlyTotals[m] || 0) + d.count;
});

let PA_GLOBAL_STATS = null;
(function() {
  const peakE = Object.entries(monthlyTotals).sort((a,b)=>b[1]-a[1])[0];
  const [pmY,pmM] = peakE[0].split('-').map(Number);
  const pmLabel = new Date(pmY,pmM-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const sorted = DAILY_DATA.map(d=>d.date).sort();
  let maxS=1,curS=1;
  for(let i=1;i<sorted.length;i++){
    const diff=(new Date(sorted[i])-new Date(sorted[i-1]))/86400000;
    curS=diff===1?curS+1:1; maxS=Math.max(maxS,curS);
  }
  const maxDay = DAILY_DATA.reduce((a,b)=>b.count>a.count?b:a);
  const maxDayLbl = new Date(maxDay.date+'T12:00:00')
    .toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  PA_GLOBAL_STATS={peakMonth:pmLabel,peakCount:peakE[1].toLocaleString()+' photos',streak:maxS,maxDay:maxDay.count.toLocaleString()+' photos',maxDate:maxDayLbl};
  paSetStoryCards(PA_GLOBAL_STATS);
})();
function paSetStoryCards(s){
  document.getElementById('pa-story-peak-month').textContent=s.peakMonth;
  document.getElementById('pa-story-peak-count').textContent=s.peakCount;
  document.getElementById('pa-story-streak').textContent=s.streak;
  document.getElementById('pa-story-max-day').textContent=s.maxDay;
  document.getElementById('pa-story-max-date').textContent=s.maxDate;
}
function paUpdateStoryCards(year){
  const mE=Object.entries(monthlyTotals).filter(([k])=>k.startsWith(String(year))).sort((a,b)=>b[1]-a[1]);
  const peakMonth=mE.length?new Date(...mE[0][0].split('-').map((v,i)=>i===1?Number(v)-1:Number(v)),1).toLocaleDateString('en-US',{month:'long',year:'numeric'}):'N/A';
  const peakCount=mE.length?mE[0][1].toLocaleString()+' photos':'N/A';
  const yDates=DAILY_DATA.filter(d=>d.date.startsWith(String(year))).map(d=>d.date).sort();
  let maxS=yDates.length?1:0,curS=1;
  for(let i=1;i<yDates.length;i++){const diff=(new Date(yDates[i])-new Date(yDates[i-1]))/86400000;curS=diff===1?curS+1:1;maxS=Math.max(maxS,curS);}
  const yData=DAILY_DATA.filter(d=>d.date.startsWith(String(year)));
  const maxDay=yData.length?yData.reduce((a,b)=>b.count>a.count?b:a):null;
  const maxDayLbl=maxDay?new Date(maxDay.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'N/A';
  paSetStoryCards({peakMonth,peakCount,streak:maxS||'N/A',maxDay:maxDay?maxDay.count.toLocaleString()+' photos':'N/A',maxDate:maxDayLbl});
}

// sequential blue→purple for heatmap cells
function paColorForCount(c,mx){
  if(!c) return '#F1F5F9';
  const r=c/mx;
  if(r<0.12) return '#DBEAFE';
  if(r<0.30) return '#93C5FD';
  if(r<0.55) return '#3B82F6';
  if(r<0.80) return '#2563EB';
  return '#7C3AED';
}
function paRgbParts(col){
  if(!col) return [0,0,0];
  if(col[0]==='#'){
    const h=col.slice(1);
    const v=h.length===3?h.split('').map(ch=>ch+ch).join(''):h;
    return [parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16)];
  }
  const m=col.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m?[+m[1],+m[2],+m[3]]:[0,0,0];
}
function paMixColor(a,b,t){
  const ca=paRgbParts(a), cb=paRgbParts(b), k=clamp(t,0,1);
  return `rgb(${Math.round(lerp(ca[0],cb[0],k))},${Math.round(lerp(ca[1],cb[1],k))},${Math.round(lerp(ca[2],cb[2],k))})`;
}
function paColorForSession(c,mx){
  const r=Math.max(0,Math.min(1,(c||0)/mx));
  const scale=d3.scaleLinear().domain([0,0.5,1]).range(['#93C5FD','#2563EB','#7C3AED']).interpolate(d3.interpolateRgb);
  return scale(r);
}
// Blue shared by all-years bars (2021/2022/2026) and Winter months after drill-down
const PA_BAR_BLUE = '#3B82F6';
// sequential blue→purple per month index 0..11 (used for sessions chart)
function paMonthCol(i){
  const t=i/11;
  return `rgb(${Math.round(lerp(0x25,0x8B,t))},${Math.round(lerp(0x63,0x5C,t))},${Math.round(lerp(0xEB,0xF6,t))})`;
}
// season-tinted colour for monthly bar chart - tones match the heatmap palette
function paSeasonCol(monthIdx){
  if(monthIdx<=2) return PA_BAR_BLUE; // Winter - same blue as yearly bar chart
  if(monthIdx<=5) return P.g3;      // Spring  - same teal as yearly chart (e.g. 2023 bar)
  if(monthIdx<=8) return '#F97316'; // Summer  - exact heatmap accent orange
  return '#8B5CF6';                  // Autumn  - exact heatmap purple end
}

const YR_BAR_COLS = {2021:PA_BAR_BLUE,2022:PA_BAR_BLUE,2023:P.g3,2024:P.g6,2025:P.g8,2026:PA_BAR_BLUE};
const PA_PEAK = YEAR_DATA.reduce((a,b)=>b.count>a.count?b:a).year;
const PA_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PA_MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];


// paView: 'years' | 'months' | 'heatmap' | 'morphing'
let paView='years', paYear=null, paHits=[], paAnimAF=null, paHighlightSession=null, paPinnedSession=null;
function paRedrawCanvas(){
  if(paView!=='detail'||!paYear)return;
  const cssW=paCSSW(),cssH=PA_C.height/((window.devicePixelRatio||1));
  paCtx.clearRect(0,0,cssW,cssH);
  _renderDetail(paYear,cssW);
}

function paDPR(){ return window.devicePixelRatio||1; }
function paSetSize(cssW,cssH){
  const dpr=paDPR();
  PA_C.width=cssW*dpr; PA_C.height=cssH*dpr;
  PA_C.style.width=cssW+'px'; PA_C.style.height=cssH+'px';
  paCtx.setTransform(dpr,0,0,dpr,0,0);
}
function paCSSW(){ return cardInnerWidth(PA_C); }

function drawYears(animT=1){
  const paLegend=document.getElementById('pa-legend');
  paLegend.style.transition='';
  paLegend.style.opacity='1';
  paHits=[];
  const cssW=paCSSW(), cssH=vizH(340);
  paSetSize(cssW,cssH);
  paCtx.clearRect(0,0,cssW,cssH);
  const PL=56,PR=16,PT=30,PB=50,PW=cssW-PL-PR,PH=cssH-PT-PB;
  const yearDisplay=YEAR_DATA.filter(d=>d.year!==2021);
  const n=yearDisplay.length, gap=PW/n, barW=Math.min(Math.floor(gap*0.55),90);
  const mx=Math.max(...yearDisplay.map(d=>d.count));

  [4000,8000,12000,16000].forEach(t=>{
    const y=PT+(1-t/mx)*PH;
    paCtx.strokeStyle=P.dim; paCtx.lineWidth=0.8;
    paCtx.beginPath();paCtx.moveTo(PL,y);paCtx.lineTo(PL+PW,y);paCtx.stroke();
    paCtx.fillStyle=P.muted; paCtx.font='13px Inter'; paCtx.textAlign='right';
    paCtx.fillText(t>=1000?(t/1000)+'k':t,PL-6,y+4);
  });
  paCtx.strokeStyle=P.dim; paCtx.lineWidth=1;
  paCtx.beginPath();paCtx.moveTo(PL,PT);paCtx.lineTo(PL,PT+PH);paCtx.lineTo(PL+PW,PT+PH);paCtx.stroke();

  yearDisplay.forEach((d,i)=>{
    const cx=PL+(i+.5)*gap;
    const fullBH=(d.count/mx)*PH;
    const bh=fullBH*animT;
    const by=PT+PH-bh;
    const isPeak=d.year===PA_PEAK;
    const col=isPeak?P.accent:(YR_BAR_COLS[d.year]||P.g1);
    paCtx.globalAlpha=d.partial?0.35:1;
    paCtx.fillStyle=col;
    paCtx.beginPath();paCtx.roundRect(cx-barW/2,by,barW,bh,[4,4,0,0]);paCtx.fill();
    paCtx.globalAlpha=1;
    if(animT>0.8&&i>0&&!d.partial&&!yearDisplay[i-1].partial){
      const prev=yearDisplay[i-1];
      const pct=(d.count-prev.count)/prev.count*100;
      paCtx.globalAlpha=Math.min((animT-0.8)/0.2,1);
      paCtx.fillStyle=col;
      paCtx.font='500 13px Inter'; paCtx.textAlign='center';
      paCtx.fillText((pct>=0?'+':'')+pct.toFixed(0)+'%',cx,by-18);
      paCtx.globalAlpha=1;
    }
    if(animT>0.5){
      paCtx.globalAlpha=clamp((animT-0.5)/0.3,0,1);
      const lbl=d.count>=1000?(d.count/1000).toFixed(1)+'k':String(d.count);
      paCtx.fillStyle=P.muted;
      paCtx.font=(isPeak?'500 ':'')+'13px Inter'; paCtx.textAlign='center';
      paCtx.fillText(lbl,cx,by-6);
      paCtx.globalAlpha=1;
    }
    paCtx.fillStyle=P.muted;
    paCtx.font='14px Inter'; paCtx.textAlign='center';
    paCtx.fillText(String(d.year),cx,PT+PH+16);
    if(!d.partial) paHits.push({
      type:'year', x:cx-barW/2, y:by, w:barW, h:PT+PH-by+20,
      year:d.year,
      _a:{barCX:cx,barTop:by,barW,barH:bh,PL,PW,PT,PH,W:cssW,H:cssH}
    });
  });

  const lg=document.getElementById('pa-legend'); lg.innerHTML='';
  YEAR_DATA.filter(d=>d.year!==2021).forEach(d=>{
    const isPeak=d.year===PA_PEAK;
    const col=isPeak?P.accent:(YR_BAR_COLS[d.year]||P.g1);
    lg.innerHTML+=`<div class="li" style="opacity:${d.partial?0.45:1}"><div class="li-dot" style="background:${col}"></div>${d.year}</div>`;
  });
  document.getElementById('pa-sub').textContent='';
  document.getElementById('pa-breadcrumb').innerHTML='';
}

function paEnterYears(){
  hideTT();
  paView='years'; paYear=null; paHits=[]; paPinnedSession=null; paHighlightSession=null;
  document.getElementById('pa-panel').style.display='none';
  document.getElementById('pa-session-card').style.display='none';
  document.getElementById('pa-sessions-timeline').style.display='none';
  const story=document.getElementById('pa-story');
  story.style.display='flex';
  story.style.opacity='1';
  story.style.maxHeight='';
  story.style.marginTop='32px';
  story.style.marginBottom='24px';
  story.style.transform='translateY(0)';
  story.style.transition='';
  paSetLowerLift(0,0);
  if(PA_GLOBAL_STATS) paSetStoryCards(PA_GLOBAL_STATS);
  if(paAnimAF){cancelAnimationFrame(paAnimAF);paAnimAF=null;}
  let s=null;
  function tick(ts){
    if(!s) s=ts;
    const t=Math.min((ts-s)/800,1);
    drawYears(ease(t));
    if(t<1) paAnimAF=requestAnimationFrame(tick); else paAnimAF=null;
  }
  paAnimAF=requestAnimationFrame(tick);
}
function paShowYears(){ paEnterYears(); }
function paSetLowerLift(px,durMs){
  const ids=['pa-breadcrumb','pa-sub','pa-canvas','pa-sessions-timeline','pa-panel','pa-legend'];
  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.style.transition=durMs>0?`transform ${durMs}ms cubic-bezier(.2,.8,.2,1)`:'';
    el.style.transform=px?`translateY(${px}px)`:'translateY(0)';
  });
}
function paRenderDetailNav(year,{fadeIn=false}={}){
  const years=paNavigableYears();
  const idx=years.indexOf(year);
  const prevYear=idx>0?years[idx-1]:null;
  const nextYear=idx>=0&&idx<years.length-1?years[idx+1]:null;
  const sub=document.getElementById('pa-sub');
  sub.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;width:100%">
      <button onclick="paShowYears()" style="font-family:inherit;font-size:15px;font-weight:600;color:var(--accent);background:rgba(249,115,22,0.1);border:1.5px solid var(--accent);border-radius:6px;padding:6px 14px;cursor:pointer;letter-spacing:.01em;transition:background .2s">← All years</button>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto">
        <button onclick="paMoveYear(-1)" ${prevYear?'':'disabled'} style="font-family:inherit;font-size:14px;font-weight:600;color:${prevYear?'var(--g1)':'var(--muted)'};background:${prevYear?'rgba(37,99,235,0.08)':'rgba(148,163,184,0.12)'};border:1.5px solid ${prevYear?'var(--g1)':'var(--border)'};border-radius:6px;padding:6px 11px;cursor:${prevYear?'pointer':'not-allowed'}">← ${prevYear||'Previous'}</button>
        <div style="font-size:14px;color:var(--muted);letter-spacing:.05em;text-transform:uppercase;padding:0 2px">Year ${year}</div>
        <button onclick="paMoveYear(1)" ${nextYear?'':'disabled'} style="font-family:inherit;font-size:14px;font-weight:600;color:${nextYear?'var(--g1)':'var(--muted)'};background:${nextYear?'rgba(37,99,235,0.08)':'rgba(148,163,184,0.12)'};border:1.5px solid ${nextYear?'var(--g1)':'var(--border)'};border-radius:6px;padding:6px 11px;cursor:${nextYear?'pointer':'not-allowed'}">${nextYear||'Next'} →</button>
      </div>
    </div>`;
  if(fadeIn){
    sub.style.opacity='0';
    sub.style.transition='opacity 220ms ease-out';
    requestAnimationFrame(()=>{sub.style.opacity='1';});
  }else{
    sub.style.transition='';
    sub.style.opacity='1';
  }
}
function paAnimateStoryOut(durMs){
  const story=document.getElementById('pa-story');
  if(!story||story.style.display==='none') return;
  const h=story.offsetHeight||150;
  story.style.overflow='hidden';
  story.style.maxHeight=h+'px';
  story.style.opacity='1';
  story.style.transform='translateY(0)';
  story.style.marginTop='32px';
  story.style.marginBottom='24px';
  story.style.transition=`opacity ${durMs}ms ease, max-height ${durMs}ms cubic-bezier(.2,.8,.2,1), margin ${durMs}ms cubic-bezier(.2,.8,.2,1), transform ${durMs}ms ease`;
  requestAnimationFrame(()=>{
    story.style.opacity='0';
    story.style.maxHeight='0px';
    story.style.marginTop='0px';
    story.style.marginBottom='0px';
    story.style.transform='translateY(-8px)';
  });
  paSetLowerLift(-6,durMs);
}
function paNavigableYears(){
  return YEAR_DATA
    .filter(d=>d.year!==2021&&!d.partial)
    .map(d=>d.year)
    .sort((a,b)=>a-b);
}
function paMoveYear(delta){
  if(paView!=='detail'||!paYear) return;
  const years=paNavigableYears();
  const idx=years.indexOf(paYear);
  if(idx<0) return;
  const next=years[idx+delta];
  if(!next) return;
  paAnimateDetailYearSwitch(next,delta>=0?1:-1);
}

function animateYearToDetail(year, a){
  hideTT();
  paView='morphing';
  if(paAnimAF){cancelAnimationFrame(paAnimAF);paAnimAF=null;}
  const cssW=a.W, cssH=a.H;
  const yearMx=Math.max(...YEAR_DATA.map(d=>d.count));
  const barCol=YR_BAR_COLS[year]||P.g1;
  const DUR=780; let s=null, _sessionsPrepared=false;
  paRenderDetailNav(year,{fadeIn:true});
  paAnimateStoryOut(DUR);
  const paLegend=document.getElementById('pa-legend');
  paLegend.style.transition='opacity 0.14s ease';
  paLegend.style.opacity='0';
  setTimeout(()=>{ if(paView==='morphing') paLegend.innerHTML=''; },140);
  paSetSize(cssW,cssH);

  // Pre-compute heatmap geometry
  const _isLeap=(year%4===0&&year%100!==0)||year%400===0;
  const _jan1=new Date(year,0,1);
  const _startDow=_jan1.getDay()===0?6:_jan1.getDay()-1;
  const _totalDays=_isLeap?366:365;
  const _numWeeks=Math.ceil((_startDow+_totalDays)/7);
  const LPAD=56,PR=16,PT=30,PB=20;
  const STEP=Math.floor((cssW-LPAD-PR)/_numWeeks);
  const heatH=7*STEP;
  const HMTOP=PT+heatH+PB+4+16;

  const barCY=a.barTop+a.barH/2;
  const targetCX=cssW/2, targetCY=(HMTOP+heatH/2)*0.98;

  function tick(ts){
    if(!s) s=ts;
    const raw=Math.min((ts-s)/DUR,1);
    paCtx.clearRect(0,0,cssW,cssH);

    // 1. Other bars fade out (first 25%)
    const outA=Math.max(0,1-ease(clamp(raw/0.2,0,1)));
    if(outA>0){
      YEAR_DATA.forEach((d,i)=>{
        if(d.year===year) return;
        const n=YEAR_DATA.length;
        const cx=a.PL+(i+.5)*(a.PW/n);
        const bh=(d.count/yearMx)*a.PH, by=a.PT+a.PH-bh;
        const bw=Math.min(Math.floor((a.PW/n)*0.55),90);
        const col=d.year===PA_PEAK?P.accent:(YR_BAR_COLS[d.year]||P.g1);
        paCtx.fillStyle=col; paCtx.globalAlpha=(d.partial?0.35:1)*outA;
        paCtx.beginPath();paCtx.roundRect(cx-bw/2,by,bw,bh,[4,4,0,0]);paCtx.fill();
        paCtx.globalAlpha=1;
      });
    }

    // 2. Main bar zooms into a large rectangle
    const p=raw*raw*(3-2*raw);
    const rcx=lerp(a.barCX,targetCX,p);
    const rcy=lerp(barCY,targetCY,p);
    const rw =lerp(a.barW,cssW*0.92,p);
    const rh =lerp(a.barH,cssH*0.86,p);
    const barA=Math.max(0,1-ease(clamp((raw-0.25)/0.45,0,1)));
    if(barA>0){
      paCtx.fillStyle=barCol; paCtx.globalAlpha=barA;
      paCtx.beginPath(); paCtx.roundRect(rcx-rw/2,rcy-rh/2,rw,rh,8); paCtx.fill();
      paCtx.globalAlpha=1;
    }

    // 3. Detail content reveals from center zoom window
    const revealP=raw<=0.34?0:Math.pow(clamp((raw-0.34)/0.56,0,1),0.9);
    if(revealP>0){
      paCtx.save();
      const clipW=cssW*(0.18+0.82*revealP);
      const clipH=cssH*(0.22+0.78*revealP);
      paCtx.beginPath();
      paCtx.rect((cssW-clipW)/2,(cssH-clipH)/2,clipW,clipH);
      paCtx.clip();
      _renderDetail(year,cssW);
      paCtx.restore();
    }

    // 4. Sessions timeline fades in near the end
    if(!_sessionsPrepared&&raw>=0.68){
      _sessionsPrepared=true;
      const tl=document.getElementById('pa-sessions-timeline');
      tl.style.opacity='0';
      tl.style.transition='opacity 0.24s ease-out';
      drawSessionsTimeline(year);
      requestAnimationFrame(()=>{ tl.style.opacity='1'; });
    }

    if(raw<1) paAnimAF=requestAnimationFrame(tick);
    else drawYearDetail(year);
  }
  paAnimAF=requestAnimationFrame(tick);
}

function paDetailCssHeightForYear(year, cssW){
  const isLeap=(year%4===0&&year%100!==0)||year%400===0;
  const totalDays=isLeap?366:365;
  const jan1=new Date(year,0,1);
  const startDow=jan1.getDay()===0?6:jan1.getDay()-1;
  const numWeeks=Math.ceil((startDow+totalDays)/7);
  const STEP=Math.floor((cssW-56-16)/numWeeks);
  const PT=14,PH=7*STEP,PB=20,HTOP_OFF=PT+PH+PB+4,HMTOP=HTOP_OFF+16;
  return {cssH:HMTOP+7*STEP+46,PT,PH,PB,HMTOP,STEP,numWeeks,startDow,totalDays};
}

function paAnimateDetailYearSwitch(nextYear,direction=1){
  if(paView!=='detail'||!paYear){drawYearDetail(nextYear);return;}
  hideTT();
  const fromYear=paYear;
  const cssW=paCSSW();
  const fromGeo=paDetailCssHeightForYear(fromYear,cssW);
  const nextGeo=paDetailCssHeightForYear(nextYear,cssW);
  const cssH=Math.max(fromGeo.cssH,nextGeo.cssH);
  const tl=document.getElementById('pa-sessions-timeline');
  tl.style.transition='opacity 0.18s ease';
  tl.style.opacity='0';
  paPinnedSession=null;
  paHighlightSession=null;
  document.getElementById('pa-session-card').style.display='none';
  document.getElementById('pa-panel').style.display='none';
  paView='morphing';
  if(paAnimAF){cancelAnimationFrame(paAnimAF);paAnimAF=null;}
  paSetSize(cssW,cssH);
  const DUR=300;
  let s=null;
  function tick(ts){
    if(!s) s=ts;
    const raw=Math.min((ts-s)/DUR,1);
    const t=raw*raw*(3-2*raw);
    paCtx.clearRect(0,0,cssW,cssH);
    paCtx.save();
    paCtx.globalAlpha=1-t;
    paCtx.translate(-direction*24*t,0);
    _renderDetail(fromYear,cssW);
    paCtx.restore();
    paCtx.save();
    paCtx.globalAlpha=t;
    paCtx.translate(direction*24*(1-t),0);
    _renderDetail(nextYear,cssW);
    paCtx.restore();
    if(raw<1) paAnimAF=requestAnimationFrame(tick);
    else drawYearDetail(nextYear);
  }
  paAnimAF=requestAnimationFrame(tick);
}

// Draws monthly bars + heatmap into paCtx (used by animation and final view).
// Returns hit-geometry object for paHits building.
// Avoids explicit globalAlpha so the animation wrapper's alpha is respected for all elements.
function _renderDetail(year, cssW, opts={}){
  // compute STEP first so PH can match heatmap height
  const _isLeap=(year%4===0&&year%100!==0)||year%400===0;
  const _numWeeks=Math.ceil(((new Date(year,0,1).getDay()===0?6:new Date(year,0,1).getDay()-1)+(_isLeap?366:365))/7);
  const PL=56,PR=16,PT=30,PW=cssW-PL-PR,PB=20;
  const PH=7*Math.floor((cssW-PL-PR)/_numWeeks);
  const gap=PW/12, mBarW=Math.min(Math.floor(gap*0.7),60);
  const months=Array.from({length:12},(_,i)=>{
    const key=`${year}-${String(i+1).padStart(2,'0')}`;
    return {m:i+1,count:monthlyTotals[key]||0};
  });
  const mMax=Math.max(...months.map(d=>d.count),1);
  const peakIdx=months.reduce((a,b)=>b.count>a.count?b:a).m-1;

  // season bands - use rgba directly so animation wrapper's globalAlpha is respected
  [[0,2,'rgba(14,165,233,0.06)','Winter'],[3,5,'rgba(34,197,94,0.06)','Spring'],
   [6,8,'rgba(249,115,22,0.06)','Summer'],[9,11,'rgba(139,92,246,0.06)','Autumn']].forEach(([st,en,c,lbl])=>{
    paCtx.fillStyle=c; paCtx.fillRect(PL+st*gap,PT,(en-st+1)*gap,PH);
    // season label pinned to fixed row (y=11) - always above count labels which start at PT-5=25
    paCtx.fillStyle='rgba(71,85,105,0.40)'; paCtx.font='14px Inter'; paCtx.textAlign='center';
    paCtx.fillText(lbl,PL+(st+1.5)*gap,11);
  });
  [0.5,1].forEach(f=>{
    const y=PT+(1-f)*PH, val=Math.round(mMax*f);
    paCtx.strokeStyle=P.dim; paCtx.lineWidth=0.8;
    paCtx.beginPath();paCtx.moveTo(PL,y);paCtx.lineTo(PL+PW,y);paCtx.stroke();
    paCtx.fillStyle=P.muted; paCtx.font='13px Inter'; paCtx.textAlign='right';
    paCtx.fillText(val>=1000?(val/1000).toFixed(1)+'k':val,PL-6,y+4);
  });
  paCtx.strokeStyle=P.dim; paCtx.lineWidth=1;
  paCtx.beginPath();paCtx.moveTo(PL,PT);paCtx.lineTo(PL,PT+PH);paCtx.lineTo(PL+PW,PT+PH);paCtx.stroke();
  // bars - coloured by season, no peak overlay text (avoids label collision)
  months.forEach((d,i)=>{
    const cx=PL+(i+.5)*gap, bh=(d.count/mMax)*PH, by=PT+PH-bh;
    const col=paSeasonCol(i);
    paCtx.fillStyle=col;
    paCtx.beginPath();paCtx.roundRect(cx-mBarW/2,by,mBarW,bh,[4,4,0,0]);paCtx.fill();
    paCtx.fillStyle=P.muted; paCtx.font='14px Inter'; paCtx.textAlign='center';
    paCtx.fillText(PA_MONTHS[i],cx,PT+PH+14);
  });

  // separator between monthly bars and heatmap
  const SEP_Y=PT+PH+PB-4;
  paCtx.strokeStyle=P.dim; paCtx.lineWidth=1; paCtx.setLineDash([4,5]);
  paCtx.beginPath();paCtx.moveTo(PL,SEP_Y);paCtx.lineTo(PL+PW,SEP_Y);paCtx.stroke();
  paCtx.setLineDash([]);

  // heatmap (bottom section)
  const isLeap=(year%4===0&&year%100!==0)||year%400===0;
  const totalDays=isLeap?366:365;
  const jan1=new Date(year,0,1);
  const startDow=jan1.getDay()===0?6:jan1.getDay()-1;
  const numWeeks=Math.ceil((startDow+totalDays)/7);
  const LPAD=56, HTOP_OFF=PT+PH+PB+4;
  const STEP=Math.floor((cssW-LPAD-PR)/numWeeks);
  const CELL=Math.max(STEP-2,1);
  const HMTOP=HTOP_OFF+16;
  const yearMax=Math.max(...DAILY_DATA.filter(d=>d.date.startsWith(String(year))).map(d=>d.count),1);

  const yDates=DAILY_DATA.filter(d=>d.date.startsWith(String(year))).map(d=>d.date).sort();
  let maxS=1,curS=1,streakEnd=yDates[0];
  for(let i=1;i<yDates.length;i++){
    const diff=(new Date(yDates[i])-new Date(yDates[i-1]))/86400000;
    curS=diff===1?curS+1:1;
    if(curS>maxS){maxS=curS;streakEnd=yDates[i];}
  }
  const streakSet=new Set();
  if(maxS>2&&streakEnd){
    const ed=new Date(streakEnd+'T12:00:00');
    for(let k=0;k<maxS;k++){const d=new Date(ed);d.setDate(d.getDate()-k);streakSet.add(d.toISOString().slice(0,10));}
  }

  const shown=new Set();
  for(let w=0;w<numWeeks;w++)for(let dow=0;dow<7;dow++){
    const off=w*7+dow-startDow;
    if(off>=0&&off<totalDays){
      const d=new Date(year,0,1+off);
      if(d.getDate()<=7&&!shown.has(d.getMonth())){
        shown.add(d.getMonth());
        paCtx.fillStyle=P.muted; paCtx.font='14px Inter'; paCtx.textAlign='left';
        paCtx.fillText(PA_MONTHS[d.getMonth()],LPAD+w*STEP,HTOP_OFF+12);
      }
    }
  }
  [[0,'M'],[2,'W'],[4,'F']].forEach(([dow,lbl])=>{
    paCtx.fillStyle=P.muted; paCtx.font='14px Inter'; paCtx.textAlign='left';
    paCtx.fillText(lbl,4,HMTOP+dow*STEP+CELL/2+3);
  });
  for(let w=0;w<numWeeks;w++)for(let dow=0;dow<7;dow++){
    const off=w*7+dow-startDow;
    if(off<0||off>=totalDays) continue;
    const d=new Date(year,0,1+off), ds=d.toISOString().slice(0,10);
    const count=dailyMap[ds]||0;
    const cx=LPAD+w*STEP, cy=HMTOP+dow*STEP;
    const sessionMatch=paHighlightSession&&ALBUM_MAP[ds]===paHighlightSession;
    const dimmed=paHighlightSession&&!sessionMatch;
    const baseAlpha=paCtx.globalAlpha;
    paCtx.globalAlpha=baseAlpha*(dimmed?0.12:1);
    // session-match days: boost fill to at least a mid-blue so pale days stay visible
    const finalCellColor=sessionMatch&&count===0?'#DBEAFE':paColorForCount(count,yearMax);
    paCtx.fillStyle=opts.heatmapFromColor
      ? paMixColor(opts.heatmapFromColor,finalCellColor,opts.heatmapColorT??1)
      : finalCellColor;
    paCtx.beginPath();paCtx.roundRect(cx,cy,CELL,CELL,2);paCtx.fill();
    if(sessionMatch){
      paCtx.strokeStyle=P.g1; paCtx.lineWidth=2;
      paCtx.beginPath();paCtx.roundRect(cx+1,cy+1,CELL-2,CELL-2,2);paCtx.stroke();
    } else if(streakSet.has(ds)&&count>0&&!paHighlightSession){
      paCtx.strokeStyle=P.accent; paCtx.lineWidth=1.5;
      paCtx.beginPath();paCtx.roundRect(cx+0.75,cy+0.75,CELL-1.5,CELL-1.5,2);paCtx.stroke();
    }
    paCtx.globalAlpha=baseAlpha;
  }
  const lx=LPAD, ly=HMTOP+7*STEP+6;
  paCtx.fillStyle=P.muted; paCtx.font='14px Inter'; paCtx.textAlign='left';
  paCtx.fillText('Less',lx,ly+9);
  ['#F1F5F9','#DBEAFE','#93C5FD','#2563EB','#7C3AED'].forEach((c,ci)=>{
    paCtx.fillStyle=c; paCtx.beginPath();paCtx.roundRect(lx+40+ci*14,ly,11,11,2);paCtx.fill();
  });
  paCtx.fillStyle=P.muted; paCtx.fillText('More',lx+40+5*14+4,ly+9);
  if(maxS>2){
    const sx=lx+40+5*14+52;
    // swatch: orange-outlined square identical to streak cells
    paCtx.fillStyle='#93C5FD';
    paCtx.beginPath();paCtx.roundRect(sx,ly,11,11,2);paCtx.fill();
    paCtx.strokeStyle=P.accent;paCtx.lineWidth=1.5;
    paCtx.beginPath();paCtx.roundRect(sx+0.75,ly+0.75,9.5,9.5,2);paCtx.stroke();
    paCtx.fillStyle=P.muted;paCtx.font='14px Inter';paCtx.textAlign='left';
    paCtx.fillText(`Longest streak (${maxS} days)`,sx+16,ly+9);
  }

  return {months,peakIdx,mBarW,PL,PW,PT,PH,gap,HMTOP,STEP,CELL,numWeeks,startDow,totalDays,yearMax};
}

function drawYearDetail(year){
  hideTT();
  paView='detail'; paYear=year; paHits=[];
  paPinnedSession=null;
  paHighlightSession=null;
  const story=document.getElementById('pa-story');
  story.style.display='none';
  story.style.transition='';
  paSetLowerLift(0,0);
  const cssW=paCSSW();
  const {cssH,PT,PH}=paDetailCssHeightForYear(year,cssW);
  paSetSize(cssW,cssH);
  paCtx.clearRect(0,0,cssW,cssH);

  const geo=_renderDetail(year,cssW);
  const {months,mBarW,PL,PW,gap,HMTOP:HT,STEP:ST,CELL,numWeeks:nW,startDow:sDow,totalDays:totD,yearMax:yMx}=geo;

  // build paHits - month bars (hover only)
  const mMax=Math.max(...months.map(d=>d.count),1);
  months.forEach((d,i)=>{
    if(!d.count) return;
    const cx=PL+(i+.5)*gap, bh=(d.count/mMax)*PH, by=PT+PH-bh;
    paHits.push({type:'month',x:cx-mBarW/2,y:by,w:mBarW,h:PT+PH-by+14,month:i+1,count:d.count});
  });
  // day cells (click for panel)
  for(let w=0;w<nW;w++)for(let dow=0;dow<7;dow++){
    const off=w*7+dow-sDow;
    if(off<0||off>=totD) continue;
    const ds=new Date(year,0,1+off).toISOString().slice(0,10);
    const count=dailyMap[ds]||0;
    paHits.push({type:'day',x:56+w*ST,y:HT+dow*ST,w:CELL,h:CELL,date:ds,count,col:paColorForCount(count,yMx)});
  }

  paRenderDetailNav(year);
  document.getElementById('pa-breadcrumb').innerHTML='';
  document.getElementById('pa-legend').innerHTML='';
  document.getElementById('pa-panel').style.display='none';
  document.getElementById('pa-session-card').style.display='none';
  paUpdateStoryCards(year);
  const tl=document.getElementById('pa-sessions-timeline');
  tl.style.transition='';
  tl.style.opacity='1';
  drawSessionsTimeline(year);
}

// D3 sessions bar chart: top sessions by photo count, shown below combined view.
function drawSessionsTimeline(year){
  if(typeof d3==='undefined') return;
  const container=document.getElementById('pa-sessions-timeline');
  container.style.display='block';
  container.innerHTML='';

  // group individual shooting days by session name, summing photo counts
  const grouped={};
  Object.entries(ALBUM_MAP)
    .filter(([dt])=>dt.startsWith(String(year)))
    .forEach(([dt,name])=>{
      if(!grouped[name]) grouped[name]={name,count:0,days:0};
      grouped[name].count+=dailyMap[dt]||0;
      grouped[name].days+=1;
    });
  const allSessions=Object.values(grouped).sort((a,b)=>b.count-a.count);

  if(!allSessions.length){
    container.innerHTML='<div style="font-size:15px;color:var(--muted);padding:8px 0">No named sessions this year.</div>';
    return;
  }

  const hdr=document.createElement('div');
  hdr.style.cssText='font-size:13px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--text);margin-bottom:14px;margin-top:10px';
  hdr.textContent='Named shooting sessions';
  container.appendChild(hdr);

  // keep top 12; show note if more unique names exist
  const LIMIT=8;
  const sessions=allSessions.slice(0,LIMIT);
  if(allSessions.length>LIMIT){
    const note=document.createElement('div');
    note.style.cssText='font-size:14px;font-weight:500;color:var(--muted);margin-bottom:10px';
    note.innerHTML=`Showing top <strong>${LIMIT}</strong> of <strong>${allSessions.length}</strong> sessions`;
    container.appendChild(note);
  }

  const W=paCSSW(), ROW=36, ML=8, MR=12;
  const namePad=200; // fixed px reserved for name labels
  const barW=W-namePad-ML-MR-70; // 70px for count text on right
  const H=sessions.length*ROW+8;
  const maxCnt=sessions[0].count||1;

  const xScale=d3.scaleLinear().domain([0,maxCnt]).range([0,barW]);

  const svg=d3.select(container).append('svg')
    .attr('width',W).attr('height',H)
    .style('font-family','Inter').style('overflow','visible');

  const rowG=svg.selectAll('.sr')
    .data(sessions).enter().append('g').attr('class','sr')
    .attr('transform',(_,i)=>`translate(${ML},${i*ROW+2})`)
    .attr('data-session',d=>d.name);

  rowG.append('text')
    .attr('x',0).attr('y',ROW/2+5)
    .attr('font-size','15px').attr('fill','#475569')
    .attr('text-anchor','start')
    .text(d=>d.name.length>24?d.name.slice(0,23)+'…':d.name);

  rowG.append('rect')
    .attr('x',namePad).attr('y',ROW/2-9)
    .attr('width',barW).attr('height',18).attr('rx',6)
    .attr('fill','#F1F5F9');

  rowG.append('rect')
    .attr('x',namePad).attr('y',ROW/2-9)
    .attr('width',0).attr('height',18).attr('rx',6)
    .attr('fill',d=>paColorForSession(d.count,maxCnt))
    .transition().delay((_,i)=>i*40).duration(420).ease(d3.easeCubicOut)
    .attr('width',d=>xScale(d.count));

  rowG.append('text')
    .attr('x',namePad+barW+8).attr('y',ROW/2+5)
    .attr('font-size','14px').attr('fill','#94A3B8')
    .attr('opacity',0)
    .text(d=>d.count>=1000?(d.count/1000).toFixed(1)+'k':d.count)
    .transition().delay((_,i)=>i*40+350).duration(200)
    .attr('opacity',1);

  rowG.style('cursor','pointer')
    .on('mouseover',function(event,d){
      if(paPinnedSession&&paPinnedSession!==d.name) return; // keep pin visible
      d3.select(this).select('rect:nth-child(3)').attr('opacity',0.8);
      const dayLabel=d.days===1?'1 shooting day':`${d.days} shooting days`;
      showTT(event,d.name,`${d.count.toLocaleString()} photos total<br><span style="color:var(--muted)">${dayLabel}</span>`);
      paHighlightSession=d.name;
      svg.selectAll('g.sr').style('opacity',function(s){return s.name===d.name?1:0.3;});
      paRedrawCanvas();
    })
    .on('mousemove',moveTT)
    .on('mouseleave',function(){
      d3.select(this).select('rect:nth-child(3)').attr('opacity',paPinnedSession===d3.select(this).datum().name?0.8:1);
      hideTT();
      // restore to pinned state, not blank
      paHighlightSession=paPinnedSession;
      svg.selectAll('g.sr').style('opacity',function(s){return !paPinnedSession||s.name===paPinnedSession?1:0.3;});
      paRedrawCanvas();
    })
    .on('click',function(event,d){
      hideTT();
      if(paPinnedSession===d.name){
        paPinnedSession=null; paHighlightSession=null;
        svg.selectAll('g.sr').style('opacity',1);
        d3.select(this).select('rect:nth-child(3)').attr('opacity',1);
        document.getElementById('pa-session-card').style.display='none';
      } else {
        paPinnedSession=d.name; paHighlightSession=d.name;
        svg.selectAll('g.sr').style('opacity',function(s){return s.name===d.name?1:0.3;});
        paShowSessionCard(d.name);
      }
      paRedrawCanvas();
    });
}

function paShowSessionCard(name){
  const card=document.getElementById('pa-session-card');
  if(!name){card.style.display='none';return;}
  // gather all dates for this session in the current year
  const dates=Object.entries(ALBUM_MAP)
    .filter(([dt,n])=>n===name&&dt.startsWith(String(paYear)))
    .map(([dt])=>dt).sort();
  if(!dates.length){card.style.display='none';return;}
  const first=dates[0], last=dates[dates.length-1];
  const fmt=s=>{const d=new Date(s+'T12:00:00');return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});};
  const range=first===last?fmt(first):`${fmt(first)} – ${fmt(last)}`;
  const peakDate=dates.reduce((best,dt)=>(dailyMap[dt]||0)>(dailyMap[best]||0)?dt:best,dates[0]);
  const peakCount=dailyMap[peakDate]||0;
  const totalPhotos=dates.reduce((s,dt)=>s+(dailyMap[dt]||0),0);
  card.style.display='block';
  card.innerHTML=`
    <button onclick="paPinnedSession=null;paHighlightSession=null;paRedrawCanvas();document.getElementById('pa-session-card').style.display='none';document.querySelectorAll('#pa-sessions-timeline g.sr').forEach(g=>g.style.opacity='1');" style="position:absolute;top:12px;right:14px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;line-height:1">×</button>
    <div style="font-size:17px;font-weight:600;color:var(--g1);margin-bottom:14px">${name}</div>
    <div style="display:flex;gap:32px;flex-wrap:wrap">
      <div><div style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Dates</div><div style="font-size:16px;font-weight:500;color:var(--text)">${range}</div></div>
      <div><div style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Photos</div><div style="font-size:16px;font-weight:500;color:var(--text)">${totalPhotos.toLocaleString()}</div></div>
      <div><div style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Shooting days</div><div style="font-size:16px;font-weight:500;color:var(--text)">${dates.length}</div></div>
      <div><div style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Peak day</div><div style="font-size:16px;font-weight:500;color:var(--text)">${fmt(peakDate)} <span style="color:var(--accent)">${peakCount.toLocaleString()} photos</span></div></div>
    </div>`;
}

PA_C.addEventListener('click',e=>{
  if(paView==='morphing') return;
  const rect=PA_C.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  for(const b of paHits){
    if(mx>=b.x&&mx<=b.x+b.w&&my>=b.y&&my<=b.y+b.h){
      if(paView==='years'&&b.type==='year'){
        hideTT();
        animateYearToDetail(b.year,b._a);
      }
      break;
    }
  }
});

PA_C.addEventListener('mousemove',e=>{
  if(paView==='morphing'){PA_C.style.cursor='default';hideTT();return;}
  const rect=PA_C.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  let hit=false;
  for(const b of paHits){
    if(mx>=b.x&&mx<=b.x+b.w&&my>=b.y&&my<=b.y+b.h){
      const clickable=(paView==='years'&&b.type==='year')||(paView==='detail'&&b.type==='month')||(paView==='detail'&&b.type==='day'&&b.count>0);
      if(clickable){
        PA_C.style.cursor='pointer';
        if(paView==='years'){
          const yr=b.year;
          const yd=YEAR_DATA.find(d=>d.year===yr);
          const barCol=yr===PA_PEAK?P.accent:(YR_BAR_COLS[yr]||P.g1);
          const total=(yd?.count||0).toLocaleString();
          showTT(e,`<span style="color:${barCol}">${yr}</span>`,`${total} photos`);
        }
        else if(paView==='detail'&&b.type==='month'){const mc=paSeasonCol(b.month-1);showTT(e,`<span style="color:${mc}">${PA_MONTHS_FULL[b.month-1]}</span>`,b.count.toLocaleString()+' photos');}
        else if(paView==='detail'&&b.type==='day'){
          const s=ALBUM_MAP[b.date]||null;
          const dl=new Date(b.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long'});
          const tc=(b.col==='#F1F5F9'||b.col==='#DBEAFE')?'#93C5FD':(b.col||P.g1);
          showTT(e,`<span style="color:${tc}">${dl}</span>`,b.count.toLocaleString()+' photos'+(s?'<br>'+s:''),{preview:true});
          if(s!==paHighlightSession){
            paHighlightSession=s;
            document.querySelectorAll('#pa-sessions-timeline .sr').forEach(g=>{g.style.opacity=(!s||g.dataset.session===s)?'1':'0.3';});
            paRedrawCanvas();
          }
        }
        hit=true; break;
      }
    }
  }
  if(!hit){
    PA_C.style.cursor='default';hideTT();
    if(paHighlightSession){
      paHighlightSession=null;
      document.querySelectorAll('#pa-sessions-timeline g.sr').forEach(g=>{g.style.opacity='1';});
      paRedrawCanvas();
    }
  }
});
PA_C.addEventListener('mouseleave',()=>{
  hideTT();PA_C.style.cursor='default';
  paHighlightSession=null;
  document.querySelectorAll('#pa-sessions-timeline g.sr').forEach(g=>{g.style.opacity='1';});
  paRedrawCanvas();
});

function paResize(){
  if(paView==='years'||paView==='morphing') paEnterYears();
  else if(paView==='detail'&&paYear) drawYearDetail(paYear);
}

