/* ============ CONFIGURAÇÃO — edite aqui ============ */
const CONFIG = {
  instagramUrl: "https://www.instagram.com/mercurius_marketing",
  instagramDm:  "https://ig.me/m/mercurius_marketing",   // abre a conversa direta no Instagram
  email: "market.mercurius@gmail.com",
  whatsapp: "",   // ex.: "5511999999999" — vazio = não exibe
  services: [
    {id:"landing", name:"Landing Pages", text:"Páginas estratégicas projetadas para apresentar uma oferta, orientar a navegação e facilitar a conversão de visitantes em contatos ou oportunidades.",
     icon:'<rect x="8" y="10" width="48" height="44"/><line x1="8" y1="22" x2="56" y2="22"/><rect class="g" x="16" y="30" width="20" height="4"/><line x1="16" y1="40" x2="40" y2="40"/><line x1="16" y1="46" x2="34" y2="46"/>'},
    {id:"presenca", name:"Presença Digital", text:"Estruturação da apresentação digital da marca, com foco em coerência visual, clareza de mensagem e fortalecimento do posicionamento.",
     icon:'<circle cx="32" cy="32" r="8"/><circle cx="32" cy="32" r="17"/><circle cx="32" cy="32" r="26" stroke-dasharray="3 5"/><circle class="g" cx="32" cy="32" r="2" fill="#D6AD55"/>'},
    {id:"estrategia", name:"Estratégia de Comunicação e Marketing", text:"Organização da comunicação para que a proposta de valor seja compreendida pelo público e os próximos passos fiquem mais claros.",
     icon:'<line x1="6" y1="12" x2="32" y2="32"/><line x1="6" y1="32" x2="32" y2="32"/><line x1="6" y1="52" x2="32" y2="32"/><line class="g" x1="32" y1="32" x2="58" y2="32"/><path class="g" d="M52 26l6 6-6 6"/>'},
    {id:"experiencias", name:"Experiências Digitais", text:"Interfaces e soluções digitais desenvolvidas para simplificar processos, melhorar a experiência do usuário e organizar informações.",
     icon:'<circle cx="14" cy="14" r="5"/><circle cx="50" cy="16" r="5"/><circle cx="32" cy="50" r="5"/><line x1="18" y1="17" x2="46" y2="17"/><line x1="16" y1="19" x2="29" y2="46"/><line x1="48" y1="21" x2="35" y2="46"/><circle class="g" cx="32" cy="30" r="3"/>'}
  ],
  heroVideo: {mp4:"", webm:""},   // opcional: se preenchido, substitui o vídeo embutido do hero
};
/* ================================================== */

const $ = (s,r=document)=>r.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Links do Instagram */
const note=m=>{const n=$("#ctaNote");if(!n)return;n.textContent=m;n.classList.add("show")};
/* Se, após o clique, a página continuar em foco, o visualizador bloqueou o link */
document.addEventListener("click",e=>{
  if(!e.target.closest("[data-ig-dm]"))return;
  setTimeout(()=>{if(document.hidden||!document.hasFocus())return;note("Seu visualizador bloqueou a abertura do Instagram. Acesse: "+CONFIG.instagramUrl+" ou abra esta página direto no navegador.")},1200);
});
document.querySelectorAll("[data-ig-dm]").forEach(a=>{a.href=CONFIG.instagramDm});
document.querySelectorAll("[data-ig]").forEach(a=>{a.href=CONFIG.instagramUrl;a.target="_blank";a.rel="noopener noreferrer"});
document.getElementById("year").textContent = new Date().getFullYear();

/* Header */
const header=$("header.top");
const onScroll=()=>header.classList.toggle("solid",scrollY>40);
onScroll();addEventListener("scroll",onScroll,{passive:true});
const menuBtn=$(".menu-btn"),menu=$("#menu");
function setMenu(open){menu.classList.toggle("open",open);menuBtn.setAttribute("aria-expanded",open);menuBtn.setAttribute("aria-label",open?"Fechar menu":"Abrir menu")}
menuBtn.addEventListener("click",()=>setMenu(!menu.classList.contains("open")));
menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>setMenu(false)));
addEventListener("keydown",e=>{if(e.key==="Escape"&&menu.classList.contains("open")){setMenu(false);menuBtn.focus()}});

