const GR_C=document.getElementById('gear-canvas');
const grCtx=GR_C.getContext('2d');
let grCanvasCssW=0, grCanvasCssH=0;
function grApplyCanvasSize(cssW,cssH){
  const dpr=Math.min(window.devicePixelRatio||1,2.5);
  grCanvasCssW=cssW; grCanvasCssH=cssH;
  GR_C.width=Math.max(1,Math.floor(cssW*dpr));
  GR_C.height=Math.max(1,Math.floor(cssH*dpr));
  GR_C.style.width=cssW+'px';
  GR_C.style.height=cssH+'px';
  grCtx.setTransform(dpr,0,0,dpr,0,0);
}

// CAMERAS, CAM_COLS and GEAR_MONTHLY come from chart_data.js
const cumGear=GEAR_MONTHLY;
const GR_CAMERAS=CAMERAS.filter(c=>c!=='Sony A7 V'&&c!=='Panasonic LX100');

let activeCams=new Set(GR_CAMERAS);
let gearRevealT=1, gearAnimAF=null;
let gearHoverCam=null;
let gearHoverMonth=null;
let gearPinnedCam=null;
let gearDrag=null;
let gearRange=null;
let gearNormMode='per';
const MONTH_LABELS=GEAR_MONTH_LABELS;
const camMax={};
GR_CAMERAS.forEach(c=>{camMax[c]=Math.max(...cumGear[c],1)});
const globalGearMax=Math.max(...GR_CAMERAS.flatMap(c=>cumGear[c]),1);

(function(){
  const cont=document.getElementById('cam-toggles');
  GR_CAMERAS.forEach(c=>{
    const btn=document.createElement('button');
    const label=c.replace('Sony ','').replace('Fuji ','').replace('Canon ','').replace('Panasonic ','');
    btn.className='tg-btn on';btn.textContent=label;
    btn.style.borderColor=CAM_COLS[c];btn.style.color=CAM_COLS[c];
    btn.style.background=CAM_COLS[c]+'18';
    btn.onclick=()=>{
      if(activeCams.has(c)&&activeCams.size>1)activeCams.delete(c);else activeCams.add(c);
      if(gearPinnedCam===c&&!activeCams.has(c))gearPinnedCam=null;
      btn.classList.toggle('on',activeCams.has(c));
      btn.style.background=activeCams.has(c)?CAM_COLS[c]+'18':'transparent';
      btn.style.borderColor=activeCams.has(c)?CAM_COLS[c]:P.dim;
      btn.style.color=activeCams.has(c)?CAM_COLS[c]:P.muted;
      gearRevealT=1;
      drawGear();
      updateGearSummary();
    };
    cont.appendChild(btn);
  });
})();

(function(){
  const perBtn=document.getElementById('gear-norm-per');
  const absBtn=document.getElementById('gear-norm-abs');
  perBtn.onclick=()=>{
    gearNormMode='per';
    perBtn.classList.add('on');absBtn.classList.remove('on');
    drawGear();
  };
  absBtn.onclick=()=>{
    gearNormMode='abs';
    absBtn.classList.add('on');perBtn.classList.remove('on');
    drawGear();
  };
})();

