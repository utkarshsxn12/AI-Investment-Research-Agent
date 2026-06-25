import { QuantitativeData, ScoreFactor, AgentOutput } from "../agents/types";

// Helper to format numbers safely
const fmtPct = (val?: number) => val !== undefined ? `${(val * 100).toFixed(1)}%` : "N/A";
const fmtNum = (val?: number) => val !== undefined ? val.toFixed(2) : "N/A";

export function calculateFinancialScore(data: QuantitativeData): AgentOutput {
  const factors: ScoreFactor[] = [];
  let score = 5; // Start at baseline 5/10
  
  if (data.revenueGrowth !== undefined) {
    if (data.revenueGrowth > 0.15) { factors.push({ metric: "Revenue Growth", points: +2, reasoning: ">15% signals strong expansion.", dataValue: fmtPct(data.revenueGrowth) }); score += 2; }
    else if (data.revenueGrowth > 0.05) { factors.push({ metric: "Revenue Growth", points: +1, reasoning: "5-15% signals stable growth.", dataValue: fmtPct(data.revenueGrowth) }); score += 1; }
    else if (data.revenueGrowth < 0) { factors.push({ metric: "Revenue Growth", points: -2, reasoning: "Negative growth is a major red flag.", dataValue: fmtPct(data.revenueGrowth) }); score -= 2; }
  } else { factors.push({ metric: "Revenue Growth", points: 0, reasoning: "Data missing." }); }

  if (data.profitMargins !== undefined) {
    if (data.profitMargins > 0.15) { factors.push({ metric: "Profit Margin", points: +2, reasoning: ">15% shows excellent profitability.", dataValue: fmtPct(data.profitMargins) }); score += 2; }
    else if (data.profitMargins > 0.05) { factors.push({ metric: "Profit Margin", points: +1, reasoning: "Healthy profitability.", dataValue: fmtPct(data.profitMargins) }); score += 1; }
    else if (data.profitMargins < 0) { factors.push({ metric: "Profit Margin", points: -2, reasoning: "Unprofitable operations.", dataValue: fmtPct(data.profitMargins) }); score -= 2; }
  }

  if (data.roe !== undefined) {
    if (data.roe > 0.20) { factors.push({ metric: "ROE", points: +2, reasoning: "Exceptional return on equity.", dataValue: fmtPct(data.roe) }); score += 2; }
    else if (data.roe < 0.05) { factors.push({ metric: "ROE", points: -1, reasoning: "Poor return on equity.", dataValue: fmtPct(data.roe) }); score -= 1; }
  }

  if (data.currentRatio !== undefined) {
    if (data.currentRatio >= 1.5) { factors.push({ metric: "Current Ratio", points: +1, reasoning: "Strong short-term liquidity.", dataValue: fmtNum(data.currentRatio) }); score += 1; }
    else if (data.currentRatio < 1) { factors.push({ metric: "Current Ratio", points: -2, reasoning: "Liquidity risk: assets < liabilities.", dataValue: fmtNum(data.currentRatio) }); score -= 2; }
  }

  if (data.debtToEquity !== undefined) {
    if (data.debtToEquity < 0.5) { factors.push({ metric: "Debt/Equity", points: +1, reasoning: "Conservative leverage.", dataValue: fmtNum(data.debtToEquity) }); score += 1; }
    else if (data.debtToEquity > 2) { factors.push({ metric: "Debt/Equity", points: -2, reasoning: "High debt burden.", dataValue: fmtNum(data.debtToEquity) }); score -= 2; }
  }

  if (factors.length === 0) {
    factors.push({ metric: "Financial Data", points: 0, reasoning: "Fundamental financial data could not be retrieved." });
  }

  const clampedScore = Math.max(1, Math.min(10, score));
  return {
    score: clampedScore,
    maxScore: 10,
    factors,
    summary: `Financial health scored ${clampedScore}/10 based on quantitative fundamentals.`
  };
}

