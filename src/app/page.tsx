import Link from "next/link";
import { redirect } from "next/navigation";
import { Broadcast } from "@phosphor-icons/react/ssr";

import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { glassClasses } from "@/lib/glass";
import { cn } from "@/lib/utils";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="aurora-bg flex flex-1 flex-col">
      <header
        className={cn(
          glassClasses,
          "sticky top-0 z-20 flex h-16 items-center justify-between border-x-0 border-t-0 px-6",
        )}
      >
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Broadcast weight="fill" className="size-4" />
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

        <FeatureGrid />
      </main>
    </div>
  );
}
