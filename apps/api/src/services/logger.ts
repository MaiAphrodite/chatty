import { Elysia } from "elysia";
import { timingSafeEqual, randomUUID } from "crypto";

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

type SseEmitter = (chunk: string) => void;

type BasicAuthCredentials = {
  username: string;
  password: string;
};

const LOGGER_DASHBOARD_USER = process.env.LOGGER_DASHBOARD_USER || "admin";
const LOGGER_DASHBOARD_PASSWORD = process.env.LOGGER_DASHBOARD_PASSWORD || "chatty123";
const LOGGER_DASHBOARD_REALM = "Chatty Logger";

function decodeBasicAuthHeader(headerValue: string | null): BasicAuthCredentials | null {
  if (!headerValue?.startsWith("Basic ")) return null;
  const base64Payload = headerValue.slice("Basic ".length).trim();
  const decoded = Buffer.from(base64Payload, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex <= 0) return null;
  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function secureCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function unauthorizedResponse(): Response {
  return buildJsonResponse("Authentication required", 401, {
    "WWW-Authenticate": `Basic realm=\"${LOGGER_DASHBOARD_REALM}\", charset=\"UTF-8\"`,
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
  });
}

function isAuthorizedDashboardRequest(request: Request): boolean {
  const credentials = decodeBasicAuthHeader(request.headers.get("authorization"));
  if (!credentials) return false;
  return (
    secureCompare(credentials.username, LOGGER_DASHBOARD_USER)
    && secureCompare(credentials.password, LOGGER_DASHBOARD_PASSWORD)
  );
}

function buildRequestMeta(request: Request): Record<string, unknown> {
  return {
    method: request.method,
    path: new URL(request.url).pathname,
    userAgent: request.headers.get("user-agent") || "unknown",
    forwardedFor: request.headers.get("x-forwarded-for") || "unknown",
  };
}

function captureRequestMeta(request: Request): Record<string, unknown> {
  return buildRequestMeta(request);
}

function buildJsonResponse(body: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers });
}

function buildSseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

function createEmitter(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  onError: () => void,
): SseEmitter {
  return (chunk: string) => {
    try {
      controller.enqueue(encoder.encode(chunk));
    } catch {
      onError();
    }
  };
}

function createSseHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  };
}

function authorizedLoggerRequest(request: Request): boolean {
  return isAuthorizedDashboardRequest(request);
}

function formatHistoricalSse(log: LogEntry): string {
  return `data: ${JSON.stringify(log)}\n\n`;
}

function attachAbortCleanup(
  request: Request,
  emit: SseEmitter,
  removeClient: () => void,
  onDisconnect: () => void,
): void {
  request.signal.addEventListener("abort", () => {
    removeClient();
    onDisconnect();
  });
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
  private clients: Set<SseEmitter> = new Set();
  private maxLogs = 1000;

  private appendLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
  }

  private emitToClients(entry: LogEntry): void {
    const payload = `data: ${JSON.stringify(entry)}\n\n`;
    this.clients.forEach((emit) => emit(payload));
  }

  private printToConsole(entry: LogEntry): void {
    const levelMethod = entry.level === "ERROR" ? "error" : entry.level === "WARN" ? "warn" : "log";
    if (entry.data !== undefined) {
      console[levelMethod](`[${entry.timestamp}] [${entry.level}] [${entry.scope}] ${entry.message}`, entry.data);
      return;
    }
    console[levelMethod](`[${entry.timestamp}] [${entry.level}] [${entry.scope}] ${entry.message}`);
  }

  private createLogEntry(level: LogLevel, scope: LogScope, message: string, data?: unknown): LogEntry {
    return {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      data: data !== undefined ? this.serializeData(data) : undefined,
    };
  }

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
    const entry = this.createLogEntry(level, scope, message, data);
    this.printToConsole(entry);
    this.appendLog(entry);
    this.emitToClients(entry);
  }

  info(scope: LogScope, message: string, data?: unknown) { this.pushLog("INFO", scope, message, data); }
  warn(scope: LogScope, message: string, data?: unknown) { this.pushLog("WARN", scope, message, data); }
  error(scope: LogScope, message: string, data?: unknown) { this.pushLog("ERROR", scope, message, data); }

  private rejectUnauthorizedLoggerRequest(request: Request, message: string): Response {
    this.warn("HTTP", message, captureRequestMeta(request));
    return unauthorizedResponse();
  }

  private registerSseClient(emit: SseEmitter): void {
    this.clients.add(emit);
  }

  private removeSseClient(emit: SseEmitter): void {
    this.clients.delete(emit);
  }

  private replayLogs(emit: SseEmitter): void {
    this.logs.forEach((log) => emit(formatHistoricalSse(log)));
  }

  private createSseStream(request: Request, encoder: TextEncoder): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: (controller) => {
        const emit = createEmitter(controller, encoder, () => this.removeSseClient(emit));
        this.registerSseClient(emit);
        this.replayLogs(emit);
        attachAbortCleanup(
          request,
          emit,
          () => this.removeSseClient(emit),
          () => this.info("HTTP", "Logger stream disconnected", captureRequestMeta(request)),
        );
      },
    });
  }

  private buildDashboardPageResponse(): Response {
    return new Response(DASHBOARD_HTML, { headers: { "Content-Type": "text/html" } });
  }

  private handleDashboardRequest(request: Request): Response {
    if (!authorizedLoggerRequest(request)) {
      return this.rejectUnauthorizedLoggerRequest(request, "Rejected unauthorized logger dashboard request");
    }
    this.info("HTTP", "Logger dashboard loaded", captureRequestMeta(request));
    return this.buildDashboardPageResponse();
  }

  private handleStreamRequest(request: Request, encoder: TextEncoder): Response {
    if (!authorizedLoggerRequest(request)) {
      return this.rejectUnauthorizedLoggerRequest(request, "Rejected unauthorized logger stream request");
    }
    this.info("HTTP", "Logger stream connected", captureRequestMeta(request));
    return new Response(this.createSseStream(request, encoder), { headers: createSseHeaders() });
  }

  private createSseHandler() {
    const encoder = new TextEncoder();
    return ({ request }: { request: Request }) => this.handleStreamRequest(request, encoder);
  }

  private createRoutes() {
    return new Elysia()
      .get("/", ({ request }) => this.handleDashboardRequest(request))
      .get("/stream", this.createSseHandler());
  }

  start() {
    try {
      const server = this.createRoutes();
      server.listen(4001, () => {
        console.log("🦊 Logger Dashboard running at http://localhost:4001");
      });
    } catch (err) {
      console.error("Logger dashboard failed to start:", err);
    }
  }
}

export const Logger = new LogService();
