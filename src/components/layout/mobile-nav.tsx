"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Home, Newspaper, ChartNoAxesCombined, Building2, UserRound} from "lucide-react";
const links=[{href:"/",label:"Home",Icon:Home},{href:"/news",label:"News",Icon:Newspaper},{href:"/market-intelligence",label:"Markets",Icon:ChartNoAxesCombined},{href:"/brokers",label:"Brokers",Icon:Building2},{href:"/dashboard",label:"Account",Icon:UserRound}];
export function MobileNav(){const path=usePathname();return <nav aria-label="Quick navigation" className="fx-mobile-nav">{links.map(({href,label,Icon})=>{const active=href==="/"?path==="/":path===href||path.startsWith(href+"/")||(label==="News"&&(/^\/(broker-updates|trading-updates|category)(\/|$)/.test(path)))||(label==="Markets"&&["/market-quotes","/economic-calendar","/currency-strength","/market-sentiment"].includes(path));return <Link key={href} href={href} aria-current={active?"page":undefined}><Icon size={21} strokeWidth={active?2.4:1.7} aria-hidden/><span>{label}</span></Link>})}</nav>}
