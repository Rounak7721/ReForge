"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Exit } from "@/components/ui/icons";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Couldn’t log you out. Please try again.");
      setPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={onLogout}
      disabled={pending}
      aria-label={pending ? "Logging out…" : "Log out"}
      title="Log out"
    >
      <Exit />
    </Button>
  );
}
