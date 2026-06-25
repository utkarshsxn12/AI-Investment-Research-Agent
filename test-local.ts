// Test script

import { investmentAgent } from "./src/lib/agents/graph";

async function test() {
  console.log("Starting local test for Apple...");
  try {
    const eventStream = await investmentAgent.stream(
      { company: "Apple" },
      { streamMode: "updates" }
    );
    
    for await (const chunk of eventStream) {
      const nodeName = Object.keys(chunk)[0];
      const nodeOutput = (chunk as any)[nodeName];
      console.log(`\n--- Completed Node: ${nodeName} ---`);
      if (nodeOutput.logs) {
        console.log(nodeOutput.logs[nodeOutput.logs.length - 1].message);
      }
      
      if (nodeName === "financialAgent") {
         console.log(JSON.stringify(nodeOutput.financialOutput, null, 2));
      }
      if (nodeName === "data_fetcher") {
         console.log("Financial Data Extracted:", !!nodeOutput.financialData);
         if (nodeOutput.financialData?.missingMetrics?.length > 0) {
           console.log("WARNING MISSING METRICS:", nodeOutput.financialData.missingMetrics);
         }
      }
    }
    console.log("\nTest Finished successfully.");
  } catch (error) {
    console.error("Test crashed with error:", error);
  }
}

test();
