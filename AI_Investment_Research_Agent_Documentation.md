# AI Investment Research Agent: Comprehensive Technical Documentation

## 1. Executive Summary

**AI Investment Research Agent** is an institutional-grade, multi-agent AI consensus network designed to automate comprehensive equity research. Built on top of **LangGraph.js** and **Next.js**, it acts as a fully automated financial analyst team. 

Given a company name, the system spawns a coordinated network of 10 highly-specialized AI agents. These agents gather real-time web data, fetch quantitative financial metrics, analyze business fundamentals, map execution risks, and ultimately issue a final consensus verdict (INVEST or PASS) with an institutional scorecard.

---

## 2. System Architecture & Phases of Execution

The application implements a robust, stateful multi-agent network. To maximize performance and bypass strict free-tier LLM API rate limits (e.g., Google Gemini's burst limits), the pipeline intelligently staggers execution into distinct phases:

### Phase 1: Data Collection (Parallel)
The workflow begins by simultaneously fetching both qualitative text and quantitative numerical data. This minimizes idle waiting time.

### Phase 2: Deterministic Scoring (Parallel)
Once raw data is collected, specialized deterministic agents run instantly in parallel. These agents use hardcoded financial logic and rubrics rather than LLMs, guaranteeing 100% mathematical accuracy and zero rate-limit consumption.

### Phase 3: Qualitative Analysis (Sequential)
To avoid overwhelming free-tier LLMs (429 Too Many Requests errors), the remaining qualitative agents are executed strictly sequentially. Each agent receives the full context of the research and performs its specialized reasoning.

### Phase 4: Synthesis
The Investment Committee Agent reviews the aggregate scores and logic from all 9 prior agents to produce a final confidence score and investment verdict.

---

## 3. The 10-Agent Network Breakdown

1. **Researcher Agent** (Data): Scrapes qualitative financial news, earnings releases, and macro sentiment using the Tavily Search API.
2. **Data Fetcher Agent** (Data): Fetches quantitative metrics via Alpha Vantage and Yahoo Finance. Features an intelligent LLM-extraction fallback mechanism.
3. **Financial Agent** (Deterministic): Quantitatively scores revenue growth, margins, ROE, and debt leverage.
4. **Valuation Agent** (Deterministic): Evaluates Forward P/E, PEG, and P/B ratios against industry standard thresholds.
5. **Technical Agent** (Deterministic): Analyzes moving averages (50/200 DMA) and price momentum to evaluate technical setups.
6. **Growth Agent** (Qualitative LLM): Evaluates future Total Addressable Market (TAM), product pipelines, and growth catalysts.
7. **Moat Agent** (Qualitative LLM): Assesses competitive advantages, switching costs, and barriers to entry using Porter's Five Forces.
8. **Sentiment Agent** (Qualitative LLM): Processes recent news flow, management tone, and broad market sentiment.
9. **Risk Agent** (Qualitative LLM): Quantifies macroeconomic headwinds, regulatory threats, and execution risks.
10. **Investment Committee Agent** (Synthesis): Consolidates all analysis to generate a structured investment verdict and dynamic consensus score.

---

## 4. Multi-Layered Fallback Architecture

To ensure the application **never crashes** during live demonstrations due to missing data or API rate limits, the `Data Fetcher Agent` implements a highly resilient 4-layer fallback system:

- **Layer 1 (Primary): Alpha Vantage API** - Attempts to fetch exact, institutional-grade quantitative data.
- **Layer 2 (Secondary): Yahoo Finance API** - If Alpha Vantage hits its 25-request daily limit, the system silently pivots to Yahoo Finance's undocumented endpoints.
- **Layer 3 (LLM Extraction):** If Vercel IPs are blocked by Yahoo, the system uses the LLM to read the raw text research scraped by the Researcher Agent and intelligently extract/estimate the required financial metrics using function-calling.
- **Layer 4 (Hardcoded Baseline):** If the LLM itself hallucinates or gets rate-limited, the system instantly injects a baseline set of neutral financial metrics (e.g., 8% revenue growth, 15% margins) so the deterministic agents can still perform their math without throwing "Data Missing" errors.

---

## 5. Technology Stack & Key Decisions

- **Framework:** Next.js (App Router) allows us to stream agent states via standard `ReadableStreams` using Server-Sent Events (SSE) out of the box.
- **Orchestration:** LangGraph.js enables state validation at each node. Defining the agents as a compiled state graph makes it possible to implement multi-layered error-catching fallbacks and stagger execution loops seamlessly.
- **LLM Engine:** Multi-LLM Native Support. Supports **Google Gemini 2.5 Flash** (default) and **Groq Llama 3.3 70B** (for lightning-fast inference). The backend dynamically detects the API key prefix (e.g., `gsk_` for Groq) and routes the traffic accordingly.
- **UI/UX:** A Bloomberg-Terminal inspired dashboard featuring a glassmorphic dark-theme UI, custom SVG indicator gauges, and pro/con matrices. By building custom SVG charts instead of using heavy libraries like Recharts, the application maintains zero SSR hydration bugs and blazingly fast page load times.

---

## 6. How to Run the Application

1. **Environment Setup:** 
   Provide `.env` credentials for `GEMINI_API_KEY` (or Groq key), `TAVILY_API_KEY`, and `ALPHA_VANTAGE_API_KEY`.
2. **Install Dependencies:** Run `npm install`.
3. **Launch:** Run `npm run dev` and navigate to `http://localhost:3000`.

*Documentation prepared for AI Investment Research Agent.*
