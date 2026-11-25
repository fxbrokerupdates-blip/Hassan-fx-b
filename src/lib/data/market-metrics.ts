export const CURRENCIES = ["AUD","CAD","CHF","EUR","GBP","JPY","NZD","USD"] as const;
export type Rate = {currency:string;period:string;units_per_eur:number|string};
export type Cot = {currency:string;period:string;open_interest:number|string;asset_long:number|string;asset_short:number|string;leveraged_long:number|string;leveraged_short:number|string};
export const COT_CURRENCIES = CURRENCIES.filter(c=>c!=="USD");
export type RateSnapshot = {period:string;rates:Record<string,number>};
export function rateSnapshots(rows:Rate[]):RateSnapshot[]{
 const grouped=new Map<string,Record<string,number>>();
 for(const row of rows){
  if(!CURRENCIES.some(c=>c===row.currency)||row.currency==="EUR")continue;
  const value=Number(row.units_per_eur);
  if(!Number.isFinite(value)||value<=0)continue;
  const rates=grouped.get(row.period)??{EUR:1};rates[row.currency]=value;grouped.set(row.period,rates);
 }
 return [...grouped.entries()].filter(([,rates])=>CURRENCIES.every(c=>Number.isFinite(rates[c])&&rates[c]>0)).map(([period,rates])=>({period,rates})).sort((a,b)=>b.period.localeCompare(a.period));
}
export function crossRate(s:RateSnapshot,base:string,quote:string):number|null{
 const b=s.rates[base],q=s.rates[quote];return Number.isFinite(b)&&b>0&&Number.isFinite(q)&&q>0?q/b:null;
}
export function crossChange(current:RateSnapshot,previous:RateSnapshot,base:string,quote:string):number|null{
 const a=crossRate(current,base,quote),b=crossRate(previous,base,quote);
 return a===null||b===null?null:(a/b-1)*100;
}
/** Equal-weight geometric mean of each currency's seven bilateral changes.
 * Positive means appreciation versus the equal-weight basket; not a signal. */
export function currencyStrength(current:RateSnapshot,previous:RateSnapshot){
 return CURRENCIES.map(currency=>{
 const others=CURRENCIES.filter(c=>c!==currency);
 const changes=others.map(other=>crossChange(current,previous,currency,other));
 const strength=changes.some(x=>x===null)?null:100*Math.expm1(changes.reduce<number>((sum,x)=>sum+Math.log1p(x!/100),0)/others.length);
 return {currency,strength};
 }).sort((a,b)=>(b.strength??-Infinity)-(a.strength??-Infinity));
}
export function positioning(long:unknown,short:unknown){
 if(long===null||short===null||long===undefined||short===undefined||long===""||short==="")return null;
 const l=Number(long),s=Number(short);if(!Number.isFinite(l)||!Number.isFinite(s)||l<0||s<0)return null;
 return {net:l-s,longPercent:l+s>0?100*l/(l+s):null};
}
export function cotSnapshots(rows:Cot[]){
 const dates=[...new Set(rows.map(r=>r.period))].sort((a,b)=>b.localeCompare(a));
 return dates.map(period=>({period,rows:rows.filter(r=>r.period===period)})).filter(s=>COT_CURRENCIES.every(c=>s.rows.some(r=>r.currency===c)));
}
