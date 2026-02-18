"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { useTransition } from "react";

interface SemanticSearchToggleProps {
  enabled: boolean;
}

export function SemanticSearchToggle({ enabled }: SemanticSearchToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("semanticSearch", "1");
    } else {
      params.delete("semanticSearch");
    }
    // Reset to page 1 on toggle
    params.delete("page");
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="semantic-search-toggle"
        checked={enabled}
        onCheckedChange={handleToggle}
      />
      <label
        htmlFor="semantic-search-toggle"
        className="text-sm font-medium cursor-pointer select-none"
      >
        ON/OFF
      </label>
    </div>
  );
}