function drawGear(){
  const W=grCanvasCssW,H=grCanvasCssH;grCtx.clearRect(0,0,W,H);
  const PL=172,PR=16,PT=32,PB=16,PW=W-PL-PR,PH=H-PT-PB;
  const active=[...activeCams];
  const nM=MONTH_LABELS.length;
  const cellW=PW/nM;
  const rowGap=6;
  const rowH=Math.min(Math.floor((PH-rowGap*(active.length-1))/active.length),48);

  const revealMonths=gearRevealT*nM;
  const focusCam=gearPinnedCam&&activeCams.has(gearPinnedCam)?gearPinnedCam:gearHoverCam;

  if(gearRange){
    const rx=PL+gearRange.start*cellW;
    const rw=(gearRange.end-gearRange.start+1)*cellW;
    grCtx.fillStyle='rgba(249,115,22,0.08)';
    grCtx.fillRect(rx,PT-12,rw,PH+16);
    grCtx.strokeStyle='rgba(249,115,22,0.45)';
    grCtx.lineWidth=1.5;
    grCtx.setLineDash([4,4]);
    grCtx.strokeRect(rx,PT-12,rw,PH+16);
    grCtx.setLineDash([]);
  }

  MONTH_LABELS.forEach((lbl,i)=>{
    if(!lbl.startsWith('Jan')||i>revealMonths)return;
    const x=PL+i*cellW;
    grCtx.globalAlpha=clamp((revealMonths-i)/2,0,1);
    grCtx.strokeStyle=P.dim;grCtx.lineWidth=0.8;grCtx.setLineDash([3,4]);
    grCtx.beginPath();grCtx.moveTo(x,PT-14);grCtx.lineTo(x,PT+active.length*(rowH+rowGap)-rowGap);grCtx.stroke();
    grCtx.setLineDash([]);
    grCtx.fillStyle=P.muted;grCtx.font='14px Inter';grCtx.textAlign='left';
    grCtx.fillText(lbl.split(' ')[1],x+3,PT-4);
    grCtx.globalAlpha=1;
  });

  active.forEach((cam,row)=>{
    const y=PT+row*(rowH+rowGap);
    const col=CAM_COLS[cam];
    const normMax=gearNormMode==='per'?camMax[cam]:globalGearMax;
    const rowOn=focusCam===cam;
    const rowDim=!!focusCam&&!rowOn;

    grCtx.fillStyle=rowOn?P.text:P.muted;
    grCtx.font=(rowOn?'600 ':'500 ')+'16px Inter';
    grCtx.textAlign='right';
    grCtx.globalAlpha=rowDim?0.35:1;
    grCtx.fillText(cam,PL-8,y+rowH/2+4);
    grCtx.globalAlpha=1;

    grCtx.fillStyle=rowOn?'rgba(37,99,235,0.12)':P.dim;
    grCtx.globalAlpha=rowDim?0.18:(rowOn?0.85:0.35);
    grCtx.beginPath();grCtx.roundRect(PL,y,PW,rowH,4);grCtx.fill();
    grCtx.globalAlpha=1;

    if(rowOn){
      grCtx.strokeStyle=gearPinnedCam===cam?P.accent:col;
      grCtx.lineWidth=2;
      grCtx.beginPath();grCtx.roundRect(PL-1,y-1,PW+2,rowH+2,5);grCtx.stroke();
    }

    grCtx.save();
    grCtx.beginPath();grCtx.roundRect(PL,y,PW,rowH,4);grCtx.clip();
    cumGear[cam].forEach((shots,mi)=>{
      if(shots===0)return;
      if(mi>revealMonths)return;
      const cx=PL+mi*cellW;
      const revealFrac=clamp(revealMonths-mi,0,1);
      const cw=Math.min((cellW-0.5)*revealFrac, PL+PW-cx);
      if(cw<=0)return;
      const alpha=0.2+0.8*Math.sqrt(shots/normMax);
      const inRange=!gearRange||(mi>=gearRange.start&&mi<=gearRange.end);
      grCtx.fillStyle=col;
      grCtx.globalAlpha=alpha*(rowDim?0.28:1)*(inRange?1:0.22);
      grCtx.fillRect(cx, y, cw, rowH);
      grCtx.globalAlpha=1;
    });
    grCtx.restore();
  });

  if(gearHoverMonth!==null&&!gearDrag){
    const cx=PL+(gearHoverMonth+0.5)*cellW;
    const gridBottom=PT+active.length*(rowH+rowGap)-rowGap;
    grCtx.save();
    grCtx.strokeStyle=P.accent;grCtx.lineWidth=1.5;grCtx.globalAlpha=0.65;
    grCtx.setLineDash([3,3]);
    grCtx.beginPath();grCtx.moveTo(cx,PT-14);grCtx.lineTo(cx,gridBottom);grCtx.stroke();
    grCtx.setLineDash([]);
    grCtx.globalAlpha=1;
    grCtx.restore();
  }

  if(gearDrag){
    const x0=PL+Math.min(gearDrag.start,gearDrag.current)*cellW;
    const x1=PL+(Math.max(gearDrag.start,gearDrag.current)+1)*cellW;
    grCtx.fillStyle='rgba(37,99,235,0.08)';
    grCtx.fillRect(x0,PT-12,x1-x0,PH+16);
    grCtx.strokeStyle='rgba(37,99,235,0.55)';
    grCtx.lineWidth=1.5;
    grCtx.setLineDash([4,4]);
    grCtx.strokeRect(x0,PT-12,x1-x0,PH+16);
    grCtx.setLineDash([]);
  }

  GR_C._meta={active,rowH,rowGap,PT,PL,PW,nM,cellW};
}