/* Vídeos configuráveis */
function swapSources(video,list){
  const srcs=list.filter(s=>s.url);if(!srcs.length)return;
  video.innerHTML=srcs.map(s=>`<source src="${s.url}" type="${s.type}">`).join("");video.load();
}
swapSources($("#heroVideo"),[{url:CONFIG.heroVideo.webm,type:"video/webm"},{url:CONFIG.heroVideo.mp4,type:"video/mp4"}]);

/* Hero: autoplay só quando permitido; poster como fallback */
(function(){
  const v=$("#heroVideo"),p=$("#heroPoster");
  const saveData=navigator.connection&&navigator.connection.saveData;
  if(reduce||saveData){v.remove();return}
  v.style.opacity=0;v.style.transition="opacity 1s";
  const show=()=>{v.style.opacity=1};
  v.addEventListener("playing",show,{once:true});
  const tryPlay=()=>{const r=v.play();if(r&&r.catch)r.catch(()=>{})};
  tryPlay();
  document.addEventListener("visibilitychange",()=>{document.hidden?v.pause():tryPlay()});
  new IntersectionObserver(([e])=>{e.isIntersecting?tryPlay():v.pause()},{threshold:.05}).observe($("#inicio"));
})();

/* Soluções (módulos editáveis em CONFIG.services) */
const grid=$("#solGrid");
CONFIG.services.forEach(s=>{
  const el=document.createElement("article");el.className="sol";
  el.innerHTML=`<svg viewBox="0 0 64 64" aria-hidden="true">${s.icon}</svg><h3></h3><p></p><a href="#contato" data-tipo="${s.id}">Solicitar uma proposta</a>`;
  $("h3",el).textContent=s.name;$("p",el).textContent=s.text;grid.appendChild(el);
});

/* Ruído → clareza */
(function(){
  const g=$("#noiseLines"),svg=$("#noise"),ns="http://www.w3.org/2000/svg";
  let seed=7;const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280};
  const N=13;
  for(let i=0;i<N;i++){
    const y=70+i*(340/(N-1)),w=70+(i%4)*38,x0=300-w-14,x1=300+14;
    const gr=document.createElementNS(ns,"g");gr.setAttribute("class","s");
    const l=document.createElementNS(ns,"line");
    const side=i%2?1:-1;
    l.setAttribute("x1",side>0?x1:x0);l.setAttribute("x2",side>0?x1+w:x0+w-0);l.setAttribute("y1",y);l.setAttribute("y2",y);
    l.setAttribute("stroke",i%5===2?"#36A9F5":"#C7D2DF");l.setAttribute("stroke-width",i%5===2?1.6:1);l.setAttribute("stroke-opacity",i%5===2?.9:.55);
    gr.appendChild(l);
    const rx=(rnd()-.5)*340,ry=(rnd()-.5)*300,rot=(rnd()-.5)*120;
    gr.dataset.chaos=`translate(${rx}px,${ry}px) rotate(${rot}deg)`;
    gr.style.transform=gr.dataset.chaos;gr.style.opacity=.55;
    g.appendChild(gr);
  }
  const go=()=>{svg.classList.add("on");g.querySelectorAll("g.s").forEach((el,i)=>{el.style.transitionDelay=(i*60)+"ms";el.style.transform="none";el.style.opacity=1})};
  window.__noise={svg,g};                       // scroll.js controla esta animação pelo scroll
  if(document.documentElement.classList.contains("st-on"))return;
  if(reduce){go();return}
  new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){go();o.disconnect()}},{threshold:.4}).observe(svg);
})();

/* Linha do processo */
(function(){
  const s=$("#steps");
  if(document.documentElement.classList.contains("st-on"))return;   // scroll.js controla a linha
  if(reduce){s.classList.add("on");return}
  new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){s.classList.add("on");o.disconnect()}},{threshold:.35}).observe(s);
})();

/* Contato direto (somente dados configurados) */
(function(){
  const d=$("#direct"),items=[["Instagram","@mercurius_marketing",CONFIG.instagramUrl,true]];
  if(CONFIG.whatsapp)items.push(["WhatsApp","+"+CONFIG.whatsapp,"https://wa.me/"+CONFIG.whatsapp,true]);
  items.forEach(([k,v,h,ext])=>{const a=document.createElement("a");a.href=h;if(ext){a.target="_blank";a.rel="noopener noreferrer"}a.innerHTML=`<span></span><span></span>`;a.children[0].textContent=k;a.children[1].textContent=v;d.appendChild(a)});
})();


