const EXP_C=document.getElementById('exp-canvas');
const expCtx=EXP_C.getContext('2d');

const AXES={
  iso:     {label:'ISO sensitivity',ticks:[100,200,400,800,1600,3200,6400,25600],tickFmt:v=>v>=1000?(v/1000)+'k':String(v),xform:v=>Math.log2(v/100)/Math.log2(256)},
  aperture:{label:'Aperture (f/)',  ticks:[1.4,2,2.8,4,5.6,8,11,16],           tickFmt:v=>'f/'+v,             xform:v=>Math.log2(Math.max(v,1))/Math.log2(22)},
  shutter: {label:'Shutter speed', ticks:[1/4000,1/1000,1/250,1/60,1/15,1,2], tickFmt:v=>v>=1?v+'s':'1/'+Math.round(1/v)+'s', xform:v=>Math.log(Math.max(v,1/4000)*4000)/Math.log(8000)},
  focal:   {label:'Focal length',  ticks:[14,24,35,50,70,100,200],             tickFmt:v=>v+'mm',             xform:v=>Math.log2(Math.max(v,14)/14)/Math.log2(200/14)},
};

const EXP_COLOR_MAPS={
  year:      {fn:d=>YR_COLS[d.yr],items:YEARS.map(y=>({label:String(y),color:YR_COLS[y]}))},
  camera:    {fn:d=>d.cam==='Sony'?P.g1:d.cam==='Fuji'?P.g2:d.cam==='Panasonic'?P.g3:d.cam==='iPhone'?P.g5:P.g7,
               items:[{label:'Sony',color:P.g1},{label:'Fuji',color:P.g2},{label:'Panasonic',color:P.g3},{label:'iPhone',color:P.g5},{label:'Other',color:P.g7}]},
  focal_cat: {fn:d=>d.focal<35?P.g8:d.focal<85?P.g4:P.g6,
               items:[{label:'Wide (<35mm)',color:P.g8},{label:'Normal (35–85mm)',color:P.g4},{label:'Tele (>85mm)',color:P.g6}]},
};

const jRnd=rng(55);
const EXP_RAW=EXP_DATA.map(d=>({
  ...d,
  jx:(jRnd()-.5)*.018,
  jy:(jRnd()-.5)*.018,
}));

const expSpeedRnd=rng(88);
const EXP_SPRING_STIFF_MIN=0.006;
const EXP_SPRING_STIFF_SPAN=0.018;
const EXP_SPRING_DAMP_MIN=0.76;
const EXP_SPRING_DAMP_SPAN=0.08;
const expSprings=EXP_RAW.map(()=>({
  cx:0,cy:0,vx:0,vy:0,tx:0,ty:0,
  stiff:EXP_SPRING_STIFF_MIN+expSpeedRnd()*EXP_SPRING_STIFF_SPAN,
  damp:EXP_SPRING_DAMP_MIN+expSpeedRnd()*EXP_SPRING_DAMP_SPAN
}));
let expAnimAF=null;

