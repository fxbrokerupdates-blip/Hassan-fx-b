"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Home,BarChart3,Landmark,TrendingUp,CalendarDays,Newspaper,Calculator,Sparkles,Users,Bookmark,Bell,Settings,Shield,ChevronDown,ArrowRight,Globe,LogIn} from "lucide-react";
import {Logo} from "@/components/layout/logo";
import type {NavItem} from "@/types/db";
export function PublicTerminalSidebar({nav,flags,logoUrl,name}:{nav:NavItem[];flags:Record<string,boolean>;logoUrl:string;name:string}){
const pathname=usePathname();
const items=[
 {label:"Home",href:"/",Icon:Home,links:[]},
 {label:"Market Watch",href:"/market-quotes",Icon:BarChart3,links:[["Market overview","/market-intelligence"],["Currency strength","/currency-strength"],["Institutional positioning","/market-sentiment"],["Central banks","/central-banks"],["Macro data","/macroeconomic-data"]]},
 {label:"Brokers",href:"/brokers",Icon:Landmark,links:[["Compare brokers","/compare-brokers"],["License checker","/broker-regulation"],["Promotions","/broker-promotions"],["Regulatory warnings","/broker-warnings"]]},
 {label:"Trading Workspace",href:"/dashboard/trader",Icon:TrendingUp,links:[]},
 {label:"Economic Calendar",href:"/economic-calendar",Icon:CalendarDays,links:[]},
 {label:"News & Analysis",href:"/news",Icon:Newspaper,links:[["Broker updates","/broker-updates"],["Trading updates","/trading-updates"]]},
 {label:"Trading Tools",href:"/free-tools",Icon:Calculator,links:[["Calculators","/trading-calculators"],...(flags.banner_prompts?[["Banner prompts","/free-tools/banner-prompts"]]:[]),...(flags.video_scripts?[["Video scripts","/free-tools/video-scripts"]]:[])]},
 ...(flags.ai_studio?[{label:"AI Creator Studio",href:"/dashboard/studio",Icon:Sparkles,links:[]}]:[]),
 {label:"IB Center",href:"/ib-programs",Icon:Users,links:[["IB Directory","/ib-directory"]]},
 {label:"Community",href:"/community",Icon:Users,links:[]},
 {label:"Saved Content",href:"/dashboard/saved",Icon:Bookmark,links:[]},
 {label:"Notifications",href:"/dashboard/notifications",Icon:Bell,links:[]},
 {label:"Settings",href:"/dashboard/settings",Icon:Settings,links:[]}
];
const active=(href:string)=>href==="/"?pathname==="/":pathname===href||pathname.startsWith(href+"/");
const known=new Set(items.flatMap(i=>[i.href,...i.links.map(l=>l[1])]));
return <aside className="fx-public-terminal-sidebar"><div className="fx-public-sidebar-brand"><Logo src={logoUrl} name={name}/></div><nav aria-label="Desktop navigation">{items.map(({label,href,Icon,links})=><div key={href} className="fx-public-sidebar-item"><Link href={href} aria-current={active(href)?"page":undefined} className={active(href)||links.some(l=>active(l[1]))?"fx-side-active":""}><Icon size={18}/><span>{label}</span></Link>{links.length>0&&<details key={pathname+href} open={links.some(l=>active(l[1]))}><summary aria-label={label+" subpages"}><ChevronDown size={14}/></summary><div>{links.map(([label,url])=><Link key={url} href={url} aria-current={active(url)?"page":undefined}>{label}</Link>)}</div></details>}</div>)}</nav><details className="fx-side-more"><summary><Globe size={16}/>More pages <ChevronDown size={13}/></summary><div>{nav.filter(n=>!known.has(n.href)).map(n=><Link key={n.id} href={n.href}>{n.label}</Link>)}<Link href="/legal">Legal & policies</Link><Link href="/contact">Contact</Link></div></details><section className="fx-public-side-feature"><Shield size={23}/><h2>Your research workspace</h2><p>Market intelligence, broker research, daily content and trading tools.</p><Link href="/dashboard">Member dashboard <ArrowRight size={15}/></Link><Link className="fx-public-side-signin" href="/signup"><LogIn size={14}/> Create account</Link></section></aside>;
}
