const SK_C=document.getElementById('sankey-canvas');
const skCtx=SK_C.getContext('2d');
const SK_CSS_H=360;
function skLogicalW(){return Math.max(220,cardInnerWidth(SK_C));}
let skCanvasCssW=-1,skCanvasDpr=-1;
function skApplyCanvasSize(){
  const cssW=skLogicalW(),cssH=SK_CSS_H;
  const dpr=Math.min(window.devicePixelRatio||1,2.5);
  if(cssW===skCanvasCssW&&dpr===skCanvasDpr)return;
  skCanvasCssW=cssW;skCanvasDpr=dpr;
  SK_C.width=Math.max(1,Math.floor(cssW*dpr));
  SK_C.height=Math.max(1,Math.floor(cssH*dpr));
  SK_C.style.width=cssW+'px';
  SK_C.style.height=cssH+'px';
  skCtx.setTransform(dpr,0,0,dpr,0,0);
}
// Sequential blue → purple (teacher palette); orange accent on Published node only
const SK_FUNNEL={shots:'#2563EB',selection:'#4338CA',edition:'#5B21B6',published:'#8B5CF6'};
const SK_LOSS_NODE='#94A3B8';
const SK_LOSS_LINK_A='#CBD5E1';
const SK_LOSS_LINK_B='#94A3B8';
let skHover=null;
let skFocus=null;
let skPrevFocus=null;
let skAnimT=0;
let skAnimAF=null;
let skInited=false;
let skIntroTimers=[];
let skStripStage=null;
let skFilmToken=0;
const SK_STAGE_ORDER=['shots','selection','edition','published'];

const SK_PHOTO_BASE='data/sankey-previews/';
// Update these arrays when you add/remove files in data/sankey-previews/
const SK_BEFORE_NUMS=[1,8,9];               // numbers that have before_edit-XX.jpg
const SK_LOST_NUMS=[2,3,4,5,6,7,10,11,12]; // numbers that have lost-XX.jpg
const SK_AFTER_NUMS=[1,8,9];               // numbers that have after_edit-X.jpg
const SK_PUBLISHED_NUMS=[8];              // numbers that have published-X.jpg
const SK_PHOTOS=(function(){
  const pad=n=>String(n).padStart(2,'0');
  const shots=[
    ...SK_BEFORE_NUMS.map(n=>({f:`before_edit-${pad(n)}.jpg`,n})),
    ...SK_LOST_NUMS.map(n=>({f:`lost-${pad(n)}.jpg`,n}))
  ].sort((a,b)=>a.n-b.n).map(x=>x.f);
  return {
    shots,
    edition:SK_BEFORE_NUMS.filter(n=>SK_AFTER_NUMS.includes(n))
      .map(n=>({before:`before_edit-${pad(n)}.jpg`,after:`after_edit-${pad(n)}.jpg`})),
    published:SK_PUBLISHED_NUMS.map(n=>`published-${pad(n)}.jpg`)
  };
})();

function sankeyDataSafe(){
  const d=typeof SANKEY_DATA!=='undefined'?SANKEY_DATA:null;
  if(!d||!d.nodes||!d.links||!d.totals)return null;
  return d;
}