const EXP_INSIGHTS={
  'iso|aperture':   {icon:'📷',title:'Aperture priority signature',body:'Adrien usually shoots in aperture priority, so aperture is intentionally chosen while ISO adapts to exposure. That creates a fairly straight structure in this view, with ISO mostly bounded between 100 and 3200 on Sony.'},
  'aperture|iso':   {icon:'📷',title:'f/2.8 dominates',body:'The strong vertical band at f/2.8 comes from the two most used lenses. Since aperture is often fixed first, ISO changes independently, so there is no strong global ISO-aperture correlation apart from these lens limits.'},
  'iso|shutter':    {icon:'⚡',title:'Bright scenes sit bottom-left',body:'At very fast shutter speeds, ISO tends to stay low. Those points correspond to bright scenes where the camera limits incoming light. The rest of the cloud is more spread because shutter and ISO are both adapting.'},
  'shutter|iso':    {icon:'⚡',title:'Auto exposure compensation',body:'High shutter speed regions are mostly low ISO, while slower shutter regions need higher ISO more often. This spread reflects automatic compensation between both settings under changing light conditions.'},
  'aperture|shutter':{icon:'⏱️',title:'Weak direct correlation',body:'Adrien usually sets aperture first, then shutter speed adapts. The f/2.8 column is prominent because of lens limits, but outside that, shutter and aperture do not show a strong one-to-one relationship.'},
  'shutter|aperture':{icon:'⏱️',title:'Aperture priority again',body:'Most of the time shutter speed is the adaptive variable and aperture is the controlled one. That is why the pattern stays fairly structured without a strong free-form aperture-shutter dependency.'},
  'focal|aperture': {icon:'🔭',title:'Lens constraints are visible',body:'This view highlights lens boundaries clearly. Zoom lenses (24-70mm and 70-200mm) mostly open to f/2.8, while primes can open wider like f/1.4 at 50mm. Fuji shots cluster at 24mm with a max opening around f/2.'},
  'aperture|focal': {icon:'🔭',title:'Lens families shape the plot',body:'You can read lens behavior directly from this chart: zooms are constrained around f/2.8, primes open wider, and focal bands reveal hard optical limits. Across focal lengths, Adrien often favors the widest available aperture.'},
  'focal|shutter':  {icon:'📐',title:'Rule of thumb appears',body:'Lens limits form strong columns at key focal lengths, and a near-affine trend appears in shutter adaptation. In practice it follows a rule close to 1 / (4 * focal length), typical of handheld sharpness control.'},
  'shutter|focal':  {icon:'📐',title:'Handheld stabilization logic',body:'When you invert axes, the same structure becomes very clear: focal length stays on lens-defined bands while shutter speed follows an adaptive curve close to 1 / (4 * focal length).'},
  'iso|focal':      {icon:'🎯',title:'No strong global dependency',body:'There is no strict focal-to-ISO law here. The key insight is different: focal length is hard-bounded by lens design, while ISO has photographer-defined upper limits that can be occasionally exceeded, creating outliers.'},
  'focal|iso':      {icon:'🎯',title:'Bounded optics vs bounded noise',body:'Focal length cannot exceed lens limits, so vertical bands appear naturally. ISO is soft-bounded by shooting choices to control noise, with a few isolated high-ISO exceptions when conditions require it.'},
};

function getInsight(xKey,yKey){
  return EXP_INSIGHTS[xKey+'|'+yKey]||{icon:'🔍',title:'Explore freely',body:'This combination does not show a dominant photographic rule, but interesting local patterns can still appear. Try coloring by focal range or camera to reveal gear-driven clusters.'};
}

function updateInsightCard(xKey,yKey){
  const ins=getInsight(xKey,yKey);
  document.getElementById('exp-insight-icon').textContent=ins.icon;
  document.getElementById('exp-insight-title').textContent=ins.title;
  document.getElementById('exp-insight-body').textContent=ins.body;
}


function computeExpTargets(){
  const xKey=document.getElementById('x-axis').value;
  const yKey=document.getElementById('y-axis').value;
  const W=EXP_C.width,H=EXP_C.height;
  const PL=72,PR=20,PT=24,PB=56,PW=W-PL-PR,PH=H-PT-PB;
  const PAD=20;
  const r=expZoomRange;
  const xLo=r?r.xLo:0, xHi=r?r.xHi:1;
  const yLo=r?r.yLo:0, yHi=r?r.yHi:1;
  EXP_RAW.forEach((d,i)=>{
    const xn=clamp(AXES[xKey].xform(d[xKey])+d.jx,0,1);
    const yn=clamp(AXES[yKey].xform(d[yKey])+d.jy,0,1);
    expSprings[i].tx=PL+PAD+(xn-xLo)/(xHi-xLo)*(PW-2*PAD);
    expSprings[i].ty=PT+PAD+(1-(yn-yLo)/(yHi-yLo))*(PH-2*PAD);
  });
}

