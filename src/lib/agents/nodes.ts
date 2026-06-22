import { getLLM } from "./llm";
import { tavilySearch } from "./search";
import { StateAnnotation, AgentLog, InvestmentVerdict } from "./state";

function parseVerdictJSON(rawText: string): InvestmentVerdict {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned) as InvestmentVerdict;
  } catch {
    const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
    if (s !== -1 && e !== -1) {
      try { return JSON.parse(cleaned.substring(s, e + 1)) as InvestmentVerdict; } catch {}
    }
    return {
      decision: "PASS", score: 50,
      reasoning: "Failed to parse verdict. Please retry.",
      pros: ["Analysis completed"], cons: ["Parsing error"],
      financialHealthScore: 5, growthScore: 5, valuationScore: 5,
      competitiveMoatScore: 5, riskLevel: "Medium"
    };
  }
}

interface ConsolidatedAnalysis {
  financialAnalysis: string;
  riskAssessment: string;
  verdict: InvestmentVerdict;
}

function parseConsolidatedJSON(rawText: string): ConsolidatedAnalysis {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned) as ConsolidatedAnalysis;
  } catch {
    const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
    if (s !== -1 && e !== -1) {
      try { return JSON.parse(cleaned.substring(s, e + 1)) as ConsolidatedAnalysis; } catch {}
    }
    return {
      financialAnalysis: "Could not parse financial analysis. Please retry.",
      riskAssessment: "Could not parse risk assessment. Please retry.",
      verdict: {
        decision: "PASS", score: 50,
        reasoning: "Failed to parse consolidated verdict. Please retry.",
        pros: ["Research completed"], cons: ["Parsing error"],
        financialHealthScore: 5, growthScore: 5, valuationScore: 5,
        competitiveMoatScore: 5, riskLevel: "Medium"
      }
    };
  }
}

// Retries LLM calls on 429 rate-limit errors with exponential backoff
async function invokeWithRetry(llm: any, prompt: string, retries = 5, delayMs = 3000): Promise<any> {
  let lastError = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await llm.invoke(prompt);
    } catch (error: any) {
      lastError = error;
      const isRateLimit = (error.message || "").includes("429") || (error.message || "").toLowerCase().includes("quota");
      if (isRateLimit && i < retries - 1) {
        let waitMs = delayMs;
        const retryInfo = error.errorDetails?.find((d: any) => d?.retryDelay);
        if (retryInfo?.retryDelay) {
          const s = parseFloat(retryInfo.retryDelay);
          if (!isNaN(s)) waitMs = Math.ceil(s * 1000) + 1500;
        }
        console.warn(`[Rate Limit] Retrying in ${waitMs / 1000}s (attempt ${i + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, waitMs));
        delayMs *= 1.5;
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

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

export async function analystNode(state: typeof StateAnnotation.State) {
  const { company, research } = state;
  const timestamp = new Date().toISOString();
  console.log(`[Financial Analyst] Analyzing: ${company}`);

  const llm = getLLM(0);
  const researchTruncated = research.length > 6000 ? research.substring(0, 6000) + "\n\n[Truncated...]" : research;

  const prompt = `You are a team of elite Wall Street financial experts, risk officers, and investment committee chairs.
Conduct a full financial, risk, and investment policy review for ${company} using the research below.

Research Context:
${researchTruncated}

Return ONLY a valid JSON object (no markdown, no extra text) with this exact schema:
{
  "financialAnalysis": "Detailed markdown: business overview, valuation (P/E, P/S), balance sheet, profitability & growth, shareholder value.",
  "riskAssessment": "Detailed markdown: competitive moat, operational & market risks, macroeconomic risks.",
  "verdict": {
    "decision": "INVEST" or "PASS",
    "score": number,
    "reasoning": "Concise committee thesis paragraph.",
    "pros": ["pro 1", "pro 2", "pro 3"],
    "cons": ["con 1", "con 2", "con 3"],
    "financialHealthScore": number,
    "growthScore": number,
    "valuationScore": number,
    "competitiveMoatScore": number,
    "riskLevel": "Low" or "Medium" or "High"
  }
}`;

  const response = await invokeWithRetry(llm, prompt);
  const responseText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  const consolidated = parseConsolidatedJSON(responseText);

  return {
    analysis: consolidated.financialAnalysis,
    risks: consolidated.riskAssessment,
    verdict: consolidated.verdict,
    logs: [{ agent: "Financial Analyst", message: `Analyzed financials, valuation, and risk metrics for ${company}.`, timestamp }] as AgentLog[],
  };
}

export async function riskNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Risk Evaluator] Processing: ${state.company}`);
  await new Promise((r) => setTimeout(r, 800));

  let risksText = state.risks;
  if (!risksText) {
    const llm = getLLM(0);
    const response = await invokeWithRetry(llm,
      `Evaluate risks and competitive moat of ${state.company}. Research: ${state.research} Analysis: ${state.analysis}`
    );
    risksText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  }

  return {
    risks: risksText,
    logs: [{ agent: "Risk Evaluator", message: `Completed moat analysis and risk mapping for ${state.company}.`, timestamp }] as AgentLog[],
  };
}

export async function committeeNode(state: typeof StateAnnotation.State) {
  const timestamp = new Date().toISOString();
  console.log(`[Investment Committee] Convening for: ${state.company}`);
  await new Promise((r) => setTimeout(r, 800));

  let verdict = state.verdict;
  if (!verdict) {
    const llm = getLLM(0);
    const response = await invokeWithRetry(llm,
      `Issue INVEST or PASS verdict for ${state.company} as JSON only. Research: ${state.research} Analysis: ${state.analysis} Risks: ${state.risks}`
    );
    verdict = parseVerdictJSON(typeof response.content === "string" ? response.content : JSON.stringify(response.content));
  }

  return {
    verdict,
    logs: [{ agent: "Investment Committee", message: `Voted "${verdict.decision}" with score ${verdict.score}/100.`, timestamp }] as AgentLog[],
  };
}
