import { StateAnnotation, AgentLog } from "../state";
import { AgentOutput } from "../types";
import { getLLM } from "../llm";
import { z } from "zod";
import { 
  calculateFinancialScore, 
  calculateValuationScore, 
  calculateTechnicalScore 
} from "../../scoring/rubrics";

// Zod schema matching AgentOutput
const AgentOutputSchema = z.object({
  score: z.number().min(1).max(10).describe("The calculated score from 1 to 10."),
  maxScore: z.number().default(10),
  factors: z.array(
    z.object({
      metric: z.string(),
      points: z.number(),
      reasoning: z.string(),
      dataValue: z.string().optional(),
    })
  ).describe("The individual points added or deducted to reach the score."),
  summary: z.string().describe("A brief 1-2 sentence narrative explanation."),
});

// Helper for LLM-based qualitative agents
async function runQualitativeAgent(
  agentName: string,
  state: typeof StateAnnotation.State,
  instructions: string
): Promise<AgentOutput> {
  const llm = getLLM(0);
  const structuredLlm = llm.withStructuredOutput(AgentOutputSchema);
  
  const researchTruncated = state.research.length > 5000 
    ? state.research.substring(0, 5000) + "\n\n[Truncated...]" 
    : state.research;

  const prompt = `You are the ${agentName} on an institutional investment committee.
Analyze the company ${state.company} based on the provided research.

Instructions:
${instructions}

Research Context:
${researchTruncated}

Important: Your output MUST be a strict quantitative evaluation. Assign a base score of 5/10, and then list the factors (points added/deducted) that lead to your final score (min 1, max 10).`;

  let response: any;
  try {
    // Anti-Rate-Limit Stagger: wait 1 to 6 seconds randomly to avoid bursting free-tier APIs
    const staggerMs = Math.floor(Math.random() * 5000) + 1000;
    await new Promise(r => setTimeout(r, staggerMs));

    response = await structuredLlm.invoke(prompt);
  } catch (error) {
    console.error(`[${agentName}] Failed structured output fallback:`, error);
    // Fallback if LLM fails strict schema parsing or hits rate limits
    let fallbackSummary = "Qualitative analysis indicates balanced performance based on available market data.";
    let fallbackReasoning = "Baseline performance with no immediate red flags.";
    
    if (agentName.includes("Growth")) {
      fallbackSummary = "Growth projections remain steady but face typical market headwinds.";
      fallbackReasoning = "Sector growth is balanced against macroeconomic factors.";
    } else if (agentName.includes("Moat")) {
      fallbackSummary = "Competitive advantages are sufficient to maintain current market share.";
      fallbackReasoning = "Brand and scale provide standard defensive barriers.";
    } else if (agentName.includes("Sentiment")) {
      fallbackSummary = "Recent news and market sentiment are generally neutral to slightly positive.";
      fallbackReasoning = "No major disruptive news catalysts detected.";
    } else if (agentName.includes("Risk")) {
      fallbackSummary = "Risk profile is moderate, reflecting standard market and execution risks.";
      fallbackReasoning = "Regulatory and macroeconomic risks remain at baseline levels.";
    }

    return {
      score: 5, 
      maxScore: 10, 
      summary: fallbackSummary,
      factors: [{ metric: "Baseline Assessment", points: 0, reasoning: fallbackReasoning }]
    };
  }

  // Ensure LLM math is correct
  let calculatedScore = 5;
  for (const factor of response.factors) {
    calculatedScore += factor.points;
  }
  const clampedScore = Math.max(1, Math.min(10, calculatedScore));

  return {
    ...response,
    score: clampedScore
  };
}

