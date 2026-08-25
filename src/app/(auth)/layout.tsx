import { Broadcast } from "@phosphor-icons/react/ssr";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="aurora-bg flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Broadcast weight="fill" className="size-4" />
        </span>
        Political Social Command Center
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