function skPopulateStory(){
  skUpdatePhotoStrip(skFocus);
}
function skNumFromFileName(name){
  const m=(name||'').match(/(\d+)/);
  return m?m[1]:'';
}
function skKeyForFileName(name){
  const n=skNumFromFileName(name);
  if(!n) return '';
  if(name.startsWith('before_edit-')) return `before-${n}`;
  if(name.startsWith('after_edit-')) return `after-${n}`;
  if(name.startsWith('published-')) return `after-${n}`;
  if(name.startsWith('lost-')) return `lost-${n}`;
  return `photo-${n}`;
}
function skCaptureRects(root,selector){
  const out={};
  if(!root) return out;
  root.querySelectorAll(selector).forEach(el=>{
    const key=el.dataset.key;
    if(!key) return;
    out[key]=el.getBoundingClientRect();
  });
  return out;
}
function skAlignPhotoStripToStage(stage,animate=true){
  const strip=document.getElementById('sk-photo-strip');
  const wrap=strip?.querySelector('.sk-strip-photos');
  if(!strip||!wrap||!stage) return;
  const bar=document.getElementById('sk-stage-bar');
  const stripRect=strip.getBoundingClientRect();
  const pill=bar?.querySelector(`g.sk-pill[data-stage="${stage}"]`);
  let targetCenter=null;
  if(pill){
    const pillRect=pill.getBoundingClientRect();
    targetCenter=(pillRect.left+pillRect.width/2)-stripRect.left;
  }else{
    const idx=Math.max(0,SK_STAGE_ORDER.indexOf(stage));
    targetCenter=strip.clientWidth*((idx+0.5)/SK_STAGE_ORDER.length);
  }
  const contentW=wrap.scrollWidth||wrap.getBoundingClientRect().width||0;
  const desiredLeft=Math.round(targetCenter-contentW/2);
  const minLeft=0;
  const maxLeft=Math.max(0,strip.clientWidth-contentW);
  let left=Math.max(minLeft,Math.min(maxLeft,desiredLeft));
  if(stage==='shots') left=minLeft;
  if(stage==='published') left=maxLeft;
  wrap.style.transition=animate?'transform 460ms cubic-bezier(.2,.8,.2,1)':'';
  wrap.style.transform=`translateX(${left}px)`;
  return left;
}
function skQueueAlignPhotoStrip(stage,animate=true){
  requestAnimationFrame(()=>skAlignPhotoStripToStage(stage,animate));
}
function skFlipToCurrent(root,selector,fromRects,{duration=420,stagger=26}={}){
  if(!root) return;
  const els=[...root.querySelectorAll(selector)];
  els.forEach((el,i)=>{
    const key=el.dataset.key;
    const from=key?fromRects[key]:null;
    if(!from) return;
    const to=el.getBoundingClientRect();
    const dx=from.left-to.left;
    const dy=from.top-to.top;
    el.style.willChange='transform';
    el.style.transition='none';
    el.style.transform=`translate(${dx}px,${dy}px)`;
    requestAnimationFrame(()=>{
      el.style.transition=`transform ${duration}ms cubic-bezier(.2,.8,.2,1) ${i*stagger}ms`;
      el.style.transform='translate(0,0)';
      setTimeout(()=>{
        el.style.willChange='';
        el.style.transition='';
      },duration+i*stagger+40);
    });
  });
}
function skClearFloatingPublishGhosts(){
  document.querySelectorAll('.sk-float-publish').forEach(el=>el.remove());
}
function skUpdatePhotoStrip(stage){
  skClearFloatingPublishGhosts();
  const strip=document.getElementById('sk-photo-strip');
  if(!strip)return;
  if(!stage){
    // Keep the strip visible to avoid card-height jumps.
    stage='shots';
  }
  if(stage!=='published') strip.style.minHeight='';
  const b=SK_PHOTO_BASE;
  const shotGrid=(withCull=false)=>SK_PHOTOS.shots.map(f=>`<div class="sk-strip-item${withCull&&f.startsWith('lost-')?' culled':''}" data-photo="${f}" data-key="${skKeyForFileName(f)}"><img src="${b}${f}" alt="" loading="lazy"></div>`).join('');
  const editRows=(beforeOnly=false,enterAfter=false)=>`<div class="sk-edit-stack ${beforeOnly?'before-only':''} ${enterAfter?'enter-after':''}">${
    SK_PHOTOS.edition.map(p=>`<div class="sk-edit-row">
      <div class="before-wrap"><div class="sk-strip-item" data-key="${skKeyForFileName(p.before)}" data-badge="Before"><img src="${b}${p.before}" alt="" loading="lazy"><div class="sk-pair-badge">Before</div></div></div>
      <div class="sk-pair-arrow">&rarr;</div>
      <div class="after-wrap"><div class="sk-strip-item" data-key="${skKeyForFileName(p.after)}" data-badge="After"><img src="${b}${p.after}" alt="" loading="lazy"><div class="sk-pair-badge after">After</div></div></div>
    </div>`).join('')
  }</div>`;
  const publishSorted=()=>{
    const finalFile=SK_PHOTOS.published[0]||'';
    const finalNum=skNumFromFileName(finalFile);
    const edited=SK_PHOTOS.edition.map(p=>p.after);
    const lost=SK_LOST_NUMS.map(n=>`lost-${String(n).padStart(2,'0')}.jpg`);
    return `<div class="sk-publish-stage">
      <div class="sk-publish-row edited"><span class="sk-publish-row-title">Edited</span>${
        edited.map(f=>{
          const num=skNumFromFileName(f);
          const target=num===finalNum;
          return `<div class="sk-strip-item${target?' target':''}" data-target="${target?'yes':'no'}" data-key="${skKeyForFileName(f)}"><img src="${b}${f}" alt="" loading="lazy"></div>`;
        }).join('')
      }</div>
      <div class="sk-publish-row lost"><span class="sk-publish-row-title">Not edited</span>${
        lost.map(f=>`<div class="sk-strip-item" data-key="${skKeyForFileName(f)}"><img src="${b}${f}" alt="" loading="lazy"></div>`).join('')
      }</div>
    </div>`;
  };
  const publishFinal=(withAnim=true)=>SK_PHOTOS.published.map(f=>`<div class="sk-strip-item published ${withAnim?'published-grow':''}" data-key="${skKeyForFileName(f)}"><img src="${b}${f}" alt="" loading="lazy"></div>`).join('');
  function ensureShell(label,photoClass='',preserveLayout=false){
    if(!strip.querySelector('.sk-strip-photos')){
      strip.style.display='block';
      strip.innerHTML=`<div class="sk-strip-label"></div><div class="sk-strip-photos"></div>`;
    }else{
      strip.style.display='block';
    }
    const labelEl=strip.querySelector('.sk-strip-label');
    const wrap=strip.querySelector('.sk-strip-photos');
    if(labelEl) labelEl.innerHTML=label;
    if(!preserveLayout){
      wrap.className='sk-strip-photos'+(photoClass?` ${photoClass}`:'');
    }
    return wrap;
  }
  let label='',photos='',photoClass='',transitionKind='none';
  if(stage==='shots'){
    label='Shot - <span style="color:var(--muted)">'+SK_PHOTOS.shots.length+' frames</span>';
    photos=shotGrid(false);
    photoClass='grid-3x4';
  }else if(stage==='selection'){
    label='Select - <span style="color:var(--muted)">9 kept · 3 culled</span>';
    photos=shotGrid(skStripStage!=='shots');
    photoClass='grid-3x4';
    transitionKind=skStripStage==='shots'?'shotToSelect':'none';
  }else if(stage==='edition'){
    label='Edit - <span style="color:var(--muted)">before → after</span>';
    photos=editRows(false);
    transitionKind=skStripStage==='selection'?'selectToEdit':'none';
  }else if(stage==='published'){
    label='Publish - <span style="color:var(--muted)">final photo</span>';
    photos=publishFinal(true);
    transitionKind=skStripStage==='edition'?'editToPublish':'none';
  }
  const photoWrap=ensureShell(label,photoClass,transitionKind!=='none');

  if(transitionKind==='none'){
    photoWrap.innerHTML=photos;
    skQueueAlignPhotoStrip(stage,skStripStage!==null);
    skStripStage=stage;
    return;
  }

  if(transitionKind==='shotToSelect'){
    if(!photoWrap.querySelector('.sk-strip-item[data-photo]')){
      photoWrap.innerHTML=shotGrid(false);
      photoWrap.classList.add('grid-3x4');
    }
    requestAnimationFrame(()=>{
      photoWrap.querySelectorAll('.sk-strip-item[data-photo^="lost-"]').forEach((el,i)=>{
        setTimeout(()=>el.classList.add('culled'),i*34);
      });
    });
    skQueueAlignPhotoStrip(stage,true);
  }else if(transitionKind==='selectToEdit'){
    if(!photoWrap.querySelector('.sk-strip-item[data-photo]')){
      photoWrap.classList.add('grid-3x4');
      photoWrap.innerHTML=shotGrid(true);
    }
    const PHASE1_FADE=220;
    const PHASE2_MOVE=460;
    const PHASE3_REVEAL=220;
    const stripRect=strip.getBoundingClientRect();
    const savedClass=photoWrap.className;
    const savedTransform=photoWrap.style.transform||'';
    const savedHtml=photoWrap.innerHTML;

    // Measure exact final BEFORE column positions in the EDIT layout.
    photoWrap.className='sk-strip-photos';
    photoWrap.innerHTML=editRows(false);
    skAlignPhotoStripToStage(stage,false);
    const targetRects=skCaptureRects(photoWrap,'.before-wrap .sk-strip-item[data-key]');

    // Restore SELECT layout as animation start.
    photoWrap.className=savedClass;
    photoWrap.innerHTML=savedHtml;
    photoWrap.style.transform=savedTransform;
    const startKept=[...photoWrap.querySelectorAll('.sk-strip-item[data-key^="before-"]')];

    requestAnimationFrame(()=>{
      // 1) non-kept photos fade out
      photoWrap.querySelectorAll('.sk-strip-item[data-photo^="lost-"]').forEach((el,i)=>{
        setTimeout(()=>el.classList.add('fade-out'),i*24);
      });

      setTimeout(()=>{
        // 2) kept photos translate horizontally in sync to EDIT column
        startKept.forEach(el=>{
          const key=el.dataset.key;
          const tgt=targetRects[key];
          if(!tgt) return;
          const cur=el.getBoundingClientRect();
          const dx=(tgt.left-stripRect.left)-(cur.left-stripRect.left);
          el.style.willChange='transform';
          el.style.transition=`transform ${PHASE2_MOVE}ms cubic-bezier(.2,.8,.2,1)`;
          el.style.transform=`translateX(${dx}px)`;
        });

        setTimeout(()=>{
          // 3) swap to EDIT layout then reveal edited counterparts
          photoWrap.classList.remove('grid-3x4');
          photoWrap.innerHTML=editRows(false,true);
          skAlignPhotoStripToStage(stage,false);
          const stack=photoWrap.querySelector('.sk-edit-stack');
          // Keep "after" briefly behind "before" before moving right.
          setTimeout(()=>{
            requestAnimationFrame(()=>stack?.classList.add('reveal-after'));
          },140);
          setTimeout(()=>{
            stack?.classList.remove('enter-after');
            stack?.classList.remove('reveal-after');
          },PHASE3_REVEAL);
        },PHASE2_MOVE);
      },PHASE1_FADE);
    });
  }else if(transitionKind==='editToPublish'){
    const editStack=photoWrap.querySelector('.sk-edit-stack');
    editStack?.classList.remove('enter-after','reveal-after','pre-edit','before-only');
    photoWrap.querySelectorAll('.after-wrap').forEach(w=>{
      w.style.clipPath='inset(0 0 0 0)';
      w.style.overflow='visible';
      w.style.transform='translateX(0)';
      w.style.opacity='1';
    });
    photoWrap.querySelectorAll('.before-wrap').forEach(w=>{
      w.style.overflow='visible';
      w.style.transform='translateX(0)';
      w.style.opacity='1';
    });
    const finalFile=SK_PHOTOS.published[0]||'';
    const finalKey=skKeyForFileName(finalFile);
    const allAfter=[...photoWrap.querySelectorAll('.after-wrap .sk-strip-item[data-key]')];
    const targetEl=allAfter.find(el=>el.dataset.key===finalKey)||allAfter[0]||null;
    const beforeEls=[...photoWrap.querySelectorAll('.before-wrap .sk-strip-item')];
    const nonKeptAfter=allAfter.filter(el=>el!==targetEl);
    const arrows=[...photoWrap.querySelectorAll('.sk-pair-arrow')];
    const PHASE_FADE_BEFORE=260;
    const PHASE_FADE_OTHERS=320;
    const PHASE_MOVE=380;
    beforeEls.forEach((el,i)=>{
      el.style.transition='opacity 240ms ease';
      setTimeout(()=>{el.style.opacity='0';},i*36);
    });
    setTimeout(()=>{
      nonKeptAfter.forEach((el,i)=>{
        el.style.transition='opacity 280ms ease, transform 280ms ease';
        setTimeout(()=>{
          el.style.opacity='0';
          el.style.transform='translateY(10px)';
        },i*70);
      });
      arrows.forEach(a=>{
        a.style.transition='opacity 240ms ease';
        a.style.opacity='0';
      });
    },PHASE_FADE_BEFORE);

    // Move to publish only after both fade phases are visible.
    setTimeout(()=>{
      // Freeze current strip height so the card size does not shrink on publish.
      strip.style.minHeight=strip.offsetHeight+'px';
      const startRect=targetEl?targetEl.getBoundingClientRect():null;
      if(!targetEl||!startRect) return;
      targetEl.style.opacity='0';
      // Build final publish layout first, then animate toward its exact measured position.
      photoWrap.innerHTML=publishFinal(false);
      skAlignPhotoStripToStage(stage,false);
      const finalEl=photoWrap.querySelector(`.sk-strip-item[data-key="${finalKey}"]`);
      if(!finalEl) return;
      const endRect=finalEl.getBoundingClientRect();
      finalEl.style.visibility='hidden';
      const ghost=document.createElement('img');
      const src=targetEl.querySelector('img')?.src||finalEl.querySelector('img')?.src||'';
      ghost.src=src;
      ghost.alt='';
      ghost.style.position='fixed';
      ghost.style.left=startRect.left+'px';
      ghost.style.top=startRect.top+'px';
      ghost.style.width=startRect.width+'px';
      ghost.style.height=startRect.height+'px';
      ghost.style.borderRadius='8px';
      ghost.style.objectFit='cover';
      ghost.style.pointerEvents='none';
      ghost.style.zIndex='4000';
      ghost.className='sk-float-publish';
      ghost.style.transform='translate(0,0)';
      document.body.appendChild(ghost);
      const dx=endRect.left-startRect.left;
      const dy=endRect.top-startRect.top;
      requestAnimationFrame(()=>{
        ghost.style.transition=`transform ${PHASE_MOVE}ms cubic-bezier(.2,.8,.2,1)`;
        ghost.style.transform=`translate(${dx}px,${dy}px)`;
      });
      let done=false;
      const finish=()=>{
        if(done) return;
        done=true;
        // Two-frame handoff to prevent blink at swap.
        finalEl.style.visibility='visible';
        requestAnimationFrame(()=>{
          requestAnimationFrame(()=>{
            ghost.remove();
          });
        });
      };
      ghost.addEventListener('transitionend',finish,{once:true});
      setTimeout(()=>{ if(document.body.contains(ghost)) finish(); },PHASE_MOVE+70);
    },PHASE_FADE_BEFORE+PHASE_FADE_OTHERS);
  }
  skStripStage=stage;
}

