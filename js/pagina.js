// NavOS — landing page.
// Um motor de rolagem pequeno (sem biblioteca): cada "cena" fica presa na tela e recebe um
// progresso de 0 a 1, suavizado quadro a quadro. O resto é montagem do aparelho em 3D,
// galeria, mapa vetorial do campus e os controles.
(() => {
  "use strict";

  const raiz = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  raiz.classList.add("js");
  if (calmo) raiz.classList.add("calmo");

  const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const misturar = (a, b, t) => a + (b - a) * t;
  const trecho = (p, a, b) => limitar((p - a) / (b - a));
  const suave = (t) => t * t * (3 - 2 * t);
  const sai = (t) => 1 - Math.pow(1 - t, 3);
  const entraSai = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const criar = (tag, classe) => Object.assign(document.createElement(tag), { className: classe });
  const n = (v, casas = 2) => Number(v.toFixed(casas));

  // Escreve um estilo só quando o valor muda. As variáveis CSS vão sempre no próprio elemento que as usa:
  // numa variável herdada, cada escrita no pai recalcula o estilo de todos os filhos, a cada quadro.
  const escrito = new WeakMap();
  const definir = (el, prop, valor) => {
    let m = escrito.get(el);
    if (!m) escrito.set(el, (m = {}));
    if (m[prop] === valor) return;
    m[prop] = valor;
    if (prop.startsWith("--")) el.style.setProperty(prop, valor); else el.style[prop] = valor;
  };
  const surgir = (el, visivel, dy) => { definir(el, "opacity", n(visivel, 3)); definir(el, "transform", `translate3d(0,${n(dy, 1)}px,0)`); };

  let vw = raiz.clientWidth;
  let vh = innerHeight;
  const estreito = () => vw <= 900;

  /* ------------------------------------------------------------------ vídeo */
  const tocar = (v) => {
    if (!v || calmo) return;
    const p = v.play();
    if (p) p.catch(() => {}); // o navegador pode recusar; a capa continua no lugar
  };
  const parar = (v) => { if (v && !v.paused) v.pause(); };
  const irPara = (v, t) => {
    if (calmo) return; // com movimento reduzido, cada vídeo fica na capa até a pessoa mandar tocar
    const pular = () => { try { v.currentTime = t; } catch { /* ainda sem metadados */ } };
    if (v.readyState >= 1) return pular();
    v.addEventListener("loadedmetadata", pular, { once: true });
    v.preload = "auto"; // os vídeos nascem com preload="none": é o salto que manda carregar
  };

  /* --------------------------------------------------------------- aparelho */
  // Frente, verso e a lateral em facetas: 4 paredes retas e 10 facetas por canto. É geometria de
  // verdade, então o aparelho pode ficar de perfil sem "sumir" como um cartão.
  const MEIA_L = 0.5, MEIA_A = 2.0826 / 2, RAIO = 0.148, FACETAS = 10;
  function montarAparelho(el) {
    const tela = $(".aparelho__tela", el);
    const corpo = criar("div", "aparelho__corpo");
    const verso = criar("div", "aparelho__verso");
    verso.innerHTML = '<i class="aparelho__ilha"></i><svg viewBox="150 82 510 515" aria-hidden="true"><use href="#marca-icone"/></svg>';
    corpo.append(verso);
    const parede = (fx, fy, comprimento, graus, extra = "") => {
      const s = criar("i", `aparelho__lado ${extra}`);
      const rad = (graus * Math.PI) / 180;
      const luz = Math.cos(rad) * -0.4 + Math.sin(rad) * -0.8; // luz vinda de cima, um pouco da esquerda
      s.style.cssText = `--x:calc(var(--w)*${n(fx, 4)});--y:calc(var(--w)*${n(fy, 4)});--l:calc(var(--w)*${n(comprimento, 4)} + 0.9px);--a:${n(graus + 90)}deg;--sombra:${n(limitar(0.3 - 0.34 * luz, 0, 0.62), 3)}`;
      corpo.append(s);
    };
    parede(MEIA_L, 0, 2 * (MEIA_A - RAIO), 0);
    parede(-MEIA_L, 0, 2 * (MEIA_A - RAIO), 180);
    parede(0, MEIA_A, 2 * (MEIA_L - RAIO), 90);
    parede(0, -MEIA_A, 2 * (MEIA_L - RAIO), 270);
    const passo = 90 / FACETAS;
    const faceta = 2 * RAIO * Math.tan(((passo / 2) * Math.PI) / 180);
    const cantos = [[MEIA_L - RAIO, MEIA_A - RAIO, 0], [RAIO - MEIA_L, MEIA_A - RAIO, 90], [RAIO - MEIA_L, RAIO - MEIA_A, 180], [MEIA_L - RAIO, RAIO - MEIA_A, 270]];
    for (const [cx, cy, inicio] of cantos) {
      for (let i = 0; i < FACETAS; i++) {
        const g = inicio + (i + 0.5) * passo, rad = (g * Math.PI) / 180;
        parede(cx + RAIO * Math.cos(rad), cy + RAIO * Math.sin(rad), faceta, g);
      }
    }
    parede(MEIA_L + 0.007, -0.4, 0.2, 0, "aparelho__botao");
    parede(MEIA_L + 0.007, -0.13, 0.11, 0, "aparelho__botao");
    const frente = criar("div", "aparelho__frente");
    const vidro = criar("i", "aparelho__vidro");
    frente.append(tela, criar("i", "aparelho__camera"), vidro);
    corpo.append(frente);
    el.append(corpo);
    el.classList.add("pronto");
    el.corpo = corpo;
    el.brilho = (v) => definir(vidro, "--brilho", n(v, 3));
    el.aro = (v) => definir(frente, "--aro", n(v, 2));
  }
  $$("[data-aparelho]").forEach(montarAparelho);
  const pose = (corpo, { x = 0, y = 0, rolo = 0, giro = 0, queda = 0, pe = 0, s = 1 }) => {
    definir(corpo, "transform", `translate3d(${n(x, 1)}px,${n(y, 1)}px,0) rotateZ(${n(rolo)}deg) rotateY(${n(giro)}deg) rotateX(${n(queda)}deg) rotateZ(${n(pe)}deg) scale3d(${n(s, 4)},${n(s, 4)},${n(s, 4)})`);
  };

  /* ------------------------------------------------------------------ cenas */
  const cenas = [];
  const cena = (nome, def) => {
    const el = $(`[data-cena="${nome}"]`);
    if (!el) return null;
    const c = { nome, el, palco: $(".cena__fixo", el), p: 0, alvo: 0, ini: 0, fim: 1, alt: vh, visivel: false, visto: -1, continua: false, ...def };
    cenas.push(c);
    return c;
  };
  const ponteiro = { x: 0, y: 0, ax: 0, ay: 0 };
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    ponteiro.ax = (e.clientX / vw) * 2 - 1;
    ponteiro.ay = (e.clientY / vh) * 2 - 1;
  }, { passive: true });
  const rolarAte = (y) => scrollTo({ top: Math.round(y), behavior: calmo ? "auto" : "smooth" });

  /* ------------------------------------------------------------------- hero */
  const hero = cena("hero", {
    continua: true,
    estatico: 0,
    montar(c) {
      c.marca = $("[data-marca]", c.el);
      c.aparelho = $(".aparelho", c.el);
      c.video = $("video", c.el);
      c.texto = $(".hero__texto", c.el);
      c.acoes = $(".hero__acoes", c.el);
      c.brilho = $("#cromo-brilho");
      // A marca em camadas: a da frente é cromo, as de trás escurecem. Inclinada, parece ter espessura.
      const frente = $("svg", c.marca);
      frente.insertAdjacentHTML("beforeend", '<use href="#marca-letras" fill="url(#cromo-brilho)"/>');
      const CAMADAS = 9;
      c.camadas = [frente];
      for (let i = 1; i < CAMADAS; i++) {
        const k = i / (CAMADAS - 1);
        const tom = Math.round(misturar(150, 14, Math.pow(k, 0.7)));
        const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        s.setAttribute("viewBox", frente.getAttribute("viewBox"));
        s.innerHTML = `<use href="#marca-letras" fill="rgb(${tom},${tom},${tom + 3})"/>`;
        c.marca.prepend(s);
        c.camadas.push(s);
      }
      c.inicio = performance.now();
      c.levantou = false;
    },
    medir(c) {
      const larguraMarca = c.marca.offsetWidth;
      const deitado = larguraMarca * 0.37; // deitado, o comprimento cobre ~77% da marca
      const emPe = Math.min((c.alt * 0.7) / 2.0826, vw * 0.6);
      const base = Math.max(deitado, emPe); // desenhado no maior tamanho: nunca amplia pixels
      c.aparelho.style.setProperty("--w", `${n(base, 1)}px`);
      c.sA = deitado / base;
      c.sB = emPe / base;
      c.assento = c.marca.offsetHeight * 0.13; // deitado, o aparelho fica um pouco abaixo do meio das letras
      c.fundo = larguraMarca * 0.0062;
      c.camadas.forEach((s, i) => { s.style.transform = `translateZ(${n(-i * c.fundo, 1)}px)`; });
      const centro = c.aparelho.offsetTop + c.aparelho.offsetHeight / 2;
      c.descida = c.alt * (estreito() ? 0.5 : 0.53) - centro;
    },
    entrar(c) { tocar(c.video); },
    sair(c) { parar(c.video); },
    quadro(p, agora, c) {
      const t = agora - c.inicio;
      const chega = calmo ? 1 : sai(trecho(t, 200, 2700));
      const e = entraSai(trecho(p, 0.03, 0.8));
      const repouso = 1 - e;
      const balancoQueda = calmo ? 0 : Math.sin(agora / 3300) * 1.5 * repouso;
      const balancoGiro = calmo ? 0 : Math.sin(agora / 5100) * 3 * repouso;
      // Deitado, o aparelho fica inteiro na frente das letras, cobrindo a faixa de baixo delas:
      // o topo de cada letra continua à vista, e a marca segue legível.
      pose(c.aparelho.corpo, {
        y: misturar(c.assento, c.descida, e) + (1 - chega) * 30,
        rolo: misturar(-3.5, 0, e),
        giro: misturar(-8 + balancoGiro + ponteiro.x * 7, ponteiro.x * 5, e) - Math.sin(Math.PI * e) * 22,
        queda: misturar(misturar(89.6, 81.5, chega) + balancoQueda - ponteiro.y * 2.5, -ponteiro.y * 3, e),
        pe: misturar(-90, 0, e),
        s: misturar(c.sA, c.sB, e),
      });
      c.aparelho.brilho(ponteiro.x * 0.5 + e * 0.4);
      // Quase de perfil, o aro claro da frente vira uma linha de meio pixel e serrilha: ele só acende ao levantar.
      c.aparelho.aro(misturar(0.1, 1, suave(trecho(e, 0.1, 0.6))));

      // A marca recua e apaga quando o aparelho se levanta. A opacidade vai em cada camada (e não no
      // grupo) para o grupo continuar em 3D.
      const acende = calmo ? 1 : trecho(t, 80, 1100);
      const apaga = suave(trecho(e, 0.04, 0.8));
      const luzFrente = n(acende * misturar(1, 0.12, apaga), 3);
      if (luzFrente !== c.luzFrente) {
        c.luzFrente = luzFrente;
        const luzFundo = n(luzFrente * (1 - apaga), 3);
        c.camadas.forEach((s, i) => { s.style.opacity = i ? luzFundo : luzFrente; });
      }
      definir(c.marca, "transform", `translate3d(0,${n(-e * c.alt * 0.04, 1)}px,${n(-e * 460, 1)}px) rotateX(${n(-ponteiro.y * 5)}deg) rotateY(${n(ponteiro.x * 8 + balancoGiro * 0.6)}deg)`);

      // O brilho atravessa o cromo na entrada e depois de tempos em tempos.
      let faixa = -400;
      if (!calmo) {
        if (t < 2600) faixa = misturar(380, 1900, suave(trecho(t, 500, 2500)));
        else { const ciclo = ((t - 2600) % 7200) / 1900; if (ciclo < 1) faixa = misturar(380, 1900, suave(ciclo)); }
      }
      if (faixa !== c.faixa) { c.faixa = faixa; c.brilho.setAttribute("gradientTransform", `translate(${n(faixa, 1)}) skewX(-24)`); }

      // Texto e botão: entram no carregamento (um depois do outro) e saem com a rolagem.
      const some = suave(trecho(p, 0.1, 0.34));
      const entra = calmo ? 1 : sai(trecho(t, 1000, 1900)), entra2 = calmo ? 1 : sai(trecho(t, 1250, 2150));
      surgir(c.texto, entra * (1 - some), (1 - entra) * 26 - some * 34);
      surgir(c.acoes, entra2 * (1 - some), (1 - entra2) * 26 - some * 34);

      // Quando o aparelho fica de pé, a abertura do app recomeça: a marca aparece na tela e dá lugar ao mapa.
      if (e > 0.5 && !c.levantou) { c.levantou = true; irPara(c.video, 0.9); tocar(c.video); }
      else if (e < 0.2) c.levantou = false;
    },
  });

  /* --------------------------------------------------------------- explorar */
  const explorar = cena("explorar", {
    continua: true,
    estatico: 0.2,
    montar(c) {
      c.lista = $$(".recurso", c.el);
      c.aparelho = $(".aparelho", c.el);
      c.midias = $$("[data-midia]", c.aparelho);
      c.ativo = -1;
      c.impulso = 0;
      c.legenda = criar("p", "vitrine__legenda");
      $(".vitrine", c.el).append(c.legenda);
      c.lista.forEach((li, i) => {
        const dobra = $(".recurso__dobra", li);
        dobra.id = `recurso-${i}`;
        const botao = $("button", li);
        botao.setAttribute("aria-controls", dobra.id);
        botao.addEventListener("click", () => {
          if (calmo || c.fim <= c.ini) return c.ativar(i);
          rolarAte(c.ini + (0.16 + ((i + 0.5) / c.lista.length) * 0.84) * (c.fim - c.ini));
        });
      });
      c.ativar = (i) => {
        if (i === c.ativo) return;
        const antes = c.ativo;
        c.ativo = i;
        c.lista.forEach((li, j) => { li.classList.toggle("aberto", j === i); $("button", li).setAttribute("aria-expanded", String(j === i)); });
        const li = c.lista[i], chave = li.dataset.midia;
        c.faixa = li.dataset.de ? [Number(li.dataset.de), Number(li.dataset.ate)] : null;
        for (const m of c.midias) {
          const ativa = m.dataset.midia === chave;
          m.classList.toggle("ativa", ativa);
          if (m.tagName !== "VIDEO") continue;
          if (ativa) { c.video = m; irPara(m, c.faixa[0]); if (c.visivel) tocar(m); } else parar(m);
        }
        if (!c.midias.some((m) => m.tagName === "VIDEO" && m.dataset.midia === chave)) c.video = null;
        if (antes >= 0) c.impulso = (i > antes ? -1 : 1) * 26;
        // No celular a lista vira uma fileira de botões e a explicação fica embaixo.
        c.legenda.classList.add("trocando");
        setTimeout(() => { c.legenda.textContent = $("p", li).textContent; c.legenda.classList.remove("trocando"); }, 160);
        const trilho = li.parentElement;
        if (trilho.scrollWidth > trilho.clientWidth) trilho.scrollTo({ left: li.offsetLeft - (trilho.clientWidth - li.offsetWidth) / 2, behavior: calmo ? "auto" : "smooth" });
      };
    },
    medir(c) {
      // Largura de cada botão fechado, para a abertura animar de pílula a cartão.
      c.lista.forEach((li) => { li.style.removeProperty("--fechado"); });
      if (estreito()) return;
      c.lista.forEach((li) => {
        const botao = $("button", li);
        botao.style.width = "max-content";
        li.style.setProperty("--fechado", `${botao.offsetWidth}px`);
        botao.style.width = "";
      });
    },
    entrar(c) { if (c.video) tocar(c.video); },
    sair(c) { c.midias.forEach((m) => m.tagName === "VIDEO" && parar(m)); },
    quadro(p, agora, c, dt) {
      const chega = sai(trecho(p, 0, 0.13));
      const deriva = trecho(p, 0.13, 1);
      c.impulso *= Math.exp(-dt / 300);
      pose(c.aparelho.corpo, {
        y: (1 - chega) * 70,
        giro: misturar(204, -24, chega) + deriva * 42 + c.impulso + ponteiro.x * 4,
        queda: misturar(16, 5, chega) - deriva * 5 - ponteiro.y * 2,
        s: misturar(0.72, 1, chega),
      });
      c.aparelho.brilho(-0.5 + deriva + c.impulso / 40);
      c.lista.forEach((li, i) => definir(li, "--surge", calmo ? 1 : n(suave(trecho(p, 0.07 + i * 0.012, 0.14 + i * 0.012)), 3)));
      c.ativar(limitar(Math.floor(trecho(p, 0.16, 1) * c.lista.length - 1e-6), 0, c.lista.length - 1));
      if (c.video && c.faixa && c.video.currentTime >= c.faixa[1]) irPara(c.video, c.faixa[0]);
    },
  });

  /* ------------------------------------------------------------------- rota */
  cena("rota", {
    estatico: 1,
    montar(c) {
      c.aparelho = $(".aparelho", c.el);
      c.video = $("video", c.el);
      c.itens = [$(".rota__resumo", c.el), ...$$(".rota__fatos li", c.el)];
      c.titulo = $(".rota__titulo", c.el);
      c.veu = $(".rota__veu", c.el);
    },
    medir(c) {
      const w = c.aparelho.offsetWidth;
      c.telaAlt = w * 0.93 * (2532 / 1170);
      // Escala em que só a tela do app cabe na janela (a moldura fica de fora).
      c.cheio = Math.max(vw / (w * 0.93), c.alt / c.telaAlt) * 1.05;
      c.dx = estreito() ? 0 : -Math.min(vw * 0.2, 290);
      c.dy = estreito() ? -c.alt * 0.135 : 0;
    },
    entrar(c) { tocar(c.video); },
    sair(c) { parar(c.video); },
    quadro(p, agora, c) {
      const recua = entraSai(trecho(p, 0.14, 0.6));
      const s = Math.pow(c.cheio, 1 - recua); // escala geométrica: o recuo parece constante
      const lado = entraSai(trecho(p, 0.5, 0.8));
      pose(c.aparelho.corpo, {
        x: c.dx * lado,
        y: c.dy * lado + 0.1 * c.telaAlt * s * (1 - recua), // começa olhando o mapa, não o meio exato da tela
        giro: lado * (estreito() ? 0 : 17),
        queda: lado * 3,
        s,
      });
      c.aparelho.brilho(lado * 0.7 - 0.2);
      const titulo = 1 - suave(trecho(p, 0.08, 0.24));
      definir(c.titulo, "opacity", n(titulo, 3));
      definir(c.titulo, "transform", `scale(${n(1 + (1 - titulo) * 0.06, 4)})`);
      definir(c.veu, "opacity", n(1 - trecho(p, 0.1, 0.42), 3));
      c.itens.forEach((el, i) => { const f = suave(trecho(p, 0.68 + i * 0.045, 0.79 + i * 0.045)); surgir(el, f, (1 - f) * 26); });
    },
  });

  /* ----------------------------------------------------------------- campus */
  cena("campus", {
    estatico: 1,
    montar(c) {
      const D = window.NAVOS_CAMPUS;
      c.svg = $("[data-mapa]", c.el);
      if (!D) { c.quadro = () => {}; return; }
      c.D = D;
      // Trechos em 6 grupos, do começo da rota para fora: a rede se desenha como uma onda.
      const origem = D.rota.d.match(/-?[\d.]+/g).slice(0, 2).map(Number);
      const comDist = D.trechos.map((d) => { const [x, y] = d.match(/-?[\d.]+/g).map(Number); return { d, dist: Math.hypot(x - origem[0], y - origem[1]) }; });
      const maior = Math.max(...comDist.map((t) => t.dist));
      const GRUPOS = 6, grupos = Array.from({ length: GRUPOS }, () => []);
      for (const t of comDist) grupos[Math.min(GRUPOS - 1, Math.floor((t.dist / maior) * GRUPOS))].push(`<path pathLength="1" d="${t.d}"/>`);
      const rotulo = (r, destino) => {
        const w = 16 + r.sigla.length * 7.6;
        return `<g class="campus__rotulo${destino ? " campus__rotulo--destino" : ""}" data-em="${r.em}" data-x="${r.x}" data-y="${r.y}"><rect x="${-w / 2}" y="-11" width="${w}" height="22" rx="11"/><text>${r.sigla}</text></g>`;
      };
      c.svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
      c.svg.innerHTML =
        `<g class="campus__predios">${D.faixas.map((d) => `<path d="${d}"/>`).join("")}</g>` +
        `<g class="campus__trechos">${grupos.map((g) => `<g>${g.join("")}</g>`).join("")}</g>` +
        `<path class="campus__halo" d="${D.rota.d}"/><path class="campus__rota" d="${D.rota.d}"/>` +
        `<g>${D.rotulos.map((r) => rotulo(r, r.sigla === D.rota.sigla)).join("")}</g>` +
        `<g data-ponto><path class="campus__cone" d="M0 0L-15-30A34 34 0 0 1 15-30Z"/><circle class="campus__ponto-aura" r="15"/><circle class="campus__ponto-borda" r="8"/><circle class="campus__ponto-miolo" r="5.6"/></g>`;
      c.faixas = $$(".campus__predios path", c.svg);
      c.grupos = $$(".campus__trechos > g", c.svg);
      c.rota = $(".campus__rota", c.svg);
      c.halo = $(".campus__halo", c.svg);
      c.ponto = $("[data-ponto]", c.svg);
      c.cone = $(".campus__cone", c.svg);
      c.aura = $(".campus__ponto-aura", c.svg);
      c.rotulos = $$(".campus__rotulo", c.svg).map((el) => ({ el, em: Number(el.dataset.em), x: Number(el.dataset.x), y: Number(el.dataset.y) }));
      c.comprimento = c.rota.getTotalLength();
      for (const el of [c.rota, c.halo]) el.style.strokeDasharray = `${c.comprimento} ${c.comprimento}`;
      // Enquadramentos: a rede inteira e a rota.
      const nums = D.trechos.flatMap((d) => d.match(/-?[\d.]+/g).map(Number));
      const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
      c.rede = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
      const rb = c.rota.getBBox();
      c.caixaRota = { x0: rb.x, x1: rb.x + rb.width, y0: rb.y, y1: rb.y + rb.height };
      c.metros = $("[data-metros]", c.el);
      c.tempo = $("[data-tempo]", c.el);
      c.passando = $("[data-passando]", c.el);
      c.linhaPassando = $("[data-linha-passando]", c.el);
      c.titulo = $(".campus__titulo", c.el);
      c.leitura = $(".campus__leitura", c.el);
      c.unidade = c.metros.nextElementSibling;
    },
    medir(c) {
      if (!c.D) return;
      const asp = vw / c.alt;
      // ox/oy: quanto o centro da câmera fica deslocado do assunto (o texto ocupa um lado da tela).
      const enquadrar = (b, folga, desvioX, desvioY) => {
        const w = Math.max(b.x1 - b.x0, (b.y1 - b.y0) * asp) * folga;
        const ox = -w * desvioX, oy = (w / asp) * desvioY;
        return { cx: (b.x0 + b.x1) / 2 + ox, cy: (b.y0 + b.y1) / 2 + oy, w, ox, oy };
      };
      // No desktop o desenho fica à direita (o texto ocupa a esquerda); no celular, em cima.
      c.geral = estreito() ? enquadrar(c.rede, 1.12, 0, 0.14) : enquadrar(c.rede, 1.5, 0.17, 0);
      c.perto = estreito() ? enquadrar(c.caixaRota, 1.5, 0, 0.16) : enquadrar(c.caixaRota, 2.6, 0.2, 0);
    },
    quadro(p, agora, c) {
      if (!c.D) return;
      const asp = vw / c.alt;
      // 1. A rede se desenha e os prédios acendem.
      c.faixas.forEach((el, i) => definir(el, "opacity", n(trecho(p, 0.015 + i * 0.016, 0.085 + i * 0.016), 3)));
      c.grupos.forEach((g, i) => {
        const o = 1 - suave(trecho(p, i * 0.028, 0.1 + i * 0.028));
        definir(g, "--o", n(o, 4));
        definir(g, "opacity", o >= 0.999 ? 0 : 1);
      });
      // 2. A câmera desce até a rota. 3. A rota avança com a rolagem. 4. Chegada.
      const desce = entraSai(trecho(p, 0.24, 0.42));
      const anda = trecho(p, 0.42, 0.9);
      const chegou = trecho(p, 0.9, 1);
      const em = c.comprimento * anda;
      const pt = c.rota.getPointAtLength(em);
      const adiante = c.rota.getPointAtLength(Math.min(c.comprimento, em + 3));
      const atras = c.rota.getPointAtLength(Math.max(0, em - 3));
      const w = misturar(c.geral.w, c.perto.w, desce) * (1 + suave(chegou) * 0.16);
      // A câmera acompanha o ponto sem colar nele: metade do caminho entre o centro da rota e o ponto.
      const segueX = misturar(c.perto.cx, pt.x + c.perto.ox, 0.5);
      const segueY = misturar(c.perto.cy, pt.y + c.perto.oy, 0.5);
      const cx = misturar(c.geral.cx, segueX, desce), cy = misturar(c.geral.cy, segueY, desce);
      const h = w / asp, u = w / vw;
      c.svg.setAttribute("viewBox", `${n(cx - w / 2, 1)} ${n(cy - h / 2, 1)} ${n(w, 1)} ${n(h, 1)}`);
      definir(c.svg, "--u", n(u, 4));
      const tracado = c.comprimento * (1 - anda);
      c.rota.style.strokeDashoffset = c.halo.style.strokeDashoffset = n(tracado, 1);
      c.rota.style.opacity = c.halo.style.opacity = desce > 0.5 ? 1 : 0;
      const rumo = (Math.atan2(adiante.x - atras.x, -(adiante.y - atras.y)) * 180) / Math.PI;
      const pulso = 1 + Math.sin(chegou * Math.PI) * 0.9;
      c.ponto.setAttribute("transform", `translate(${n(pt.x, 1)} ${n(pt.y, 1)}) scale(${n(u * misturar(0, 1, sai(trecho(p, 0.3, 0.4))), 4)})`);
      c.cone.setAttribute("transform", `rotate(${n(rumo, 1)})`);
      c.cone.style.opacity = anda > 0.001 && anda < 0.999 ? 1 : 0;
      c.aura.setAttribute("r", n(15 * pulso, 1));
      const metros = Math.round(c.D.rota.metros * (1 - anda));
      for (const r of c.rotulos) {
        const destino = r.el.classList.contains("campus__rotulo--destino");
        r.el.classList.toggle("visto", destino ? desce > 0.6 : desce > 0.9 && c.D.rota.metros - metros >= r.em - 12);
        r.el.setAttribute("transform", `translate(${r.x} ${n(r.y - (destino ? 20 * u : 0), 1)}) scale(${n(u, 4)})`);
      }
      // Leitura: metros que faltam, tempo e o prédio por onde a rota passa.
      const chave = `${metros}`;
      if (chave !== c.lido) {
        c.lido = chave;
        c.metros.textContent = metros > 0 ? metros : "Chegou";
        c.unidade.textContent = metros > 0 ? "m" : "";
        c.tempo.textContent = metros > 0 ? `${Math.max(1, Math.ceil(metros / 1.3 / 60))} min` : `${c.D.rota.metros} m a pé, em ${Math.round(c.D.rota.segundos / 60)} min`;
        c.linhaPassando.style.visibility = metros > 0 ? "" : "hidden";
        const feito = c.D.rota.metros - metros;
        const perto = [...c.rotulos].reverse().find((r) => r.em <= feito + 12);
        if (perto) c.passando.textContent = perto.el.textContent;
      }
      const titulo = 1 - suave(trecho(p, 0.22, 0.31)), leitura = suave(trecho(p, 0.33, 0.42));
      surgir(c.titulo, titulo, (1 - titulo) * -30);
      surgir(c.leitura, leitura, (1 - leitura) * 30);
    },
  });

  /* ------------------------------------------------------------------ temas */
  const LEGENDAS = {
    escuro: ["Escuro.", "Fundo preto e linhas claras, para a sala escura e a volta à noite."],
    claro: ["Claro.", "Fundo branco e texto quase preto, para ler a tela com o sol do meio-dia."],
  };
  const temas = cena("temas", {
    estatico: 0,
    montar(c) {
      c.aparelho = $(".aparelho", c.el);
      c.video = $(".temas__video", c.el);
      c.tela = $(".aparelho__tela", c.el);
      c.luz = $(".temas__luz", c.el);
      c.botoes = $$("[data-tema]", c.el);
      c.titulo = $("[data-legenda-t]", c.el);
      c.texto = $("[data-legenda]", c.el);
      c.tema = "escuro";
      // t: quanto da tela do app já está clara. luz: quanto da página a luz já tomou.
      c.aplicar = (t, luz = t) => {
        definir(c.tela, "--t", n(t, 4));
        definir(c.tela, "--risco", t > 0.004 && t < 0.996 ? 1 : 0);
        definir(c.luz, "clipPath", `circle(${luz <= 0 ? 0 : n(misturar(c.raio0, c.raio1, luz), 1)}px at ${c.lx}px ${c.ly}px)`);
        const tema = t > 0.5 ? "claro" : "escuro";
        if (tema !== c.tema) {
          c.tema = tema;
          c.botoes.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tema === tema)));
          [c.titulo.textContent, c.texto.textContent] = LEGENDAS[tema];
        }
        // Com a tela toda clara, a gravação continua exatamente do quadro em que a imagem parou.
        if (t >= 0.999 && !c.rodando && !calmo) {
          c.rodando = true;
          irPara(c.video, 3);
          c.video.addEventListener("seeked", () => { if (c.rodando) { c.video.classList.add("ativa"); tocar(c.video); } }, { once: true });
        } else if (t < 0.98 && c.rodando) {
          c.rodando = false;
          c.video.classList.remove("ativa");
          parar(c.video);
        }
      };
      c.video.addEventListener("ended", () => { if (c.rodando) { irPara(c.video, 3); tocar(c.video); } });
      c.botoes.forEach((b) => b.addEventListener("click", () => {
        const claro = b.dataset.tema === "claro";
        if (calmo || c.fim <= c.ini) return c.aplicar(claro ? 1 : 0);
        rolarAte(c.ini + (claro ? 0.88 : 0.03) * (c.fim - c.ini));
      }));
    },
    medir(c) {
      // A luz nasce no centro do aparelho e cresce até o canto mais distante da tela.
      const a = c.aparelho.getBoundingClientRect(), b = c.palco.getBoundingClientRect();
      const x = a.left - b.left + a.width / 2, y = a.top - b.top + a.height / 2;
      c.raio0 = a.width * 0.42;
      c.raio1 = Math.hypot(Math.max(x, b.width - x), Math.max(y, b.height - y)) + 2;
      c.lx = n(x, 1);
      c.ly = n(y, 1);
      if (calmo) c.aplicar(c.tema === "claro" ? 1 : 0);
    },
    sair(c) { parar(c.video); },
    quadro(p, agora, c) {
      // Primeiro a tela do app clareia, da esquerda para a direita; depois a luz sai dela e toma a página.
      const t = entraSai(trecho(p, 0.12, 0.46));
      if (!calmo) c.aplicar(t, entraSai(trecho(p, 0.32, 0.82)));
      pose(c.aparelho.corpo, { giro: misturar(15, -11, entraSai(trecho(p, 0.12, 0.82))) + ponteiro.x * 3, queda: 4 - ponteiro.y * 2 });
      c.aparelho.brilho(0.6 - t * 1.2);
    },
  });

  /* ------------------------------------------------------------------ fecho */
  cena("fecho", {
    estatico: 1,
    montar(c) {
      const svg = $("[data-fecho]", c.el);
      const peca = (nome) => $(`[data-peca="${nome}"]`, svg);
      c.tudo = peca("tudo"); c.os = peca("os"); c.ufcg = peca("ufcg");
      c.somem = [peca("a"), peca("v")].map((el) => { const b = el.getBBox(); return { el, cx: b.x + b.width / 2, pe: b.y + b.height }; });
      c.somos = $$('[data-peca="somos"] path', svg);
      c.acoes = $(".fecho__acoes", c.el);
      c.svg = svg;
    },
    quadro(p, agora, c) {
      // NavOS → NOS somos UFCG: o "a" e o "v" afundam, o "OS" encosta no "N" e "somos" se escreve.
      // Só depois que o "OS" assenta é que "somos" começa a ser escrito, letra por letra.
      const m = entraSai(trecho(p, 0.12, 0.5));
      c.tudo.setAttribute("transform", `translate(${n(142 * m, 1)} 0)`);
      c.os.setAttribute("transform", `translate(${n(-276 * m, 1)} 0)`);
      c.ufcg.setAttribute("transform", `translate(${n(-285 * m, 1)} ${n(35 * m, 1)})`);
      const some = trecho(m, 0, 0.42);
      for (const l of c.somem) {
        l.el.setAttribute("transform", `translate(${n(l.cx, 1)} ${n(l.pe, 1)}) scale(${n(1 - some * 0.35, 3)} ${n(Math.max(0.001, 1 - some), 3)}) translate(${n(-l.cx, 1)} ${n(-l.pe, 1)})`);
        l.el.style.opacity = n(1 - trecho(some, 0.2, 1), 3);
        l.el.style.visibility = some >= 1 ? "hidden" : "";
      }
      c.somos.forEach((el, i) => {
        const o = 1 - suave(trecho(p, 0.5 + i * 0.03, 0.6 + i * 0.03));
        el.style.setProperty("--o", n(o, 4));
        el.style.visibility = o >= 0.999 ? "hidden" : ""; // ponta arredondada apareceria como um pingo
      });
      definir(c.svg, "transform", `scale(${n(misturar(0.94, 1, sai(trecho(p, 0, 0.2))), 4)})`);
      const cta = suave(trecho(p, 0.74, 0.86));
      surgir(c.acoes, cta, (1 - cta) * 22);
    },
  });

  /* ---------------------------------------------------------------- galeria */
  const galeria = (() => {
    const el = $("[data-galeria]");
    if (!el) return null;
    const trilho = $(".galeria__trilho", el);
    const quadros = $$("[data-quadro]", el);
    const videos = quadros.map((q) => $("video", q));
    const pontos = $(".pontos", el);
    const pausa = $("[data-pausa]", el);
    const g = { ativo: -1, pausado: calmo, aVista: false, alvo: -1, alvoAte: 0 };
    const botoes = quadros.map((q, i) => {
      const b = criar("button", "");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", $("h3", q).textContent);
      b.append(criar("i", ""));
      b.addEventListener("click", () => g.ativar(i, true));
      pontos.append(b);
      return b;
    });
    g.ativar = (i, rolar) => {
      if (rolar) {
        g.alvo = i;
        g.alvoAte = performance.now() + 1400;
        const q = quadros[i];
        trilho.scrollTo({ left: q.offsetLeft - (trilho.clientWidth - q.offsetWidth) / 2, behavior: calmo ? "auto" : "smooth" });
      }
      if (i === g.ativo) return;
      g.ativo = i;
      quadros.forEach((q, j) => q.classList.toggle("ativo", j === i));
      botoes.forEach((b, j) => { b.setAttribute("aria-selected", String(j === i)); b.style.setProperty("--anda", 0); });
      videos.forEach((v, j) => { if (j !== i) parar(v); });
      irPara(videos[i], 0);
      if (g.aVista && !g.pausado) tocar(videos[i]);
    };
    videos.forEach((v, i) => v.addEventListener("ended", () => { if (!g.pausado && g.aVista && g.ativo === i) g.ativar((i + 1) % quadros.length, true); }));
    // Arrastar o trilho também troca o quadro ativo: vale o que estiver mais perto do centro.
    let agendado = false;
    trilho.addEventListener("scroll", () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        const meio = trilho.scrollLeft + trilho.clientWidth / 2;
        let perto = 0, menor = Infinity;
        quadros.forEach((q, i) => { const d = Math.abs(q.offsetLeft + q.offsetWidth / 2 - meio); if (d < menor) { menor = d; perto = i; } });
        if (g.alvo >= 0 && performance.now() < g.alvoAte) { if (perto === g.alvo) g.alvo = -1; return; }
        g.alvo = -1;
        g.ativar(perto, false);
      });
    }, { passive: true });
    const refletir = () => {
      pausa.setAttribute("aria-pressed", String(g.pausado));
      pausa.setAttribute("aria-label", g.pausado ? "Tocar a galeria" : "Pausar a galeria");
    };
    pausa.addEventListener("click", () => {
      g.pausado = !g.pausado;
      refletir();
      const v = videos[g.ativo];
      if (g.pausado) parar(v);
      else { if (v.ended) irPara(v, 0); const p = v.play(); if (p) p.catch(() => {}); }
    });
    refletir();
    new IntersectionObserver(([e]) => {
      g.aVista = e.isIntersecting;
      const v = videos[g.ativo];
      if (g.aVista && !g.pausado) tocar(v); else parar(v);
    }, { threshold: 0.3 }).observe(el);
    g.quadro = () => {
      if (!g.aVista) return;
      const v = videos[g.ativo];
      if (v && v.duration) botoes[g.ativo].style.setProperty("--anda", n(v.currentTime / v.duration, 4));
    };
    g.ativar(0, false);
    return g;
  })();

  /* --------------------------------------------------------------- tutorial */
  (() => {
    const el = $("[data-tutorial]");
    if (!el) return;
    const trilho = $("[data-trilho]", el);
    const passos = $$(".passo", el);
    passos.forEach((p) => p.style.setProperty("--foco", `${p.dataset.foco}%`));
    const setas = $$("[data-seta]", el);
    const atualizar = () => {
      setas[0].disabled = trilho.scrollLeft < 8;
      setas[1].disabled = trilho.scrollLeft > trilho.scrollWidth - trilho.clientWidth - 8;
    };
    setas.forEach((b) => b.addEventListener("click", () => {
      const passoLargura = passos[1].offsetLeft - passos[0].offsetLeft;
      trilho.scrollBy({ left: Number(b.dataset.seta) * passoLargura, behavior: calmo ? "auto" : "smooth" });
    }));
    trilho.addEventListener("scroll", atualizar, { passive: true });
    atualizar();
    // Claro ou escuro: a captura nova entra por cima da antiga, sem piscar.
    const botoes = $$("[data-tema]", el);
    botoes.forEach((b) => b.addEventListener("click", () => {
      if (b.getAttribute("aria-pressed") === "true") return;
      botoes.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      for (const img of $$("img[data-passo]", el)) {
        const nova = img.cloneNode();
        nova.removeAttribute("loading");
        nova.src = `midia/tutorial/passo-${img.dataset.passo}-${b.dataset.tema}.webp`;
        nova.style.opacity = "0";
        const trocar = () => { img.after(nova); requestAnimationFrame(() => { nova.style.opacity = "1"; setTimeout(() => img.remove(), 520); }); };
        if (nova.decode) nova.decode().then(trocar, trocar); else nova.addEventListener("load", trocar, { once: true });
      }
    }));
  })();

  /* ------------------------------------------------- luz, contagem, blocos */
  const luzes = $$("[data-luz]").map((el) => ({ el, v: calmo ? 1 : 0, topo: 0, perto: false }));
  const sobe = $$("[data-sobe]").map((el) => ({ el, alvo: $(".aparelho", el), topo: 0, alt: 0 }));
  const olhoLuz = new IntersectionObserver((entradas) => {
    for (const e of entradas) { const l = luzes.find((x) => x.el === e.target); if (l) l.perto = e.isIntersecting; }
  }, { rootMargin: "30% 0px 30% 0px" });
  luzes.forEach((l) => olhoLuz.observe(l.el));

  const olhoUmaVez = (seletor, limiar, fn) => {
    const olho = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) { olho.unobserve(e.target); fn(e.target); }
    }, { threshold: limiar });
    $$(seletor).forEach((el) => olho.observe(el));
  };
  olhoUmaVez(".bloco", 0.5, (el) => el.classList.add("visto"));
  olhoUmaVez("[data-conta]", 0.9, (el) => {
    if (calmo) return;
    const fim = Number(el.dataset.conta), inicio = performance.now();
    const passo = (agora) => {
      const t = trecho(agora - inicio, 0, 1500);
      el.textContent = Math.round(fim * (1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10)));
      if (t < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });

  /* ------------------------------------------------------------ barra local */
  const local = $(".local");
  const progresso = $(".local__progresso", local);
  const secao = $("[data-secao]", local);
  let localVisivel = false;
  const mostrarLocal = (sim) => {
    if (sim === localVisivel) return;
    localVisivel = sim;
    local.classList.toggle("visivel", sim);
    local.setAttribute("aria-hidden", String(!sim));
    $$("a", local).forEach((a) => { a.tabIndex = sim ? 0 : -1; });
  };
  const olhoSecao = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      const nome = e.target.dataset.nome;
      if (secao.dataset.nome === nome) continue;
      secao.dataset.nome = nome;
      secao.classList.add("trocando");
      setTimeout(() => { secao.textContent = nome; secao.classList.remove("trocando"); }, 200);
    }
  }, { rootMargin: "-48% 0px -48% 0px" });
  $$("[data-nome]").forEach((el) => olhoSecao.observe(el));

  /* ------------------------------------------------------- medida e quadros */
  let alturaPagina = 1;
  function medir() {
    vw = raiz.clientWidth;
    vh = innerHeight;
    const y = scrollY;
    for (const c of cenas) {
      const r = c.el.getBoundingClientRect();
      c.alt = c.palco.clientHeight || vh;
      c.ini = r.top + y;
      c.fim = c.ini + r.height - c.alt;
      c.medir?.(c);
      c.visto = -1;
    }
    for (const l of luzes) l.topo = l.el.getBoundingClientRect().top + y - (1 - l.v) * 22;
    for (const s of sobe) { const r = s.el.getBoundingClientRect(); s.topo = r.top + y; s.alt = r.height; }
    alturaPagina = Math.max(1, raiz.scrollHeight - vh);
  }

  let anterior = performance.now();
  function quadro(agora) {
    const dt = Math.min(64, agora - anterior);
    anterior = agora;
    const y = scrollY;
    const k = 1 - Math.exp(-dt / 105);
    ponteiro.x += (ponteiro.ax - ponteiro.x) * (1 - Math.exp(-dt / 260));
    ponteiro.y += (ponteiro.ay - ponteiro.y) * (1 - Math.exp(-dt / 260));

    if (!calmo) {
      for (const c of cenas) {
        c.alvo = limitar((y - c.ini) / Math.max(1, c.fim - c.ini));
        const perto = y > c.ini - vh * 1.15 && y < c.fim + vh * 1.15;
        if (!perto) {
          if (c.visivel) { c.visivel = false; c.p = c.alvo; c.quadro(c.p, agora, c, dt); c.sair?.(c); }
          continue;
        }
        if (!c.visivel) { c.visivel = true; c.p = c.alvo; c.visto = -1; c.entrar?.(c); }
        c.p += (c.alvo - c.p) * k;
        if (Math.abs(c.alvo - c.p) < 0.0004) c.p = c.alvo;
        if (c.continua || c.p !== c.visto) { c.visto = c.p; c.quadro(c.p, agora, c, dt); }
      }
      for (const l of luzes) {
        if (!l.perto) continue;
        const alvo = limitar((0.94 - (l.topo - y) / vh) / 0.22);
        if (alvo === l.v) continue;
        l.v += (alvo - l.v) * k;
        if (Math.abs(alvo - l.v) < 0.003) l.v = alvo;
        surgir(l.el, 0.16 + 0.84 * l.v, (1 - l.v) * 22);
      }
      for (const s of sobe) {
        const pos = (s.topo - y) / vh;
        if (pos > 1.2 || pos < -0.8) continue;
        definir(s.alvo, "transform", `translate3d(0,${n(misturar(64, 5, suave(trecho(1 - pos, 0.02, 0.72))), 2)}%,0)`);
      }
    }
    galeria?.quadro();
    mostrarLocal(y > (hero ? hero.ini + (hero.fim - hero.ini) * 0.82 : vh));
    definir(progresso, "transform", `scaleX(${n(limitar(y / alturaPagina), 4)})`);
    requestAnimationFrame(quadro);
  }

  for (const c of cenas) c.montar?.(c);
  medir();
  if (calmo) {
    // Sem rolagem conduzindo nada: cada cena fica no seu melhor quadro parado.
    for (const c of cenas) { c.visivel = true; c.quadro(c.estatico ?? 1, performance.now(), c, 16); }
    explorar?.ativar(0);
    temas?.aplicar(0);
    luzes.forEach((l) => surgir(l.el, 1, 0));
  }
  let espera = 0;
  const remedir = () => { clearTimeout(espera); espera = setTimeout(medir, 120); };
  addEventListener("resize", remedir);
  addEventListener("load", medir);
  document.fonts?.ready.then(medir);
  if ("ResizeObserver" in window) new ResizeObserver(remedir).observe(document.body);
  requestAnimationFrame(quadro);
})();