function drawExpFrame(){
  const W=EXP_C.width,H=EXP_C.height;
  expCtx.clearRect(0,0,W,H);
  const PL=72,PR=20,PT=24,PB=56,PW=W-PL-PR,PH=H-PT-PB;
  const xKey=document.getElementById('x-axis').value;
  const yKey=document.getElementById('y-axis').value;
  const colKey=document.getElementById('color-by').value;
  const colMap=EXP_COLOR_MAPS[colKey];

  // Border (grid lines + tick labels handled by D3 SVG overlay)
  expCtx.strokeStyle=P.dim;expCtx.lineWidth=1;
  expCtx.beginPath();expCtx.moveTo(PL,PT);expCtx.lineTo(PL,PT+PH);expCtx.lineTo(PL+PW,PT+PH);expCtx.stroke();

  // Dots - clipped to padded plot area (PAD matches computeExpTargets)
  const DOT_PAD=20;
  expCtx.save();
  expCtx.beginPath();expCtx.rect(PL+DOT_PAD-6,PT+DOT_PAD-6,PW-2*(DOT_PAD-6),PH-2*(DOT_PAD-6));expCtx.clip();
  const hasSel=expBrushSel!==null&&expBrushSel.size>0;
  EXP_RAW.forEach((d,i)=>{
    const s=expSprings[i],col=colMap.fn(d);
    const inSel=!hasSel||expBrushSel.has(i);
    expCtx.beginPath();expCtx.arc(s.cx,s.cy,inSel?3.5:2,0,Math.PI*2);
    expCtx.globalAlpha=inSel?(hasSel?0.82:0.45):0.07;
    expCtx.fillStyle=inSel?col:P.muted;
    expCtx.fill();
    expCtx.globalAlpha=1;
  });
  expCtx.restore();

  const lg=document.getElementById('exp-legend');lg.innerHTML='';
  colMap.items.forEach(it=>{lg.innerHTML+=`<div class="li"><div class="li-dot" style="background:${it.color}"></div>${it.label}</div>`});
  lg.innerHTML+=`<div class="li" style="margin-left:8px;padding-left:14px;border-left:1px solid var(--border)"><svg width="22" height="10" style="flex-shrink:0;vertical-align:middle"><line x1="0" y1="5" x2="22" y2="5" stroke="${P.accent}" stroke-width="2.5" stroke-opacity="0.75" stroke-linecap="round"/></svg>&nbsp;Median trend</div>`;
  EXP_C._meta={PL,PT,PW,PH};
}

function runExpSprings(){
  let moving=false;
  EXP_RAW.forEach((_,i)=>{
    const s=expSprings[i];
    s.vx=(s.vx+(s.tx-s.cx)*s.stiff)*s.damp;s.cx+=s.vx;
    s.vy=(s.vy+(s.ty-s.cy)*s.stiff)*s.damp;s.cy+=s.vy;
    if(Math.abs(s.cx-s.tx)>.3||Math.abs(s.cy-s.ty)>.3)moving=true;
  });
  drawExpFrame();
  if(moving)expAnimAF=requestAnimationFrame(runExpSprings);
}

function redrawExposure(){
  expBrushSel=null;expZoomRange=null;expZoomed=false;updateExpStats();
  const xKey=document.getElementById('x-axis').value;
  const yKey=document.getElementById('y-axis').value;
  updateInsightCard(xKey,yKey);computeExpTargets();updateExpAxesSVG();
  if(expAnimAF)cancelAnimationFrame(expAnimAF);
  expAnimAF=requestAnimationFrame(runExpSprings);
}

function drawExposure(){
  const xKey=document.getElementById('x-axis').value;
  const yKey=document.getElementById('y-axis').value;
  updateInsightCard(xKey,yKey);updateExpAxesSVG();
  const W=EXP_C.width,H=EXP_C.height;
  const PL=72,PR=20,PT=24,PB=56,PW=W-PL-PR,PH=H-PT-PB;
  const r2=rng(77);
  expSprings.forEach(s=>{s.cx=PL+r2()*PW;s.cy=PT+r2()*PH;s.vx=0;s.vy=0});
  computeExpTargets();
  if(expAnimAF)cancelAnimationFrame(expAnimAF);
  expAnimAF=requestAnimationFrame(runExpSprings);
}

let expBrushSel=null;
let expD3Brush=null;
let expHintUsed=false;
let expZoomed=false;
let expZoomRange=null;
function cardInnerWidth(el){const cs=getComputedStyle(el.parentElement);return el.parentElement.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);}
// cap canvas at 46% viewport so surrounding text is not dwarfed
function vizH(minH){return Math.max(minH,Math.min(Math.round(window.innerHeight*0.46),520));}
function resizeExp(){
  const h=vizH(380);
  EXP_C.height=h;EXP_C.style.height=h+'px';
  EXP_C.width=cardInnerWidth(EXP_C);
  redrawExposure();
}

const expSVG=d3.select('#exp-svg');