function skLabel(id){
  const map={
    shots:'Picture shots',
    selection:'Selection',
    edition:'Edition',
    published:'Published',
    lost_selection:'Lost after selection',
    lost_edition:'Not edited',
    lost_published:'Not published',
  };
  return map[id]||id;
}
function skSetPillStates(svg,stages){
  svg.selectAll('g.sk-pill').each(function(_,j){
    const pid=stages[j].id;
    const on=skFocus===pid, dim=!!skFocus&&!on;
    d3.select(this).select('rect')
      .attr('opacity',dim?0.32:1)
      .attr('stroke',on?P.accent:'rgba(15,23,42,0.08)')
      .attr('stroke-width',on?2.5:1);
  });
}
function skGotoStage(stage,svg,stages){
  skPrevFocus=skFocus;
  skFocus=stage;
  skPopulateStory();
  skRunSankeyAnim();
  skSetPillStates(svg,stages);
}
function skPlayStageFilm(fromStage,toStage,svg,stages){
  const fromIdx=SK_STAGE_ORDER.indexOf(fromStage);
  const toIdx=SK_STAGE_ORDER.indexOf(toStage);
  if(toIdx<0) return;
  const path=[];
  if(fromIdx<0){
    for(let i=0;i<=toIdx;i++) path.push(SK_STAGE_ORDER[i]);
  }else if(fromIdx===toIdx){
    path.push(toStage);
  }else{
    const dir=toIdx>fromIdx?1:-1;
    for(let i=fromIdx+dir; dir>0?i<=toIdx:i>=toIdx; i+=dir) path.push(SK_STAGE_ORDER[i]);
  }
  const token=++skFilmToken;
  function skTransitionDuration(from,to){
    if(from==='shots'&&to==='selection') return 520;
    if(from==='selection'&&to==='edition') return 1040;   // 220 + 460 + 220 + buffer
    if(from==='edition'&&to==='published') return 980;    // 220 + 220 + 420 + buffer
    return 520;
  }
  const run=(i)=>{
    if(token!==skFilmToken||i>=path.length) return;
    const prev=i===0?fromStage:path[i-1];
    skGotoStage(path[i],svg,stages);
    if(i<path.length-1){
      const t=setTimeout(()=>run(i+1),skTransitionDuration(prev,path[i]));
      skIntroTimers.push(t);
    }
  };
  run(0);
}

