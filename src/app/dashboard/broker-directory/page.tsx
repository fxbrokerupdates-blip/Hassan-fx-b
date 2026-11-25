import Brokers from "@/app/(public)/brokers/page";
import type {RawParams} from "@/lib/params";
export const metadata={title:"Broker Directory"};
export default function Page(props:{searchParams:Promise<RawParams>}){return <div className="fx-member-embedded"><BrokersPage {...props}/></div>}
const BrokersPage=Brokers;