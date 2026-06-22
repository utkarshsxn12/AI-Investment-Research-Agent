import { getLLM } from "./llm";
import { tavilySearch } from "./search";
import { StateAnnotation, AgentLog, InvestmentVerdict } from "./state";

// Helper to clean up Markdown-wrapped JSON response from LLM
function parseVerdictJSON(rawText: string): InvestmentVerdict {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned) as InvestmentVerdict;
  } catch (e) {
    console.error("Failed to parse JSON directly. Attempting regex extract.", e);
    // Fallback parser: Find the first '{' and last '}'
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");
    if (startIndex !== -1 && endIndex !== -1) {
      try {
        const jsonSub = cleaned.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonSub) as InvestmentVerdict;
      } catch (innerError) {
        console.error("Regex extract failed as well:", innerError);
      }
    }
    
    // Hard fallback if everything fails
    return {
      decision: "PASS",
      score: 50,
      reasoning: "Failed to parse investment committee verdict format. Analysis aborted.",
      pros: ["Analysis was performed"],
      cons: ["Committee parsing error"],
      financialHealthScore: 5,
      growthScore: 5,
      valuationScore: 5,
      competitiveMoatScore: 5,
    };
  }
}

// 1. Research Agent Node
export async function researchNode(state: typeof StateAnnotation.State) {
  const company = state.company;
  const timestamp = new Date().toISOString();
  
  console.log(`[Research Agent] Starting web research for: ${company}`);
  
  const query1 = `${company} stock price history financial performance balance sheet`;
  const query2 = `${company} recent news earnings release product launches industry trends`;
  
  // Execute searches in parallel
  const [results1, results2] = await Promise.all([
    tavilySearch(query1),
    tavilySearch(query2)
  ]);
  
  const allResults = [...results1, ...results2];
  
  let researchText = "";
  if (allResults.length === 0) {
    researchText = `No real-time search results found for ${company}. Proceeding with baseline LLM knowledge.`;
  } else {
    researchText = allResults
      .map((r, i) => `Source [${i+1}]: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n---`)
      .join("\n\n");
  }

  const log: AgentLog = {
    agent: "Researcher",
    message: `Completed real-time web research on "${company}" using Tavily Search API. Extracted ${allResults.length} sources.`,
    timestamp,
  };

  return {
    research: researchText,
    logs: [log],
  };
}

// 2. Financial Analyst Agent Node
export async function analystNode(state: typeof StateAnnotation.State) {
  const company = state.company;
  const research = state.research;
  const timestamp = new Date().toISOString();
  
  console.log(`[Financial Analyst] Evaluating financials for: ${company}`);
  
  const llm = getLLM(0);
  const prompt = `You are an elite Wall Street Financial Analyst. Your job is to analyze the financial health, valuation, and fundamental strength of ${company} based on the web research context provided below.
  
Research Context:
${research}

Conduct a rigorous financial analysis. Focus on:
1. Valuation (P/E ratio, P/S ratio, current valuation vs historical/peers).
2. Balance Sheet Strength (Debt-to-equity, cash position, liquidity).
3. Profitability & Growth (Revenue growth rate, net profit margins, operating margins).
4. Shareholder Value (Capital allocation, share buybacks, dividends if applicable).

Provide your analysis in a structured, comprehensive manner.`;

  const response = await llm.invoke(prompt);
  const analysisText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  const log: AgentLog = {
    agent: "Financial Analyst",
    message: `Analyzed fundamental financial metrics, margins, and valuation ratios based on research data.`,
    timestamp,
  };

  return {
    analysis: analysisText,
    logs: [log],
  };
}

// 3. Risk Evaluator Agent Node
export async function riskNode(state: typeof StateAnnotation.State) {
  const company = state.company;
  const research = state.research;
  const analysis = state.analysis;
  const timestamp = new Date().toISOString();
  
  console.log(`[Risk Evaluator] Assessing risks and competitive moat for: ${company}`);
  
  const llm = getLLM(0);
  const prompt = `You are a Risk Assessment Officer and Competitive Moat Expert. Your job is to evaluate the risks and competitive advantages (moat) of ${company} based on the research context and financial analysis below.

Research Context:
${research}

Financial Analysis:
${analysis}

Evaluate:
1. Competitive Moat: Does the company have pricing power, high switching costs, network effects, brand equity, or cost advantages? (Evaluate strength).
2. Operational & Market Risks: Competitor actions, regulatory headwinds, supply chain vulnerabilities, or dependency on key clients/technologies.
3. Macroeconomic Risks: Interest rate sensitivities, geopolitical exposures, inflation impact.

Provide a detailed risk and moat assessment.`;

  const response = await llm.invoke(prompt);
  const riskText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  const log: AgentLog = {
    agent: "Risk Evaluator",
    message: `Completed competitive moat analysis (Porter's Five Forces) and mapped market/macro risk factors.`,
    timestamp,
  };

  return {
    risks: riskText,
    logs: [log],
  };
}

// 4. Investment Committee Agent Node
export async function committeeNode(state: typeof StateAnnotation.State) {
  const company = state.company;
  const research = state.research;
  const analysis = state.analysis;
  const risks = state.risks;
  const timestamp = new Date().toISOString();
  
  console.log(`[Investment Committee] Convening for final decision on: ${company}`);
  
  const llm = getLLM(0);
  const prompt = `You are the Chairman of the Investment Committee. Your task is to review the complete research, financial analysis, and risk assessment for ${company}, and issue a final decision: whether to INVEST or PASS.

Research Context:
${research}

Financial Analysis:
${analysis}

Risk & Moat Assessment:
${risks}

Synthesize these inputs. You must return your final decision ONLY as a valid JSON object matching the schema below. Do not add any extra explanations or wrapping outside the JSON.

Expected JSON Schema:
{
  "decision": "INVEST" or "PASS",
  "score": number, // Overall rating from 0 (strong pass) to 100 (strong invest)
  "reasoning": "A concise paragraph summarizing the committee's final consensus decision and core thesis.",
  "pros": ["Key pro 1", "Key pro 2", "Key pro 3"],
  "cons": ["Key con 1", "Key con 2", "Key con 3"],
  "financialHealthScore": number, // rating from 1 (poor) to 10 (excellent)
  "growthScore": number, // rating from 1 (poor) to 10 (excellent)
  "valuationScore": number, // rating from 1 (extremely overvalued) to 10 (extremely cheap/undervalued)
  "competitiveMoatScore": number // rating from 1 (no moat) to 10 (wide moat)
}

Output ONLY the JSON object. Do not include markdown code block syntax (like \`\`\`json).`;

  const response = await llm.invoke(prompt);
  const responseText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  
  const verdict = parseVerdictJSON(responseText);

  const log: AgentLog = {
    agent: "Investment Committee",
    message: `Convened committee. Voted to "${verdict.decision}" with consensus score of ${verdict.score}/100.`,
    timestamp,
  };

  return {
    verdict,
    logs: [log],
  };
}
