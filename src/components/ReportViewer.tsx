import React, { useState, useMemo } from "react";
import StockChart from "./StockChart";
import { InvestmentState } from "@/lib/agents/state";
import { CommitteeVerdict, AgentOutput, ScoreFactor } from "@/lib/agents/types";
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Database, 
  ThumbsUp, 
  ThumbsDown,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
  FileSearch
} from "lucide-react";

// --- Markdown Renderer ---
function Markdown({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  
  return (
    <div className="space-y-3 font-sans text-sm text-slate-300">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={index} className="text-sm font-bold text-white uppercase tracking-wider mt-6 mb-2 border-b border-slate-800 pb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-500 rounded-sm" />
              {renderMarkdownText(trimmed.substring(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={index} className="text-base font-extrabold text-white mt-8 mb-3 flex items-center gap-2">
              <span className="w-2 h-4 bg-gradient-to-b from-indigo-500 to-cyan-500 rounded-sm" />
              {renderMarkdownText(trimmed.substring(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={index} className="text-lg font-black text-white mt-10 mb-4 pb-2 border-b border-slate-850">
              {renderMarkdownText(trimmed.substring(2))}
            </h2>
          );
        }

        // Bullet lists
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          return (
            <div key={index} className="flex items-start gap-2.5 pl-4 py-0.5 group">
              <span className="text-indigo-400 mt-1.5 shrink-0 select-none text-[8px] group-hover:scale-125 transition-transform">◆</span>
              <span className="text-slate-300 group-hover:text-slate-200 transition-colors">{renderMarkdownText(trimmed.substring(2))}</span>
            </div>
          );
        }

        // Regular paragraphs
        return (
          <p key={index} className="leading-relaxed text-slate-300 py-0.5">
            {renderMarkdownText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderMarkdownText(text: string) {
  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>');
  safeText = safeText.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline font-medium transition-colors inline-flex items-center gap-0.5">$1</a>');

  return <span dangerouslySetInnerHTML={{ __html: safeText }} />;
}

// --- Scraped Data Sources Renderer ---
interface ScrapedSource {
  index: number;
  title: string;
  url: string;
  content: string;
}

function parseSources(rawText: string): ScrapedSource[] {
  if (!rawText) return [];
  const parts = rawText.split("---");
  const sources: ScrapedSource[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const sourceMatch = trimmed.match(/Source\s+\[(\d+)\]:\s*([^\n]+)/);
    const urlMatch = trimmed.match(/URL:\s*([^\n]+)/);
    const contentMatch = trimmed.match(/Content:\s*([\s\S]+)/);

    if (sourceMatch) {
      sources.push({
        index: parseInt(sourceMatch[1]),
        title: sourceMatch[2].trim(),
        url: urlMatch ? urlMatch[1].trim() : "",
        content: contentMatch ? contentMatch[1].trim() : "",
      });
    }
  }
  return sources;
}

function SourceCard({ source }: { source: ScrapedSource }) {
  const [isExpanded, setIsExpanded] = useState(false);

  let domain = "";
  try {
    if (source.url) {
      const parsedUrl = new URL(source.url);
      domain = parsedUrl.hostname.replace("www.", "");
    }
  } catch (e) {
    domain = "Link";
  }

  return (
    <div className="border border-slate-800/80 bg-slate-955/40 rounded-xl overflow-hidden hover:border-slate-700/60 transition-all duration-300 group">
      <div className="p-4 flex justify-between items-start gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Source [{source.index}]
            </span>
            {domain && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Globe className="w-3 h-3" />
                {domain}
              </span>
            )}
          </div>
          <h4 className="font-bold text-slate-200 text-sm leading-snug group-hover:text-white transition-colors">
            {source.title}
          </h4>
        </div>

        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all shrink-0"
            title="Open Source Link"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="px-4 pb-4 border-t border-slate-900/60 bg-slate-950/40">
        <div className={`mt-3 text-xs leading-relaxed text-slate-400 font-sans transition-all duration-300 ${
          isExpanded ? "max-h-[500px] overflow-y-auto" : "max-h-16 overflow-hidden line-clamp-3"
        }`}>
          {source.content}
        </div>
        
        {source.content.length > 100 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[10px] font-bold text-indigo-400/80 hover:text-indigo-300 mt-2 transition-colors uppercase tracking-wider"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Collapse Details
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> View Scraped Content
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ScrapedSourcesView({ rawSources }: { rawSources: string }) {
  const sources = useMemo(() => parseSources(rawSources), [rawSources]);

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-2">
        <FileSearch className="w-8 h-8 opacity-40 animate-pulse" />
        <p className="text-xs">No web data sources were parsed.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sources.map((source) => (
        <SourceCard key={source.index} source={source} />
      ))}
    </div>
  );
}

// --- Score Breakdown Component ---
function ScoreBreakdown({ verdict, isInvest }: { verdict: CommitteeVerdict; isInvest: boolean }) {
  const [open, setOpen] = useState(false);

  const rows = [
    { label: "Financial Health", value: verdict.financialOutput.score, weight: 3.0, color: "text-sky-400", bar: "bg-sky-500" },
    { label: "Growth Potential", value: verdict.growthOutput.score, weight: 2.0, color: "text-violet-400", bar: "bg-violet-500" },
    { label: "Valuation Comfort", value: verdict.valuationOutput.score, weight: 1.5, color: "text-rose-400", bar: "bg-rose-500" },
    { label: "Competitive Moat", value: verdict.moatOutput.score, weight: 1.5, color: "text-amber-400", bar: "bg-amber-500" },
    { label: "Technical Setup", value: verdict.technicalOutput.score, weight: 1.0, color: "text-emerald-400", bar: "bg-emerald-500" },
    { label: "News Sentiment", value: verdict.sentimentOutput.score, weight: 0.5, color: "text-fuchsia-400", bar: "bg-fuchsia-500" },
    { label: "Risk Profile", value: verdict.riskOutput.score, weight: 0.5, color: "text-orange-400", bar: "bg-orange-500" },
  ];

  return (
    <div className={`bg-slate-950/50 backdrop-blur border rounded-2xl transition-all duration-300 ${
      open ? "border-indigo-500/30" : "border-slate-800/80"
    }`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex flex-col items-center gap-1 px-6 py-4 cursor-pointer group"
      >
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Consensus Score</div>
        <div className="flex items-baseline justify-center gap-0.5">
          <span className={`text-4xl font-black ${isInvest ? "text-emerald-400" : "text-rose-400"}`}>
            {verdict.finalScore}
          </span>
          <span className="text-slate-500 text-xs font-semibold">/100</span>
        </div>
        <span className={`text-[9px] font-semibold uppercase tracking-wider transition-colors ${
          open ? "text-indigo-300" : "text-indigo-400/60 group-hover:text-indigo-300"
        }`}>
          {open ? "▲ Hide breakdown" : "▼ How is this calculated?"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-800/80 px-5 py-4 space-y-4 max-h-[400px] overflow-y-auto">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Weighted Formula</p>
            <div className="font-mono text-[11px] text-slate-300 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 leading-[1.9]">
              <span className="text-slate-500">score = (</span><br />
              {rows.map((r, i) => (
                <span key={i}>
                  &nbsp;&nbsp;<span className={r.color}>{r.value}</span>
                  <span className="text-slate-500"> × {r.weight.toFixed(1)}</span>
                  {i < rows.length - 1 ? <span className="text-slate-600"> +</span> : ""}
                  <br />
                </span>
              ))}
              <span className="text-slate-500">) = </span>
              <span className={isInvest ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{verdict.finalScore}</span>
              <span className="text-slate-500"> / 100</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {rows.map((r, i) => {
              const contrib = r.value * r.weight;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold">{r.label}</span>
                    <span className={`font-mono font-bold ${r.color}`}>
                      {r.value}/10 × {r.weight.toFixed(1)} = <span className="text-slate-200">{contrib.toFixed(1)}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.bar} transition-all duration-500`}
                      style={{ width: `${(contrib / 30) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Agent Score Card Component ---
function AgentScoreCard({ title, output }: { title: string; output: AgentOutput | null }) {
  if (!output) {
    return <div className="p-4 text-slate-500 text-sm">Waiting for agent analysis...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <h4 className="text-lg font-bold text-white">{title}</h4>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-lg">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Score:</span>
          <span className={`font-mono font-black ${output.score >= 7 ? "text-emerald-400" : output.score >= 4 ? "text-amber-400" : "text-rose-400"}`}>
            {output.score}/10
          </span>
        </div>
      </div>
      
      <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 border border-slate-800/50 rounded-xl">
        {output.summary}
      </p>

      <div className="space-y-2 pt-2">
        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Scoring Factors</h5>
        {output.factors.map((f, i) => (
          <div key={i} className="flex gap-3 bg-slate-900/40 border border-slate-800/60 p-3 rounded-xl hover:border-slate-700/60 transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 border ${
              f.points > 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
              f.points < 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : 
              "bg-slate-500/10 text-slate-400 border-slate-500/20"
            }`}>
              {f.points > 0 ? "+" : ""}{f.points}
            </div>
            <div className="space-y-0.5 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-200">{f.metric}</span>
                {f.dataValue && (
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    {f.dataValue}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{f.reasoning}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ReportViewerProps {
  company: string;
  stateChunk: Partial<InvestmentState>;
}

type TabType = "thesis" | "financials" | "valuation" | "growth" | "moat" | "technical" | "sentiment" | "risk" | "sources";

export default function ReportViewer({ company, stateChunk }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("thesis");
  
  const verdict = stateChunk.verdict;
  if (!verdict) return null; // Wait for committee

  const isInvest = ["Strong Invest", "Invest"].includes(verdict.recommendation);

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
    { name: "Financial Health", value: verdict.financialOutput.score, max: 10, icon: ShieldCheck },
    { name: "Growth Potential", value: verdict.growthOutput.score, max: 10, icon: TrendingUp },
    { name: "Valuation Comfort", value: verdict.valuationOutput.score, max: 10, icon: FileText },
    { name: "Competitive Moat", value: verdict.moatOutput.score, max: 10, icon: Database },
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
            
            <h2 className="text-4xl font-extrabold text-white tracking-tight mt-2 flex flex-wrap items-center gap-3">
              Verdict:
              <span className={isInvest ? "text-emerald-400" : verdict.recommendation === "Pass" ? "text-amber-400" : "text-rose-400"}>
                {verdict.recommendation}
              </span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider ml-2 text-indigo-400 border-indigo-500/30 bg-indigo-500/10">
                {verdict.confidence}% Confidence
              </span>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider ml-1 ${
                verdict.riskLevel === 'Low Risk' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                verdict.riskLevel === 'Moderate Risk' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                'text-rose-400 border-rose-500/30 bg-rose-500/10'
              }`}>
                {verdict.riskLevel}
              </span>
            </h2>
            <p className="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
              {verdict.summary}
            </p>
          </div>

          {/* Verdict Score Gauge + Breakdown */}
          <ScoreBreakdown verdict={verdict} isInvest={isInvest} />
        </div>

        {/* Metric Gauges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800/60 relative z-10">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <div key={i} className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2">
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

      {/* Stock Price Chart */}
      {verdict.ticker && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">1-Year Price History</span>
            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">{verdict.ticker}</span>
          </div>
          <StockChart ticker={verdict.ticker} />
        </div>
      )}

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
                <div>{renderMarkdownText(pro)}</div>
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
                <div>{renderMarkdownText(con)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detailed Analysis Reports Tab View */}
      <div className="border border-slate-800/80 bg-slate-900/40 rounded-2xl overflow-hidden shadow-lg">
        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800/60 bg-slate-950/40 px-4 pt-3 gap-2">
          {(["thesis", "financials", "valuation", "growth", "moat", "technical", "sentiment", "risk", "sources"] as TabType[]).map((tab) => {
            const labelMap: Record<TabType, string> = {
              thesis: "Synthesis",
              financials: "Financials",
              valuation: "Valuation",
              growth: "Growth",
              moat: "Moat",
              technical: "Technical",
              sentiment: "Sentiment",
              risk: "Risk",
              sources: "Sources",
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
        <div className="p-6 max-h-[600px] overflow-y-auto font-sans leading-relaxed text-sm text-slate-300">
          {activeTab === "thesis" && (
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white mb-2">Synthesis Recommendation</h4>
              <p>{verdict.summary}</p>
              <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl mt-6">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Committee Consensus Summary
                </div>
                <p className="text-xs text-slate-400">
                  This verdict represents a consensus score computed deterministically across 7 specialized multi-agent pillars. Data is fetched via Yahoo Finance API and qualitative analysis is strictly quantified using LLMs.
                </p>
              </div>
            </div>
          )}

          {activeTab === "financials" && <AgentScoreCard title="Financial Health" output={stateChunk.financialOutput || null} />}
          {activeTab === "valuation" && <AgentScoreCard title="Valuation" output={stateChunk.valuationOutput || null} />}
          {activeTab === "growth" && <AgentScoreCard title="Growth Potential" output={stateChunk.growthOutput || null} />}
          {activeTab === "moat" && <AgentScoreCard title="Competitive Moat" output={stateChunk.moatOutput || null} />}
          {activeTab === "technical" && <AgentScoreCard title="Technical Setup" output={stateChunk.technicalOutput || null} />}
          {activeTab === "sentiment" && <AgentScoreCard title="News Sentiment" output={stateChunk.sentimentOutput || null} />}
          {activeTab === "risk" && <AgentScoreCard title="Risk Profile" output={stateChunk.riskOutput || null} />}

          {activeTab === "sources" && (
            <ScrapedSourcesView rawSources={stateChunk.research || ""} />
          )}
        </div>
      </div>
    </div>
  );
}
