import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui";

export default function LayoutAuth({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
      <Link href="/" className="mb-10">
        <Logo />
      </Link>
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