function skFilterSankeyByStage(fullGraph,focusId){
  const depth=SK_STAGE_ORDER.indexOf(focusId);
  if(depth<0)return{nodes:[],links:[]};
  const{nodes,links}=fullGraph;
  if(depth===0)return{nodes:nodes.filter(n=>n.id==='shots'),links:[]};
  if(depth===1)return{
    nodes:nodes.filter(n=>['shots','selection','lost_selection'].includes(n.id)),
    links:links.filter(l=>l.source==='shots')
  };
  if(depth===2)return{
    nodes:nodes.filter(n=>['shots','selection','lost_selection','edition','lost_edition'].includes(n.id)),
    links:links.filter(l=>l.source==='shots'||l.source==='selection')
  };
  return fullGraph;
}

function buildSankeyGraph(data){
  const t=data.totals||{};
  const shots=Math.max(0,+t.shots||0);
  const selection=Math.max(0,Math.min(shots,+t.selection||0));
  const edition=Math.max(0,Math.min(selection,+t.edition||0));
  const published=Math.max(0,Math.min(edition,+t.published||0));
  const lossSelection=Math.max(0,shots-selection);
  const lossEdition=Math.max(0,selection-edition);
  const lossPublished=Math.max(0,edition-published);
  return {
    nodes:[
      {id:'shots',value:shots,col:0,row:'main'},
      {id:'selection',value:selection,col:1,row:'main'},
      {id:'edition',value:edition,col:2,row:'main'},
      {id:'published',value:published,col:3,row:'main'},
      {id:'lost_selection',value:lossSelection,col:1,row:'loss'},
      {id:'lost_edition',value:lossEdition,col:2,row:'loss'},
      {id:'lost_published',value:lossPublished,col:3,row:'loss'},
    ],
    links:[
      {source:'shots',target:'selection',value:selection,kind:'kept'},
      {source:'shots',target:'lost_selection',value:lossSelection,kind:'loss'},
      {source:'selection',target:'edition',value:edition,kind:'kept'},
      {source:'selection',target:'lost_edition',value:lossEdition,kind:'loss'},
      {source:'edition',target:'published',value:published,kind:'kept'},
      {source:'edition',target:'lost_published',value:lossPublished,kind:'loss'},
    ]
  };
}

