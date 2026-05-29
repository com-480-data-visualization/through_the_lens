const LR_C=document.getElementById('lens-canvas');
const lrCtx=LR_C.getContext('2d');
let lrCanvasCssW=0, lrCanvasCssH=0;
function lrApplyCanvasSize(cssW,cssH){
  const dpr=Math.min(window.devicePixelRatio||1,2.5);
  lrCanvasCssW=cssW; lrCanvasCssH=cssH;
  LR_C.width=Math.max(1,Math.floor(cssW*dpr));
  LR_C.height=Math.max(1,Math.floor(cssH*dpr));
  LR_C.style.width=cssW+'px';
  LR_C.style.height=cssH+'px';
  lrCtx.setTransform(dpr,0,0,dpr,0,0);
}

// Build cumulative totals per lens
const lensCum={};
LENSES.forEach(l=>{
  let acc=0;
  lensCum[l]=LENS_MONTHLY[l].map(v=>(acc+=v,acc));
});

const nLensMonths=LENS_MONTH_LABELS.length;
document.getElementById('lr-slider').max=nLensMonths-1;

// Current displayed values (smooth interpolation targets)
const lrCur={};
LENSES.forEach(l=>{lrCur[l]=0});

let lrFrameF=0; // float frame index for smooth animation
let lrPlaying=false;
let lrAF=null;
let lrInited=false;
let lrLastTs=null;
let lrSpeed=1;
const LR_BASE_MONTHS_PER_SEC=3.6;

function lrMaxAt(fi){
  const fi0=Math.floor(fi);
  return Math.max(...LENSES.map(l=>lensCum[l][fi0]||0),1);
}

function lrDrawFrame(){
  const W=lrCanvasCssW,H=lrCanvasCssH;
  lrCtx.clearRect(0,0,W,H);

  const nL=LENSES.length;
  const PL=155,PR=16,PT=20,PB=20,PW=W-PL-PR,PH=H-PT-PB;
  const rowH=Math.min(Math.floor((PH-10*(nL-1))/nL),62);
  const rowGap=8;

  // Sort by current cumulative count descending (creates the race)
  const sorted=[...LENSES].sort((a,b)=>lrCur[b]-lrCur[a]);
  const maxVal=Math.max(...LENSES.map(l=>lrCur[l]),1);

  sorted.forEach((lens,rank)=>{
    const y=PT+rank*(rowH+rowGap);
    const col=LENS_COLS[lens];
    const frac=lrCur[lens]/maxVal;
    const barW=Math.max(frac*PW,1);

    lrCtx.fillStyle=P.dim;lrCtx.globalAlpha=0.35;
    lrCtx.beginPath();lrCtx.roundRect(PL,y,PW,rowH,6);lrCtx.fill();
    lrCtx.globalAlpha=1;

    lrCtx.save();
    lrCtx.beginPath();lrCtx.roundRect(PL,y,PW,rowH,6);lrCtx.clip();
    lrCtx.fillStyle=col;lrCtx.globalAlpha=0.82;
    lrCtx.fillRect(PL,y,barW,rowH);
    lrCtx.globalAlpha=1;
    lrCtx.restore();

    lrCtx.fillStyle=P.muted;lrCtx.font='500 16px Inter';lrCtx.textAlign='right';
    lrCtx.fillText(lens,PL-8,y+rowH/2+4);

    const val=Math.round(lrCur[lens]).toLocaleString();
    const textX=PL+barW+(barW>PW*0.15?-8:6);
    lrCtx.fillStyle=barW>PW*0.15?'#fff':P.muted;
    lrCtx.font='500 16px Inter';
    lrCtx.textAlign=barW>PW*0.15?'right':'left';
    lrCtx.fillText(val+' shots',textX,y+rowH/2+4);
  });

  const fi0=clamp(Math.floor(lrFrameF),0,nLensMonths-1);
  lrCtx.fillStyle=P.muted;lrCtx.font='14px Inter';lrCtx.textAlign='right';
  lrCtx.fillText(LENS_MONTH_LABELS[fi0],W-PR,PT-6);
}

function lrTickValues(){
  // Lerp current values toward target frame
  const fi=clamp(lrFrameF,0,nLensMonths-1);
  const fi0=Math.floor(fi);
  const fi1=Math.min(fi0+1,nLensMonths-1);
  const t=fi-fi0;
  LENSES.forEach(l=>{
    const v0=lensCum[l][fi0];
    const v1=lensCum[l][fi1];
    lrCur[l]=v0+(v1-v0)*t;
  });
}

function lrStep(ts){
  if(!lrPlaying){lrAF=null;lrLastTs=null;return}
  if(lrLastTs===null)lrLastTs=ts;
  const dt=Math.min((ts-lrLastTs)/1000,0.08);
  lrLastTs=ts;
  lrFrameF+=LR_BASE_MONTHS_PER_SEC*lrSpeed*dt;
  if(lrFrameF>=nLensMonths-1){
    lrFrameF=nLensMonths-1;lrPlaying=false;lrLastTs=null;
    document.getElementById('lr-play-btn').textContent='▶';
  }
  lrTickValues();
  lrDrawFrame();
  document.getElementById('lr-slider').value=Math.round(lrFrameF);
  document.getElementById('lr-time-label').textContent=LENS_MONTH_LABELS[clamp(Math.round(lrFrameF),0,nLensMonths-1)];
  if(lrPlaying)lrAF=requestAnimationFrame(lrStep);else lrAF=null;
}

function lrTogglePlay(){
  lrPlaying=!lrPlaying;
  document.getElementById('lr-play-btn').textContent=lrPlaying?'⏸':'▶';
  lrLastTs=null;
  if(lrPlaying){
    if(lrFrameF>=nLensMonths-1)lrFrameF=0;
    if(lrAF)cancelAnimationFrame(lrAF);
    lrAF=requestAnimationFrame(lrStep);
  }
}

function lrSeek(fi){
  lrPlaying=false;document.getElementById('lr-play-btn').textContent='▶';
  lrLastTs=null;
  if(lrAF){cancelAnimationFrame(lrAF);lrAF=null}
  lrFrameF=fi;
  lrTickValues();lrDrawFrame();
  document.getElementById('lr-time-label').textContent=LENS_MONTH_LABELS[clamp(fi,0,nLensMonths-1)];
}

function lrSetSpeed(v){
  lrSpeed=clamp(v,0.4,2);
  const label=document.getElementById('lr-speed-label');
  if(label)label.textContent=lrSpeed.toFixed(lrSpeed%1?2:0).replace(/0$/,'')+'×';
}

function lrInit(){
  if(lrInited)return;lrInited=true;
  lrSetSpeed(+(document.getElementById('lr-speed')?.value||1));
  lrSeek(0);
}

function lrEnter(){
  resizeLens();
  lrInit();
  lrSeek(0);
  lrPlaying=true;
  document.getElementById('lr-play-btn').textContent='⏸';
  lrLastTs=null;
  if(lrAF)cancelAnimationFrame(lrAF);
  lrAF=requestAnimationFrame(lrStep);
}

function resizeLens(){
  const nL=LENSES.length;
  const h=20+20+nL*62+Math.max(0,nL-1)*10; // PT+PB + n bars at max rowH + gaps
  lrApplyCanvasSize(cardInnerWidth(LR_C),h);
  if(lrInited)lrDrawFrame();
}

