import { Card, CardContent } from "@/components/ui/card";
import SearchBar from "@/components/search";
import Image from "next/image";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { Index } from "@upstash/vector";
import { SemanticSearchToggle } from "@/components/semantic-search-toggle";
import {
  PAGE_SIZE,
  parseParams,
  fetchFromDb,
  fetchSemanticFallback,
  buildHref,
} from "@/lib/search";

// Singleton index – created once per module, not per request.
const index = Index.fromEnv();

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Home({ searchParams }: PageProps) {
  // ── 1. Parse & validate params ──────────────────────────────────────────
  const { q, page, semanticSearch } = parseParams(await searchParams);

  // ── 2. Fetch from DB (full-text search or all rows) ──────────────────────
  const { rows, dbTotal } = await fetchFromDb(q, page);

  // ── 3. Optional semantic fallback ────────────────────────────────────────
  // Only runs when: (a) semantic search is toggled on, (b) query is non-empty,
  // and (c) the DB returned fewer results than a full page.
  const semanticExtras =
    semanticSearch && q && rows.length < PAGE_SIZE
      ? await fetchSemanticFallback(index, q, new Set(rows.map((r) => r.id)))
      : [];

  // ── 4. Merge, paginate, compute totals ───────────────────────────────────
  const combined = [...rows, ...semanticExtras];
  const hasNext = combined.length > PAGE_SIZE;
  const items = combined.slice(0, PAGE_SIZE);
  // dbTotal is from the window function and reflects all pages; add any
  // semantic extras that appeared on this page only.
  const total = dbTotal + semanticExtras.length;

  // ── 5. Render ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl lg:flex gap-16">
      <div className="h-full w-full">
        <div className="mt-16 mx-auto w-full max-w-2xl flex flex-col gap-8">
          <div className="mx-auto w-full flex flex-col gap-4">
            <h1 className="tracking-tight text-2xl sm:text-4xl font-bold">
              Semantic search
            </h1>
            <SemanticSearchToggle enabled={semanticSearch} />
            <a
              href="https://en.wikipedia.org/wiki/Semantic_search"
              target="_blank"
            >
              <p className="max-w-xl text-left text-md text-foreground hover:underline">
                An approach to information retrieval that seeks to improve
                search accuracy by understanding the searcher&apos;s intent and
                the contextual meaning of terms as they appear in the searchable
                dataspace.
              </p>
            </a>
          </div>

          <Card>
            <CardContent>
              <SearchBar />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            {items.length === 0 ? (
              <div className="w-full py-8 flex items-center justify-center">
                <p className="text-muted-foreground">
                  No items found. Try different keywords or clear the search.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <Card key={item.id} className="py-0">
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-1/3 relative h-40 flex-shrink-0 overflow-hidden bg-muted rounded-l-xl">
                        {item.imageId && (
                          <Image
                            src={item.imageId}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1 p-4">
                        <h2 className="font-semibold text-lg">{item.name}</h2>
                        <div className="text-sm text-muted-foreground mt-1">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(Number(item.price))}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {q
                  ? `${total} result${total !== 1 ? "s" : ""} for "${q}"`
                  : `${total} listing${total !== 1 ? "s" : ""}`}
              </p>

              <Pagination className="mx-0 w-auto">
                <PaginationPrevious
                  href={page > 1 ? buildHref(page - 1, q, semanticSearch) : "#"}
                  aria-disabled={page <= 1}
                />

                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      href={buildHref(page, q, semanticSearch)}
                      isActive
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>

                <PaginationNext
                  href={hasNext ? buildHref(page + 1, q, semanticSearch) : "#"}
                  aria-disabled={!hasNext}
                />
              </Pagination>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
