import { MaintenanceNotice } from "@/components/layout/maintenance";
import { getSiteConfig } from "@/lib/data/site";

export const metadata = { title: "Maintenance", robots: { index: false } };

export default async function MaintenancePage() {
  const { settings } = await getSiteConfig();
  return <MaintenanceNotice message={settings["site.maintenance"].message} />;
}
