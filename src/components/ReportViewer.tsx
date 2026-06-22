import React, { useState } from "react";
import { InvestmentVerdict } from "@/lib/agents/state";
import { CheckCircle2, XCircle, FileText, TrendingUp, AlertTriangle, ShieldCheck, Database, ThumbsUp, ThumbsDown } from "lucide-react";

interface ReportViewerProps {
  company: string;
  verdict: InvestmentVerdict;
  research: string;
  analysis: string;
  risks: string;
}

type TabType = "thesis" | "financials" | "risks" | "sources";

export default function ReportViewer({ company, verdict, research, analysis, risks }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("thesis");

  const isInvest = verdict.decision === "INVEST";

  // Score description mapping
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
    if (score >= 60) return "text-cyan-400 border-cyan-500/30 bg-cyan-500/5";
    if (score >= 40) return "text-amber-400 border-amber-500/30 bg-amber-500/5";
    return "text-rose-400 border-rose-500/30 bg-rose-500/5";
  };

  const getMetricColor = (val: number) => {
    if (val >= 8) return "bg-emerald-500";
    if (val >= 6) return "bg-cyan-500";
    if (val >= 4) return "bg-amber-500";
    return "bg-rose-500";
  };

  const metrics = [
    { name: "Financial Health", value: verdict.financialHealthScore, max: 10, icon: ShieldCheck },
    { name: "Growth Potential", value: verdict.growthScore, max: 10, icon: TrendingUp },
    { name: "Valuation Comfort", value: verdict.valuationScore, max: 10, icon: FileText },
    { name: "Competitive Moat", value: verdict.competitiveMoatScore, max: 10, icon: Database },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Verdict Header Block */}
      <div className={`relative border rounded-3xl p-8 overflow-hidden shadow-2xl transition-all duration-300 ${
        isInvest 
          ? "border-emerald-500/30 bg-slate-900/60 shadow-emerald-500/5" 
          : "border-rose-500/30 bg-slate-900/60 shadow-rose-500/5"
      }`}>
        {/* Glow decoration */}
        <div className={`absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-20 -mr-20 -mt-20 transition-colors ${
          isInvest ? "bg-emerald-500" : "bg-rose-500"
        }`} />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-slate-400 font-medium tracking-wider text-xs uppercase">Investment Thesis Report</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 text-xs font-semibold">{company.toUpperCase()}</span>
            </div>
            
            <h2 className="text-4xl font-extrabold text-white tracking-tight mt-2 flex items-center gap-3">
              Verdict:
              <span className={isInvest ? "text-emerald-400" : "text-rose-400"}>
                {verdict.decision}
              </span>
            </h2>
            <p className="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
              {verdict.reasoning}
            </p>
          </div>

          {/* Verdict Score Gauge */}
          <div className="flex items-center gap-4 bg-slate-950/50 backdrop-blur border border-slate-800/80 px-6 py-4 rounded-2xl">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Consensus Score</div>
              <div className="flex items-baseline justify-center gap-0.5 mt-1">
                <span className={`text-4xl font-black ${isInvest ? "text-emerald-400" : "text-rose-400"}`}>
                  {verdict.score}
                </span>
                <span className="text-slate-500 text-xs font-semibold">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Gauges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800/60">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <div key={i} className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold">{metric.name}</span>
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-100">{metric.value}</span>
                  <span className="text-xs text-slate-500">/{metric.max}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getMetricColor(metric.value)}`}
                    style={{ width: `${(metric.value / metric.max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pros & Cons Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pros card */}
        <div className="border border-slate-800/80 bg-slate-900/40 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <ThumbsUp className="w-4 h-4" /> Supporting Pros (Investment Thesis)
          </h3>
          <ul className="space-y-3">
            {verdict.pros.map((pro, index) => (
              <li key={index} className="flex gap-2.5 text-slate-300 text-sm leading-relaxed">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cons card */}
        <div className="border border-slate-800/80 bg-slate-900/40 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
            <ThumbsDown className="w-4 h-4" /> Risk Factors & Cons
          </h3>
          <ul className="space-y-3">
            {verdict.cons.map((con, index) => (
              <li key={index} className="flex gap-2.5 text-slate-300 text-sm leading-relaxed">
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detailed Analysis Reports Tab View */}
      <div className="border border-slate-800/80 bg-slate-900/40 rounded-2xl overflow-hidden shadow-lg">
        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800/60 bg-slate-950/40 px-4 pt-3 gap-2">
          {(["thesis", "financials", "risks", "sources"] as TabType[]).map((tab) => {
            const labelMap = {
              thesis: "Synthesis Thesis",
              financials: "Financial Analysis",
              risks: "Risk & Moat Analysis",
              sources: "Scraped Data Sources",
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-semibold tracking-wider rounded-t-xl transition-all duration-200 uppercase ${
                  activeTab === tab
                    ? "bg-slate-900 text-indigo-400 border-t border-x border-slate-800/80 -mb-[1px]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="p-6 max-h-[500px] overflow-y-auto font-sans leading-relaxed text-sm text-slate-300">
          {activeTab === "thesis" && (
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white mb-2">Synthesis Recommendation</h4>
              <p>{verdict.reasoning}</p>
              <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl mt-6">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Committee Consensus Summary
                </div>
                <p className="text-xs text-slate-400">
                  This verdict represents a consensus score computed across all individual agent insights. Verification includes web-scraping stock history and running neural valuation analysis. Ensure local market conditions are verified before execution.
                </p>
              </div>
            </div>
          )}

          {activeTab === "financials" && (
            <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
              {analysis}
            </div>
          )}

          {activeTab === "risks" && (
            <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
              {risks}
            </div>
          )}

          {activeTab === "sources" && (
            <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
              {research}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
