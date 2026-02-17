import { Card, CardContent } from "@/components/ui/card";
import SearchBar from "@/components/search";

import { redirect } from "next/navigation";

interface PageProps {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}

export default function Search({ searchParams }: PageProps) {
  const query = searchParams.query;

  if (Array.isArray(query) || !query) {
    return redirect("/");
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex gap-16 lg:px-8 lg:py-24">
      <div className="h-full w-full">
        <div className="mt-16 mx-auto w-full max-w-2xl flex flex-col gap-8">
          <div className="mx-auto w-full flex flex-col gap-4">
            <h1 className="tracking-tight text-2xl sm:text-4xl font-bold">
              Semantic search
            </h1>

            <a
              href={"https://en.wikipedia.org/wiki/Semantic_search"}
              target="_blank"
            >
              <p className="max-w-xl text-left text-md text-foreground hover:underline ">
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
        </div>
      </div>
    </div>
  );
}
