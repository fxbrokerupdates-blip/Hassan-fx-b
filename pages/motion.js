
/* Native motion only. Works with hash navigation and async Supabase content. */
(() => {
 'use strict';
 const root=document.getElementById('main');
 const header=document.querySelector('header');
 const progress=document.querySelector('.reading-progress i');
 if(!root||!header)return;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const fine=matchMedia('(hover: hover) and (pointer: fine)');
 const seen=new WeakSet();
 const bound=new WeakSet();
 const active=new Set();
 const targets='.hero-kicker,.hero-copy h1,.hero-copy .actions,.home-content .action-card,.home-content .tool-card,.home-content .newsbar,.home-content .panel:not(.motion-skeleton),.home-content .category,.page h1,.page .news-card,.article h1';
 function reveal(el){
  if(seen.has(el)||!el.isConnected)return;
  seen.add(el);
  if(reduce.matches||!el.animate||document.body.classList.contains('reference-workspace'))return;
  const delay=Number(el.dataset.fxDelay||0);
  const animation=el.animate([{opacity:.15,translate:'0 9px'},{opacity:1,translate:'0 0'}],{duration:420,delay,easing:'cubic-bezier(.2,.7,.3,1)',fill:'backwards'});
  active.add(animation);
  animation.onfinish=animation.oncancel=()=>active.delete(animation);
 }
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);reveal(entry.target);}
 },{threshold:.08}):null;
 function bindPointer(el,kind){
  if(bound.has(el))return;
  bound.add(el);
  let frame=0,px=0,py=0;
  const target=kind==='hero'?el.querySelector('.hero-art'):el;
  if(!target)return;
  function reset(){
   if(frame)cancelAnimationFrame(frame);
   frame=0;
   for(const v of ['--fx-x','--fx-y','--fx-rx','--fx-ry'])target.style.removeProperty(v);
   target.classList.remove('fx-active');
  }
  el.addEventListener('pointermove',ev=>{
   if(reduce.matches||!fine.matches||ev.pointerType==='touch')return;
   px=ev.clientX;py=ev.clientY;
   if(frame)return;
   frame=requestAnimationFrame(()=>{
    frame=0;
    if(!el.isConnected||reduce.matches||!fine.matches){reset();return;}
    const b=el.getBoundingClientRect();if(!b.width||!b.height)return;
    const x=Math.max(-1,Math.min(1,(px-b.left)/b.width*2-1));
    const y=Math.max(-1,Math.min(1,(py-b.top)/b.height*2-1));
    target.classList.add('fx-active');
    if(kind==='card'){target.style.setProperty('--fx-rx',(-y*2).toFixed(2)+'deg');target.style.setProperty('--fx-ry',(x*2).toFixed(2)+'deg');}
    else {const amount=kind==='hero'?3:2;target.style.setProperty('--fx-x',(x*amount).toFixed(2)+'px');target.style.setProperty('--fx-y',(y*amount).toFixed(2)+'px');}
   });
  },{passive:true});
  el.addEventListener('pointerleave',reset);el.addEventListener('pointercancel',reset);el.addEventListener('blur',reset);
 }
 function scan(){
  root.querySelectorAll(targets).forEach((el,i)=>{
   if(seen.has(el))return;
   el.dataset.fxDelay=String(el.closest('.hero-copy')?Math.min(i*65,130):i%3*45);
   if(observer)observer.observe(el);else reveal(el);
  });
  root.querySelectorAll('.hero-refined').forEach(el=>bindPointer(el,'hero'));
  root.querySelectorAll('.home-content a.action-card,.home-content a.tool-card,.home-content a.category').forEach(el=>bindPointer(el,'card'));
  root.querySelectorAll('.hero-refined .actions a').forEach(el=>bindPointer(el,'button'));
 }
 let scanFrame=0;
 const mutation=new MutationObserver(()=>{
  if(!scanFrame)scanFrame=requestAnimationFrame(()=>{scanFrame=0;scan();scheduleScroll();});
 });
 mutation.observe(root,{childList:true,subtree:true});
 let scrollFrame=0;
 function updateScroll(){
  scrollFrame=0;
  const y=window.scrollY||0;
  const total=document.documentElement.scrollHeight-window.innerHeight;
  if(progress)progress.style.transform='scaleX('+Math.max(0,Math.min(1,total>0?y/total:0))+')';
  header.classList.toggle('is-scrolled',y>28);
 }
 function scheduleScroll(){if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);}
 window.addEventListener('scroll',scheduleScroll,{passive:true});
 window.addEventListener('resize',scheduleScroll,{passive:true});
 window.addEventListener('hashchange',scheduleScroll);
 const onPreference=()=>{if(reduce.matches){for(const a of active)a.cancel();active.clear();}};
 if(reduce.addEventListener)reduce.addEventListener('change',onPreference);
 scan();scheduleScroll();
})();