function sankeyGeom(){
  const data=sankeyDataSafe();
  if(!data||!skFocus)return null;
  const full=buildSankeyGraph(data);
  const graph=skFilterSankeyByStage(full,skFocus);
  const W=skLogicalW(),H=SK_CSS_H;
  const PL=52,PR=56,PT=24,PB=54;
  const PW=W-PL-PR,PH=H-PT-PB;
  const nodeW=12;
  const xStep=PW/3;
  const mainY=PT+PH*0.18;
  const lossY=PT+PH*0.66;
  const maxV=Math.max(...graph.nodes.map(n=>n.value),1);
  const maxCol=graph.nodes.length?Math.max(...graph.nodes.map(n=>n.col)):0;
  const numC=Math.max(1,maxCol+1);

  const prevDepth=SK_STAGE_ORDER.indexOf(skPrevFocus);
  const prevNumC=prevDepth<0 ? 0 : prevDepth+1;

  const newCols=numC-prevNumC;
  const colAlpha=col=>{
    if(col<prevNumC) return 1;
    const slot=col-prevNumC;
    const wave=skAnimT*(newCols+0.5);
    return ease(clamp(wave-slot,0,1));
  };

  const nodes=graph.nodes.map(n=>{
    const x=PL+n.col*xStep;
    const y=n.row==='main'?mainY:lossY;
    const alpha=colAlpha(n.col);
    const hFull=Math.max(10,Math.min(90,10+Math.sqrt((n.value||0)/maxV)*76));
    return {id:n.id,x,y,w:nodeW,h:hFull,alpha,value:n.value,row:n.row,col:n.col,inSum:0,outSum:0};
  });

  const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
  const activeLinks=graph.links.filter(l=>l.value>0);
  activeLinks.forEach(l=>{
    const s=byId[l.source],t=byId[l.target];
    if(s)s.outSum+=l.value;
    if(t)t.inSum+=l.value;
  });

  const nodeScale={};
  nodes.forEach(n=>{
    const den=Math.max(n.inSum,n.outSum,1);
    nodeScale[n.id]=n.h/den;
  });

  const outCursor={},inCursor={};
  nodes.forEach(n=>{outCursor[n.id]=0;inCursor[n.id]=0;});

  const links=activeLinks.map((l,idx)=>{
    const s=byId[l.source],t=byId[l.target];
    const sy=s.y+outCursor[s.id]*nodeScale[s.id];
    const ty=t.y+inCursor[t.id]*nodeScale[t.id];
    const sTh=Math.max(2,l.value*nodeScale[s.id]);
    const tTh=Math.max(2,l.value*nodeScale[t.id]);
    outCursor[s.id]+=l.value;
    inCursor[t.id]+=l.value;
    const linkCol=Math.max(s.col,t.col);
    const flowA=colAlpha(linkCol);
    return {
      ...l,idx,s,t,srcValue:s.value,flowA,
      sy0:sy,sy1:sy+sTh,
      ty0:ty,ty1:ty+tTh,
      thMid:(sTh+tTh)/2
    };
  });
  return {W,H,PL,PT,PW,PH,nodes,links,maxV,graph};
}

