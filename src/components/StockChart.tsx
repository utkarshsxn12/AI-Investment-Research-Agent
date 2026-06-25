import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface Point {
  date: string;
  price: number;
}

interface StockChartProps {
  ticker: string;
}

export default function StockChart({ ticker }: StockChartProps) {
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Hover tracking states
  const [activePoint, setActivePoint] = useState<Point | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchHistory() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/stock-history?ticker=${encodeURIComponent(ticker)}`);
        if (!res.ok) throw new Error("Failed to load chart data");
        const data = await res.json();
        if (active) {
          setPoints(data.points || []);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Could not retrieve historical pricing.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchHistory();
    return () => {
      active = false;
    };
  }, [ticker]);

  if (loading) {
    return (
      <div className="w-full h-[220px] bg-slate-950/20 border border-slate-900 rounded-3xl p-6 flex flex-col justify-between animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="w-16 h-4 bg-slate-800 rounded" />
            <div className="w-32 h-8 bg-slate-800 rounded" />
          </div>
          <div className="w-24 h-6 bg-slate-800 rounded-full" />
        </div>
        <div className="w-full h-24 bg-slate-850/50 rounded-xl" />
      </div>
    );
  }

  if (error || points.length === 0) {
    return (
      <div className="w-full h-[220px] bg-slate-950/20 border border-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-500 space-y-3">
        <span className="text-xs">Failed to load chart for {ticker.toUpperCase()}</span>
        <button 
          onClick={() => {
            setLoading(true);
            setError(null);
            // Re-fetch logic happens by trigger
            setPoints([]);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try Again
        </button>
      </div>
    );
  }

  // Analytics
  const prices = points.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const currentPoint = activePoint || lastPoint;

  const totalChange = lastPoint.price - firstPoint.price;
  const totalChangePercent = (totalChange / firstPoint.price) * 100;
  const isUp = totalChange >= 0;

  // Chart dimensions & scaling
  const width = 600;
  const height = 150;
  const paddingX = 20;
  const paddingY = 15;

  const getCoordinates = (p: Point, i: number) => {
    const x = paddingX + (i / (points.length - 1)) * (width - 2 * paddingX);
    // Invert Y so higher price is at top
    const y = height - paddingY - ((p.price - minPrice) / priceRange) * (height - 2 * paddingY);
    return { x, y };
  };

  // Generate SVG path strings
  const coords = points.map((p, i) => getCoordinates(p, i));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  
  const areaPath = `
    ${linePath} 
    L ${coords[coords.length - 1].x.toFixed(1)} ${(height - paddingY).toFixed(1)} 
    L ${coords[0].x.toFixed(1)} ${(height - paddingY).toFixed(1)} 
    Z
  `;

  // Handle interactive hover tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    
    // Relative position inside the SVG width [0, 1]
    const relativeX = (e.clientX - rect.left) / rect.width;
    const computedIndex = Math.round(relativeX * (points.length - 1));
    const idx = Math.max(0, Math.min(points.length - 1, computedIndex));
    
    setHoverIndex(idx);
    setActivePoint(points[idx]);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setActivePoint(null);
  };

  // Coordinates of target hovered node
  const activeCoord = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div className="w-full bg-slate-950/20 border border-slate-900 rounded-3xl p-6 transition-all hover:shadow-lg hover:shadow-slate-900/10">
      {/* Chart Header Metrics */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tracking-tight">${currentPoint.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{ticker.toUpperCase()}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            {activePoint ? `Selected: ${currentPoint.date}` : "Past 1 Year (Weekly Close)"}
          </p>
        </div>

        {/* Positive/Negative badge */}
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
          isUp 
            ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" 
            : "text-rose-400 border-rose-500/20 bg-rose-500/5"
        }`}>
          {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {isUp ? "+" : ""}{totalChangePercent.toFixed(2)}%
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            
            {/* Grid line gradient */}
            <linearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#334155" stopOpacity="0" />
              <stop offset="20%" stopColor="#334155" stopOpacity="0.3" />
              <stop offset="80%" stopColor="#334155" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="url(#gridGrad)" strokeDasharray="3,3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="url(#gridGrad)" />

          {/* Area fill */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Smooth line */}
          <path
            d={linePath}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover interactive elements */}
          {activeCoord && (
            <>
              {/* Vertical line indicator */}
              <line
                x1={activeCoord.x}
                y1={paddingY}
                x2={activeCoord.x}
                y2={height - paddingY}
                stroke="#475569"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Pulsing Target dot */}
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="6.5"
                fill="#818cf8"
                className="animate-ping"
                style={{ transformOrigin: `${activeCoord.x}px ${activeCoord.y}px` }}
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="4.5"
                fill="#6366f1"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </>
          )}
        </svg>

        {/* Min/Max value callouts */}
        <div className="absolute top-1 right-2 text-[9px] font-semibold text-slate-600 bg-slate-950/20 px-1.5 py-0.5 rounded">
          H: ${maxPrice.toFixed(2)}
        </div>
        <div className="absolute bottom-1 right-2 text-[9px] font-semibold text-slate-600 bg-slate-950/20 px-1.5 py-0.5 rounded">
          L: ${minPrice.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
