import { Annotation } from "@langchain/langgraph";

export interface AgentLog {
  agent: string;
  message: string;
  timestamp: string;
}

export interface InvestmentVerdict {
  decision: "INVEST" | "PASS";
  score: number; // 0 to 100
  reasoning: string;
  pros: string[];
  cons: string[];
  financialHealthScore: number; // 1 to 10
  growthScore: number; // 1 to 10
  valuationScore: number; // 1 to 10
  competitiveMoatScore: number; // 1 to 10
  riskLevel: "Low" | "Medium" | "High";
}

export interface InvestmentState {
  company: string;
  research: string;
  analysis: string;
  risks: string;
  verdict: InvestmentVerdict | null;
  logs: AgentLog[];
}

export const StateAnnotation = Annotation.Root({
  company: Annotation<string>(),
  research: Annotation<string>({
    reducer: (a, b) => b ?? a ?? "",
    default: () => "",
  }),
  analysis: Annotation<string>({
    reducer: (a, b) => b ?? a ?? "",
    default: () => "",
  }),
  risks: Annotation<string>({
    reducer: (a, b) => b ?? a ?? "",
    default: () => "",
  }),
  verdict: Annotation<InvestmentVerdict | null>({
    reducer: (a, b) => b ?? a ?? null,
    default: () => null,
  }),
  logs: Annotation<AgentLog[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});
