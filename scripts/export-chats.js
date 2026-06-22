const fs = require("fs");
const path = require("path");

// Default paths for local conversation IDE logs
const CONV_ID = "a5927594-06b2-4b36-9acf-471bc18eaa20";
const DEFAULT_LOG_PATH = `/Users/utkarshsaxena/.gemini/antigravity-ide/brain/${CONV_ID}/.system_generated/logs/transcript.jsonl`;

function exportChats() {
  const logPath = process.argv[2] || DEFAULT_LOG_PATH;

  console.log(`[Chat Exporter] Reading logs from: ${logPath}`);

  if (!fs.existsSync(logPath)) {
    console.error(`Error: Log file not found at ${logPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(logPath, "utf-8");
  const lines = fileContent.split("\n");
  
  let markdown = `# AI Chat Transcript: Pair Programming Session\n\n`;
  markdown += `*This log documents the interactive pair-programming chat history between the developer and the Antigravity AI coding assistant to build the **AI Investment Research Agent** application. Included for submission bonus points.*\n\n---\n\n`;

  let currentTurn = 1;

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const step = JSON.parse(line);
      
      // Filter logs by type/source
      const isUser = step.type === "USER_INPUT" || step.source === "USER_EXPLICIT";
      const isAI = step.type === "PLANNER_RESPONSE" || step.source === "MODEL";

      if (isUser && step.content) {
        // Skip ephemeral or purely system messages that might get logged
        if (step.content.includes("<SYSTEM_MESSAGE>") || step.content.includes("<EPHEMERAL_MESSAGE>")) {
          continue;
        }
        
        markdown += `### 🧑‍💻 Developer Prompt #${currentTurn}\n\n`;
        // Strip XML tags if present for formatting cleanliness
        let cleanContent = step.content
          .replace(/<USER_REQUEST>/g, "")
          .replace(/<\/USER_REQUEST>/g, "")
          .replace(/<ADDITIONAL_METADATA>[^]*?<\/ADDITIONAL_METADATA>/g, "")
          .trim();
          
        markdown += `${cleanContent}\n\n`;
      } else if (isAI && step.content) {
        markdown += `### 🤖 Antigravity Response #${currentTurn}\n\n`;
        markdown += `${step.content.trim()}\n\n`;
        markdown += `---\n\n`;
        currentTurn++;
      }
    } catch (e) {
      // Ignore JSON parse errors for incomplete/corrupted lines
    }
  }

  const outputPath = path.join(__dirname, "../ai_chat_transcript.md");
  fs.writeFileSync(outputPath, markdown, "utf-8");
  console.log(`[Chat Exporter] Success! Saved formatted chat log to: ${outputPath}`);
}

exportChats();
