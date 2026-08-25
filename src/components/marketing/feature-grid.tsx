"use client";

import { motion } from "framer-motion";
import type { Icon } from "@phosphor-icons/react";
import { CheckCircle, ShieldCheck, UsersThree } from "@phosphor-icons/react";

import { glassClasses } from "@/lib/glass";
import { cn } from "@/lib/utils";

interface Feature {
  icon: Icon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: CheckCircle,
    title: "Human review, always",
    description:
      "AI drafts and researches. Nothing publishes without an authorized approver.",
  },
  {
    icon: ShieldCheck,
    title: "Fact-checked by design",
    description:
      "Every claim is labeled verified, unverified, or AI inference — never presented as fact silently.",
  },
  {
    icon: UsersThree,
    title: "Built for teams",
    description:
      "Role-based access for editors, approvers, analysts, and admins.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function FeatureGrid() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mt-8 grid gap-4 text-left sm:grid-cols-3"
    >
      {features.map((feature) => (
        <motion.div
          key={feature.title}
          variants={item}
          whileHover={{ y: -3 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(glassClasses, "flex flex-col gap-2 rounded-xl p-5")}
        >
          <feature.icon weight="duotone" className="size-6 text-primary" />
          <p className="text-sm font-medium">{feature.title}</p>
          <p className="text-sm text-muted-foreground">{feature.description}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
