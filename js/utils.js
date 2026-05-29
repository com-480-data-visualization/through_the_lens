function rng(s){let x=s;return()=>{x=(x*1664525+1013904223)&0xffffffff;return(x>>>0)/4294967296}}
function lerp(a,b,t){return a+(b-a)*t}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function ease(t){return 1-Math.pow(1-clamp(t,0,1),3)}
function goto(id){document.getElementById(id).scrollIntoView({behavior:'smooth'})}

const MOSAIC_REDUCE_MOTION=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let mosaicParallaxPending=false;
let mosaicItems=null;
let mosaicSeed=0;

function mosaicUrl(rel){return new URL(rel,window.location.href).href}

function shuffleArr(arr,rand){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function fillMosaicPool(items,minCount,rand){
  const out=[];
  let pool=shuffleArr(items,rand);
  while(out.length<minCount){
    out.push(...pool);
    pool=shuffleArr(items,rand);
  }
  return out.slice(0,minCount);
}

const MOSAIC_FLOAT_COUNT=62;
const MOSAIC_SIZE_MIN=110;
const MOSAIC_SIZE_MAX=240;
const MOSAIC_PARALLAX_MIN=0.22;
const MOSAIC_PARALLAX_MAX=0.58;
const MOSAIC_SCROLL_GAIN=1.4;

function mosaicCanvasHeight(){
  return Math.round(window.innerHeight*3.2);
}

function mosaicTileCount(){
  return MOSAIC_FLOAT_COUNT;
}

function mosaicPickPosition(size,pad,vw,vh,rand){
  const left=pad+rand()*Math.max(1,vw-size-pad*2);
  const top=pad+rand()*Math.max(1,vh-size-pad*2);
  return{left,top};
}

function appendMosaicTiles(host,pool,rand){
  const vw=window.innerWidth;
  const vh=mosaicCanvasHeight();
  const sizeMin=Math.round(Math.min(MOSAIC_SIZE_MIN,vw*0.32));
  const sizeMax=Math.round(Math.min(MOSAIC_SIZE_MAX,vw*0.48));
  host.style.height=vh+'px';
  const frag=document.createDocumentFragment();
  pool.forEach(item=>{
    if(!item.thumb)return;
    const size=Math.round(lerp(sizeMin,sizeMax,rand()));
    const t=clamp((size-sizeMin)/Math.max(1,sizeMax-sizeMin),0,1);
    const pad=12;
    const pos=mosaicPickPosition(size,pad,vw,vh,rand);
    const left=pos.left;
    const top=pos.top;
    const rot=((rand()-0.5)*16).toFixed(1);
    const parallax=lerp(MOSAIC_PARALLAX_MIN,MOSAIC_PARALLAX_MAX,t);
    const blur=lerp(1.6,0,1-t);
    const cell=document.createElement('span');
    cell.className='mosaic-cell';
    cell.dataset.parallax=parallax.toFixed(4);
    cell.dataset.rot=rot;
    cell.style.left=left+'px';
    cell.style.top=top+'px';
    cell.style.width=size+'px';
    cell.style.height=size+'px';
    cell.style.zIndex=String(Math.round(lerp(8,120,t)));
    cell.style.setProperty('--tile-rot',rot+'deg');
    cell.style.opacity=lerp(0.82,1,t).toFixed(2);
    if(blur>0.12)cell.style.filter=`blur(${blur.toFixed(1)}px)`;
    cell.style.boxShadow=`0 ${lerp(3,8,t).toFixed(0)}px ${lerp(16,28,t).toFixed(0)}px rgba(15,23,42,${lerp(.1,.2,t).toFixed(2)})`;
    const img=document.createElement('img');
    img.src=mosaicUrl(item.thumb);
    img.alt='';
    img.width=size;
    img.height=size;
    cell.appendChild(img);
    frag.appendChild(cell);
  });
  host.appendChild(frag);
}

function rebuildMosaicLayers(){
  const host=document.getElementById('mosaic-tiles');
  if(!host||!mosaicItems||!mosaicItems.length)return;
  host.innerHTML='';
  const rand=rng(mosaicSeed);
  appendMosaicTiles(host,fillMosaicPool(mosaicItems,mosaicTileCount(),rand),rand);
  updateMosaicParallax();
}

function updateMosaicParallax(){
  mosaicParallaxPending=false;
  if(MOSAIC_REDUCE_MOTION)return;
  const y=window.scrollY*MOSAIC_SCROLL_GAIN;
  const host=document.getElementById('mosaic-tiles');
  if(!host)return;
  host.querySelectorAll('.mosaic-cell').forEach(cell=>{
    const f=parseFloat(cell.dataset.parallax)||0.25;
    const rot=cell.dataset.rot||'0';
    cell.style.transform=`rotate(${rot}deg) translate3d(0,${(-y*f).toFixed(1)}px,0)`;
  });
}

function onMosaicScroll(){
  if(MOSAIC_REDUCE_MOTION||mosaicParallaxPending)return;
  mosaicParallaxPending=true;
  requestAnimationFrame(updateMosaicParallax);
}

let revealLastT=0,revealLastX=-999,revealLastY=-999,revealIdx=0;
function shouldRevealPhoto(e){
  if(MOSAIC_REDUCE_MOTION||!mosaicItems||!mosaicItems.length)return false;
  if(e.target.closest('.viz-card,#topnav,#nav-dots,#tt,#sk-lightbox'))return false;
  return true;
}
function spawnRevealPhoto(x,y){
  const layer=document.getElementById('photo-reveal-layer');
  if(!layer)return;
  const pool=mosaicItems.filter(item=>item.thumb);
  if(!pool.length)return;
  const item=pool[revealIdx++%pool.length];
  const r=Math.random();
  const size=Math.round(58+Math.pow(r,1.8)*170);
  const ratio=0.58+Math.random()*0.28;
  const rot=(Math.random()*18-9).toFixed(1)+'deg';
  const blurVal=Math.random()<0.34?0.4+Math.random()*1.8:Math.random()*0.25;
  const blur=blurVal.toFixed(2)+'px';
  const opacity=(0.38+Math.random()*0.52).toFixed(2);
  const life=Math.round(520+Math.random()*780);
  const cell=document.createElement('span');
  cell.className='reveal-photo';
  cell.style.left=x+'px';cell.style.top=y+'px';
  cell.style.width=size+'px';cell.style.height=Math.round(size*ratio)+'px';
  cell.style.setProperty('--reveal-rot',rot);
  cell.style.setProperty('--reveal-opacity',opacity);
  cell.style.setProperty('--reveal-blur',blur);
  cell.style.setProperty('--reveal-fade-total-blur',(blurVal+0.4+Math.random()*1.6).toFixed(2)+'px');
  cell.style.setProperty('--reveal-sat',(0.78+Math.random()*0.42).toFixed(2));
  cell.style.setProperty('--reveal-start',(0.58+Math.random()*0.2).toFixed(2));
  cell.style.setProperty('--reveal-end',(1.02+Math.random()*0.16).toFixed(2));
  cell.style.setProperty('--reveal-in',(0.16+Math.random()*0.18).toFixed(2)+'s');
  cell.style.setProperty('--reveal-move',(0.45+Math.random()*0.42).toFixed(2)+'s');
  cell.style.setProperty('--reveal-shadow-y',Math.round(5+Math.random()*14)+'px');
  cell.style.setProperty('--reveal-shadow-blur',Math.round(18+Math.random()*34)+'px');
  cell.style.setProperty('--reveal-shadow-a',(0.09+Math.random()*0.14).toFixed(2));
  const img=document.createElement('img');
  img.src=mosaicUrl(item.thumb);img.alt='';img.loading='lazy';img.decoding='async';
  cell.appendChild(img);
  layer.appendChild(cell);
  requestAnimationFrame(()=>cell.classList.add('show'));
  setTimeout(()=>cell.classList.add('fade'),life);
  setTimeout(()=>cell.remove(),life+650);
}
function initWhitespacePhotoReveal(){
  window.addEventListener('mousemove',e=>{
    if(!shouldRevealPhoto(e))return;
    const now=performance.now();
    if(now-revealLastT<70)return;
    if(Math.hypot(e.clientX-revealLastX,e.clientY-revealLastY)<34)return;
    revealLastT=now;revealLastX=e.clientX;revealLastY=e.clientY;
    spawnRevealPhoto(e.clientX,e.clientY);
  },{passive:true});
}

async function initSiteMosaic(){
  const host=document.getElementById('mosaic-tiles');
  if(!host)return;
  try{
    let items;
    if(typeof HERO_GALLERY!=='undefined'&&HERO_GALLERY.length){
      items=HERO_GALLERY;
    }else{
      const res=await fetch(mosaicUrl('data/hero-gallery/manifest.json'));
      if(!res.ok)throw new Error('manifest '+res.status);
      const data=await res.json();
      items=data.items||[];
    }
    if(!items.length)throw new Error('manifest empty');
    mosaicItems=items;
    mosaicSeed=(Date.now()&0xffffffff)>>>0;
    rebuildMosaicLayers();
    initWhitespacePhotoReveal();
    document.body.dataset.mosaic='ready';
    window.addEventListener('scroll',onMosaicScroll,{passive:true});
    let mosaicResizeT;
    window.addEventListener('resize',()=>{
      clearTimeout(mosaicResizeT);
      mosaicResizeT=setTimeout(rebuildMosaicLayers,250);
    });
  }catch(e){
    console.error('Site mosaic failed:',e);
    document.body.dataset.mosaic='error';
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSiteMosaic);
else initSiteMosaic();

const TT=document.getElementById('tt');
function showTT(e,head,body,opts){
  opts=opts||{};
  document.getElementById('tt-head').innerHTML=head;
  document.getElementById('tt-body').innerHTML=body;
  TT.classList.toggle('tt-with-preview',!!opts.preview);
  TT.style.display='block';
}
function moveTT(e){TT.style.left=(e.clientX+16)+'px';TT.style.top=(e.clientY-12)+'px'}
function hideTT(){TT.classList.remove('tt-with-preview');TT.style.display='none'}
document.addEventListener('mousemove',moveTT);

window.addEventListener('scroll',()=>{
  const ids=['s-hero','s-activity','s-exposure','s-gear','s-lens','s-sankey'];
  const nds=document.querySelectorAll('.nd');
  const nls=document.querySelectorAll('.nav-link');
  ids.forEach((id,i)=>{
    const el=document.getElementById(id);if(!el)return;
    const r=el.getBoundingClientRect();
    if(r.top<window.innerHeight/2&&r.bottom>window.innerHeight/2){
      nds.forEach((d,j)=>d.classList.toggle('on',i===j));
      nls.forEach((l,j)=>l.classList.toggle('on',i===j));
    }
  });
});

function animCount(id,target,fmt){
  let s=null;const el=document.getElementById(id);
  const f=ts=>{if(!s)s=ts;const p=clamp((ts-s)/2000,0,1);el.textContent=fmt?fmt(Math.round(ease(p)*target)):Math.round(ease(p)*target).toLocaleString();if(p<1)requestAnimationFrame(f)};
  requestAnimationFrame(f);
}
function heroAssignmentCount(){
  if(typeof ALBUM_MAP==='undefined'||!ALBUM_MAP) return HERO_STATS.lenses;
  const names=Object.values(ALBUM_MAP)
    .map(v=>typeof v==='string'?v.trim():'')
    .filter(Boolean);
  return names.length?new Set(names).size:HERO_STATS.lenses;
}

const io=new IntersectionObserver(entries=>{entries.forEach(e=>{
  if(!e.isIntersecting)return;
  const id=e.target.id;
  if(id==='s-hero'){animCount('c1',HERO_STATS.photos);animCount('c2',HERO_STATS.days);animCount('c3',heroAssignmentCount())}
  if(id==='s-exposure'){resizeExp();drawExposure()}
  if(id==='s-gear'){gearEnter()}
  if(id==='s-lens'){lrEnter()}
  if(id==='s-sankey'){resizeSankey();sankeyStart(true)}
  if(id==='s-activity'){paEnterYears()}
  io.unobserve(e.target);
})},{threshold:.25});
['s-hero','s-activity','s-exposure','s-gear','s-lens','s-sankey'].forEach(id=>io.observe(document.getElementById(id)));
