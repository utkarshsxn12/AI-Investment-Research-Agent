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
  
  // Wait for data collection, then fan-out to parallel agents
  .addEdge("researcher", "financialAgent")
  .addEdge("researcher", "valuationAgent")
  .addEdge("researcher", "growthAgent")
  .addEdge("researcher", "moatAgent")
  .addEdge("researcher", "technicalAgent")
  .addEdge("researcher", "sentimentAgent")
  .addEdge("researcher", "riskAgent")
  
  .addEdge("data_fetcher", "financialAgent")
  .addEdge("data_fetcher", "valuationAgent")
  .addEdge("data_fetcher", "growthAgent")
  .addEdge("data_fetcher", "moatAgent")
  .addEdge("data_fetcher", "technicalAgent")
  .addEdge("data_fetcher", "sentimentAgent")
  .addEdge("data_fetcher", "riskAgent")
  
  // Fan-in to the committee
  .addEdge("financialAgent", "committee")
  .addEdge("valuationAgent", "committee")
  .addEdge("growthAgent", "committee")
  .addEdge("moatAgent", "committee")
  .addEdge("technicalAgent", "committee")
  .addEdge("sentimentAgent", "committee")
  .addEdge("riskAgent", "committee")
  
  .addEdge("committee", END);

export const investmentAgent = workflow.compile();
export type InvestmentAgentType = typeof investmentAgent;
