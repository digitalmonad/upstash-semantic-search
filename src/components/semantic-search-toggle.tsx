"use client";

import { Switch } from "@/components/ui/switch";
import { useTransition } from "react";
import { useQueryStates, parseAsBoolean, parseAsInteger } from "nuqs";

export function SemanticSearchToggle() {
  const [{ semanticSearch }, setParams] = useQueryStates({
    semanticSearch: parseAsBoolean.withDefault(false),
    page: parseAsInteger.withDefault(1),
  });
  const [, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    startTransition(() => {
      setParams({ semanticSearch: checked, page: 1 }, { shallow: false });
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="semantic-search-toggle"
        checked={semanticSearch}
        onCheckedChange={handleToggle}
      />
      <label
        htmlFor="semantic-search-toggle"
        className="text-sm font-medium cursor-pointer select-none"
      >
        OFF/ON
      </label>
    </div>
  );
}
