import {
  Award, BarChart3, Bell, Building2, Calendar, Cpu, Gift, Globe, Handshake, LineChart, Megaphone, Monitor, Newspaper,
  Package, Scale, ShieldCheck, TrendingUp, UserCheck, Users, Wallet, type LucideProps,
} from "lucide-react";

const MAP: Record<string, React.ComponentType<LucideProps>> = {
  award: Award, "bar-chart": BarChart3, bell: Bell, building: Building2, calendar: Calendar, cpu: Cpu, gift: Gift,
  globe: Globe, handshake: Handshake, "line-chart": LineChart, megaphone: Megaphone, monitor: Monitor, newspaper: Newspaper,
  package: Package, scale: Scale, "shield-check": ShieldCheck, "trending-up": TrendingUp, "user-check": UserCheck,
  users: Users, wallet: Wallet,
};

/** Renders a named icon stored in the database (categories, hero chips). */
export function NamedIcon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = MAP[name] ?? Newspaper;
  return <Cmp {...props} />;
}
export const ICON_NAMES = Object.keys(MAP);
