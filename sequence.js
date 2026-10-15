/* =====================================================================
   sequence.js — ScrollImageSequence
   Desenha uma sequência de imagens (WebP) num <canvas>, ligada ao scroll.
   Dois modos:
     • "global": canvas FIXO atrás de TODO o site; o progresso é o scroll da página inteira.
     • "pin"   : hero fixo (pinned) durante a sequência, depois a página segue (para cenas futuras).
   • GSAP ScrollTrigger quando disponível; senão, motor próprio equivalente.
   • Mistura quadros vizinhos (blend) para o movimento ficar contínuo, mesmo com poucos quadros.
   • Carregamento progressivo com prioridade ao quadro atual, concorrência limitada e cache.
   • Só redesenha quando algo muda (sem loop permanente).
   • Sem quadros válidos: não ativa nada e o site continua como era (hero com vídeo em loop).
   Novas cenas no futuro: acrescente um objeto em SEQUENCES.
   ===================================================================== */
(function(){
"use strict";

/* ----------------------------- CONFIGURAÇÃO ----------------------------- */
const SEQUENCES = [
  {
    id: "site",
    mode: "global",                   // "global" (fundo do site todo) ou "pin" (hero fixo)
    canvas: "#siteSeq",
    container: null, stage: null,     // só usados no modo "pin"
    dir: "hero-sequence/",            // pasta dos quadros (relativa à página). Use "" se estiverem soltos na raiz
    pattern: "frame_{n}.webp",        // {n} = número com zeros à esquerda (ex.: frame_0001.webp)
    pad: 4, start: 1,
    count: "auto",                    // "auto" detecta o total sozinho; ou um número (ex.: 120)
    frames: window.__SEQ_FRAMES || null,   // opcional: lista explícita de URLs (substitui dir/pattern)
    maxProbe: 600,
    range: [0, 0.9],                  // modo global: a sequência completa-se aos 90% da página; o fim fica parado no último quadro
    blend: true,                      // mistura quadros vizinhos
    scroll: { desktop: "+=300%", tablet: "+=250%", mobile: "+=200%" },   // só no modo "pin"
    fit:    { desktop: "cover", tablet: "cover", mobile: "contain" },
    focal: [0.5, 0.5],
    zoom:    { desktop: 1, tablet: 1, mobile: 1.65 },
    anchorY: { desktop: 0.5, tablet: 0.5, mobile: 0.36 },
    stride:      { desktop: 1, tablet: 1, mobile: 2 },
    concurrency: { desktop: 6, tablet: 4, mobile: 3 },
    dprMax:      { desktop: 2, tablet: 2, mobile: 1.5 },
    damping: 0.16, scrub: 0.5,
    textFade: { target: ".hero-in", vh: [0.08, 0.75], range: [0.02, 0.22] },   // vh: modo global (em alturas de janela); range: modo pin
    breakpoints: { mobile: 640, tablet: 1024 },
    background: "#05070B"
  }
];
/* ------------------------------------------------------------------------ */

const $ = (s, r) => (r || document).querySelector(s);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = (n, len) => String(n).padStart(len, "0");
const warn = (...a) => console.warn("[sequence]", ...a);
window.MercuriusSequences = window.MercuriusSequences || {};

class ScrollImageSequence {
  constructor(cfg){
    this.cfg = cfg; this.cache = new Map(); this.pending = new Map(); this.failed = new Set();
    this.total = 0; this.cur = 0; this.target = 0; this.key = null; this.running = false; this.on = false;
    this.cleanups = []; this.currentFrame = null;
  }
  get global(){ return this.cfg.mode === "global"; }
  device(){ const w = innerWidth, b = this.cfg.breakpoints; return w <= b.mobile ? "mobile" : w <= b.tablet ? "tablet" : "desktop"; }
  opt(k){ return this.cfg[k][this.device()]; }
  stride(){ return Math.max(1, this.opt("stride")); }
  url(n){ const f = this.cfg.frames; if (f) return f[n - this.cfg.start] || ""; return this.cfg.dir + this.cfg.pattern.replace("{n}", pad(n, this.cfg.pad)); }
  last(){ return this.cfg.start + this.total - 1; }

  /* ---- carregamento de um quadro (sem duplicar pedidos) ---- */
  load(n){
    if (this.cache.has(n)) return Promise.resolve(this.cache.get(n));
    if (this.failed.has(n)) return Promise.resolve(null);
    if (this.pending.has(n)) return this.pending.get(n);
    const p = new Promise(res => {
      const img = new Image(); img.decoding = "async";
      img.onload = () => { this.cache.set(n, img); this.pending.delete(n); res(img); };
      img.onerror = () => { this.failed.add(n); this.pending.delete(n); res(null); };
      img.src = this.url(n);
    });
    this.pending.set(n, p); return p;
  }

  /* ---- deteção automática do nº de quadros (ficheiros contíguos) ---- */
  async resolveCount(){
    const c = this.cfg;
    if (c.frames) return c.frames.length;
    if (typeof c.count === "number") return c.count;
    const ok = async k => !!(await this.load(c.start + k - 1));
    if (!(await ok(1))) return 0;
    let lo = 1, hi = 2;
    while (hi <= c.maxProbe && await ok(hi)) { lo = hi; hi *= 2; }
    if (hi > c.maxProbe) hi = c.maxProbe + 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; (await ok(mid)) ? lo = mid : hi = mid; }
    return lo;
  }

  /* ---- quadro totalmente vazio/transparente? (proteção contra exportações falhadas) ---- */
  isBlank(img){
    try {
      const s = document.createElement("canvas"); s.width = 32; s.height = 18;
      const x = s.getContext("2d"); x.drawImage(img, 0, 0, 32, 18);
      const d = x.getImageData(0, 0, 32, 18).data;
      for (let i = 0; i < d.length; i += 4) if (d[i+3] > 8 && (d[i] > 6 || d[i+1] > 6 || d[i+2] > 6)) return false;
      return true;
    } catch (e) { return false; }   // canvas "tainted" (ex.: file://): assume válido
  }

  async init(){
    try { await this._init(); }
    finally { window.__seqSettled = true; document.dispatchEvent(new Event("mercurius:sequence-settled")); }
  }
  async _init(){
    const c = this.cfg;
    this.canvas = $(c.canvas);
    if (this.global) { this.root = document.body; this.stage = this.canvas; }
    else { this.root = $(c.container); this.stage = $(c.stage); }
    if (!this.root || !this.stage || !this.canvas) return;
    if (window.MercuriusSequences[c.id]) window.MercuriusSequences[c.id].destroy();
    window.MercuriusSequences[c.id] = this;
    if (reduce) return;                                   // reduzir movimento: mantém o site estático atual
    this.total = await this.resolveCount();
    if (!this.total) { warn(`"${c.id}": não encontrei "${this.url(c.start)}". A sequência não foi ativada; o site continua como estava.`); return; }
    const keys = [0, .25, .5, .75, 1].map(f => c.start + Math.round(f * (this.total - 1)));
    const imgs = await Promise.all(keys.map(n => this.load(n)));
    const valid = imgs.filter(Boolean);
    if (!valid.length || valid.every(i => this.isBlank(i))) {
      warn(`"${c.id}": os ${this.total} quadros existem, mas estão vazios/transparentes. A sequência não foi ativada. Reexporte os quadros.`);
      return;
    }
    this.activate();
  }

  activate(){
    const c = this.cfg, root = document.documentElement;
    this.ctx2d = this.canvas.getContext("2d", { alpha: false });
    this.on = true; root.classList.add("seq-on"); if (this.global) root.classList.add("seq-global");
    const v = $("#heroVideo");                            // o vídeo em loop deixa de ser necessário
    if (v) { try { v.pause(); v.removeAttribute("src"); v.innerHTML = ""; v.load(); v.remove(); } catch (e) {} }
    this.resize();
    const ro = new ResizeObserver(() => this.resize()); ro.observe(this.stage); this.cleanups.push(() => ro.disconnect());
    this.render(0, true);
    this.pump();
    this.setupScroll();
    this.fadeText();
  }

  /* ---- posição fracionária (em "passos" de quadro) ---- */
  mapP(p){ if (!this.global) return clamp(p, 0, 1); const r = this.cfg.range; return clamp((p - r[0]) / Math.max(1e-6, r[1] - r[0]), 0, 1); }
  frameNumber(p){
    const c = this.cfg, st = this.stride();
    if (p >= 0.999) return this.last();
    const k = Math.round(p * (this.total - 1) / st) * st;
    return clamp(c.start + k, c.start, this.last());
  }

  /* ---- carregamento progressivo com prioridade ao quadro atual ---- */
  nextWanted(){
    const c = this.cfg, st = this.stride(), cur = this.frameNumber(this.cur), end = this.last();
    const need = n => n >= c.start && n <= end && !this.cache.has(n) && !this.pending.has(n) && !this.failed.has(n);
    for (let d = 0; d <= 30; d++) for (const s of [d, -d]) { const n = cur + s * st; if (need(n)) return n; }
    for (let n = c.start; n <= end; n += st) if (need(n)) return n;
    return null;
  }
  pump(){
    const max = this.opt("concurrency");
    while (this.pending.size < max) {
      const n = this.nextWanted(); if (n == null) break;
      const near = Math.abs(n - this.frameNumber(this.cur)) <= 12 * this.stride();
      this.load(n).then(img => { if (img && near && img.decode) img.decode().catch(() => {}); if (img) this.render(this.cur); this.pump(); });
    }
  }

  /* ---- canvas ---- */
  resize(){
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.opt("dprMax"));
    const cw = this.global ? innerWidth : this.stage.clientWidth, ch = this.global ? innerHeight : this.stage.clientHeight;
    const w = Math.max(1, Math.round(cw * dpr)), h = Math.max(1, Math.round(ch * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.key = null; if (this.on) this.render(this.cur, true);
  }
  draw(img, alpha){
    const x = this.ctx2d, cw = this.canvas.width, ch = this.canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
    const mode = this.opt("fit"), z = this.opt("zoom") || 1;
    const s = (mode === "cover" ? Math.max(cw / iw, ch / ih) : Math.min(cw / iw, ch / ih)) * z;
    const dw = iw * s, dh = ih * s;
    const fx = mode === "cover" ? this.cfg.focal[0] : .5, fy = mode === "cover" ? this.cfg.focal[1] : this.opt("anchorY");
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    if (alpha >= 1 && mode !== "cover") { x.fillStyle = this.cfg.background; x.fillRect(0, 0, cw, ch); }
    x.globalAlpha = alpha; x.drawImage(img, (cw - dw) * fx, (ch - dh) * fy, dw, dh); x.globalAlpha = 1;
  }
  nearest(n){                                             // quadro n, ou o mais próximo já carregado (sem piscar)
    if (this.cache.has(n)) return { img: this.cache.get(n), exact: true };
    const st = this.stride();
    for (let d = 1; d <= 40; d++) for (const s of [-d, d]) { const m = n + s * st; if (this.cache.has(m)) return { img: this.cache.get(m), exact: false }; }
    return null;
  }
  render(p, force){
    const c = this.cfg, st = this.stride();
    const maxI = Math.floor((this.total - 1) / st);
    const f = clamp(p, 0, 1) * (this.total - 1) / st;
    let i0 = Math.min(Math.floor(f), maxI), frac = f - i0;
    if (i0 >= maxI) { i0 = maxI; frac = 0; }
    const blend = c.blend && frac > 0.02;
    const key = i0 + ":" + (blend ? Math.round(frac * 12) : 0) + ":" + this.canvas.width + "x" + this.canvas.height + ":" + this.opt("fit");
    if (!force && key === this.key) return;                // sem redesenhos desnecessários
    const n0 = i0 >= maxI ? this.last() : c.start + i0 * st, n1 = Math.min(n0 + st, this.last());
    const a = this.nearest(n0); if (!a) return;
    this.draw(a.img, 1);
    let exact = a.exact;
    if (blend) { const b = this.nearest(n1); if (b) { this.draw(b.img, frac); exact = exact && b.exact; } else exact = false; }
    this.key = exact ? key : null;
    this.currentFrame = blend && frac > 0.5 ? n1 : n0;
  }

  /* ---- progresso do scroll (anima só enquanto não estabiliza) ---- */
  onProgress(p){ this.target = this.mapP(p); if (!this.running) { this.running = true; requestAnimationFrame(() => this.tick()); } }
  tick(){
    this.cur += (this.target - this.cur) * this.cfg.damping;
    if (Math.abs(this.target - this.cur) < 0.0003) this.cur = this.target;
    this.render(this.cur); this.fadeText(); this.pump();
    if (this.cur !== this.target) requestAnimationFrame(() => this.tick()); else this.running = false;
  }
  fadeText(){
    const t = this.cfg.textFade; if (!t) return;
    const el = $(t.target); if (!el) return;
    const v = this.global ? 1 - ss(t.vh[0], t.vh[1], scrollY / innerHeight) : 1 - ss(t.range[0], t.range[1], this.cur);
    el.style.opacity = String(v);
    try { el.inert = v < 0.05; } catch (e) {}
  }

  setupScroll(){
    const c = this.cfg;
    let ok = false;
    const docMax = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (window.gsap && window.ScrollTrigger) {
      try {
        gsap.registerPlugin(ScrollTrigger);
        this.gctx = gsap.context(() => {
          this.st = this.global
            ? ScrollTrigger.create({ start: 0, end: () => docMax(), invalidateOnRefresh: true, refreshPriority: 10,
                onUpdate: s => this.onProgress(s.progress), onRefresh: s => this.onProgress(s.progress) })
            : ScrollTrigger.create({ trigger: this.root, start: "top top", end: () => this.opt("scroll"),
                pin: this.stage, pinSpacing: true, anticipatePin: 1, scrub: c.scrub, invalidateOnRefresh: true, refreshPriority: 10,
                onUpdate: s => this.onProgress(s.progress), onRefresh: s => this.onProgress(s.progress) });
        });
        this.cleanups.push(() => this.gctx && this.gctx.revert());
        requestAnimationFrame(() => ScrollTrigger.refresh());
        ok = true;
      } catch (e) { warn("ScrollTrigger falhou; a usar o motor próprio.", e); try { this.gctx && this.gctx.revert(); } catch (_) {} }
    }
    if (!ok) {
      if (this.global) {
        const upd = () => this.onProgress(scrollY / docMax());
        upd(); addEventListener("scroll", upd, { passive: true }); addEventListener("resize", upd); addEventListener("load", upd);
        this.cleanups.push(() => { removeEventListener("scroll", upd); removeEventListener("resize", upd); removeEventListener("load", upd); });
      } else {
        document.documentElement.classList.add("seq-fallback");
        const setH = () => { const pct = parseFloat(String(this.opt("scroll")).replace(/[^\d.]/g, "")) || 300; this.root.style.setProperty("--seq-h", (100 + pct) + "vh"); };
        const upd = () => { const tot = this.root.offsetHeight - innerHeight; this.onProgress(tot > 0 ? -this.root.getBoundingClientRect().top / tot : 0); };
        setH(); upd();
        const onR = () => { setH(); upd(); };
        addEventListener("scroll", upd, { passive: true }); addEventListener("resize", onR);
        this.cleanups.push(() => { removeEventListener("scroll", upd); removeEventListener("resize", onR); document.documentElement.classList.remove("seq-fallback"); });
      }
    }
  }

  destroy(){
    this.cleanups.forEach(f => { try { f(); } catch (e) {} }); this.cleanups = [];
    document.documentElement.classList.remove("seq-on", "seq-global"); this.cache.clear(); this.on = false;
  }
}

function boot(){ SEQUENCES.forEach(cfg => new ScrollImageSequence(cfg).init()); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