export function calculateValuationScore(data: QuantitativeData): AgentOutput {
  const factors: ScoreFactor[] = [];
  let score = 5;

  if (data.forwardPe !== undefined) {
    if (data.forwardPe < 15) { factors.push({ metric: "Forward P/E", points: +2, reasoning: "Undervalued compared to historical market averages.", dataValue: fmtNum(data.forwardPe) }); score += 2; }
    else if (data.forwardPe > 30) { factors.push({ metric: "Forward P/E", points: -2, reasoning: "Expensive relative to near-term earnings.", dataValue: fmtNum(data.forwardPe) }); score -= 2; }
  }

  if (data.pegRatio !== undefined) {
    if (data.pegRatio < 1) { factors.push({ metric: "PEG Ratio", points: +2, reasoning: "Undervalued relative to growth (<1).", dataValue: fmtNum(data.pegRatio) }); score += 2; }
    else if (data.pegRatio > 2) { factors.push({ metric: "PEG Ratio", points: -2, reasoning: "Overvalued relative to growth (>2).", dataValue: fmtNum(data.pegRatio) }); score -= 2; }
  }

  if (data.priceToBook !== undefined) {
    if (data.priceToBook < 1) { factors.push({ metric: "P/B Ratio", points: +2, reasoning: "Trading below book value.", dataValue: fmtNum(data.priceToBook) }); score += 2; }
    else if (data.priceToBook > 5) { factors.push({ metric: "P/B Ratio", points: -1, reasoning: "High premium to book value.", dataValue: fmtNum(data.priceToBook) }); score -= 1; }
  }

  if (factors.length === 0) {
    factors.push({ metric: "Valuation Data", points: 0, reasoning: "Valuation multiples could not be retrieved." });
  }

  const clampedScore = Math.max(1, Math.min(10, score));
  return {
    score: clampedScore,
    maxScore: 10,
    factors,
    summary: `Valuation scored ${clampedScore}/10 using deterministic multiple analysis.`
  };
}

export function calculateTechnicalScore(data: QuantitativeData): AgentOutput {
  const factors: ScoreFactor[] = [];
  let score = 5;

  if (data.price !== undefined && data.fiftyDayAverage !== undefined && data.twoHundredDayAverage !== undefined) {
    // Trend analysis
    if (data.price > data.fiftyDayAverage && data.fiftyDayAverage > data.twoHundredDayAverage) {
      factors.push({ metric: "Moving Averages", points: +3, reasoning: "Strong bullish trend (Price > 50 DMA > 200 DMA).", dataValue: "Bullish" });
      score += 3;
    } else if (data.price < data.fiftyDayAverage && data.fiftyDayAverage < data.twoHundredDayAverage) {
      factors.push({ metric: "Moving Averages", points: -3, reasoning: "Strong bearish trend (Price < 50 DMA < 200 DMA).", dataValue: "Bearish" });
      score -= 3;
    } else if (data.fiftyDayAverage > data.twoHundredDayAverage) {
      factors.push({ metric: "Golden Cross", points: +1, reasoning: "50 DMA is above 200 DMA.", dataValue: "Positive" });
      score += 1;
    } else {
      factors.push({ metric: "Death Cross", points: -1, reasoning: "50 DMA is below 200 DMA.", dataValue: "Negative" });
      score -= 1;
    }
  }

  if (data.price !== undefined && data.fiftyTwoWeekHigh !== undefined && data.fiftyTwoWeekLow !== undefined) {
    const range = data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow;
    if (range > 0) {
      const pos = (data.price - data.fiftyTwoWeekLow) / range;
      if (pos > 0.8) { factors.push({ metric: "52-Wk Range", points: +1, reasoning: "Trading near 52-week highs indicates momentum.", dataValue: "Top 20%" }); score += 1; }
      else if (pos < 0.2) { factors.push({ metric: "52-Wk Range", points: -1, reasoning: "Trading near 52-week lows.", dataValue: "Bottom 20%" }); score -= 1; }
    }
  }

  if (factors.length === 0) {
    factors.push({ metric: "Technical Data", points: 0, reasoning: "Price and moving average data could not be retrieved." });
  }

  const clampedScore = Math.max(1, Math.min(10, score));
  return {
    score: clampedScore,
    maxScore: 10,
    factors,
    summary: `Technical analysis scored ${clampedScore}/10 based on moving averages and price momentum.`
  };
}
