import Link from "next/link";
import {PageHeader} from "@/components/news/page-header";
import {pageMetadata} from "@/lib/seo";
import {ResearchStats,ResearchNav,InfoPanel,SupportNav} from "@/components/layout/research-widgets";
import {createSupabasePublic} from "@/lib/supabase/server";
import {str,type RawParams} from "@/lib/params";
export const metadata=pageMetadata({title:"Legal & Policies",description:"Privacy, terms of use and financial risk disclosures.",path:"/legal"});
export default function Page(){return <><PageHeader title="Legal &" gold="Policies" description="Read our policies and financial risk disclosures." crumbs={[{name:"Home",path:"/"},{name:"Legal & Policies",path:"/legal"}]}/><div className="container-site py-8 fx-support-layout"><SupportNav active="/legal"/><div className="grid gap-3"><InfoPanel title="Privacy policy" href="/privacy" label="Read privacy policy"><p>How we handle personal information and analytics.</p></InfoPanel><InfoPanel title="Terms & conditions" href="/terms" label="Read terms"><p>Conditions for accessing and using the platform.</p></InfoPanel><InfoPanel title="Risk disclaimer" href="/disclaimer" label="Read disclaimer"><p>Trading involves financial risk. Research and educational information do not constitute individualized investment advice.</p></InfoPanel></div></div></>;}
