/* =====================================================================
   dia.js — "Dia Text Reveal" (implementação própria, JavaScript puro)
   Uma faixa de cor percorre o texto da esquerda para a direita, revelando as letras com um brilho
   em degradê, e termina assentando na cor normal do texto. Inspirado no componente DiaTextReveal
   do Magic UI (React); aqui sem dependências e com as cores da marca.
   • MercuriusDia.prep(el)       esconde o texto de el (pronto para ser revelado)
   • MercuriusDia.play(el, opts) corre a faixa uma única vez ({delay, duration} em segundos)
   • O scroll.js chama play() quando cada título entra na cena; o hero arranca sozinho ao carregar.
   Desligado com "reduzir movimento" (o texto fica sempre visível). Se algo falhar, o CSS volta a mostrar o texto.
   ===================================================================== */
(function(){
"use strict";
const root = document.documentElement;
const api = { prep(){ return null; }, play(){}, prepAll(){}, playAll(){} };
window.MercuriusDia = api;
if (!root.classList.contains("st-on")) return;
window.__diaReady = true;                       // avisa o <head> de que o efeito está ativo (senão o hero volta a aparecer sozinho)

const CFG = {
  colors: ["#36A9F5", "#C7D2DF", "#D6AD55"],    // azul → cromo → dourado (o dourado é a borda de ataque da faixa)
  band: 34,                                     // largura da faixa (% da largura de cada linha)
  duration: 1.5,                                // segundos
  auto: [                                       // textos que arrancam ao carregar a página
    { sel: ".hero .kicker", delay: 0.10, duration: 1.2 },
    { sel: ".hero h1",      delay: 0.25, duration: 1.9 },
    { sel: ".hero p.lead",  delay: 0.75, duration: 1.4 }
  ]
};
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;

function gradient(base, x){
  const b = CFG.band, c = CFG.colors, n = c.length;
  let s = base + " 0%," + base + " " + (x - b).toFixed(2) + "%";
  c.forEach((col, i) => { s += "," + col + " " + (x - b + b * i / (n - 1)).toFixed(2) + "%"; });
  return "linear-gradient(90deg," + s + ",transparent " + (x + 3).toFixed(2) + "%)";
}

api.prep = function(el){
  if (!el) return null;
  if (el.__dia) return el.__dia;
  const span = document.createElement("span");          // o gradiente fica no <span>, não no título (preserva fundos/placas do título)
  span.className = "dia-t dia";
  while (el.firstChild) span.appendChild(el.firstChild);
  el.appendChild(span);
  const st = { el, span, base: getComputedStyle(el).color, played: false };
  span.style.backgroundImage = gradient(st.base, -CFG.band - 4);   // tudo escondido até a faixa passar
  el.__dia = st; return st;
};

/* um único laço de animação para todos os textos em curso (leve, mesmo com vários ao mesmo tempo) */
const jobs = []; let running = false;
function loop(now){
  for (let i = jobs.length - 1; i >= 0; i--) {
    const j = jobs[i]; if (now < j.t0) continue;
    const t = Math.min(1, (now - j.t0) / j.dur), x = Math.round(lerp(j.from, j.to, ease(t)) * 2) / 2;
    if (x !== j.q) { j.q = x; j.st.span.style.backgroundImage = gradient(j.st.base, x); }
    if (t >= 1) { j.st.span.classList.remove("dia"); j.st.span.style.backgroundImage = ""; jobs.splice(i, 1); }   // assenta na cor normal
  }
  if (jobs.length) requestAnimationFrame(loop); else running = false;
}
api.play = function(el, o){
  if (!el) return;
  const st = api.prep(el); if (!st || st.played) return;
  st.played = true; o = o || {};
  if (el.matches(".hero h1,.hero .kicker,.hero p.lead")) {            // elementos que arrancam escondidos por CSS
    el.style.animation = "none"; el.style.opacity = "1"; el.style.transform = "none"; el.classList.add("dia-ok");
  }
  jobs.push({ st, t0: performance.now() + (o.delay || 0) * 1000, dur: (o.duration || CFG.duration) * 1000, from: -CFG.band - 4, to: 100 + CFG.band + 6, q: null });
  if (!running) { running = true; requestAnimationFrame(loop); }
};
api.prepAll = els => els.forEach(e => api.prep(e));
api.playAll = (els, o) => { o = o || {}; els.forEach((e, i) => api.play(e, { delay: (o.delay || 0) + i * (o.gap || 0.12), duration: o.duration })); };

function auto(){ CFG.auto.forEach(a => { const el = document.querySelector(a.sel); if (el) { api.prep(el); api.play(el, a); } }); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
