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
import { db } from "@/lib/db";
import { Apartment, apartmentTable } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const queryParam = params.query;
  const pageParam = params.page;

  const q =
    typeof queryParam === "string" && queryParam.trim()
      ? queryParam.trim()
      : null;
  const pageNum =
    typeof pageParam === "string" && /^\d+$/.test(pageParam)
      ? parseInt(pageParam, 10)
      : 1;
  const pageSize = 3;
  const fetchLimit = pageSize + 1; // fetch one extra to detect next page
  const offset = (pageNum - 1) * pageSize;

  const baseQuery = db
    .select({
      id: apartmentTable.id,
      name: apartmentTable.name,
      description: apartmentTable.description,
      price: apartmentTable.price,
      imageId: apartmentTable.imageId,
      total: sql<number>`count(*) OVER()`,
    })
    .from(apartmentTable)
    .$dynamic(); // allows

  const resultsRaw = await (
    q
      ? baseQuery.where(
          sql`to_tsvector('simple', lower(${apartmentTable.name} || ' ' || ${apartmentTable.description})) @@ to_tsquery('simple', lower(${q.split(" ").join(" & ")}))`,
        )
      : baseQuery
  )
    .limit(fetchLimit)
    .offset(offset);

  const total = resultsRaw.length > 0 ? Number(resultsRaw[0].total) : 0;

  const hasNext = resultsRaw.length > pageSize;
  const results: Array<Apartment & { total: number }> = resultsRaw.slice(
    0,
    pageSize,
  );

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("query", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : `/`;
  };

  return (
    <div className="mx-auto max-w-7xl lg:flex gap-16">
      <div className="h-full w-full">
        <div className="mt-16 mx-auto w-full max-w-2xl flex flex-col gap-8">
          <div className="mx-auto w-full flex flex-col gap-4">
            <h1 className="tracking-tight text-2xl sm:text-4xl font-bold">
              Semantic search
            </h1>
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
            {results.length === 0 ? (
              <div className="w-full py-8 flex items-center justify-center">
                <p className="text-muted-foreground">
                  No items found. Try different keywords or clear the search.
                </p>
              </div>
            ) : (
              results.map((result) => (
                <Card key={result.id} className="py-0">
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-1/3 relative h-40 flex-shrink-0 overflow-hidden bg-muted rounded-l-xl ">
                        <Image
                          src={result.imageId}
                          alt={result.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 p-4">
                        <h2 className="font-semibold text-lg">{result.name}</h2>
                        <div className="text-sm text-muted-foreground mt-1">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(Number(result.price))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {result.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground text-left">
                {q
                  ? `Total ${total} item${total !== 1 ? "s" : ""} for "${q}"`
                  : `Total ${total} item${total !== 1 ? "s" : ""}`}
              </p>
              <div>
                <Pagination>
                  <PaginationPrevious
                    href={pageNum > 1 ? buildHref(pageNum - 1) : "#"}
                    aria-disabled={pageNum <= 1}
                  />

                  <PaginationContent>
                    <PaginationItem>
                      <PaginationLink href={buildHref(pageNum)} isActive>
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  </PaginationContent>

                  <PaginationNext
                    href={hasNext ? buildHref(pageNum + 1) : "#"}
                    aria-disabled={!hasNext}
                  />
                </Pagination>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
