'use server';

import { searchContent, type SearchResults } from '@/lib/search';

/** Server action used by the header search and the editor [[ autocomplete. */
export async function searchAction(query: string): Promise<SearchResults> {
  return searchContent(query, 8);
}