function drawLink(link,hovered){
  const {s,t,sy0,sy1,ty0,ty1}=link;
  const x1=s.x+s.w,x2=t.x;
  const c1=x1+(x2-x1)*0.45,c2=x1+(x2-x1)*0.55;
  skCtx.beginPath();
  skCtx.moveTo(x1,sy0);
  skCtx.bezierCurveTo(c1,sy0,c2,ty0,x2,ty0);
  skCtx.lineTo(x2,ty1);
  skCtx.bezierCurveTo(c2,ty1,c1,sy1,x1,sy1);
  skCtx.closePath();
  const grad=skCtx.createLinearGradient(x1,0,x2,0);
  if(link.kind==='loss'){
    grad.addColorStop(0,SK_LOSS_LINK_A+'55');
    grad.addColorStop(1,SK_LOSS_LINK_B+'70');
  }else{
    const c0=SK_FUNNEL[link.source]||'#2563EB';
    const c1b=SK_FUNNEL[link.target]||'#6366F1';
    grad.addColorStop(0,c0+'44');
    grad.addColorStop(1,c1b+'55');
  }
  skCtx.fillStyle=grad;
  const fa=typeof link.flowA==='number'?link.flowA:1;
  let a=(link.kind==='loss'?0.62:0.82)*fa;
  if(hovered)a=Math.min(1,a+(link.kind==='loss'?0.25:0.18));
  skCtx.globalAlpha=a;
  skCtx.fill();
  skCtx.globalAlpha=1;
}

function drawSankey(){
  skApplyCanvasSize();
  const W=skLogicalW(),H=SK_CSS_H;
  skCtx.clearRect(0,0,W,H);
  skCtx.imageSmoothingEnabled=true;
  if(!skFocus){
    skCtx.fillStyle=P.muted;
    skCtx.font='500 17px Inter';
    skCtx.textAlign='center';
    skCtx.fillText('Select a stage to explore the funnel.',Math.round(W/2),Math.round(H*0.44));
    SK_C._meta={nodes:[],links:[]};
    return;
  }
  const g=sankeyGeom();if(!g)return;
  const {nodes,links}=g;

  links.forEach(l=>drawLink(l,skHover&&skHover.type==='link'&&skHover.idx===l.idx));

  nodes.forEach(n=>{
    const a=n.alpha??1;
    if(n.row==='loss'){
      skCtx.fillStyle=SK_LOSS_NODE;
      skCtx.globalAlpha=0.55*a;
    }else{
      skCtx.fillStyle=SK_FUNNEL[n.id]||'#2563EB';
      skCtx.globalAlpha=0.92*a;
    }
    skCtx.fillRect(n.x,n.y,n.w,n.h);
    skCtx.globalAlpha=1;
    if(n.id==='published'&&skFocus==='published'){
      skCtx.strokeStyle=P.accent;
      skCtx.lineWidth=2;
      skCtx.globalAlpha=a;
      skCtx.strokeRect(n.x-1.5,n.y-1.5,n.w+3,n.h+3);
      skCtx.globalAlpha=1;
    }
  });

  skCtx.textAlign='center';
  nodes.forEach(n=>{
    const a=n.alpha??1;
    if(a<0.06)return;
    skCtx.globalAlpha=a;
    skCtx.fillStyle=P.text;
    skCtx.font='500 16px Inter';
    const tx=Math.round(n.x+n.w/2),ty=Math.round(n.y+n.h+22);
    skCtx.fillText(skLabel(n.id),tx,ty);
    skCtx.fillStyle=P.muted;
    skCtx.font='400 15px Inter';
    skCtx.fillText((n.value||0).toLocaleString(),Math.round(n.x+n.w/2),Math.round(n.y+n.h+38));
    skCtx.globalAlpha=1;
  });

  SK_C._meta={nodes,links};
}

