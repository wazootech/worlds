import type { FactSearchEngine } from "#/tools/search-facts/fact-search-engine.ts";
import type { SearchFactsOutput } from "#/tools/search-facts/fact-search-engine.ts";

export class FakeFactSearchEngine implements FactSearchEngine {
  public searchFacts(
    _query: string,
    _limit: number,
  ): Promise<SearchFactsOutput> {
    return Promise.resolve([]);
  }
}