GR_C.addEventListener('mousemove',e=>{
  const m=GR_C._meta;if(!m)return;
  const rect=GR_C.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*(grCanvasCssW/rect.width);
  const my=(e.clientY-rect.top)*(grCanvasCssH/rect.height);
  const {active,rowH,rowGap,PT,PL,PW,nM,cellW}=m;
  const inGrid=mx>=PL&&mx<=PL+PW;
  const hoverMonth=inGrid?clamp(Math.floor((mx-PL)/cellW),0,nM-1):null;
  let hoverCam=null;
  if(inGrid){
    active.forEach((cam,row)=>{
      const y=PT+row*(rowH+rowGap);
      if(my>=y&&my<=y+rowH)hoverCam=cam;
    });
  }
  if(gearDrag){
    if(inGrid&&hoverMonth!==null){
      gearDrag.current=hoverMonth;
      gearDrag.moved=true;
      drawGear();
      updateGearSummary();
    }
    hideTT();
    return;
  }
  let needRedraw=false;
  if(gearHoverCam!==hoverCam){gearHoverCam=hoverCam;needRedraw=true;}
  if(gearHoverMonth!==hoverMonth){gearHoverMonth=hoverMonth;needRedraw=true;}
  if(needRedraw)drawGear();
  if(inGrid&&hoverMonth!==null){
    const monthTotal=active.reduce((sum,cam)=>sum+(cumGear[cam][hoverMonth]||0),0);
    const rows=active.map(cam=>({cam,shots:cumGear[cam][hoverMonth]||0})).sort((a,b)=>b.shots-a.shots);
    const detail=rows.filter(d=>d.shots>0).map(d=>`<span style="color:${CAM_COLS[d.cam]};font-weight:500">${d.cam.replace('Sony ','').replace('Fuji ','').replace('Canon ','').replace('Panasonic ','')}</span>&nbsp;${d.shots.toLocaleString()}`).join('<br>');
    showTT(e,MONTH_LABELS[hoverMonth],`<span style="color:var(--muted)">${monthTotal.toLocaleString()} shots total</span><br><br>${detail||'<span style="color:var(--muted)">No shots</span>'}`);
  }else hideTT();
});
GR_C.addEventListener('mouseleave',()=>{
  if(gearDrag)return;
  gearHoverCam=null;
  gearHoverMonth=null;
  drawGear();
  hideTT();
});

GR_C.addEventListener('mousedown',e=>{
  const m=GR_C._meta;if(!m)return;
  const rect=GR_C.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*(grCanvasCssW/rect.width);
  const my=(e.clientY-rect.top)*(grCanvasCssH/rect.height);
  const {active,rowH,rowGap,PT,PL,PW,nM,cellW}=m;
  // Click in label area → pin camera + show stats card
  if(mx<PL){
    let rowCam=null;
    active.forEach((cam,row)=>{
      const y=PT+row*(rowH+rowGap);
      if(my>=y&&my<=y+rowH)rowCam=cam;
    });
    if(rowCam){
      gearPinnedCam=gearPinnedCam===rowCam?null:rowCam;
      gearRange=null;
      hideTT();
      drawGear();
      updateGearSummary();
    }
    return;
  }
  if(mx>PL+PW)return;
  const month=clamp(Math.floor((mx-PL)/cellW),0,nM-1);
  let rowCam=null;
  active.forEach((cam,row)=>{
    const y=PT+row*(rowH+rowGap);
    if(my>=y&&my<=y+rowH)rowCam=cam;
  });
  gearDrag={start:month,current:month,rowCam,moved:false};
  hideTT();
  drawGear();
});

window.addEventListener('mouseup',()=>{
  if(!gearDrag)return;
  const start=Math.min(gearDrag.start,gearDrag.current);
  const end=Math.max(gearDrag.start,gearDrag.current);
  const moved=Math.abs(gearDrag.current-gearDrag.start)>=1||gearDrag.moved;
  if(moved){
    gearRange={start,end};
  }else if(gearDrag.rowCam){
    gearPinnedCam=gearPinnedCam===gearDrag.rowCam?null:gearDrag.rowCam;
    gearRange=null;
  }else{
    gearRange=null;
  }
  gearDrag=null;
  drawGear();
  updateGearSummary();
});

