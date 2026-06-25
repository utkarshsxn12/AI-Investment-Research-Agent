import { NextRequest } from "next/server";

function getMockHistory(ticker: string) {
  const points = [];
  const now = new Date();
  
  let baseline = 100;
  let trend = 0.1; 
  let volatility = 2; 
  
  const t = ticker.toUpperCase();
  if (t === "AAPL") { baseline = 180; trend = 0.05; volatility = 3; }
  else if (t === "TSLA") { baseline = 220; trend = -0.02; volatility = 10; }
  else if (t === "NVDA") { baseline = 120; trend = 0.8; volatility = 8; }
  else if (t === "MSFT") { baseline = 400; trend = 0.04; volatility = 4; }
  else if (t === "KO") { baseline = 60; trend = 0.01; volatility = 1; }
  else {
    let codeSum = 0;
    for (let i = 0; i < t.length; i++) codeSum += t.charCodeAt(i);
    baseline = 50 + (codeSum % 150);
    trend = ((codeSum % 10) - 4) / 100;
    volatility = 2 + (codeSum % 5);
  }
  
  let currentPrice = baseline;
  for (let i = 52; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    const changePercent = (Math.sin(i * 0.5) * volatility) + (Math.cos(i * 1.5) * volatility * 0.5) + (trend * 2);
    currentPrice = Math.max(5, currentPrice * (1 + changePercent / 100));
    
    points.push({
      date: dateStr,
      price: parseFloat(currentPrice.toFixed(2)),
    });
  }
  return points;
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return new Response(JSON.stringify({ error: "Ticker is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1wk`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo API returned ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
      throw new Error("Invalid chart data structure");
    }

    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;

    const points = [];
    for (let i = 0; i < timestamps.length; i++) {
      const date = new Date(timestamps[i] * 1000);
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const price = closes[i];
      
      if (price !== null && price !== undefined && !isNaN(price)) {
        points.push({
          date: dateStr,
          price: parseFloat(price.toFixed(2)),
        });
      }
    }

    if (points.length === 0) throw new Error("No points extracted");

    return new Response(JSON.stringify({ points, ticker, source: "yahoo" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.warn(`Yahoo Finance chart fetch failed for ${ticker}, using mock. Error:`, error.message);
    const points = getMockHistory(ticker);
    return new Response(JSON.stringify({ points, ticker, source: "mocked" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
