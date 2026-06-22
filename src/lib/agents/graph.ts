import { StateGraph, START, END } from "@langchain/langgraph";
import { StateAnnotation } from "./state";
import { researchNode, analystNode, riskNode, committeeNode } from "./nodes";

// Compile the multi-agent execution graph
const workflow = new StateGraph(StateAnnotation)
  .addNode("researcher", researchNode)
  .addNode("analyst", analystNode)
  .addNode("risk_evaluator", riskNode)
  .addNode("committee", committeeNode)
  
  // Set up sequential relationships
  .addEdge(START, "researcher")
  .addEdge("researcher", "analyst")
  .addEdge("analyst", "risk_evaluator")
  .addEdge("risk_evaluator", "committee")
  .addEdge("committee", END);

export const investmentAgent = workflow.compile();
export type InvestmentAgentType = typeof investmentAgent;
