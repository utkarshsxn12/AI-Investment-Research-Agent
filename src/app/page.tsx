"use client";

import React, { useState } from "react";
import { AgentLog, InvestmentVerdict } from "@/lib/agents/state";
import AgentStepper from "@/components/AgentStepper";
import ReportViewer from "@/components/ReportViewer";
import { Search, Sparkles, Terminal, AlertTriangle, Download, Github } from "lucide-react";

export default function Home() {
  const [company, setCompany] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [verdict, setVerdict] = useState<InvestmentVerdict | null>(null);
  const [research, setResearch] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [risks, setRisks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;

    // Reset states
    setIsSearching(true);
    setActiveNode(null);
    setLogs([]);
    setVerdict(null);
    setResearch("");
    setAnalysis("");
    setRisks("");
    setError(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company: company.trim() }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to start analysis");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        
        // Save the incomplete line back to buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.substring(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              
              if (data.event === "start") {
                setLogs((prev) => [
                  ...prev,
                  { agent: "System", message: data.message, timestamp: new Date().toISOString() },
                ]);
              } else if (data.event === "update") {
                if (data.node) {
                  setActiveNode(data.node);
                }
                if (data.log) {
                  setLogs((prev) => [...prev, data.log]);
                }
                if (data.verdict) {
                  setVerdict(data.verdict);
                }
                if (data.analysis) {
                  setAnalysis(data.analysis);
                }
                if (data.risks) {
                  setRisks(data.risks);
                }
              } else if (data.event === "error") {
                setError(data.error);
                setIsSearching(false);
                return;
              } else if (data.event === "complete") {
                setIsSearching(false);
              }
            } catch (jsonErr) {
              console.error("Error parsing SSE line:", cleanLine, jsonErr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Streaming error:", err);
      setError(err.message || "An unexpected error occurred during analysis.");
      setIsSearching(false);
    }
  };

  const loadDemo = (companyName: string) => {
    setCompany(companyName);
  };

  return (
    <main className="min-h-screen bg-[#070913] text-slate-100 flex flex-col items-center px-4 py-12 relative overflow-x-hidden font-sans">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="w-full max-w-6xl flex justify-between items-center mb-16 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-white tracking-wider text-base uppercase">
            Altuni <span className="text-indigo-400 font-medium">Research</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/utkarshsxn12/AI-Investment-Research-Agent"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-900/40 px-4 py-2 rounded-xl transition-all duration-200"
          >
            <Github className="w-4 h-4" /> GitHub
          </a>
        </div>
      </nav>

      {/* Hero section */}
      <div className="w-full max-w-3xl text-center space-y-6 mb-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-xs font-semibold text-indigo-300 tracking-wide uppercase">
          <Terminal className="w-3.5 h-3.5" /> LangGraph.js Multi-Agent Network
        </div>
        
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
          AI Investment <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Research Agent
          </span>
        </h1>
        
        <p className="text-slate-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed">
          Input any stock or company name to spawn a coordinated network of specialized financial agents. Get a deep-dive consensus report in seconds.
        </p>

        {/* Input box */}
        <form onSubmit={handleSearch} className="w-full max-w-xl mx-auto pt-4">
          <div className="relative flex items-center p-1.5 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md focus-within:border-indigo-500/50 focus-within:shadow-2xl focus-within:shadow-indigo-500/5 transition-all duration-300">
            <Search className="w-5 h-5 text-slate-500 absolute left-4.5 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. Nvidia, Apple, Tesla..."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={isSearching}
              className="w-full bg-transparent border-none outline-none py-3 pl-12 pr-32 text-slate-200 placeholder-slate-600 font-medium text-sm rounded-xl focus:ring-0"
            />
            <button
              type="submit"
              disabled={isSearching || !company.trim()}
              className="absolute right-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 disabled:opacity-40 disabled:pointer-events-none transition-all duration-150 shadow-md shadow-indigo-500/10"
            >
              {isSearching ? "Analyzing" : "Analyze"}
            </button>
          </div>
        </form>

        {/* Suggestions */}
        {!isSearching && !verdict && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-slate-600 font-medium mr-1">Quick Demos:</span>
            {["Nvidia", "Apple", "Tesla", "Microsoft"].map((name) => (
              <button
                key={name}
                onClick={() => loadDemo(name)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-900/30 px-3 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Results / Loading Section */}
      <section className="w-full max-w-5xl relative z-10 min-h-[400px] flex items-center justify-center py-6">
        {/* Error panel */}
        {error && (
          <div className="w-full max-w-xl mx-auto border border-rose-500/20 bg-rose-500/5 p-5 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-400">Execution Blocked</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Streaming Loading Panel */}
        {isSearching && !verdict && (
          <div className="w-full py-10">
            <AgentStepper activeNode={activeNode} logs={logs} isSearching={isSearching} />
          </div>
        )}

        {/* Report Panel */}
        {verdict && !isSearching && (
          <ReportViewer
            company={company}
            verdict={verdict}
            research={research}
            analysis={analysis}
            risks={risks}
          />
        )}

        {/* Empty state dashboard decoration */}
        {!isSearching && !verdict && !error && (
          <div className="w-full max-w-xl mx-auto border border-slate-900 bg-slate-950/20 p-8 rounded-2xl text-center space-y-4">
            <Sparkles className="w-8 h-8 text-indigo-400/60 mx-auto" />
            <h3 className="font-bold text-slate-300">Investment Insights Engine Ready</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              Our Multi-Agent Graph operates using parallel real-time searches via Tavily, parsing financials using large models, and concluding consensus scoring under strict investment policy guidelines.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-24 border-t border-slate-900 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-600 gap-4">
        <div>
          © 2026 InsideIIM x Altuni AI Labs take-home candidate entry.
        </div>
        <div className="flex items-center gap-6">
          <span>Tech Stack: Next.js + LangGraph.js + Gemini 2.5</span>
        </div>
      </footer>
    </main>
  );
}
