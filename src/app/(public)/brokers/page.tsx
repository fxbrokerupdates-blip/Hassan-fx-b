import type { Metadata } from "next";
import { BrokerDirectory } from "@/components/brokers/directory";
import { pageMetadata } from "@/lib/seo";
import type { RawParams } from "@/lib/params";
export const metadata:Metadata=pageMetadata({title:"Broker Intelligence Center",description:"Explore broker profiles, compare platforms and account types, and find regulatory verification sources.",path:"/brokers"});
export default function Page({searchParams}:{searchParams:Promise<RawParams>}){return <BrokerDirectory searchParams={searchParams}/>;}
