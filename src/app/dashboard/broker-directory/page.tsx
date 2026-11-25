import {BrokerDirectory} from "@/components/brokers/directory";
import type {RawParams} from "@/lib/params";
export const metadata={title:"Broker Directory"};
export default function Page({searchParams}:{searchParams:Promise<RawParams>}){return <div className="fx-member-embedded"><BrokerDirectory searchParams={searchParams} basePath="/dashboard/broker-directory"/></div>;}
