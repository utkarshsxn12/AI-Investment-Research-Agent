export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export async function tavilySearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("TAVILY_API_KEY is not set. Returning mock empty results.");
    return [];
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return (data.results || []) as SearchResult[];
  } catch (error) {
    console.error("Error performing Tavily search:", error);
    return [];
  }
}
