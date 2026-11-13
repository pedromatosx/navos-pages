// Injeta a marca oficial em index.html (entre "marca:inicio" e "marca:fim") e grava midia/icone.svg.
// Uso:  node ferramentas/gerar-marca.mjs  [caminho-do-repositório]
// A geometria vem de src/components/abertura/MarcaOficial.tsx: nada é redesenhado aqui.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(process.argv[2] ?? "C:/Users/pedro/orca/navos-ufcg");
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsx = await readFile(path.join(repo, "src/components/abertura/MarcaOficial.tsx"), "utf8");

const d = (re, rotulo) => {
  const m = re.exec(tsx);
  if (!m) throw new Error(`não achei ${rotulo} em MarcaOficial.tsx`);
  return m[1];
};
const peca = (nome) => d(new RegExp(`<path[^>]*data-peca="${nome}"[^>]*\\sd="([^"]+)"`), nome);
const porCor = (cor) => d(new RegExp(`<path fill="${cor}" d="([^"]+)"`), cor);

const corpo = d(/<path fill="var\(--abertura-tinta\)" d="([^"]+)"/, "corpo do ícone");
const pino = d(/<path fill="var\(--abertura-fundo\)" d="([^"]+)"/, "pino");
const seta = peca("arrow");
const cinzas = ["#c4c4c4", "#606060", "#5c5c5c", "#777"].map((c) => [c, porCor(c)]);
const letras = ["N", "a", "v", "O", "S"].map((l) => [l, peca(l)]);
const ufcg = [...d(/<g data-peca="ufcg">([\s\S]*?)<\/g>/, "ufcg").matchAll(/d="([^"]+)"/g)].map((m) => m[1]);

const icone = (tinta, fundo) => `<path fill="${tinta}" d="${corpo}"/>${cinzas.map(([c, p]) => `<path fill="${c}" d="${p}"/>`).join("")}<path fill="${fundo}" d="${pino}"/><path fill="${tinta}" d="${seta}"/>`;

const sprite = `<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false">
  <defs>
    <!-- Cromo: céu claro em cima, horizonte escuro no meio, chão claro embaixo. O JS desliza o brilho. -->
    <linearGradient id="cromo" gradientUnits="userSpaceOnUse" x1="0" y1="214" x2="0" y2="440">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".28" stop-color="#d3d8e0"/><stop offset=".47" stop-color="#868b94"/>
      <stop offset=".5" stop-color="#1d1d1f"/><stop offset=".56" stop-color="#4a4846"/><stop offset=".8" stop-color="#b3aeaa"/><stop offset="1" stop-color="#f5f5f7"/>
    </linearGradient>
    <linearGradient id="cromo-brilho" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="330" y2="0" gradientTransform="translate(400) skewX(-24)">
      <stop offset="0" stop-color="#9ac8ff" stop-opacity="0"/><stop offset=".4" stop-color="#9ac8ff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/>
      <stop offset=".6" stop-color="#ffd9a8" stop-opacity=".3"/><stop offset="1" stop-color="#ffd9a8" stop-opacity="0"/>
    </linearGradient>
    <g id="marca-icone" fill-rule="evenodd">${icone("currentColor", "var(--marca-fundo, #000)")}</g>
${letras.map(([l, p]) => `    <path id="l-${l}" fill-rule="evenodd" d="${p}"/>`).join("\n")}
    <g id="l-ufcg" fill-rule="evenodd">${ufcg.map((p) => `<path d="${p}"/>`).join("")}</g>
    <g id="marca-letras">${letras.map(([l]) => `<use href="#l-${l}"/>`).join("")}</g>
  </defs>
</svg>`;

const arq = path.join(raiz, "index.html");
const html = await readFile(arq, "utf8");
const re = /(<!-- marca:inicio -->)[\s\S]*?(<!-- marca:fim -->)/;
if (!re.test(html)) throw new Error("index.html sem os marcadores marca:inicio / marca:fim");
await writeFile(arq, html.replace(re, (_, a, b) => `${a}\n${sprite}\n${b}`));

await writeFile(
  path.join(raiz, "midia", "icone.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="150 82 510 515" fill-rule="evenodd"><rect x="150" y="82" width="510" height="515" rx="120" fill="#000"/>${icone("#f5f5f7", "#000")}</svg>\n`,
);
console.log(`marca injetada em index.html (${(sprite.length / 1024).toFixed(0)} KB) e midia/icone.svg gravado`);
