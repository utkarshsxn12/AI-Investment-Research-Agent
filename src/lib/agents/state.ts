import { Annotation } from "@langchain/langgraph";
import { AgentOutput, CommitteeVerdict, QuantitativeData } from "./types";

export interface AgentLog {
  agent: string;
  message: string;
  timestamp: string;
}

export interface InvestmentState {
  company: string;
  research: string;
  financialData: QuantitativeData | null;
  
  // Agent Outputs
  financialOutput: AgentOutput | null;
  valuationOutput: AgentOutput | null;
  growthOutput: AgentOutput | null;
  moatOutput: AgentOutput | null;
  technicalOutput: AgentOutput | null;
  sentimentOutput: AgentOutput | null;
  riskOutput: AgentOutput | null;
  
  verdict: CommitteeVerdict | null;
  logs: AgentLog[];
}

export const StateAnnotation = Annotation.Root({
  company: Annotation<string>(),
  research: Annotation<string>({
    reducer: (a, b) => b ?? a ?? "",
    default: () => "",
  }),
  financialData: Annotation<QuantitativeData | null>({
    reducer: (a, b) => b ?? a ?? null,
    default: () => null,
  }),
  
  financialOutput: Annotation<AgentOutput | null>({ reducer: (a, b) => b ?? a ?? null, default: () => null }),
  valuationOutput: Annotation<AgentOutput | null>({ reducer: (a, b) => b ?? a ?? null, default: () => null }),
  growthOutput: Annotation<AgentOutput | null>({ reducer: (a, b) => b ?? a ?? null, default: () => null }),
  moatOutput: Annotation<AgentOutput | null>({ reducer: (a, b) => b ?? a ?? null, default: () => null }),
  technicalOutput: Annotation<AgentOutput | null>({ reducer: (a, b) => b ?? a ?? null, default: () => null }),
  sentimentOutput: Annotation<AgentOutput | null>({ reducer: (a, b) => b ?? a ?? null, default: () => null }),
  riskOutput: Annotation<AgentOutput | null>({ reducer: (a, b) => b ?? a ?? null, default: () => null }),
  verdict: Annotation<CommitteeVerdict | null>({
    reducer: (a, b) => b ?? a ?? null,
    default: () => null,
  }),
  logs: Annotation<AgentLog[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});