// Tooltip via SVG (SVG intercepts mouse events; canvas tooltip moved here)
expSVG.on('mousemove',function(event){
  if(expBrushSel!==null&&!expZoomed){hideTT();return;}
  const [mx,my]=d3.pointer(event,this);
  let cl=null,md=22;
  EXP_RAW.forEach((d,i)=>{const s=expSprings[i],ds=Math.hypot(s.cx-mx,s.cy-my);if(ds<md){md=ds;cl=d;}});
  if(cl){
    const sstr=cl.shutter>=1?cl.shutter.toFixed(1)+'s':'1/'+Math.round(1/cl.shutter)+'s';
    const fcat=cl.focal<35?'Wide angle':cl.focal<85?'Normal':'Telephoto';
    showTT(event,`${cl.cam} · ${cl.yr}`,`ISO ${Math.round(cl.iso).toLocaleString()}<br>f/${cl.aperture.toFixed(1)}<br>${sstr}<br>${Math.round(cl.focal)}mm<br><span style="color:var(--muted)">${fcat}</span>`);
  }else hideTT();
}).on('mouseleave',hideTT);

function updateExpStats(){
  const el=document.getElementById('exp-stats');if(!el)return;
  if(!expBrushSel||expBrushSel.size===0){el.style.display='none';const zb=document.getElementById('exp-zoom-out-btn');if(zb)zb.style.display='none';return;}
  const sel=EXP_RAW.filter((_,i)=>expBrushSel.has(i));
  const n=sel.length;
  const med=arr=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};
  const mISO=med(sel.map(d=>d.iso));
  const mAp=med(sel.map(d=>d.aperture));
  const mSh=med(sel.map(d=>d.shutter));
  const mFo=Math.round(med(sel.map(d=>d.focal)));
  const sstr=mSh>=1?mSh.toFixed(1)+'s':'1/'+Math.round(1/mSh)+'s';
  const camCounts={};sel.forEach(d=>{camCounts[d.cam]=(camCounts[d.cam]||0)+1;});
  const camStr=Object.entries(camCounts).sort((a,b)=>b[1]-a[1])
    .map(([c,cnt])=>{const col=EXP_COLOR_MAPS.camera.items.find(it=>it.label===c)?.color||P.muted;return `<span style="color:${col};font-weight:500">${c}</span> ${Math.round(cnt/n*100)}%`;}).join(' &nbsp;·&nbsp; ');
  const yrCounts={};sel.forEach(d=>{yrCounts[d.yr]=(yrCounts[d.yr]||0)+1;});
  const yrStr=Object.entries(yrCounts).sort((a,b)=>+a[0]-+b[0])
    .map(([y,cnt])=>`<span style="color:${YR_COLS[y]||P.muted};font-weight:500">${y}</span> ${Math.round(cnt/n*100)}%`).join(' &nbsp;·&nbsp; ');
  el.style.display='block';
  const zoomBtn=document.getElementById('exp-zoom-out-btn');
  if(zoomBtn)zoomBtn.style.display=expZoomed?'block':'none';
  el.innerHTML=`<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:baseline">
    <span style="font-size:24px;font-weight:600;color:var(--accent);line-height:1">${n}</span><span style="font-size:16px;color:var(--muted)">photos selected</span>
    <span style="color:var(--muted);font-size:17px">ISO <strong style="color:var(--text)">${mISO.toLocaleString()}</strong></span>
    <span style="color:var(--muted);font-size:17px">f/<strong style="color:var(--text)">${mAp.toFixed(1)}</strong></span>
    <span style="color:var(--muted);font-size:17px">shutter <strong style="color:var(--text)">${sstr}</strong></span>
    <span style="color:var(--muted);font-size:17px">focal <strong style="color:var(--text)">${mFo}mm</strong></span>
  </div>
  <div style="font-size:15px;color:var(--muted);margin-top:10px">${camStr} &nbsp;&nbsp; ${yrStr}</div>`;
}

function expClearBrush(){
  expBrushSel=null;
  drawExpFrame();
  updateExpStats();
  if(expD3Brush) expSVG.select('.exp-brush').call(expD3Brush.move,null);
}
function expZoomOut(){
  expZoomRange=null;expZoomed=false;expBrushSel=null;
  computeExpTargets();updateExpAxesSVG();
  if(expAnimAF)cancelAnimationFrame(expAnimAF);
  expAnimAF=requestAnimationFrame(runExpSprings);
  updateExpStats();
}

