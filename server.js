const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const PORT = Number(process.env.AGENT_DASHBOARD_PORT || 8787);
const ROOT = __dirname;

function runOpenClaw(args) {
  return new Promise((resolve, reject) => {
    execFile('openclaw', args, { timeout: 15000, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr.trim() || error.message));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error('OpenClaw 回傳的 JSON 無法解析')); }
    });
  });
}

function statusFromSession(session) {
  if (!session) return 'idle';
  if (['running', 'active', 'streaming'].includes(session.status)) return 'working';
  if (['error', 'failed', 'killed', 'aborted'].includes(session.status)) return 'error';
  if (session.status === 'done') return 'done';
  return 'idle';
}

async function getAgents() {
  const [agents, sessionData] = await Promise.all([
    runOpenClaw(['agents', 'list', '--json']),
    runOpenClaw(['sessions', 'list', '--all-agents', '--limit', '100', '--json'])
  ]);
  const latest = new Map();
  for (const session of sessionData.sessions || []) {
    const old = latest.get(session.agentId);
    if (!old || session.updatedAt > old.updatedAt) latest.set(session.agentId, session);
  }
  return agents.map(agent => {
    const session = latest.get(agent.id);
    const status = statusFromSession(session);
    return {
      id: agent.id,
      name: agent.name || agent.id,
      emoji: agent.identityEmoji || '🤖',
      model: agent.model || '未指定',
      workspace: agent.workspace,
      status,
      task: session?.label || (status === 'idle' ? '等待新任務' : status === 'done' ? '最近工作已完成' : '需要檢查'),
      progress: status === 'done' ? 100 : status === 'working' ? 68 : status === 'error' ? 35 : 0,
      sessionId: session?.sessionId || '尚無 session',
      updatedAt: session?.updatedAt || null
    };
  });
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/agents') {
    try { return send(res, 200, 'application/json', JSON.stringify({ source: 'openclaw', agents: await getAgents() })); }
    catch (error) { return send(res, 502, 'application/json', JSON.stringify({ source: 'openclaw', error: error.message })); }
  }
  const requested = url.pathname === '/' ? '/agents-dashboard.html' : url.pathname;
  const file = path.resolve(ROOT, `.${requested}`);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'text/plain', 'Not found');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  send(res, 200, types[path.extname(file)] || 'application/octet-stream', fs.readFileSync(file));
});

server.listen(PORT, '127.0.0.1', () => console.log(`Agent dashboard: http://127.0.0.1:${PORT}`));
