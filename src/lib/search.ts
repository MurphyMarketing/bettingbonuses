import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type SearchType = 'brand' | 'article' | 'author';
export type SearchResult = {
  id: string;
  type: SearchType;
  slug: string;
  title: string;
  snippet: string;
  url: string;
};
export type SearchResults = { brands: SearchResult[]; articles: SearchResult[]; authors: SearchResult[] };

const EMPTY: SearchResults = { brands: [], articles: [], authors: [] };

/** Build a prefix tsquery from user input (so "fandu" matches "fanduel"). */
function toPrefixTsQuery(query: string): string | null {
  const terms = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;
  return terms.map((t) => `${t}:*`).join(' & ');
}

const HEADLINE_OPTS = 'MaxFragments=1, MaxWords=18, MinWords=5';
const stripMarks = (s: unknown) => String(s ?? '').replace(/<\/?b>/g, '').replace(/\s+/g, ' ').trim();

type Row = { id: string | number; slug: string; title: string; snippet: string };

export async function searchContent(query: string, limit = 20): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return EMPTY;
  const tsqStr = toPrefixTsQuery(q);
  if (!tsqStr) return EMPTY;
  const tsq = sql`to_tsquery('english', ${tsqStr})`;

  const [brandRows, articleRows, authorRows] = await Promise.all([
    db.execute(sql`
      select id::text as id, slug, name as title,
        ts_headline('english', coalesce(short_description, intro_paragraph, full_description, ''), ${tsq}, ${HEADLINE_OPTS}) as snippet
      from brands
      where status = 'active' and search_vector @@ ${tsq}
      order by ts_rank(search_vector, ${tsq}) desc, name asc
      limit ${limit}
    `) as unknown as Row[],
    db.execute(sql`
      select id, slug, title,
        ts_headline('english', coalesce(excerpt, regexp_replace(coalesce(body, ''), '<[^>]+>', ' ', 'g'), ''), ${tsq}, ${HEADLINE_OPTS}) as snippet
      from articles
      where status = 'published' and search_vector @@ ${tsq}
      order by ts_rank(search_vector, ${tsq}) desc, title asc
      limit ${limit}
    `) as unknown as Row[],
    db.execute(sql`
      select id, slug, name as title,
        ts_headline('english', coalesce(bio, credentials, title, ''), ${tsq}, ${HEADLINE_OPTS}) as snippet
      from authors
      where is_active = true and search_vector @@ ${tsq}
      order by ts_rank(search_vector, ${tsq}) desc, name asc
      limit ${limit}
    `) as unknown as Row[],
  ]);

  return {
    brands: brandRows.map((r) => ({ id: String(r.id), type: 'brand', slug: r.slug, title: r.title, snippet: stripMarks(r.snippet), url: `/${r.slug}/` })),
    articles: articleRows.map((r) => ({ id: String(r.id), type: 'article', slug: r.slug, title: r.title, snippet: stripMarks(r.snippet), url: `/${r.slug}/` })),
    authors: authorRows.map((r) => ({ id: String(r.id), type: 'author', slug: r.slug, title: r.title, snippet: stripMarks(r.snippet), url: `/authors/${r.slug}/` })),
  };
}
