/**
 * search.ts – server-side helpers for DB full-text search and Upstash vector
 * semantic fallback.
 *
 * Keeping data-fetching logic here keeps page.tsx clean and makes the helpers
 * unit-testable without spinning up Next.js.
 */

import { Index } from "@upstash/vector";
import { db } from "@/lib/db";
import { Apartment, apartmentTable } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const PAGE_SIZE = 3;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/** Validated, normalised params extracted from raw URL search-params. */
export interface ParsedParams {
  /** Trimmed query string, or null if absent / blank. */
  q: string | null;
  /** Current page number, always >= 1. */
  page: number;
  /** Whether the user has opted into semantic search. */
  semanticSearch: boolean;
}

/**
 * A DB row as returned by the window-function query.
 * `total` is the full count matching the current filter, injected by
 * `count(*) OVER()` – it is NOT persisted in the apartments table.
 */
export interface DbRow extends Apartment {
  total: number;
}

/** Final shape returned to the page component. */
export interface SearchResult {
  items: Apartment[];
  hasNext: boolean;
  /** Total count of matching DB rows (+ any semantic extras on this page). */
  total: number;
}

// ─────────────────────────────────────────────────────────────
// Param parsing
// ─────────────────────────────────────────────────────────────

/**
 * Safely extract and validate params from raw Next.js `searchParams`.
 *
 * Works with both synchronous `Record<…>` and the `await`-ed value from
 * `Promise<Record<…>>` – just `await searchParams` before calling this.
 *
 * SQL-injection note: `q` is used only as a parameterised value inside
 * drizzle's `sql` template – it is never interpolated as raw SQL text, so
 * no additional escaping is necessary.
 */
export function parseParams(
  raw: Record<string, string | string[] | undefined>,
): ParsedParams {
  // query – pick only the first value if it arrives as an array
  const rawQ =
    typeof raw.query === "string"
      ? raw.query.trim()
      : Array.isArray(raw.query)
        ? (raw.query[0] ?? "").trim()
        : "";
  const q = rawQ.length > 0 ? rawQ : null;

  // page – must be a positive integer
  const rawPage = typeof raw.page === "string" ? raw.page : "";
  const parsedPage = /^\d+$/.test(rawPage) ? parseInt(rawPage, 10) : 1;
  const page = parsedPage >= 1 ? parsedPage : 1;

  // semanticSearch toggle
  const semanticSearch = raw.semanticSearch === "1";

  return { q, page, semanticSearch };
}

// ─────────────────────────────────────────────────────────────
// DB query
// ─────────────────────────────────────────────────────────────

/**
 * Query the apartments table with optional full-text filtering.
 *
 * Full-text search uses PostgreSQL `to_tsvector` / `to_tsquery` via
 * drizzle-orm's tagged-template `sql` helper.  Every `${value}` inside the
 * template is passed as a **parameterised bind variable** by drizzle – the
 * user-supplied string `tsQuery` is therefore never interpolated as raw SQL,
 * which prevents SQL injection.
 *
 * `coalesce` on `description` guards against NULL values breaking the
 * concatenation (description is defined without `notNull()` in the schema).
 */
export async function fetchFromDb(
  q: string | null,
  page: number,
): Promise<{ rows: DbRow[]; dbTotal: number }> {
  const fetchLimit = PAGE_SIZE + 1; // one extra to detect whether a next page exists
  const offset = (page - 1) * PAGE_SIZE;

  const base = db
    .select({
      id: apartmentTable.id,
      name: apartmentTable.name,
      description: apartmentTable.description,
      price: apartmentTable.price,
      imageId: apartmentTable.imageId,
      // Window function: count of ALL matching rows, not just this page
      total: sql<number>`count(*) OVER()`,
    })
    .from(apartmentTable)
    .$dynamic();

  const query = q
    ? base.where(
        // Build tsquery by joining tokens with ' & ' (AND).
        // The whole expression is parameterised – drizzle binds `tsQuery`
        // as $1, keeping the column references as identifiers.
        sql`to_tsvector('simple', lower(${apartmentTable.name} || ' ' || coalesce(${apartmentTable.description}, ''))) @@ to_tsquery('simple', lower(${q
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .join(" & ")}))`,
      )
    : base;

  const rows = (await query.limit(fetchLimit).offset(offset)) as DbRow[];
  const dbTotal = rows.length > 0 ? Number(rows[0].total) : 0;

  return { rows, dbTotal };
}

// ─────────────────────────────────────────────────────────────
// Semantic / vector fallback
// ─────────────────────────────────────────────────────────────

/**
 * Runtime type-guard: validate that vector metadata looks like an Apartment
 * before casting.  Metadata stored in Upstash is untyped JSON, so we must
 * not blindly trust the shape.
 */
function isApartmentMetadata(val: unknown): val is Apartment {
  if (!val || typeof val !== "object") return false;
  const o = val as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.imageId === "string" &&
    typeof o.price === "number"
  );
}

/**
 * Query the Upstash vector index for semantically similar apartments.
 *
 * Only called when:
 *  - the user has enabled semantic search (`semanticSearch === true`), AND
 *  - there is a non-empty query string, AND
 *  - the DB returned fewer results than PAGE_SIZE.
 *
 */
const ABSOLUTE_MIN = 0.5;
const SCORE_DROP_TOLERANCE = 0.15;
const RANK_INCREMENT = 0.1;

export async function fetchSemanticFallback(
  index: Index,
  q: string,
  existingIds: Set<string>,
): Promise<Apartment[]> {
  const res = await index.query<Record<string, unknown>>({
    data: q,
    topK: PAGE_SIZE,
    includeMetadata: true,
  });

  const valid = res.filter(
    (r) => !existingIds.has(String(r.id)) && isApartmentMetadata(r.metadata),
  );

  if (valid.length === 0) return [];

  const bestScore = valid[0].score ?? 0;

  // base minimum: never below ABSOLUTE_MIN, but also consider bestScore
  const baseMin = Math.max(ABSOLUTE_MIN, bestScore - SCORE_DROP_TOLERANCE);

  // For each result increase the required threshold by RANK_INCREMENT per position.
  // This makes lower-ranked items require a higher score to pass (filters more).
  return valid
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) => r.score >= Math.min(1, baseMin + i * RANK_INCREMENT))
    .map(({ r }) => r.metadata as Apartment);
}

// ─────────────────────────────────────────────────────────────
// URL construction helper
// ─────────────────────────────────────────────────────────────

/** Build a pagination href that preserves the current search state. */
export function buildHref(
  p: number,
  q: string | null,
  semanticSearch: boolean,
): string {
  const params = new URLSearchParams();
  if (q) params.set("query", q);
  if (semanticSearch) params.set("semanticSearch", "1");
  if (p > 1) params.set("page", String(p));
  const qs = params.toString();
  return qs ? `/?${qs}` : `/`;
}
