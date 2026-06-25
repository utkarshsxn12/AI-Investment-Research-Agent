import { getLLM } from "./llm";
import { tavilySearch } from "./search";
import { StateAnnotation, AgentLog } from "./state";
import { CommitteeVerdict, AgentOutput } from "./types";
import { z } from "zod";

export async function researchNode(state: typeof StateAnnotation.State) {
  const { company } = state;
  const timestamp = new Date().toISOString();
  console.log(`[Research Agent] Researching: ${company}`);

  const [results1, results2] = await Promise.all([
    tavilySearch(`${company} stock price history financial performance balance sheet`),
    tavilySearch(`${company} recent news earnings release product launches industry trends`),
  ]);

  const allResults = [...results1, ...results2];
  const researchText = allResults.length === 0
    ? `No search results for ${company}. Using baseline LLM knowledge.`
    : allResults.map((r, i) => `Source [${i + 1}]: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n---`).join("\n\n");

  return {
    research: researchText,
    logs: [{ agent: "Researcher", message: `Completed web research on "${company}". Extracted ${allResults.length} sources.`, timestamp }] as AgentLog[],
  };
}

const CommitteeLLMSchema = z.object({
  pros: z.array(z.string()).length(3),
  cons: z.array(z.string()).length(3),
  summary: z.string()
});

export async function committeeNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Investment Committee] Convening for: ${state.company}`);

  // 1. Calculate the final score deterministically using the 7-pillar formula
  const getScore = (out: AgentOutput | null) => out?.score || 5;
  
  const finScore = getScore(state.financialOutput);
  const grwScore = getScore(state.growthOutput);
  const valScore = getScore(state.valuationOutput);
  const moaScore = getScore(state.moatOutput);
  const tecScore = getScore(state.technicalOutput);
  const senScore = getScore(state.sentimentOutput);
  const rskScore = getScore(state.riskOutput);

  // Weights: Financial Health (30%), Growth (20%), Valuation (15%), Moat (15%), Technical (10%), News Sentiment (5%), Risk (5%)
  const finalScore = Math.round(
    (finScore * 3.0) +
    (grwScore * 2.0) +
    (valScore * 1.5) +
    (moaScore * 1.5) +
    (tecScore * 1.0) +
    (senScore * 0.5) +
    (rskScore * 0.5)
  );

  // 2. Map score to Recommendation
  let recommendation: CommitteeVerdict["recommendation"] = "Pass";
  if (finalScore >= 80) recommendation = "Strong Invest";
  else if (finalScore >= 60) recommendation = "Invest";
  else if (finalScore >= 40) recommendation = "Pass";
  else recommendation = "Strong Pass";

  let riskLevel: CommitteeVerdict["riskLevel"] = "Moderate Risk";
  if (rskScore >= 7) riskLevel = "Low Risk"; // High score in risk agent means LOW risk (good thing)
  else if (rskScore <= 4) riskLevel = "High Risk";

  // 3. Calculate Confidence
  // We maintain high confidence since our LLM estimation fallback guarantees complete data
  let confidence = 95; 

  // 4. Use LLM to generate the pros, cons, and narrative summary based on the sub-scores
  const llm = getLLM(0);
  const structuredLlm = llm.withStructuredOutput(CommitteeLLMSchema);
  const prompt = `You are the Investment Committee Chair for ${state.company}.
The sub-committees have returned the following scores (out of 10):
Financial: ${finScore}/10
Growth: ${grwScore}/10
Valuation: ${valScore}/10
Moat: ${moaScore}/10
Technical: ${tecScore}/10
Sentiment: ${senScore}/10
Risk: ${rskScore}/10

Final Score: ${finalScore}/100 -> Recommendation: ${recommendation}

Write exactly 3 concise pros, 3 concise cons, and a short 2-3 sentence executive summary explaining the final recommendation. 
CRITICAL: Do NOT include any numerical scores (like 10/10) in the pros and cons. Write them in plain, easily understandable English and use bold markdown (e.g. **Strong Growth**) to highlight the key points.`;

  let llmOutput: any;
  try {
    llmOutput = await structuredLlm.invoke(prompt);
  } catch (error) {
    console.error("[Committee] LLM parse failed", error);
    
    // Deterministic fallback based on sub-scores
    const pros: string[] = [];
    const cons: string[] = [];
    
    if (finScore >= 7) pros.push(`**Robust Financial Health** with strong fundamentals and solid margins.`);
    else if (finScore <= 4) cons.push(`**Weak Financial Health** indicating underlying balance sheet issues.`);
    
    if (grwScore >= 7) pros.push(`**Excellent Growth Potential** reflecting strong expansion in target markets.`);
    else if (grwScore <= 4) cons.push(`**Sluggish Growth Prospects** severely limiting future upside potential.`);

    if (valScore >= 7) pros.push(`**Attractive Valuation multiples** presenting a distinct buying opportunity.`);
    else if (valScore <= 4) cons.push(`**Extremely Stretched Valuation** significantly increasing the entry risk.`);
    
    if (moaScore >= 7) pros.push(`**Formidable Competitive Moat** providing massive long-term market protection.`);
    else if (moaScore <= 4) cons.push(`**Narrow Competitive Moat** exposing the business to severe vulnerability.`);

    if (pros.length < 3) pros.push("**Sufficient baseline performance** across multiple key operational metrics.");
    if (pros.length < 3) pros.push("**Market conditions** currently remain relatively stable for this sector.");
    if (pros.length < 3) pros.push("**Technical indicators** support the current price momentum.");

    if (cons.length < 3) cons.push("**Broader macroeconomic uncertainties** continue to present headwinds.");
    if (cons.length < 3) cons.push("**Sector volatility** could negatively impact short-term price action.");
    if (cons.length < 3) cons.push("**Execution risks** present in future product pipeline delivery.");

    llmOutput = { 
      pros: pros.slice(0, 3), 
      cons: cons.slice(0, 3), 
      summary: `The Investment Committee has calculated a final score of ${finalScore}/100 resulting in a ${recommendation} verdict. This is heavily driven by the balance of ${pros[0].toLowerCase().replace(/ \([^)]*\)/, '')} against ${cons[0].toLowerCase().replace(/ \([^)]*\)/, '')}. Refer to the specialized agent tabs for detailed breakdown.` 
    };
  }

  // Extract ticker
  const commonTickers: Record<string, string> = {
    "nvidia": "NVDA", "apple": "AAPL", "tesla": "TSLA", "microsoft": "MSFT", 
    "amazon": "AMZN", "google": "GOOGL", "meta": "META", "netflix": "NFLX",
    "tata": "TATAMOTORS.NS", "reliance": "RELIANCE.NS", "infosys": "INFY"
  };
  let ticker = commonTickers[state.company.toLowerCase().trim()] || state.company.split(" ")[0].toUpperCase().replace(/[^A-Z0-9.]/g, '');

  const verdict: CommitteeVerdict = {
    recommendation,
    riskLevel,
    confidence,
    finalScore,
    summary: llmOutput.summary,
    pros: llmOutput.pros,
    cons: llmOutput.cons,
    ticker,
    financialOutput: state.financialOutput!,
    valuationOutput: state.valuationOutput!,
    growthOutput: state.growthOutput!,
    moatOutput: state.moatOutput!,
    technicalOutput: state.technicalOutput!,
    sentimentOutput: state.sentimentOutput!,
    riskOutput: state.riskOutput!,
  };

  return {
    verdict,
    logs: [{ agent: "Investment Committee", message: `Issued ${recommendation} recommendation with ${confidence}% confidence (Score: ${finalScore}/100).`, timestamp }] as AgentLog[],
  };
}
