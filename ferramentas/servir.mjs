// Servidor local da landing, só para ver a página no navegador.
// Uso:  node ferramentas/servir.mjs  [porta]     → http://localhost:4174
// Atende pedidos por faixa (Range), que o vídeo precisa para saltar no tempo.
// (O "python -m http.server" não atende, e os vídeos em laço travam com ele.)
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const porta = Number(process.argv[2] ?? 4174);
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let arq = path.join(raiz, rel);
    // Nada fora da pasta da landing.
    if (arq !== raiz && !arq.startsWith(raiz + path.sep)) { res.writeHead(403).end(); return; }
    let info = await stat(arq);
    if (info.isDirectory()) { arq = path.join(arq, "index.html"); info = await stat(arq); }
    const base = { "Content-Type": TIPOS[path.extname(arq).toLowerCase()] ?? "application/octet-stream", "Accept-Ranges": "bytes", "Cache-Control": "no-cache" };
    const faixa = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (faixa && (faixa[1] || faixa[2])) {
      const ini = faixa[1] ? Number(faixa[1]) : Math.max(0, info.size - Number(faixa[2]));
      const fim = faixa[1] && faixa[2] ? Math.min(Number(faixa[2]), info.size - 1) : info.size - 1;
      if (ini > fim || ini >= info.size) { res.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end(); return; }
      res.writeHead(206, { ...base, "Content-Range": `bytes ${ini}-${fim}/${info.size}`, "Content-Length": fim - ini + 1 });
      if (req.method === "HEAD") return res.end();
      createReadStream(arq, { start: ini, end: fim }).pipe(res);
      return;
    }
    res.writeHead(200, { ...base, "Content-Length": info.size });
    if (req.method === "HEAD") return res.end();
    createReadStream(arq).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Não encontrado");
  }
}).listen(porta, "127.0.0.1", () => console.log(`NavOS — landing em http://localhost:${porta}`));
