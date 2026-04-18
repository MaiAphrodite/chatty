import { Elysia } from "elysia";

type LogLevel = "INFO" | "WARN" | "ERROR";
type LogScope = "SYSTEM" | "HTTP" | "LLM" | "TKG" | "DB";

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  scope: LogScope;
  message: string;
  data?: any;
}

const DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chatty API | Live Logger</title>
  <style>
    :root {
      --bg: #1e1e2e;
      --bg-panel: #181825;
      --text: #cdd6f4;
      --text-muted: #a6adc8;
      --border: #313244;
      
      --color-info: #89b4fa;
      --color-warn: #f9e2af;
      --color-error: #f38ba8;
      
      --scope-system: #cba6f7;
      --scope-http: #94e2d5;
      --scope-llm: #f5c2e7;
      --scope-tkg: #a6e3a1;
      --scope-db: #fab387;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      background: var(--bg);
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    header {
      background: var(--bg-panel);
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    
    h1 { font-size: 14px; font-weight: 700; color: var(--color-info); }
    
    .filters { display: flex; gap: 8px; }
    .filter-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      text-transform: uppercase;
    }
    .filter-btn.active { background: var(--border); color: var(--text); }
    
    #log-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .log-row {
      display: flex;
      align-items: flex-start;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255,255,255,0.02);
      animation: flash 0.3s ease-out;
    }
    
    @keyframes flash {
      from { background: rgba(255,255,255,0.1); }
      to { background: transparent; }
    }
    
    .time { color: var(--text-muted); width: 85px; flex-shrink: 0; }
    
    .level { width: 45px; flex-shrink: 0; font-weight: 700; }
    .level.INFO { color: var(--color-info); }
    .level.WARN { color: var(--color-warn); }
    .level.ERROR { color: var(--color-error); }
    
    .scope { width: 65px; flex-shrink: 0; font-weight: 700; }
    .scope.SYSTEM { color: var(--scope-system); }
    .scope.HTTP { color: var(--scope-http); }
    .scope.LLM { color: var(--scope-llm); }
    .scope.TKG { color: var(--scope-tkg); }
    .scope.DB { color: var(--scope-db); }
    
    .message { flex: 1; word-wrap: break-word; }
    
    .data {
      margin-top: 4px;
      background: var(--bg-panel);
      padding: 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
      color: var(--text-muted);
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <header>
    <h1>Chatty | Real-Time Log Pipeline</h1>
    <div class="filters" id="filters">
      <button class="filter-btn active" data-filter="ALL">All</button>
      <button class="filter-btn" data-filter="LLM">LLM</button>
      <button class="filter-btn" data-filter="TKG">TKG</button>
      <button class="filter-btn" data-filter="ERROR">Errors</button>
    </div>
  </header>
  
  <div id="log-container"></div>

  <script>
    const container = document.getElementById('log-container');
    const filters = document.getElementById('filters');
    let activeFilter = "ALL";
    let autoScroll = true;

    container.addEventListener('scroll', () => {
      const bottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
      autoScroll = bottom;
    });

    filters.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeFilter = e.target.dataset.filter;
        renderAll();
      }
    });

    const logs = [];

    function renderLog(log) {
      if (activeFilter !== "ALL") {
        if (activeFilter === "ERROR" && log.level !== "ERROR") return;
        if (activeFilter !== "ERROR" && log.scope !== activeFilter) return;
      }

      const row = document.createElement('div');
      row.className = 'log-row';
      
      const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour12: false });
      
      let html = \`
        <span class="time">\${timeStr}</span>
        <span class="level \${log.level}">\${log.level}</span>
        <span class="scope \${log.scope}">[\${log.scope}]</span>
        <div class="message">\${escapeHtml(log.message)}
      \`;

      if (log.data) {
        html += \`<pre class="data">\${escapeHtml(typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2))}</pre>\`;
      }
      
      html += '</div>';
      row.innerHTML = html;
      container.appendChild(row);

      if (autoScroll) {
        container.scrollTop = container.scrollHeight;
      }
    }

    function renderAll() {
      container.innerHTML = '';
      logs.forEach(renderLog);
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.innerText = str;
      return div.innerHTML;
    }

    const evtSource = new EventSource("/stream");
    evtSource.onmessage = (event) => {
      const log = JSON.parse(event.data);
      logs.push(log);
      if (logs.length > 2000) logs.shift();
      renderLog(log);
    };
  </script>
</body>
</html>
`;

class LogService {
  private logs: LogEntry[] = [];
  private clients: Set<(chunk: string) => void> = new Set();
  private maxLogs = 1000;

  private serializeData(data: unknown): unknown {
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        cause: data.cause instanceof Error ? data.cause.message : data.cause,
        stack: data.stack?.split("\n").slice(0, 4).join(" | "),
      };
    }
    if (typeof data === "object" && data !== null) return data;
    return String(data);
  }

  private pushLog(level: LogLevel, scope: LogScope, message: string, data?: unknown) {
    const serialized = data !== undefined ? this.serializeData(data) : undefined;
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      data: serialized,
    };

    const cLevel = level === "ERROR" ? "error" : level === "WARN" ? "warn" : "log";
    if (serialized) {
      console[cLevel](`[${entry.timestamp}] [${level}] [${scope}] ${message}`, serialized);
    } else {
      console[cLevel](`[${entry.timestamp}] [${level}] [${scope}] ${message}`);
    }

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    const sseChunk = `data: ${JSON.stringify(entry)}\n\n`;
    this.clients.forEach(c => c(sseChunk));
  }

  info(scope: LogScope, message: string, data?: unknown) { this.pushLog("INFO", scope, message, data); }
  warn(scope: LogScope, message: string, data?: unknown) { this.pushLog("WARN", scope, message, data); }
  error(scope: LogScope, message: string, data?: unknown) { this.pushLog("ERROR", scope, message, data); }

  private createSseHandler() {
    const encoder = new TextEncoder();
    return ({ request }: { request: Request }) => {
      return new Response(
        new ReadableStream({
          start: (controller) => {
            const emit = (chunk: string) => {
              try { controller.enqueue(encoder.encode(chunk)); }
              catch { this.clients.delete(emit); }
            };
            this.clients.add(emit);
            this.logs.forEach(l => emit(`data: ${JSON.stringify(l)}\n\n`));
            request.signal.addEventListener("abort", () => this.clients.delete(emit));
          }
        }),
        { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } }
      );
    };
  }

  private createRoutes() {
    return new Elysia()
      .get("/", () => new Response(DASHBOARD_HTML, { headers: { "Content-Type": "text/html" } }))
      .get("/stream", this.createSseHandler());
  }

  start() {
    this.createRoutes().listen(4001, () => {
      console.log("🦊 Logger Dashboard running at http://localhost:4001");
    });
  }
}

export const Logger = new LogService();
