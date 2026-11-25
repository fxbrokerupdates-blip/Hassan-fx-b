import EconomicCalendar from "@/app/(public)/economic-calendar/page";
import type {RawParams} from "@/lib/params";
export const metadata={title:"Economic Calendar"};
export default function Page(props:{searchParams:Promise<RawParams>}){return <div className="fx-member-embedded"><EconomicCalendar {...props}/></div>}