import Link from "next/link";
import { redirect } from "next/navigation";
import { Radar, ShieldCheck, Users, CheckCircle2 } from "lucide-react";

import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Radar className="size-4" />
          </span>
          Political Social Command Center
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          One command center for your team&apos;s public communication
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground text-balance">
          Monitor approved sources, research facts, draft original posts in
          your voice, and publish only what a human on your team has
          approved.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/signup">Create your command center</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-6 text-left sm:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <CheckCircle2 className="size-5 text-primary" />
            <p className="text-sm font-medium">Human review, always</p>
            <p className="text-sm text-muted-foreground">
              AI drafts and researches. Nothing publishes without an
              authorized approver.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <ShieldCheck className="size-5 text-primary" />
            <p className="text-sm font-medium">Fact-checked by design</p>
            <p className="text-sm text-muted-foreground">
              Every claim is labeled verified, unverified, or AI inference —
              never presented as fact silently.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <Users className="size-5 text-primary" />
            <p className="text-sm font-medium">Built for teams</p>
            <p className="text-sm text-muted-foreground">
              Role-based access for editors, approvers, analysts, and admins.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
