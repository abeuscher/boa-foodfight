/**
 * Static file server for the replay viewer.
 *
 *   pnpm viewer [--port 8080] [--out out]
 *
 * Serves three things:
 *   - GET /                      → viewer/index.html
 *   - GET /<file>                → static asset under viewer/
 *   - GET /api/runs              → JSON array of run directory names
 *     (subdirectories of <out> that contain replay-*.jsonl)
 *   - GET /api/replays?run=NAME  → JSON array of replay-*.jsonl filenames
 *   - GET /api/replay?run=NAME&file=FILE → raw JSONL contents
 */

import fs from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sortReplaysBySeed } from '../harness/replay-utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Args {
  readonly port: number;
  readonly outDir: string;
}

const parseArgs = (argv: readonly string[]): Args => {
  let port = 8080;
  let outDir = path.join(process.cwd(), 'out');
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (flag === '--port' && val !== undefined) {
      port = Number(val);
      i += 1;
    } else if (flag === '--out' && val !== undefined) {
      outDir = val;
      i += 1;
    }
  }
  return { port, outDir };
};

const MIME = new Map<string, string>([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.jsonl', 'application/x-ndjson; charset=utf-8'],
]);

const findRuns = (outDir: string): readonly string[] => {
  if (!fs.existsSync(outDir)) return [];
  const entries = fs.readdirSync(outDir, { withFileTypes: true });
  const runs: string[] = [];
  const visit = (relPath: string): void => {
    const abs = path.join(outDir, relPath);
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (!stat.isDirectory()) return;
    const children = fs.readdirSync(abs);
    if (children.some((c) => c.startsWith('replay-') && c.endsWith('.jsonl'))) {
      runs.push(relPath);
    }
    for (const child of children) {
      const childPath = path.join(relPath, child);
      const childAbs = path.join(outDir, childPath);
      if (fs.existsSync(childAbs) && fs.statSync(childAbs).isDirectory()) {
        visit(childPath);
      }
    }
  };
  for (const e of entries) {
    if (e.isDirectory()) visit(e.name);
  }
  return runs.sort();
};

const findReplays = (outDir: string, run: string): readonly string[] => {
  const dir = path.join(outDir, run);
  if (!fs.existsSync(dir)) return [];
  return sortReplaysBySeed(
    fs.readdirSync(dir).filter((f) => f.startsWith('replay-') && f.endsWith('.jsonl')),
  );
};

const safeJoin = (base: string, rel: string): string | null => {
  const resolved = path.resolve(base, rel);
  const baseAbs = path.resolve(base);
  if (!resolved.startsWith(baseAbs + path.sep) && resolved !== baseAbs) return null;
  return resolved;
};

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  const viewerRoot = __dirname;

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${String(args.port)}`);
    const send = (status: number, body: string | Buffer, mime = 'text/plain'): void => {
      res.writeHead(status, { 'Content-Type': mime });
      res.end(body);
    };

    if (url.pathname === '/api/runs') {
      send(200, JSON.stringify(findRuns(args.outDir)), 'application/json');
      return;
    }
    if (url.pathname === '/api/replays') {
      const run = url.searchParams.get('run') ?? '';
      send(200, JSON.stringify(findReplays(args.outDir, run)), 'application/json');
      return;
    }
    if (url.pathname === '/api/replay') {
      const run = url.searchParams.get('run') ?? '';
      const file = url.searchParams.get('file') ?? '';
      const target = safeJoin(args.outDir, path.join(run, file));
      if (!target || !fs.existsSync(target)) {
        send(404, 'replay not found');
        return;
      }
      send(200, fs.readFileSync(target), 'application/x-ndjson; charset=utf-8');
      return;
    }

    // Static asset under viewer/
    const assetPath = url.pathname === '/' ? '/index.html' : url.pathname;
    const target = safeJoin(viewerRoot, '.' + assetPath);
    if (!target || !fs.existsSync(target)) {
      send(404, 'not found');
      return;
    }
    const ext = path.extname(target);
    send(200, fs.readFileSync(target), MIME.get(ext) ?? 'application/octet-stream');
  });

  server.listen(args.port, () => {
    console.log(`viewer: http://localhost:${String(args.port)}`);
    console.log(`  serving viewer/ + ${args.outDir}/`);
  });
};

main();
