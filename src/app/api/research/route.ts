import { NextRequest } from "next/server";
import { investmentAgent } from "@/lib/agents/graph";
import { CommitteeVerdict } from "@/lib/agents/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Prevent Vercel Hobby 10s timeout

// ── In-memory result cache ──────────────────────────────────────────────────
// Keyed by normalized company name. Stores the full result so repeat searches
// for the same company always return the identical scores & verdict.
interface CachedResult {
  events: string[];   // pre-serialised SSE data strings
  cachedAt: number;   // timestamp ms
}
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const resultCache = new Map<string, CachedResult>();

function normKey(company: string) {
  return company.trim().toLowerCase();
}
// ───────────────────────────────────────────────────────────────────────────

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
    const key = normKey(company);

    // ── Serve from cache if fresh ────────────────────────────────────────────
    const cached = resultCache.get(key);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      console.log(`[Cache HIT] Serving cached result for "${company}"`);
      const stream = new ReadableStream({
        async start(controller) {
          for (const eventStr of cached.events) {
            controller.enqueue(encoder.encode(eventStr));
            // Small delay so the frontend stepper animates naturally
            await new Promise((r) => setTimeout(r, 120));
          }
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    // Fresh run — collect events while streaming them live
    const collectedEvents: string[] = [];

    let isClosed = false;
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (eventStr: string) => {
          if (!isClosed) {
            controller.enqueue(encoder.encode(eventStr));
            collectedEvents.push(eventStr);
          }
        };

        try {
          enqueue(`data: ${JSON.stringify({ event: "start", message: `Initiating research for ${company}...` })}\n\n`);

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

            const latestLog = nodeOutput.logs && nodeOutput.logs.length > 0
              ? nodeOutput.logs[nodeOutput.logs.length - 1]
              : null;

            enqueue(`data: ${JSON.stringify({
              event: "update",
              node: nodeName,
              log: latestLog,
              verdict: nodeOutput.verdict || null,
              research: nodeOutput.research || null,
              // Send the specific agent output if present in this chunk
              financialOutput: nodeOutput.financialOutput || null,
              valuationOutput: nodeOutput.valuationOutput || null,
              growthOutput: nodeOutput.growthOutput || null,
              moatOutput: nodeOutput.moatOutput || null,
              technicalOutput: nodeOutput.technicalOutput || null,
              sentimentOutput: nodeOutput.sentimentOutput || null,
              riskOutput: nodeOutput.riskOutput || null,
              financialData: nodeOutput.financialData || null,
            })}\n\n`);
          }

          enqueue(`data: ${JSON.stringify({ event: "complete" })}\n\n`);

          // Save to cache only after a successful complete run
          resultCache.set(key, { events: collectedEvents, cachedAt: Date.now() });
          console.log(`[Cache SET] Cached result for "${company}" (${collectedEvents.length} events)`);

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
          try { controller.close(); } catch (e) { /* ignore */ }
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

