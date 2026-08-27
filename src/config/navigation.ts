import type { Icon } from "@phosphor-icons/react";
import {
  SquaresFour,
  Target,
  CheckSquare,
  CalendarBlank,
  Image as ImageIcon,
  BookOpen,
  RssSimple,
  ChartBar,
  ShieldCheck,
  Gear,
  CreditCard,
  UserCircle,
  Plug,
} from "@phosphor-icons/react/ssr";

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
  /** Set once the route behind this item actually exists. */
  available: boolean;
}

export const primaryNav: NavItem[] = [
  { label: "Today", href: "/dashboard", icon: SquaresFour, available: true },
  { label: "Content Radar", href: "/radar", icon: Target, available: true },
  { label: "Approval Queue", href: "/approvals", icon: CheckSquare, available: true },
  { label: "Calendar", href: "/calendar", icon: CalendarBlank, available: true },
  { label: "Media Library", href: "/media", icon: ImageIcon, available: true },
  { label: "Knowledge Base", href: "/knowledge", icon: BookOpen, available: true },
  { label: "Reference Sources", href: "/sources/reference-accounts", icon: RssSimple, available: true },
  { label: "Analytics", href: "/analytics", icon: ChartBar, available: false },
  { label: "Audit Log", href: "/audit", icon: ShieldCheck, available: true },
];

export const settingsNav: NavItem[] = [
  { label: "Politician Profile", href: "/settings/politician", icon: UserCircle, available: true },
  { label: "Team & Roles", href: "/settings/team", icon: Gear, available: true },
  { label: "Integrations", href: "/settings/integrations", icon: Plug, available: true },
  { label: "Billing", href: "/settings/billing", icon: CreditCard, available: true },
];
