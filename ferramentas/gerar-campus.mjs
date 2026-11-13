// Gera js/dados-campus.js: o campus sede em vetor, tirado dos dados do próprio app.
// Uso:  node ferramentas/gerar-campus.mjs  [caminho-do-repositório]
// Prédios e caminhos vêm de src/data/rede-mapa.json; a rota é calculada pelo roteador do app
// (src/lib/routing/campus-router.ts), com a mesma origem e o mesmo destino do clipe 03-rota.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = path.resolve(process.argv[2] ?? "C:/Users/pedro/orca/navos-ufcg");
const aqui = path.dirname(fileURLToPath(import.meta.url));
const saida = path.join(aqui, "..", "js", "dados-campus.js");

const json = async (rel) => JSON.parse(await readFile(path.join(repo, rel), "utf8"));
const rede = await json("src/data/rede-mapa.json");
const grafo = await json("src/data/campus-graph.json");
const { CampusRouter } = await import(pathToFileURL(path.join(repo, "src/lib/routing/campus-router.ts")).href);

// Projeção plana em metros: o campus tem menos de 1 km, a distorção é desprezível.
const LAT0 = -7.21425, LNG0 = -35.9092;
const M_GRAU = 111_320;
const kx = Math.cos((LAT0 * Math.PI) / 180) * M_GRAU;
const proj = (lat, lng) => [(lng - LNG0) * kx, -(lat - LAT0) * M_GRAU];
const n = (v) => Math.round(v * 10) / 10;
const caminho = (pts, fechar) => pts.map(([x, y], i) => `${i ? "L" : "M"}${n(x)} ${n(y)}`).join("") + (fechar ? "Z" : "");

// Locais (notas do Obsidian): só id, nome curto, sigla e posição.
const dirLocais = path.join(repo, "content/locais");
const locais = [];
for (const arq of await readdir(dirLocais)) {
  if (!arq.endsWith(".md")) continue;
  const txt = await readFile(path.join(dirLocais, arq), "utf8");
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(txt)?.[1] ?? "";
  const campo = (k) => new RegExp(`^${k}:\\s*"?([^"\\r\\n]*)"?\\s*$`, "m").exec(fm)?.[1]?.trim();
  const lat = Number(campo("lat")), lng = Number(campo("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  locais.push({ id: campo("id"), nome: campo("nome"), sigla: campo("nome-mapa") || campo("codigo") || "", categoria: campo("categoria"), lat, lng });
}

// Rota: do ponto perto do BD até a Central de Aulas CAA, como no clipe.
const ORIGEM = [-7.216435, -35.910621];
const caa = locais.find((l) => l.id === "caa-central-de-aulas");
const rota = new CampusRouter(grafo).rota(ORIGEM, [caa.lat, caa.lng]);
if (!rota) throw new Error("o roteador não achou a rota");
const rotaXY = rota.pontos.map(([lat, lng]) => proj(lat, lng));

// Prédios em faixas, da origem da rota para fora: cada faixa acende de uma vez na página.
const [ox, oy] = rotaXY[0];
const FAIXAS = 10;
const predios = rede.predios.map(([id, , ...c]) => {
  const pts = [];
  for (let i = 0; i < c.length; i += 2) pts.push(proj(c[i + 1], c[i]));
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { id, pts, cx, cy, dist: Math.hypot(cx - ox, cy - oy) };
});
const maxDist = Math.max(...predios.map((p) => p.dist));
const faixas = Array.from({ length: FAIXAS }, () => []);
for (const p of predios) faixas[Math.min(FAIXAS - 1, Math.floor((p.dist / maxDist) * FAIXAS))].push(caminho(p.pts, true));

const trechos = rede.trechos.map(([, ...c]) => {
  const pts = [];
  for (let i = 0; i < c.length; i += 2) pts.push(proj(c[i + 1], c[i]));
  return caminho(pts, false);
});

// Rótulos: prédios com sigla a até 45 m da rota (sem repetir sigla), mais o destino.
const distSeg = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};
let acumulado = 0;
const metros = [0];
for (let i = 1; i < rotaXY.length; i++) metros.push((acumulado += Math.hypot(rotaXY[i][0] - rotaXY[i - 1][0], rotaXY[i][1] - rotaXY[i - 1][1])));
const rotulos = [];
for (const l of locais) {
  if (!l.sigla || l.sigla.length > 6 || /Entrada|Estacionamento/.test(l.nome)) continue;
  const p = proj(l.lat, l.lng);
  let melhor = Infinity, em = 0;
  for (let i = 1; i < rotaXY.length; i++) {
    const d = distSeg(p, rotaXY[i - 1], rotaXY[i]);
    if (d < melhor) { melhor = d; em = metros[i - 1]; }
  }
  if (melhor <= 45 || l.id === caa.id) rotulos.push({ sigla: l.sigla, nome: l.nome, x: n(p[0]), y: n(p[1]), em: Math.round(em), d: melhor });
}
// Só siglas de verdade (maiúsculas), sem repetir e sem amontoar: 34 m entre um rótulo e outro.
// O destino entra primeiro, para nunca ser o descartado.
rotulos.sort((a, b) => (b.sigla === caa.sigla) - (a.sigla === caa.sigla) || a.em - b.em);
const escolhidos = [];
for (const r of rotulos) {
  if (!/^[A-Z0-9]{2,6}$/.test(r.sigla) || escolhidos.some((o) => o.sigla === r.sigla)) continue;
  if (escolhidos.some((o) => Math.hypot(o.x - r.x, o.y - r.y) < 34)) continue;
  escolhidos.push(r);
}
const rotulosUnicos = escolhidos.sort((a, b) => a.em - b.em).map(({ d, ...r }) => r);

const xs = [...predios.flatMap((p) => p.pts.map((q) => q[0]))], ys = [...predios.flatMap((p) => p.pts.map((q) => q[1]))];
const dados = {
  // Atribuição obrigatória da base (ODbL).
  fonte: grafo.fonte,
  caixa: [n(Math.min(...xs)), n(Math.min(...ys)), n(Math.max(...xs)), n(Math.max(...ys))],
  faixas: faixas.map((f) => f.join("")),
  trechos,
  rota: { d: caminho(rotaXY, false), metros: Math.round(rota.distanciaM), segundos: Math.round(rota.duracaoS), destino: caa.nome, sigla: caa.sigla },
  rotulos: rotulosUnicos,
  numeros: { locais: locais.length, predios: predios.length, trechos: rede.estatistica.trechos, metros: rede.estatistica.metros },
};
await writeFile(saida, `// Gerado por ferramentas/gerar-campus.mjs a partir dos dados do app. Não edite à mão.\nwindow.NAVOS_CAMPUS = ${JSON.stringify(dados)};\n`);
console.log(`${path.relative(process.cwd(), saida)}: ${(JSON.stringify(dados).length / 1024).toFixed(0)} KB`);
console.log(`rota: ${dados.rota.metros} m, ${Math.round(dados.rota.segundos / 60)} min, ${rotaXY.length} pontos`);
console.log(`rótulos: ${rotulosUnicos.map((r) => `${r.sigla}@${r.em}m`).join(", ")}`);
console.log(`números: ${JSON.stringify(dados.numeros)} · caixa ${dados.caixa.join(" ")}`);
