export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

async function yahooFinanceSearch(query: string): Promise<SearchResult[]> {
  try {
    const cleanQuery = query.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "");
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanQuery)}&newsCount=5`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!response.ok) throw new Error(`Yahoo Finance: ${response.status}`);
    const data = await response.json();
    const results: SearchResult[] = [];
    if (data.quotes?.length > 0) {
      data.quotes.slice(0, 2).forEach((q: any) => {
        if (q.longname || q.shortname) {
          results.push({
            title: `${q.longname || q.shortname} (${q.symbol})`,
            url: `https://finance.yahoo.com/quote/${q.symbol}`,
            content: `Listed on ${q.exchange}. Sector: ${q.sector || "N/A"}. Industry: ${q.industry || "N/A"}.`,
            score: 1.0,
          });
        }
      });
    }
    if (data.news?.length > 0) {
      data.news.slice(0, 3).forEach((item: any, i: number) => {
        results.push({ title: item.title, url: item.link, content: `Published by ${item.publisher}.`, score: 0.9 - i * 0.1 });
      });
    }
    return results;
  } catch (error) {
    console.error("Yahoo Finance fallback failed:", error);
    return [];
  }
}

export async function tavilySearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return await yahooFinanceSearch(query);

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query, search_depth: "basic", max_results: 3 }),
    });
    if (!response.ok) return await yahooFinanceSearch(query);
    const data = await response.json();
    const results = (data.results || []) as SearchResult[];
    if (results.length === 0) return await yahooFinanceSearch(query);
    return results;
  } catch (error) {
    console.error("Tavily search failed, falling back:", error);
    return await yahooFinanceSearch(query);
  }
}
