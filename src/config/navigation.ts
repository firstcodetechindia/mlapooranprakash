import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radar,
  CheckSquare,
  CalendarClock,
  Image as ImageIcon,
  BookOpen,
  Rss,
  BarChart3,
  ShieldCheck,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Set once the route behind this item actually exists. */
  available: boolean;
}

export const primaryNav: NavItem[] = [
  { label: "Today", href: "/dashboard", icon: LayoutDashboard, available: true },
  { label: "Content Radar", href: "/radar", icon: Radar, available: false },
  { label: "Approval Queue", href: "/approvals", icon: CheckSquare, available: false },
  { label: "Calendar", href: "/calendar", icon: CalendarClock, available: false },
  { label: "Media Library", href: "/media", icon: ImageIcon, available: false },
  { label: "Knowledge Base", href: "/knowledge", icon: BookOpen, available: false },
  { label: "Reference Sources", href: "/sources/reference-accounts", icon: Rss, available: false },
  { label: "Analytics", href: "/analytics", icon: BarChart3, available: false },
  { label: "Audit Log", href: "/audit", icon: ShieldCheck, available: false },
];

export const settingsNav: NavItem[] = [
  { label: "Team & Roles", href: "/settings/team", icon: Settings, available: true },
];
