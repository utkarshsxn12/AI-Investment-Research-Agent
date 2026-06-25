export interface ScoreFactor {
  metric: string;
  points: number;
  reasoning: string;
  dataValue?: string | number; // e.g. "18.5%" or 1.2
}

export interface AgentOutput {
  score: number;       // The calculated score (e.g. 8)
  maxScore: number;    // Maximum possible score (e.g. 10)
  factors: ScoreFactor[]; // List of points added/deducted
  summary: string;     // Brief narrative explanation
}

export interface QuantitativeData {
  price?: number;
  marketCap?: number;
  peRatio?: number;
  forwardPe?: number;
  pegRatio?: number;
  priceToSales?: number;
  priceToBook?: number;
  evToEbitda?: number;
  
  revenueGrowth?: number;
  earningsGrowth?: number;
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  roe?: number;
  roa?: number;
  
  currentRatio?: number;
  debtToEquity?: number;
  freeCashflow?: number;
  operatingCashflow?: number;
  
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  
  beta?: number;
  shortPercentOfFloat?: number;
  
  // To flag what couldn't be fetched
  missingMetrics: string[];
}

export interface CommitteeVerdict {
  recommendation: "Strong Invest" | "Invest" | "Pass" | "Strong Pass";
  riskLevel: "Low Risk" | "Moderate Risk" | "High Risk";
  confidence: number; // 0-100%
  finalScore: number; // 0-100
  summary: string;
  pros: string[];
  cons: string[];
  ticker: string;
  
  // Breakdown
  financialOutput: AgentOutput;
  valuationOutput: AgentOutput;
  growthOutput: AgentOutput;
  moatOutput: AgentOutput;
  technicalOutput: AgentOutput;
  sentimentOutput: AgentOutput;
  riskOutput: AgentOutput;
}
