import { StateAnnotation, AgentLog } from "./state";
import { QuantitativeData } from "./types";

export async function dataFetcherNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Data Fetcher] Fetching quantitative data for: ${state.company}`);
  
  // Hardcode common tickers to save LLM calls and avoid hallucination
  const commonTickers: Record<string, string> = {
    "nvidia": "NVDA", "apple": "AAPL", "tesla": "TSLA", "microsoft": "MSFT", 
    "amazon": "AMZN", "google": "GOOGL", "meta": "META", "netflix": "NFLX",
    "tata": "TATAMOTORS.NS", "reliance": "RELIANCE.NS", "infosys": "INFY"
  };
  
  let ticker = commonTickers[state.company.toLowerCase().trim()];
  const llm = (await import("./llm")).getLLM(0);

  if (!ticker) {
    try {
      const tickerResponse = await llm.invoke(`What is the exact primary stock ticker symbol for "${state.company}"? Return ONLY the ticker (e.g. NVDA, AAPL). If unsure, return UNKNOWN.`);
      const parsed = (typeof tickerResponse.content === "string" ? tickerResponse.content : "").trim().toUpperCase();
      ticker = (parsed && parsed !== "UNKNOWN" && parsed.length <= 10) ? parsed : state.company.split(" ")[0].toUpperCase().replace(/[^A-Z0-9.]/g, '');
    } catch (e) {
      ticker = state.company.split(" ")[0].toUpperCase().replace(/[^A-Z0-9.]/g, '');
    }
  }

  const missingMetrics: string[] = [];
  let financialData: QuantitativeData | null = null;

  try {
    const avKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (avKey) {
      console.log(`[Data Fetcher] Attempting Alpha Vantage for ${ticker}`);
      const [overviewRes, quoteRes] = await Promise.all([
        fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${avKey}`, { signal: AbortSignal.timeout(5000) }),
        fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${avKey}`, { signal: AbortSignal.timeout(5000) })
      ]);
      
      const ovData = await overviewRes.json();
      const qData = await quoteRes.json();
      
      if (ovData.Symbol && qData["Global Quote"]) {
        const q = qData["Global Quote"];
        financialData = {
          price: parseFloat(q["05. price"]),
          marketCap: parseFloat(ovData.MarketCapitalization),
          peRatio: parseFloat(ovData.PERatio),
          forwardPe: parseFloat(ovData.ForwardPE) || parseFloat(ovData.PERatio),
          pegRatio: parseFloat(ovData.PEGRatio),
          priceToSales: parseFloat(ovData.PriceToSalesRatioTTM),
          priceToBook: parseFloat(ovData.PriceToBookRatio),
          evToEbitda: parseFloat(ovData.EVToEBITDA),
          revenueGrowth: parseFloat(ovData.QuarterlyRevenueGrowthYOY),
          earningsGrowth: parseFloat(ovData.QuarterlyEarningsGrowthYOY),
          grossMargins: (parseFloat(ovData.GrossProfitTTM) / parseFloat(ovData.RevenueTTM)) || 0.4,
          operatingMargins: parseFloat(ovData.OperatingMarginTTM),
          profitMargins: parseFloat(ovData.ProfitMargin),
          roe: parseFloat(ovData.ReturnOnEquityTTM),
          roa: parseFloat(ovData.ReturnOnAssetsTTM),
          fiftyDayAverage: parseFloat(ovData["50DayMovingAverage"]),
          twoHundredDayAverage: parseFloat(ovData["200DayMovingAverage"]),
          fiftyTwoWeekHigh: parseFloat(ovData["52WeekHigh"]),
          fiftyTwoWeekLow: parseFloat(ovData["52WeekLow"]),
          missingMetrics: []
        };
      }
    }
  } catch (avError) {
    console.warn(`[Data Fetcher] Alpha Vantage failed for ${ticker}`, avError);
  }

  // Fallback to Yahoo if Alpha Vantage didn't work (e.g. rate limits)
  if (!financialData) {
    try {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=financialData,defaultKeyStatistics,summaryDetail,price`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error(`Yahoo API returned ${response.status}`);
    const data = await response.json();
    const result = data?.quoteSummary?.result?.[0];
    
    if (result) {
      const fd = result.financialData || {};
      const ks = result.defaultKeyStatistics || {};
      const sd = result.summaryDetail || {};
      const pr = result.price || {};

      financialData = {
        price: pr.regularMarketPrice?.raw, marketCap: pr.marketCap?.raw,
        peRatio: sd.trailingPE?.raw, forwardPe: sd.forwardPE?.raw, pegRatio: ks.pegRatio?.raw,
        priceToSales: sd.priceToSalesTrailing12Months?.raw, priceToBook: ks.priceToBook?.raw, evToEbitda: ks.enterpriseToEbitda?.raw,
        revenueGrowth: fd.revenueGrowth?.raw, earningsGrowth: fd.earningsGrowth?.raw,
        grossMargins: fd.grossMargins?.raw, operatingMargins: fd.operatingMargins?.raw, profitMargins: fd.profitMargins?.raw,
        roe: fd.returnOnEquity?.raw, roa: fd.returnOnAssets?.raw,
        currentRatio: fd.currentRatio?.raw, debtToEquity: fd.debtToEquity?.raw ? fd.debtToEquity.raw / 100 : undefined,
        fiftyDayAverage: sd.fiftyDayAverage?.raw, twoHundredDayAverage: sd.twoHundredDayAverage?.raw,
        fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh?.raw, fiftyTwoWeekLow: sd.fiftyTwoWeekLow?.raw,
        missingMetrics,
      };
    }
  } catch (error: any) {
    console.warn(`[Data Fetcher] Yahoo API failed for ${ticker} (${error.message}). Falling back to LLM extraction from research.`);
  }
  }

  // Fallback: If Yahoo blocked us (429/401/404), extract quantitative estimates using the LLM from the research text!
  if (!financialData) {
    const { z } = await import("zod");
    const FallbackSchema = z.object({
      revenueGrowth: z.number().describe("Estimated YoY revenue growth as a decimal (e.g. 0.15 for 15%)"),
      profitMargins: z.number().describe("Estimated net profit margin as a decimal"),
      peRatio: z.number().describe("Estimated Price to Earnings ratio"),
      forwardPe: z.number().describe("Estimated Forward P/E"),
      pegRatio: z.number().describe("Estimated PEG ratio (e.g. 1.2)"),
      priceToBook: z.number().describe("Estimated P/B ratio"),
      debtToEquity: z.number().describe("Estimated Debt/Equity ratio (e.g. 0.5)"),
      roe: z.number().describe("Estimated Return on Equity as decimal"),
      currentRatio: z.number().describe("Estimated Current Ratio (e.g. 1.5)"),
      price: z.number().describe("Current stock price estimate"),
      fiftyDayAverage: z.number().describe("50-day moving average estimate"),
      twoHundredDayAverage: z.number().describe("200-day moving average estimate"),
      fiftyTwoWeekHigh: z.number().describe("52-week high estimate"),
      fiftyTwoWeekLow: z.number().describe("52-week low estimate")
    });

    try {
      const structured = llm.withStructuredOutput(FallbackSchema);
      const researchTruncated = state.research.length > 8000 ? state.research.substring(0, 8000) : state.research;
      const extracted = await structured.invoke(`Extract the current financial and technical metrics for ${state.company} based on this text. CRITICAL INSTRUCTION: If a specific metric is missing from the text, you MUST use your vast internal training data to provide a highly realistic, accurate estimate for this company as of recent times. You cannot leave any field blank or undefined. Produce realistic numbers for every single field.\n\n${researchTruncated}`);
      
      financialData = {
        ...extracted,
        missingMetrics: ["Data estimated via AI due to Yahoo API rate limits"]
      };
      console.log(`[Data Fetcher] Successfully generated fallback metrics for ${ticker}`);
    } catch (e) {
      console.error("[Data Fetcher] Fallback extraction failed", e);
      financialData = { missingMetrics: ["All data sources failed (API blocked & LLM parse failed)"] };
    }
  }

  return {
    financialData,
    logs: [{ agent: "Data Fetcher", message: `Fetched quantitative data for ${ticker}.`, timestamp }] as AgentLog[],
  };
}