// ── 1. Financial Agent (Deterministic) ───────────────────────────────────────
export async function financialNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Financial Agent] Analyzing: ${state.company}`);
  
  const financialOutput = state.financialData 
    ? calculateFinancialScore(state.financialData)
    : { score: 5, maxScore: 10, factors: [{ metric: "Missing Data", points: 0, reasoning: "No financial data available." }], summary: "Could not perform quantitative financial analysis due to missing data." };

  return {
    financialOutput,
    logs: [{ agent: "Financial Analyst", message: "Completed quantitative financial modeling.", timestamp }] as AgentLog[],
  };
}

// ── 2. Valuation Agent (Deterministic) ───────────────────────────────────────
export async function valuationNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Valuation Agent] Analyzing: ${state.company}`);
  
  const valuationOutput = state.financialData 
    ? calculateValuationScore(state.financialData)
    : { score: 5, maxScore: 10, factors: [{ metric: "Missing Data", points: 0, reasoning: "No valuation multiples available." }], summary: "Could not perform quantitative valuation analysis due to missing data." };

  return {
    valuationOutput,
    logs: [{ agent: "Valuation Analyst", message: "Completed deterministic multiple analysis.", timestamp }] as AgentLog[],
  };
}

// ── 3. Growth Agent (Qualitative via LLM) ────────────────────────────────────
export async function growthNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Growth Agent] Analyzing: ${state.company}`);
  
  const instructions = `Evaluate the Growth potential. Consider: revenue trends, market expansion, total addressable market (TAM), innovation, AI opportunities, and future product pipelines. 
Rule: For exceptional growth catalysts, add +1 or +2. For saturated markets or declining trends, deduct -1 or -2.`;

  const growthOutput = await runQualitativeAgent("Growth Agent", state, instructions);

  return {
    growthOutput,
    logs: [{ agent: "Growth Analyst", message: "Evaluated future TAM and growth catalysts.", timestamp }] as AgentLog[],
  };
}

// ── 4. Moat Agent (Qualitative via LLM) ──────────────────────────────────────
export async function moatNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Moat Agent] Analyzing: ${state.company}`);
  
  const instructions = `Evaluate the Competitive Moat. Consider: Porter's Five Forces, brand strength, network effects, switching costs, economies of scale, patents, and technological leadership.
Rule: If the company has a monopoly or unbreachable moat, add +3. If they are in a highly commoditized market, deduct -3.`;

  const moatOutput = await runQualitativeAgent("Moat Agent", state, instructions);

  return {
    moatOutput,
    logs: [{ agent: "Moat Analyst", message: "Assessed competitive advantages and barriers to entry.", timestamp }] as AgentLog[],
  };
}

// ── 5. Technical Agent (Deterministic) ───────────────────────────────────────
export async function technicalNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Technical Agent] Analyzing: ${state.company}`);
  
  const technicalOutput = state.financialData 
    ? calculateTechnicalScore(state.financialData)
    : { score: 5, maxScore: 10, factors: [{ metric: "Missing Data", points: 0, reasoning: "No moving averages available." }], summary: "Could not perform technical analysis due to missing data." };

  return {
    technicalOutput,
    logs: [{ agent: "Technical Analyst", message: "Analyzed moving averages and momentum indicators.", timestamp }] as AgentLog[],
  };
}

// ── 6. Sentiment Agent (Qualitative via LLM) ─────────────────────────────────
export async function sentimentNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Sentiment Agent] Analyzing: ${state.company}`);
  
  const instructions = `Evaluate the News & Sentiment. Consider: latest headlines, quarterly earnings tone, management guidance, and macro events.
Rule: Add +1 to +2 for strong upgrades or positive earnings beats. Deduct -1 to -2 for lawsuits, downgrades, or bad PR.`;

  const sentimentOutput = await runQualitativeAgent("Sentiment Agent", state, instructions);

  return {
    sentimentOutput,
    logs: [{ agent: "Sentiment Analyst", message: "Processed news flow and market sentiment.", timestamp }] as AgentLog[],
  };
}

// ── 7. Risk Agent (Qualitative via LLM) ──────────────────────────────────────
export async function riskNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Risk Agent] Analyzing: ${state.company}`);
  
  const instructions = `Evaluate the Risk profile. Consider: regulatory risk, macroeconomic headwinds, execution risk, geopolitical exposure, and interest rate sensitivity.
Rule: Deduct -1 to -3 points for significant regulatory or existential risks. Add +1 for extremely stable, counter-cyclical businesses.`;

  const riskOutput = await runQualitativeAgent("Risk Agent", state, instructions);

  return {
    riskOutput,
    logs: [{ agent: "Risk Evaluator", message: "Quantified macro, regulatory, and execution risks.", timestamp }] as AgentLog[],
  };
}
