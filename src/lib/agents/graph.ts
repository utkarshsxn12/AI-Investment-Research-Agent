import { StateGraph, START, END } from "@langchain/langgraph";
import { StateAnnotation } from "./state";
import { researchNode, committeeNode } from "./nodes";
import { dataFetcherNode } from "./data-fetcher";
import {
  financialNode,
  valuationNode,
  growthNode,
  moatNode,
  technicalNode,
  sentimentNode,
  riskNode,
} from "./specialized";

// Compile the multi-agent execution graph
const workflow = new StateGraph(StateAnnotation)
  // 1. Data Collection
  .addNode("researcher", researchNode)
  .addNode("data_fetcher", dataFetcherNode)
  
  // 2. Parallel Specialized Agents
  .addNode("financialAgent", financialNode)
  .addNode("valuationAgent", valuationNode)
  .addNode("growthAgent", growthNode)
  .addNode("moatAgent", moatNode)
  .addNode("technicalAgent", technicalNode)
  .addNode("sentimentAgent", sentimentNode)
  .addNode("riskAgent", riskNode)
  
  // 3. Synthesis
  .addNode("committee", committeeNode)
  
  // Set up execution flow
  .addEdge(START, "researcher")
  .addEdge(START, "data_fetcher")
  
  // Wait for data collection, then run fast deterministic agents
  .addEdge("researcher", "financialAgent")
  .addEdge("data_fetcher", "financialAgent")
  
  .addEdge("researcher", "valuationAgent")
  .addEdge("data_fetcher", "valuationAgent")
  
  .addEdge("researcher", "technicalAgent")
  .addEdge("data_fetcher", "technicalAgent")
  
  // Chain LLM Qualitative Agents sequentially to bypass free-tier rate limits beautifully!
  .addEdge("financialAgent", "growthAgent")
  .addEdge("valuationAgent", "growthAgent")
  .addEdge("technicalAgent", "growthAgent")
  
  .addEdge("growthAgent", "moatAgent")
  .addEdge("moatAgent", "sentimentAgent")
  .addEdge("sentimentAgent", "riskAgent")
  .addEdge("riskAgent", "committee")
  
  .addEdge("committee", END);

export const investmentAgent = workflow.compile();
export type InvestmentAgentType = typeof investmentAgent;
