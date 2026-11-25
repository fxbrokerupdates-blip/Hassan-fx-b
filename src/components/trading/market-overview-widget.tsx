"use client";
import {useState} from "react";
export function MarketOverviewWidget(){
 const [enabled,setEnabled]=useState(false);
 return <section className="card-plain overflow-hidden p-4 space-y-3"><div className="flex items-center justify-between gap-3 flex-wrap"><h2 className="font-semibold">Market quotes & charts</h2>{enabled&&<button className="btn-outline px-3 py-2" onClick={()=>setEnabled(false)}>Hide widget</button>}</div>
 {!enabled?<div className="rounded-xl border border-white/10 p-5 space-y-3"><p className="text-sm text-muted">Load TradingView's third-party market widget to see available Forex, commodities, crypto and index quotes. Loading connects your browser to TradingView and its data services.</p><button className="btn-gold px-4 py-2" onClick={()=>setEnabled(true)}>Load market quotes</button></div>:<iframe src="/widgets/market-overview.html" title="TradingView market overview — forex, gold, crypto and indices" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" className="w-full rounded-lg border-0" style={{height:610}} loading="lazy"/>}
 <p className="text-xs text-muted">Quotes may be delayed or unavailable depending on the market, exchange, data provider, browser or region. This widget is for display only; no quotes are extracted or used for alerts. <a href="https://www.tradingview.com/markets/" target="_blank" rel="noopener noreferrer" className="text-gold-400">Open TradingView markets</a>.</p></section>;
}
