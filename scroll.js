/* =====================================================================
   scroll.js — animações guiadas pelo scroll em toda a página
   • GSAP ScrollTrigger quando disponível; senão, um motor próprio equivalente (um único listener de scroll).
   • Cada "cena" tem um intervalo de scroll (início/fim) e uma função apply(progresso 0–1).
     O progresso é suavizado (lerp) e funciona nos dois sentidos: ao subir, tudo reverte.
   • Posições medidas por layout (offsetTop), imunes às transformações aplicadas aos próprios elementos.
   • Sem "reduzir movimento", ou se algo falhar, a página fica estática e totalmente visível.
   ===================================================================== */
(function(){
"use strict";
const root = document.documentElement;
if (!root.classList.contains("st-on")) return;

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const isMobile = () => innerWidth <= 820 || matchMedia("(pointer:coarse)").matches;
const DAMP = 0.16;                                   // suavização (equivalente ao "scrub" do ScrollTrigger)

/* ---------- medição por layout ---------- */
function docTop(el){
  if (!(el instanceof HTMLElement)) return el.getBoundingClientRect().top + scrollY;
  let y = 0, n = el; while (n) { y += n.offsetTop || 0; n = n.offsetParent; } return y;
}
function height(el){ return el instanceof HTMLElement ? el.offsetHeight : el.getBoundingClientRect().height; }
/* posição de scroll em que a aresta (top|center|bottom) do elemento encontra pct% da altura da janela */
function Y(el, edge, pct){
  const h = height(el), off = edge === "top" ? 0 : edge === "center" ? h / 2 : h;
  return docTop(el) + off - innerHeight * pct / 100;
}

/* ---------- cenas ---------- */
const scenes = []; let running = false;
function scene(el, range, apply){ const s = { el, range, apply, target: 0, cur: 0, shown: -1 }; scenes.push(s); return s; }
function kick(){ if (!running) { running = true; requestAnimationFrame(loop); } }
function loop(){
  let busy = false;
  for (const s of scenes) {
    s.cur = lerp(s.cur, s.target, DAMP);
    if (Math.abs(s.cur - s.target) < 0.0006) s.cur = s.target; else busy = true;
    if (Math.abs(s.cur - s.shown) > 0.0004) { s.apply(s.cur); s.shown = s.cur; }
  }
  if (busy) requestAnimationFrame(loop); else running = false;
}

/* ---------- efeitos reutilizáveis ---------- */
function reveal(el, a, b, y, hook){
  if (!el) return;
  const amp = isMobile() ? y * 0.6 : y;
  scene(el, () => ({ s: Y(el, "top", a), e: Y(el, "top", b) }), p => {
    const v = ss(p); el.style.opacity = String(v); el.style.transform = "translate3d(0," + ((1 - v) * amp).toFixed(1) + "px,0)";
    if (hook) hook(v);
  });
}
/* título: entra com um leve deslize e é revelado pela faixa de cor do Dia Text Reveal (dia.js) */
const DIA = () => window.MercuriusDia;
const diaPrep = els => { if (DIA()) els.filter(Boolean).forEach(e => DIA().prep(e)); return els; };
const diaPlay = (els, dur) => { if (DIA()) DIA().playAll(els.filter(Boolean), { duration: dur || 1.1, gap: 0.14 }); };
function clipReveal(el, a, b){
  if (!el) return;
  if (DIA()) DIA().prep(el);
  scene(el, () => ({ s: Y(el, "top", a), e: Y(el, "top", b) }), p => {
    const v = ss(p); el.style.opacity = String(Math.min(1, v * 3)); el.style.transform = "translate3d(0," + ((1 - v) * 16).toFixed(1) + "px,0)";
    if (p > 0.3 && DIA()) DIA().play(el);
  });
}

function build(){
  const mob = isMobile();

  /* barra de progresso do documento */
  const bar = document.createElement("div"); bar.className = "st-bar"; bar.setAttribute("aria-hidden", "true"); document.body.appendChild(bar);
  const barScene = scene(document.body, () => ({ s: 0, e: Math.max(1, document.documentElement.scrollHeight - innerHeight) }), p => { bar.style.transform = "scaleX(" + p + ")"; });

  /* 1 — Problema: título, textos e a passagem do ruído para a clareza dependem do scroll */
  const prob = $(".problem");
  if (prob) {
    clipReveal($(".problem h2"), 90, 62);
    $$(".problem .copy p").forEach((p, i) => { diaPrep([p]); reveal(p, 88 - i * 5, 62 - i * 5, 26, v => { if (v > 0.4) diaPlay([p], 1.2); }); });
    const nz = window.__noise;
    if (nz) {
      const items = $$("g.s", nz.g).map(g => {
        const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*rotate\(([-\d.]+)deg\)/.exec(g.dataset.chaos || "");
        return { g, x: m ? +m[1] : 0, y: m ? +m[2] : 0, r: m ? +m[3] : 0 };
      });
      const core = $(".core", nz.svg);
      scene(nz.svg, () => ({ s: Y(nz.svg, "top", 90), e: Y(nz.svg, "center", 46) }), p => {
        nz.svg.style.opacity = String(Math.min(1, p * 3));
        items.forEach((it, i) => {
          const k = ss(clamp(p * 1.25 - i * 0.025)), inv = 1 - k;
          it.g.style.transform = "translate(" + (it.x * inv).toFixed(1) + "px," + (it.y * inv).toFixed(1) + "px) rotate(" + (it.r * inv).toFixed(1) + "deg)";
          it.g.style.opacity = String(0.55 + 0.45 * k);
        });
        if (core) core.style.opacity = String(ss((p - 0.6) / 0.4));
      });
    }
  }

  /* 2 — Soluções: cada módulo entra na sua própria posição de scroll */
  clipReveal($(".sol-head h2"), 90, 64);
  { const p = $(".sol-head p"); diaPrep([p]); reveal(p, 88, 62, 22, v => { if (v > 0.4) diaPlay([p], 1.2); }); }
  $$("#solGrid .sol").forEach(card => { const ts = diaPrep([$("h3", card), $("p", card)]); reveal(card, 94, 66, 48, v => { if (v > 0.5) diaPlay(ts, 1.1); }); });

  /* 3 — Como funciona: quatro painéis holográficos suspensos. O scroll controla a entrada (profundidade, rotação),
         o "desenho" de cada interface (--res) e qual painel se ilumina (--act). Tudo via variáveis CSS (sem pin). */
  clipReveal($("#como-funciona h2"), 90, 62);
  const steps = $("#steps");
  if (steps) {
    const panels = $$(".holo", steps);
    const texts = panels.map(p => diaPrep([$("h3", p), $("p", p)]));
    const Z  = [-46, 28, 28, -46];                    // profundidade em arco: os extremos mais ao fundo
    const RY = [11, 4, -4, -11];                      // painéis "olham" para o centro
    const DRIFT = [18, -10, 12, -16];                 // leve paralaxe vertical conforme o scroll
    scene(steps, () => ({ s: Y(steps, "top", 92), e: Y(steps, "bottom", 70) }), P => {
      const w = innerWidth, mode = w <= 640 ? "m" : w <= 1100 ? "t" : "d";
      const depth = mode === "d" ? 1 : mode === "t" ? 0.45 : 0, rot = mode === "d" ? 1 : mode === "t" ? 0.45 : 0;
      steps.style.setProperty("--p", P.toFixed(3));
      panels.forEach((el, i) => {
        const a = 0.04 + i * 0.16;
        const r = ss((P - a) / 0.34), res = ss((P - a - 0.12) / 0.38);
        const rise = ss((P - (a + 0.1)) / 0.16), fall = ss((P - (a + 0.34)) / 0.16);
        const base = 0.34 * res, act = base + (1 - base) * rise * (1 - fall * 0.9);
        const ty = (1 - r) * (mode === "m" ? 30 : 58) + (mode === "m" ? 0 : (0.5 - P) * DRIFT[i]);
        const tz = ((1 - r) * -170 + Z[i]) * depth;
        const ry = (RY[i] * (0.4 + 0.6 * r) + (P - 0.5) * -6) * rot;
        const rx = (1 - r) * (mode === "m" ? 5 : 11);
        if (r > 0.5) diaPlay(texts[i], 1.1);
        el.style.setProperty("--r", r.toFixed(3)); el.style.setProperty("--res", res.toFixed(3)); el.style.setProperty("--act", act.toFixed(3));
        el.style.setProperty("--ty", ty.toFixed(1) + "px"); el.style.setProperty("--tz", tz.toFixed(1) + "px");
        el.style.setProperty("--ry", ry.toFixed(2) + "deg"); el.style.setProperty("--rx", rx.toFixed(2) + "deg");
      });
    });
  }

  /* 4 — Sobre: vídeo com leve profundidade (desktop) e texto a entrar */
  const diff = $(".diff"), stage = $(".diff .stage"), dcopy = $(".diff .copy");
  if (diff && stage) {
    reveal(stage, 92, 66, 36);
    if (!mob) scene(diff, () => ({ s: Y(diff, "top", 100), e: Y(diff, "bottom", 0) }), p => { stage.style.translate = "0 " + ((0.5 - p) * 46).toFixed(1) + "px"; });
  }
  { const ts = diaPrep([$("h2", dcopy), ...$$("p", dcopy)]); reveal(dcopy, 88, 62, 30, v => { if (v > 0.4) diaPlay(ts, 1.2); }); }

  /* 5 — Contato */
  clipReveal($(".contact-grid .copy h2"), 90, 62);
  { const p = $(".contact-grid .copy p"); diaPrep([p]); reveal(p, 86, 60, 24, v => { if (v > 0.4) diaPlay([p], 1.2); }); }
  reveal($(".direct"), 84, 58, 20);
  { const ig = $(".igpanel"); if (ig) { const ts = diaPrep([$("h3", ig), ...$$("p", ig), ...$$(".brief li", ig)]); reveal(ig, 90, 60, 36, v => { if (v > 0.5) diaPlay(ts, 1.1); }); } }

  /* 6 — Rodapé */
  { const ft = $("footer"); if (ft) { const ts = diaPrep([$(".nm", ft), $(".copy-r", ft)]); scene(ft, () => ({ s: Y(ft, "top", 98), e: Y(ft, "top", 82) }), p => { if (p > 0.3) diaPlay(ts, 1.0); }); } }

  start();
}

/* ---------- motores ---------- */
function start(){
  let used = false;
  if (window.gsap && window.ScrollTrigger) {
    try {
      gsap.registerPlugin(ScrollTrigger);
      scenes.forEach(s => ScrollTrigger.create({
        trigger: s.el, invalidateOnRefresh: true,
        start: () => s.range().s, end: () => s.range().e,
        onUpdate: self => { s.target = self.progress; kick(); },
        onRefresh: self => { s.target = self.progress; kick(); }
      }));
      addEventListener("load", () => ScrollTrigger.refresh());
      used = true;
    } catch (e) { console.warn("[scroll] ScrollTrigger falhou; a usar o motor próprio.", e); }
  }
  if (!used) {
    const update = () => { const y = scrollY; scenes.forEach(s => { const r = s.range(); s.target = clamp((y - r.s) / Math.max(1, r.e - r.s)); }); kick(); };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    addEventListener("load", update);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
    update();
  }
  /* aplica o estado inicial já no primeiro cálculo (sem esperar pelo lerp) */
  scenes.forEach(s => { s.cur = s.target; s.apply(s.cur); s.shown = s.cur; });
  window.__stReady = true;
  window.MercuriusScroll = { scenes: scenes.length };
}

/* arranca depois da sequência do hero (o pin altera as posições da página) */
let built = false;
function go(){ if (built) return; built = true; try { build(); } catch (e) { console.warn("[scroll]", e); root.classList.remove("st-on"); } }
if (!window.MercuriusSequences || window.__seqSettled) go();
else { document.addEventListener("mercurius:sequence-settled", go, { once: true }); setTimeout(go, 4000); }
})();
