import React from "react";
import { AgentLog } from "@/lib/agents/state";
import { Loader2, CheckCircle2, ShieldAlert, TrendingUp, Search, Landmark, HelpCircle } from "lucide-react";

interface AgentStepperProps {
  activeNode: string | null;
  logs: AgentLog[];
  isSearching: boolean;
}

export default function AgentStepper({ activeNode, logs, isSearching }: AgentStepperProps) {
  const steps = [
    {
      id: "researcher",
      name: "Research Agent",
      desc: "Web queries, stock trends & news analysis",
      icon: Search,
    },
    {
      id: "analyst",
      name: "Financial Analyst",
      desc: "Valuation, margins, & balance sheets",
      icon: Landmark,
    },
    {
      id: "risk_evaluator",
      name: "Risk Evaluator",
      desc: "Competitive moat & headwinds mapping",
      icon: TrendingUp,
    },
    {
      id: "committee",
      name: "Investment Committee",
      desc: "Consensus synthesis & decision scoring",
      icon: HelpCircle,
    },
  ];

  const getStepStatus = (stepId: string) => {
    if (!isSearching) return "idle";
    
    const nodeToStepIndex: Record<string, number> = {
      researcher: 0,
      data_fetcher: 0,
      financialAgent: 1,
      valuationAgent: 1,
      growthAgent: 1,
      moatAgent: 2,
      technicalAgent: 2,
      sentimentAgent: 2,
      riskAgent: 2,
      committee: 3,
    };

    const currentIndex = steps.findIndex((s) => s.id === stepId);
    const activeIndex = activeNode && nodeToStepIndex[activeNode] !== undefined 
      ? nodeToStepIndex[activeNode] 
      : -1;

    if (activeIndex === -1) {
      return currentIndex === 0 ? "active" : "idle";
    }

    if (currentIndex < activeIndex) return "completed";
    if (currentIndex === activeIndex) return "active";
    return "idle";
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="relative border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-cyan-500/5 rounded-2xl pointer-events-none" />
        
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
          Real-time Agent Workflow
        </h3>

        <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
          {steps.map((step) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="relative flex items-start group">
                {/* Node icon / indicator */}
                <div className="absolute left-[-32px] flex items-center justify-center">
                  {status === "completed" ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    </div>
                  ) : status === "active" ? (
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/35 text-indigo-400 animate-pulse">
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:border-slate-700 transition-colors">
                      <StepIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Node text content */}
                <div className="pl-4">
                  <h4
                    className={`font-medium transition-colors ${
                      status === "active"
                        ? "text-indigo-400"
                        : status === "completed"
                        ? "text-slate-200"
                        : "text-slate-500"
                    }`}
                  >
                    {step.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log Feed */}
      {logs.length > 0 && (
        <div className="border border-slate-800/80 bg-slate-950/40 rounded-xl p-4 font-mono text-xs text-slate-400 space-y-2.5 max-h-48 overflow-y-auto shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            <span>Agent Operations Log</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          </div>
          {logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 leading-relaxed animate-fade-in">
              <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className="text-cyan-500 font-medium">[{log.agent}]</span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