function updateExpAxesSVG(){
  const xKey=document.getElementById('x-axis').value;
  const yKey=document.getElementById('y-axis').value;
  const W=EXP_C.width,H=EXP_C.height;
  const PL=72,PR=20,PT=24,PB=56,PW=W-PL-PR,PH=H-PT-PB;
  const PAD=20;

  expSVG.attr('width',W).attr('height',H)
    .style('width',W+'px').style('height',H+'px')
    .selectAll('*').remove();

  if(typeof d3==='undefined')return;

  const axX=AXES[xKey], axY=AXES[yKey];
  const r=expZoomRange;
  const xDomLo=r?r.xLo:0, xDomHi=r?r.xHi:1;
  const yDomLo=r?r.yLo:0, yDomHi=r?r.yHi:1;

  const xScale=d3.scaleLinear().domain([xDomLo,xDomHi]).range([PL,PL+PW]);
  const yScale=d3.scaleLinear().domain([yDomLo,yDomHi]).range([PT+PH,PT]);
  const g=expSVG.append('g');

  // X axis - only ticks within the current domain
  const xTicks=axX.ticks.map(t=>({norm:clamp(axX.xform(t),0,1),label:axX.tickFmt(t)}))
    .filter(({norm})=>norm>=xDomLo&&norm<=xDomHi);
  g.append('g').attr('transform',`translate(0,${PT+PH})`)
    .call(d3.axisBottom(xScale).tickValues(xTicks.map(t=>t.norm)).tickFormat((_,i)=>xTicks[i].label).tickSize(-PH))
    .call(ax=>{
      ax.select('.domain').remove();
      ax.selectAll('.tick line').attr('stroke',P.dim).attr('stroke-dasharray','3,3');
      ax.selectAll('.tick text').attr('fill',P.muted).attr('font-family','Inter,sans-serif').attr('font-size',13).attr('dy',15);
    });

  // Y axis - only ticks within the current domain
  const yTicks=axY.ticks.map(t=>({norm:clamp(axY.xform(t),0,1),label:axY.tickFmt(t)}))
    .filter(({norm})=>norm>=yDomLo&&norm<=yDomHi);
  g.append('g').attr('transform',`translate(${PL},0)`)
    .call(d3.axisLeft(yScale).tickValues(yTicks.map(t=>t.norm)).tickFormat((_,i)=>yTicks[i].label).tickSize(-PW))
    .call(ax=>{
      ax.select('.domain').remove();
      ax.selectAll('.tick line').attr('stroke',P.dim).attr('stroke-dasharray','3,3');
      ax.selectAll('.tick text').attr('fill',P.muted).attr('font-family','Inter,sans-serif').attr('font-size',13).attr('dx',-6).attr('dy','0.32em');
    });

  g.append('text').attr('x',PL+PW/2).attr('y',PT+PH+46)
    .attr('text-anchor','middle').attr('font-family','Inter,sans-serif').attr('font-size',14).attr('fill',P.muted)
    .text(axX.label);
  g.append('text').attr('transform',`translate(14,${PT+PH/2}) rotate(-90)`)
    .attr('text-anchor','middle').attr('font-family','Inter,sans-serif').attr('font-size',14).attr('fill',P.muted)
    .text(axY.label);

  // Trend line: zoom-aware binned medians
  const numBins=12;
  const xSpan=xDomHi-xDomLo, ySpan=yDomHi-yDomLo;
  const trendRaw=[];
  for(let i=0;i<numBins;i++){
    const xlo=i/numBins, xhi=(i+1)/numBins;
    const ys=EXP_RAW
      .filter(d=>{const xn=clamp(axX.xform(d[xKey]),0,1);return xn>=xlo&&xn<xhi;})
      .map(d=>clamp(axY.xform(d[yKey]),0,1))
      .sort((a,b)=>a-b);
    if(ys.length<8)continue;
    trendRaw.push({xn:(i+0.5)/numBins, yn:ys[Math.floor(ys.length/2)]});
  }
  if(trendRaw.length>=3){
    const trendPts=trendRaw.map(({xn,yn})=>({
      x:PL+PAD+(xn-xDomLo)/xSpan*(PW-2*PAD),
      y:PT+PAD+(1-(yn-yDomLo)/ySpan)*(PH-2*PAD)
    })).filter(({x,y})=>x>PL-30&&x<PL+PW+30&&y>PT-30&&y<PT+PH+30);
    if(trendPts.length>=2){
      g.append('path').datum(trendPts)
        .attr('d',d3.line().x(d=>d.x).y(d=>d.y).curve(d3.curveCatmullRom.alpha(0.5)))
        .attr('fill','none').attr('stroke',P.accent).attr('stroke-width',2.5)
        .attr('stroke-opacity',0.75).attr('stroke-linecap','round');
    }
  }

  // Drag-to-select hint (until first use)
  if(!expZoomed&&!expHintUsed){
    const hw=160,hh=30,hx=PL+PW/2-hw/2,hy=PT+PH-hh-16;
    const hintG=g.append('g').attr('class','drag-hint');
    hintG.append('rect').attr('x',hx).attr('y',hy).attr('width',hw).attr('height',hh).attr('rx',7)
      .attr('fill','rgba(255,255,255,0.95)').attr('stroke',P.accent).attr('stroke-width',1.5).attr('stroke-dasharray','4,2');
    hintG.append('rect').attr('x',hx+10).attr('y',hy+8).attr('width',13).attr('height',13).attr('rx',2)
      .attr('fill','rgba(249,115,22,0.12)').attr('stroke',P.accent).attr('stroke-width',1.2).attr('stroke-dasharray','2,2');
    hintG.append('text').attr('x',hx+28).attr('y',hy+19)
      .attr('font-family','Inter,sans-serif').attr('font-size',13).attr('font-weight','500').attr('fill',P.accent)
      .text('Drag to select photos');
  }

  // D3 brush - added last so it sits on top. In zoomed mode it selects only;
  // in the overview it selects and then zooms into that selection.
  expD3Brush=d3.brush()
    .extent([[PL,PT],[PL+PW,PT+PH]])
    .on('start',()=>{hideTT();expHintUsed=true;expSVG.select('.drag-hint').style('display','none');})
    .on('brush',({selection})=>{
      if(!selection)return;
      const [[x0,y0],[x1,y1]]=selection;
      expBrushSel=new Set();
      EXP_RAW.forEach((_,i)=>{const s=expSprings[i];if(s.cx>=x0&&s.cx<=x1&&s.cy>=y0&&s.cy<=y1)expBrushSel.add(i);});
      if(expBrushSel.size===0)expBrushSel=null;
      drawExpFrame();updateExpStats();
    })
    .on('end',({selection})=>{
      if(!selection){expBrushSel=null;drawExpFrame();updateExpStats();return;}
      if(expZoomed){drawExpFrame();updateExpStats();return;}
      if(expBrushSel&&expBrushSel.size>0){
        // Compute bounding box of selected points in normalized space
        const sel=EXP_RAW.filter((_,i)=>expBrushSel.has(i));
        const xNorms=sel.map(d=>clamp(AXES[xKey].xform(d[xKey]),0,1));
        const yNorms=sel.map(d=>clamp(AXES[yKey].xform(d[yKey]),0,1));
        const xLo=Math.min(...xNorms), xHi=Math.max(...xNorms);
        const yLo=Math.min(...yNorms), yHi=Math.max(...yNorms);
        const xPad=Math.max((xHi-xLo)*0.22,0.04), yPad=Math.max((yHi-yLo)*0.22,0.04);
        expZoomRange={
          xLo:Math.max(0,xLo-xPad), xHi:Math.min(1,xHi+xPad),
          yLo:Math.max(0,yLo-yPad), yHi:Math.min(1,yHi+yPad)
        };
        expZoomed=true;
        computeExpTargets();updateExpAxesSVG();
        if(expAnimAF)cancelAnimationFrame(expAnimAF);
        expAnimAF=requestAnimationFrame(runExpSprings);
        updateExpStats();
      }
    });
  const brushG=g.append('g').attr('class','exp-brush').call(expD3Brush);
  brushG.select('.selection')
    .attr('fill','rgba(249,115,22,0.06)')
    .attr('stroke',P.accent).attr('stroke-width',1.5).attr('stroke-dasharray','4,2');
  brushG.select('.overlay').attr('cursor','crosshair');
}

