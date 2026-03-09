"use client";

import { Loader2, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useRef, useState, useTransition } from "react";
import { useQueryStates, parseAsString, parseAsInteger } from "nuqs";

const SearchBar = () => {
  const [{ query }, setParams] = useQueryStates({
    query: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(1),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearching, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState<string>(query);

  const search = () => {
    startTransition(() => {
      setParams({ query: inputValue.trim(), page: 1 }, { shallow: false });
    });
  };

  return (
    <div className="relative w-full h-10 flex flex-col">
      <div className="relative h-full z-10">
        <Input
          placeholder={
            'Search for terms like "beach", "travel", "king" or "factory"'
          }
          disabled={isSearching}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
            if (e.key === "Escape") inputRef?.current?.blur();
          }}
          ref={inputRef}
          className="absolute inset-0 h-full rounded-lg"
        />
        <Button
          disabled={isSearching}
          size="sm"
          onClick={search}
          className="absolute right-0 inset-y-0 h-full rounded-lg rounded-l-none"
        >
          {isSearching ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Search className="h-6 w-6" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;
