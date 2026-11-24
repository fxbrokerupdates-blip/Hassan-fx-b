import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

function run(read,exists,compile) {
  let passed=0;
  function check(ok,label){if(!ok)throw new Error(label);passed++;}
  const html=read('pages/index.html');
  const refs=[...html.matchAll(/(?:src|href)="([^"#?]+)(?:\?v=([^"]+))?"/g)].filter(m=>!m[1].startsWith('https:')&&/\.(css|js)$/.test(m[1]));
  check(refs.length===12,'Expected 12 local JS/CSS assets');
  for(const m of refs)check(exists('pages/'+m[1]),'Missing asset '+m[1]);
  check(new Set(refs.map(m=>m[2])).size===1&&refs.every(m=>m[2]),'Inconsistent cache versions');
  for(const m of refs.filter(m=>m[1].endsWith('.js'))){compile(read('pages/'+m[1]));passed++;}
  check(html.includes('noindex,nofollow'),'Testing site must not be indexed');
  const app=read('pages/app.js');
  check(app.includes('FXCalculators?.route(path)'),'Calculator route missing');
  check(app.includes('DOMContentLoaded'), 'Deferred startup gate missing');
  const win={};compile(read('pages/calculators.js'),'window')(win);
  const api=win.FXCalculators;
  check(api.list.length===21,'Calculator count changed');
  for(const t of api.list){
    const raw=Object.fromEntries(t[2].split(' ').map(k=>[k,api.inputs[k][1]]));
    check(api.calculate(t[0],raw).every(x=>Number.isFinite(x[1])),'Invalid default: '+t[0]);
  }
  const examples=[
    ['pip',{lots:1,contract:100000,pip:.0001,fx:1},10],
    ['position-size',{balance:1000,risk:1,stop:20,contract:100000,pip:.0001,fx:1},.05],
    ['margin',{lots:1,contract:100000,price:1.1,fx:1,leverage:100},1100],
    ['recovery',{loss:20},25],
    ['profit',{entry:1.1,exit:1.105,side:1,lots:1,contract:100000,fx:1,fees:7},493]
  ];
  for(const [slug,v,expected] of examples)check(Math.abs(api.calculate(slug,v)[0][1]-expected)<1e-8,'Formula: '+slug);
  for(const [slug,v] of [['ib-commission',{volume:1,rate:-1}],['cashback',{volume:1,rate:-1}],['break-even',{entry:1,side:1,lots:0,contract:1,fx:1,fees:0}]]){
    let rejected=false;try{api.calculate(slug,v)}catch{rejected=true;}check(rejected,'Invalid input accepted: '+slug);
  }
  const marketWin={};compile(read('pages/markets.js'),'window')(marketWin);const markets=marketWin.FXMarkets;check(markets.instruments.length===20,'Market instrument count');check(new Set(markets.instruments.map(i=>i[0])).size===20,'Duplicate instrument');check(markets.route('/invalid')===false,'Unknown market route');check(app.includes('FXMarkets?.route(path)'),'Market route missing');return passed;
}

const passed=run(p=>readFileSync(resolve(root,p),'utf8'),p=>existsSync(resolve(root,p)),(src,...args)=>new Function(...args,src));
console.log('PASS: '+passed+' static regression checks');