function skDrawStageBar(){
  if(typeof d3==='undefined')return;
  const bar=document.getElementById('sk-stage-bar');
  if(!bar)return;
  const stages=[
    {id:'shots',    title:'Shots',   sub:'All captures'},
    {id:'selection',title:'Select',  sub:'Keepers'},
    {id:'edition',  title:'Edit',    sub:'Lightroom'},
    {id:'published',title:'Publish', sub:'Out the door'},
  ];

  const containerW=bar.closest('.viz-card')?.clientWidth||800;
  const availW=Math.max(400,containerW-64); // 32px card padding each side
  const pillW=Math.floor((availW - 3*32) / 4); // 3 arrows of 32px each
  const pillH=56;
  const arrowW=32;
  const totalW=4*pillW+3*arrowW;
  const H=pillH;

  const svg=d3.select(bar).html('').append('svg')
    .attr('width',totalW).attr('height',H)
    .attr('viewBox',`0 0 ${totalW} ${H}`)
    .style('overflow','visible')
    .style('font-family','Inter, sans-serif');

  stages.forEach((s,i)=>{
    const x=i*(pillW+arrowW);

    // Arrow connector between pills (not after last)
    if(i>0){
      const ax=x-arrowW;
      const mid=ax+arrowW/2;
      svg.append('line')
        .attr('x1',ax+4).attr('y1',H/2)
        .attr('x2',ax+arrowW-8).attr('y2',H/2)
        .attr('stroke','var(--dim)').attr('stroke-width',1.5);
      svg.append('polygon')
        .attr('points',`${ax+arrowW-12},${H/2-4} ${ax+arrowW-6},${H/2} ${ax+arrowW-12},${H/2+4}`)
        .attr('fill','var(--dim)');
    }

    const g=svg.append('g').attr('class','sk-pill')
      .attr('data-stage',s.id)
      .attr('transform',`translate(${x},0)`);

    g.append('rect')
      .attr('width',pillW).attr('height',pillH).attr('rx',10)
      .attr('fill',SK_FUNNEL[s.id])
      .attr('stroke','rgba(15,23,42,0.08)').attr('stroke-width',1);

    g.append('text')
      .attr('x',16).attr('y',23)
      .attr('fill','#fff')
      .attr('font-family','Playfair Display, serif')
      .attr('font-style','italic')
      .attr('font-size','16px')
      .attr('font-weight','500')
      .text(s.title);

    g.append('text')
      .attr('x',16).attr('y',41)
      .attr('fill','rgba(255,255,255,0.78)')
      .attr('font-family','Inter, sans-serif')
      .attr('font-size','13px')
      .attr('font-weight','400')
      .attr('letter-spacing','0.07em')
      .text(s.sub.toUpperCase());

    g.on('click',function(){
      skIntroTimers.forEach(clearTimeout);skIntroTimers=[];
      skFilmToken++;
      const wasActive=skFocus===s.id;
      if(wasActive){
        skPrevFocus=null;
        skFocus=null;
        skPopulateStory();
        skRunSankeyAnim();
        skSetPillStates(svg,stages);
        return;
      }
      const curIdx=SK_STAGE_ORDER.indexOf(skFocus);
      const targetIdx=SK_STAGE_ORDER.indexOf(s.id);
      if(curIdx<0||Math.abs(targetIdx-curIdx)>1){
        skPlayStageFilm(skFocus,s.id,svg,stages);
      }else{
        skGotoStage(s.id,svg,stages);
      }
    });
  });

  // Restore active states after redraw
  skSetPillStates(svg,stages);
  if(skFocus) skQueueAlignPhotoStrip(skFocus,false);
}

function skRunSankeyAnim(){
  if(skAnimAF)cancelAnimationFrame(skAnimAF);
  skAnimT=0;
  const start=performance.now();
  const dur=skFocus?1800:180;
  const tick=(ts)=>{
    skAnimT=clamp((ts-start)/dur,0,1);
    drawSankey();
    if(skAnimT<1) skAnimAF=requestAnimationFrame(tick);
    else skAnimAF=null;
  };
  skAnimAF=requestAnimationFrame(tick);
}

function sankeyStart(withIntro=false){
  skIntroTimers.forEach(clearTimeout);skIntroTimers=[];
  skFilmToken++;
  if(!skInited){
    skInited=true;
    const lg=document.getElementById('sankey-legend');
    lg.innerHTML=[
      `<div class="li"><div class="li-dot" style="background:${SK_FUNNEL.shots}"></div>Step through Shots → Select → Edit → Publish</div>`,
      `<div class="li"><div class="li-dot" style="background:${SK_LOSS_NODE}"></div>Photos leaving the flow</div>`,
      `<div class="li"><div class="li-line" style="background:${P.accent};height:3px"></div>Active stage</div>`,
    ].join('');
  }
  if(withIntro){
    skRunIntro();
    return;
  }
  skFocus=null;
  skPrevFocus=null;
  skPopulateStory();
  skRunSankeyAnim();
  skDrawStageBar();
}

function skRunIntro(){
  skIntroTimers.forEach(clearTimeout);skIntroTimers=[];
  skFilmToken++;
  skPrevFocus=null;
  skFocus='shots';
  skUpdatePhotoStrip('shots');
  skRunSankeyAnim();
  skDrawStageBar();
}

