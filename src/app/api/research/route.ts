import { NextRequest } from "next/server";
import { investmentAgent } from "@/lib/agents/graph";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { company } = await req.json();
    if (!company) {
      return new Response(JSON.stringify({ error: "Company name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    let isClosed = false;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial message
          if (!isClosed) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ event: "start", message: `Initiating research for ${company}...` })}\n\n`
              )
            );
          }

          // We invoke the agent stream which yields node name outputs sequentially
          const eventStream = await investmentAgent.stream(
            { company },
            { streamMode: "updates" }
          );

          for await (const chunk of eventStream) {
            if (isClosed) {
              console.log("Client disconnected, aborting SSE event stream.");
              break;
            }
            const nodeName = Object.keys(chunk)[0];
            const nodeOutput = (chunk as any)[nodeName];
            
            // Extract latest log entry
            const latestLog = nodeOutput.logs && nodeOutput.logs.length > 0 
              ? nodeOutput.logs[nodeOutput.logs.length - 1] 
              : null;

            // Stream state update
            if (!isClosed) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    event: "update",
                    node: nodeName,
                    log: latestLog,
                    verdict: nodeName === "committee" ? nodeOutput.verdict : null,
                    analysis: nodeName === "analyst" ? nodeOutput.analysis : null,
                    risks: nodeName === "risk_evaluator" ? nodeOutput.risks : null,
                    research: nodeName === "researcher" ? nodeOutput.research : null,
                  })}\n\n`
                )
              );
            }
          }

          // Send compilation end message
          if (!isClosed) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ event: "complete" })}\n\n`)
            );
          }
        } catch (err: any) {
          console.error("Error in graph execution stream:", err);
          if (!isClosed) {
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ event: "error", error: err.message || "Execution error" })}\n\n`
                )
              );
            } catch (e) {
              // ignore
            }
          }
        } finally {
          isClosed = true;
          try {
            controller.close();
          } catch (e) {
            // ignore
          }
        }
      },
      cancel() {
        isClosed = true;
        console.log("ReadableStream cancelled by client (connection closed).");
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