function updateGearSummary(){
  const el=document.getElementById('gear-summary');
  if(!el)return;
  const active=[...activeCams];
  if(gearPinnedCam&&!activeCams.has(gearPinnedCam))gearPinnedCam=null;
  if(!gearRange&&!gearPinnedCam){el.style.display='none';return;}

  // Camera stats card when pinned with no range selection
  if(gearPinnedCam&&!gearRange){
    const cam=gearPinnedCam;
    const col=CAM_COLS[cam];
    const shots=cumGear[cam];
    const total=shots.reduce((s,v)=>s+v,0);
    const pct=(total/56882*100).toFixed(1);
    const firstIdx=shots.findIndex(v=>v>0);
    const revShots=[...shots].reverse();
    const lastIdx=shots.length-1-revShots.findIndex(v=>v>0);
    const peakVal=Math.max(...shots);
    const peakIdx=shots.indexOf(peakVal);
    el.style.display='block';
    el.style.borderLeftColor=col;
    el.innerHTML=`
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
        <span style="font-size:20px;font-weight:600;color:${col}">${cam}</span>
        <span style="font-size:13px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)">Camera stats - click label again to dismiss</span>
      </div>
      <div style="display:flex;gap:32px;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--text);line-height:1">${total.toLocaleString()}</div>
          <div style="font-size:13px;color:var(--muted);margin-top:4px">total shots</div>
          <div style="font-size:12px;color:${col};margin-top:2px">${pct}% of dataset</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:20px;font-weight:600;color:var(--text);line-height:1">${firstIdx>=0?MONTH_LABELS[firstIdx]:'N/A'}</div>
          <div style="font-size:13px;color:var(--muted);margin-top:4px">first use</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:20px;font-weight:600;color:var(--text);line-height:1">${lastIdx>=0?MONTH_LABELS[lastIdx]:'N/A'}</div>
          <div style="font-size:13px;color:var(--muted);margin-top:4px">last use</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:20px;font-weight:600;color:${col};line-height:1">${peakVal.toLocaleString()} shots</div>
          <div style="font-size:13px;color:var(--muted);margin-top:4px">peak month</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${peakIdx>=0?MONTH_LABELS[peakIdx]:'N/A'}</div>
        </div>
      </div>`;
    return;
  }

  // Period summary (range drag or pinned+range)
  const range=gearRange||{start:0,end:MONTH_LABELS.length-1};
  const months=range.end-range.start+1;
  const cams=gearPinnedCam?[gearPinnedCam]:active;
  const totals=cams.map(cam=>({
    cam,
    total:cumGear[cam].slice(range.start,range.end+1).reduce((sum,v)=>sum+v,0)
  })).sort((a,b)=>b.total-a.total);
  const top=totals[0];
  const totalShots=totals.reduce((sum,d)=>sum+d.total,0);
  const monthLabel=months===1?MONTH_LABELS[range.start]:`${MONTH_LABELS[range.start]} – ${MONTH_LABELS[range.end]}`;
  const detail=totals.slice(0,3).map(d=>`<span style="color:${CAM_COLS[d.cam]};font-weight:500">${d.cam}</span> ${d.total.toLocaleString()}`).join(' &nbsp;·&nbsp; ');
  const leader=top?`Most used: <strong style="color:${CAM_COLS[top.cam]}">${top.cam}</strong> with ${top.total.toLocaleString()} shots`:'';
  el.style.display='block';
  el.style.borderLeftColor='var(--accent)';
  el.innerHTML=`<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:baseline">
    <span style="font-size:20px;font-weight:600;color:var(--accent);line-height:1">${totalShots.toLocaleString()}</span>
    <span style="font-size:16px;color:var(--muted)">${months} month${months>1?'s':''}: ${monthLabel}</span>
    <span style="color:var(--muted);font-size:16px">${leader}</span>
  </div>
  <div style="font-size:15px;color:var(--muted);margin-top:10px">${detail}</div>`;
}

function resizeGear(){
  const n=[...activeCams].length;
  const h=32+20+n*48+Math.max(0,n-1)*8; // PT+PB + n rows at max rowH + gaps
  grApplyCanvasSize(cardInnerWidth(GR_C),h);
  drawGear();
}

function gearEnter(){
  if(gearAnimAF)cancelAnimationFrame(gearAnimAF);
  gearHoverCam=null;
  gearRevealT=0;
  resizeGear();
  const start=performance.now(), dur=1700;
  const tick=ts=>{
    gearRevealT=ease(clamp((ts-start)/dur,0,1));
    drawGear();
    if(gearRevealT<1)gearAnimAF=requestAnimationFrame(tick);
    else {gearRevealT=1;gearAnimAF=null;drawGear();}
  };
  gearAnimAF=requestAnimationFrame(tick);
}