SK_C.addEventListener('click',e=>{
  skIntroTimers.forEach(clearTimeout);skIntroTimers=[];
  skFilmToken++;
  const m=SK_C._meta;if(!m)return;
  const rect=SK_C.getBoundingClientRect();
  const lw=skLogicalW(),lh=SK_CSS_H;
  const mx=(e.clientX-rect.left)*(lw/rect.width),my=(e.clientY-rect.top)*(lh/rect.height);
  for(const n of m.nodes){
    if(mx>=n.x&&mx<=n.x+n.w&&my>=n.y&&my<=n.y+n.h)return;
  }
  for(const l of m.links){
    const x1=l.s.x+l.s.w,x2=l.t.x;
    if(mx<x1||mx>x2)continue;
    const t=(mx-x1)/(x2-x1);
    const top=(1-t)*(1-t)*(1-t)*l.sy0 + 3*(1-t)*(1-t)*t*l.sy0 + 3*(1-t)*t*t*l.ty0 + t*t*t*l.ty0;
    const bot=(1-t)*(1-t)*(1-t)*l.sy1 + 3*(1-t)*(1-t)*t*l.sy1 + 3*(1-t)*t*t*l.ty1 + t*t*t*l.ty1;
    if(my>=Math.min(top,bot)-3 && my<=Math.max(top,bot)+3)return;
  }
  if(skFocus){skFocus=null;skPrevFocus=null;skPopulateStory();skRunSankeyAnim();skDrawStageBar();}
});

SK_C.addEventListener('mousemove',e=>{
  const m=SK_C._meta;if(!m)return;
  const rect=SK_C.getBoundingClientRect();
  const lw=skLogicalW(),lh=SK_CSS_H;
  const mx=(e.clientX-rect.left)*(lw/rect.width),my=(e.clientY-rect.top)*(lh/rect.height);
  skHover=null;

  for(const n of m.nodes){
    if(mx>=n.x&&mx<=n.x+n.w&&my>=n.y&&my<=n.y+n.h){
      skHover={type:'node',id:n.id};
      showTT(e,skLabel(n.id),`${n.value.toLocaleString()} photos`);
      drawSankey();
      return;
    }
  }

  for(const l of m.links){
    const x1=l.s.x+l.s.w,x2=l.t.x;
    if(mx<x1||mx>x2)continue;
    const t=(mx-x1)/(x2-x1);
    const top=(1-t)*(1-t)*(1-t)*l.sy0 + 3*(1-t)*(1-t)*t*l.sy0 + 3*(1-t)*t*t*l.ty0 + t*t*t*l.ty0;
    const bot=(1-t)*(1-t)*(1-t)*l.sy1 + 3*(1-t)*(1-t)*t*l.sy1 + 3*(1-t)*t*t*l.ty1 + t*t*t*l.ty1;
    if(my>=Math.min(top,bot)-2 && my<=Math.max(top,bot)+2){
      skHover={type:'link',idx:l.idx};
      const pctSrc=l.srcValue?((l.value/l.srcValue)*100).toFixed(1):0;
      showTT(e,`${skLabel(l.source)} → ${skLabel(l.target)}`,`${l.value.toLocaleString()} photos<br><span style="color:var(--muted)">${pctSrc}%</span>`);
      drawSankey();
      return;
    }
  }
  hideTT();
  drawSankey();
});
SK_C.addEventListener('mouseleave',()=>{skHover=null;hideTT();drawSankey()});

(function(){
  const lb=document.getElementById('sk-lightbox');
  const lbImg=document.getElementById('sk-lb-img');
  const lbClose=document.getElementById('sk-lb-close');
  const lbPrev=document.getElementById('sk-lb-prev');
  const lbNext=document.getElementById('sk-lb-next');
  const lbCounter=document.getElementById('sk-lb-counter');
  let lbItems=[],lbIdx=0;
  function showAt(i){
    lbIdx=(i+lbItems.length)%lbItems.length;
    const it=lbItems[lbIdx];
    lbImg.src=it.src;
    lbCounter.textContent=(lbIdx+1)+' / '+lbItems.length;
    lbPrev.style.opacity=lbNext.style.opacity=lbItems.length>1?'1':'0';
  }
  function openLb(items,idx){lbItems=items;lb.classList.add('open');document.body.style.overflow='hidden';showAt(idx);}
  function closeLb(){lb.classList.remove('open');document.body.style.overflow='';}
  document.getElementById('sk-photo-strip').addEventListener('click',e=>{
    const item=e.target.closest('.sk-strip-item');
    if(!item)return;
    const allItems=[...document.querySelectorAll('#sk-photo-strip .sk-strip-item')];
    const clicked=item.querySelector('img');
    const idx=allItems.indexOf(item);
    openLb(allItems.map(el=>({src:el.querySelector('img').src,culled:el.classList.contains('culled')})),Math.max(0,idx));
  });
  lb.addEventListener('click',e=>{if(e.target===lb)closeLb();});
  lbClose.addEventListener('click',closeLb);
  lbPrev.addEventListener('click',e=>{e.stopPropagation();showAt(lbIdx-1);});
  lbNext.addEventListener('click',e=>{e.stopPropagation();showAt(lbIdx+1);});
  document.addEventListener('keydown',e=>{
    if(!lb.classList.contains('open'))return;
    if(e.key==='Escape')closeLb();
    if(e.key==='ArrowLeft')showAt(lbIdx-1);
    if(e.key==='ArrowRight')showAt(lbIdx+1);
  });
})();

function resizeSankey(){
  skPopulateStory();
  skDrawStageBar();
  if(skInited)drawSankey();
}

