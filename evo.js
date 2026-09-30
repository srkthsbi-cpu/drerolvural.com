(function(){
'use strict';
// Deploy trigger: refresh Workers AI binding after Cloudflare AI configuration.
if(window.__EVO_LOADED__) return;
window.__EVO_LOADED__=true;

var hiddenKey='drerolvural_evo_removed';
// Eski sürümde "gizle" işlemi bu anahtarı kalıcı olarak yazıyordu.
// Yeni sürümde gizle yalnızca sohbet penceresini kapattığı için eski kilidi bir kez temizle.
try{localStorage.removeItem('drerolvural_evo_hidden')}catch(e){}
var chatKey='drerolvural_evo_chat';
var root, panel, msgs, ta, face;
var drag={active:false,moved:false,pointerId:null,startX:0,startY:0,originX:0,originY:0};
var evoTapCount=0,evoTapTimer=null,layered=false,layerEls={};

function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
function set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function loadChat(){
  try{
    var x=JSON.parse(localStorage.getItem(chatKey)||'[]');
    return Array.isArray(x)?x.filter(function(m){return m&&typeof m.text==='string'&&/^(bot|user)$/.test(m.w)}).slice(-60):[];
  }catch(e){return []}
}
function saveChat(){
  if(!msgs)return;
  var arr=[].slice.call(msgs.children).filter(function(d){return d.dataset.sensitive!=='1'}).map(function(d){return {w:d.classList.contains('user')?'user':'bot',text:d.textContent||''}}).slice(-60);
  set(chatKey,JSON.stringify(arr));
}
function addMsg(t,w,save){
  if(!msgs)return;
  var d=document.createElement('div');
  d.className='em '+w;
  d.textContent=t;
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
  if(save!==false)saveChat();
}
function getTimeGreeting(){
  // Türkiye saati: siteye ilk girişte saat aralığına göre doğal bir karşılama.
  var now=new Date();
  var parts=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',hour:'numeric',hour12:false}).formatToParts(now);
  var hour=Number((parts.find(function(p){return p.type==='hour'})||{}).value||0);
  if(hour>=5&&hour<11)return 'Günaydın! Ben EVO. Size nasıl yardımcı olabilirim?';
  if(hour>=11&&hour<17)return 'İyi günler! Ben EVO. Size nasıl yardımcı olabilirim?';
  if(hour>=17&&hour<21)return 'İyi akşamlar! Ben EVO. Size nasıl yardımcı olabilirim?';
  return 'İyi geceler! Ben EVO. Size nasıl yardımcı olabilirim?';
}
function renderChat(){
  var history=loadChat();
  if(history.length) history.forEach(function(m){addMsg(m.text,m.w,false)});
  else addMsg(getTimeGreeting(),'bot',false);
}
function setEvoState(state){
  state=state||'idle';
  if(root)root.dataset.evoState=state;
  if(face){
    face.setAttribute('class','evo-svg evo-fallback is-'+state);
  }
}
async function buildLayeredCharacter(){
  if(!root)return;
  // Use the original vector EVO inline so its real eye/brow/mouth animations
  // remain active. The raster composite is intentionally not used for motion.
  try{
    var r=await fetch('/assets/evo30-clean-final.svg?v=20260930-11',{cache:'no-store'});
    if(!r.ok)throw new Error('EVO SVG yüklenemedi');
    var markup=await r.text();
    var holder=document.createElement('div');
    holder.className='evo-vector-holder';
    holder.innerHTML=markup;
    var svg=holder.querySelector('svg.evo-svg');
    if(!svg)throw new Error('EVO SVG bulunamadı');
    svg.setAttribute('aria-hidden','true');
    svg.removeAttribute('role');
    root.appendChild(holder);
    face=svg;
    layered=true;
    setEvoState('idle');
  }catch(e){
    var fallback=document.createElement('img');
    fallback.className='evo-svg evo-fallback';
    fallback.src='/assets/evo30-composite.svg';
    fallback.alt='EVO sağlık asistanı';
    root.appendChild(fallback);
    face=fallback;
    layered=true;
    setEvoState('idle');
  }
}
function showEvoHearts(){
  if(!root||root.classList.contains('evo-off'))return;
  if(layered)setEvoState('happy');
  var hearts=['💙','💙','💙','💙','💙'];
  hearts.forEach(function(h,i){
    var el=document.createElement('span');
    el.className='evo-heart';
    el.textContent=h;
    el.style.setProperty('--heart-x',((i-2)*24+(Math.random()*12-6))+'px');
    el.style.setProperty('--heart-r',((i-2)*10+(Math.random()*10-5))+'deg');
    el.style.animationDelay=(i*70)+'ms';
    root.appendChild(el);
    setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},1700);
  });
}
function handleEvoTripleTap(){
  evoTapCount++;
  clearTimeout(evoTapTimer);
  if(evoTapCount>=3){
    evoTapCount=0;
    showEvoHearts();
    return;
  }
  evoTapTimer=setTimeout(function(){evoTapCount=0},650);
}
function isSensitiveHealthMessage(text){
  text=String(text||'');
  return /(?:kilo|kilom|kiloyum|boyum|boy\s*\d|bmi|vki|vücut\s*kitle|tahlil|kan\s*değeri|kan\s*şekeri|şekerim|diyabet|insülin|tansiyon|kolesterol|hastalık|hastayım|teşhis|tanı|ameliyat|operasyon|ilaç|ilaçlar|reçete|mr|tomografi|ultrason|endoskopi|biyopsi|patoloji|rapor|semptom|belirti|ağrı|hamileyim|gebeyim|alerji|alerjim|kan\s*grubu|nabız|ateş|depresyon|anksiyete|psikiyatr|obezite|mide\s*balonu|tüp\s*mide|gastrik\s*bypass|bypass)/i.test(text);
}
function isThanksMessage(text){
  return /\b(teşekkür(?:ler|lerim)?|tesekkur(?:ler|lerim)?|sağ\s*ol(?:un)?|sag\s*ol(?:un)?|çok\s*sağ\s*ol|cok\s*sag\s*ol|thanks|thank\s*you|thx)\b/i.test(text||'');
}
function showPrivacyGate(q){
  var box=document.createElement('div');
  box.className='em bot evo-privacy-gate';
  box.dataset.sensitive='1';
  box.innerHTML='<strong>Gizlilik uyarısı</strong><br>Bu mesaj kişisel sağlık bilgileri içerebilir. Sağlık verileri, KVKK kapsamında özel nitelikli kişisel verilerdir. EVO yanıt oluşturabilmek için bu bilgiyi işleyebilir. Lütfen kişisel kimlik bilgilerinizi (T.C. kimlik no, telefon, adres vb.) paylaşmayın.<div class="evo-privacy-text">Devam etmeden önce bu bilgilerin EVO tarafından yanıt oluşturma amacıyla işlenmesine devam etmek istediğinizi seçin.</div><div class="evo-privacy-actions"><button type="button" class="evo-privacy-continue">Devam et</button><button type="button" class="evo-privacy-cancel">İptal</button></div>';
  msgs.appendChild(box);
  msgs.scrollTop=msgs.scrollHeight;
  box.querySelector('.evo-privacy-continue').onclick=function(){
    box.remove();
    sendQuestion(q,true);
  };
  box.querySelector('.evo-privacy-cancel').onclick=function(){
    box.remove();
    addMsg('Tamam. Kişisel sağlık bilgilerinizi göndermeden de genel bilgi sorabilirsiniz.','bot');
  };
}
function sendQuestion(q,privacyConsent){
  var w=document.createElement('div');
  w.className='em bot';
  w.textContent='Düşünüyorum…';
  setEvoState('thinking');
  msgs.appendChild(w);
  msgs.scrollTop=msgs.scrollHeight;
  fetch('/api/evo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:q,privacyConsent:!!privacyConsent,history:[].slice.call(msgs.children).filter(function(d){return d.dataset.sensitive!=='1'}).map(function(d){return {role:d.classList.contains('user')?'user':'assistant',content:d.textContent||''}}).slice(-8)})})
  .then(function(r){return r.json()})
  .then(function(d){
    if(d.needsPrivacyConsent){
      w.textContent='Bu mesaj kişisel sağlık bilgileri içeriyor olabilir. Yanıt oluşturabilmem için önce gizlilik onayını vermeniz gerekiyor.';
      return;
    }
    w.textContent=d.answer||'Bu konuda genel sağlık bilgisi verebilirim. Kişisel tanı ve tedavi kararları için hekiminizle görüşmelisiniz.';
    setEvoState(isThanksMessage(q)?'happy':'talking');
    if(isThanksMessage(q))setTimeout(showEvoHearts,120);
    setTimeout(function(){setEvoState('idle')},900);
    saveChat();
  })
  .catch(function(){
    w.textContent='Şu anda bağlantı kurulamadı. Genel sağlık bilgileri için sorunuzu tekrar deneyebilirsiniz.';
    setEvoState('idle');
    saveChat();
  });
}
function openEvo(){
  if(get(hiddenKey)==='1')return;
  panel.classList.remove('closing');
  panel.classList.add('open');
  // EVO açıldığında input otomatik odaklanmaz; iOS Safari klavyesini/viewport'u kendiliğinden açmayız.
}
function closeChat(){
  panel.classList.remove('open');
  panel.classList.add('closing');
  setTimeout(function(){panel.classList.remove('closing')},300);
  resetEvoPosition();
}
function removeEvo(){
  panel.classList.remove('open');
  set(hiddenKey,'1');
  root.classList.add('evo-off');
}
function resetEvoPosition(){
  if(root.dataset.dragged==='1'){
    root.classList.add('evo-returning');
    root.dataset.dragged='0';
    root.style.left='';
    root.style.top='';
    root.style.right=innerWidth<=600?'10px':'12px';
    root.style.bottom='128px';
    setTimeout(function(){root.classList.remove('evo-returning');placeEvo()},700);
  }else placeEvo();
}
function placeEvo(){
  if(root.dataset.dragged==='1')return;
  root.style.left='';
  root.style.top='';
  root.style.right=innerWidth<=600?'10px':'12px';
  root.style.bottom='128px';
}
function syncVisualViewport(){
  if(!panel)return;
  var vv=window.visualViewport;
  if(!vv){
    panel.classList.remove('evo-keyboard');
    panel.style.removeProperty('--evo-vv-height');
    panel.style.removeProperty('--evo-vv-bottom');
    return;
  }
  var layoutH=window.innerHeight||document.documentElement.clientHeight;
  var visualH=vv.height||layoutH;
  var keyboardOpen=ta&&document.activeElement===ta&&((layoutH-visualH)>80||vv.offsetTop>20);
  if(keyboardOpen){
    var bottomGap=Math.max(10,layoutH-(vv.offsetTop+visualH)+10);
    var maxH=Math.max(260,Math.min(600,visualH-20));
    panel.classList.add('evo-keyboard');
    panel.style.setProperty('--evo-vv-height',maxH+'px');
    panel.style.setProperty('--evo-vv-bottom',bottomGap+'px');
  }else{
    panel.classList.remove('evo-keyboard');
    panel.style.removeProperty('--evo-vv-height');
    panel.style.removeProperty('--evo-vv-bottom');
  }
}
function hit(node,x,y){
  if(!node)return false;
  var r=node.getBoundingClientRect();
  return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
}
function appendStyles(){
  var s=document.createElement('style');
  s.id='evo-global-style';
  s.textContent=`
#evo-fixed{pointer-events:auto!important;touch-action:none!important;-webkit-tap-highlight-color:transparent;position:fixed;right:12px;bottom:150px;width:126px;height:102px;z-index:2147483647!important;cursor:grab;display:flex;align-items:center;justify-content:center;animation:evoFloat 5s ease-in-out infinite;user-select:none;-webkit-user-select:none}
#evo-fixed.evo-dragging{cursor:grabbing;animation:none!important}
#evo-fixed.evo-returning{animation:none!important;transition:left .68s cubic-bezier(.22,.61,.36,1),top .68s cubic-bezier(.22,.61,.36,1),right .68s cubic-bezier(.22,.61,.36,1),bottom .68s cubic-bezier(.22,.61,.36,1);will-change:left,top,right,bottom}
#evo-fixed.evo-off{display:none}
#evo-fixed .evo-vector-holder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;filter:drop-shadow(0 10px 18px rgba(0,110,160,.16));transform-origin:center bottom}
#evo-fixed .evo-vector-holder .evo-svg{width:100%;height:100%;display:block;pointer-events:none;overflow:visible}
#evo-fixed .evo-fallback{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,110,160,.16))}
#evo-fixed[data-evo-state="thinking"] .evo-vector-holder{animation:evoThink .9s ease-in-out infinite}
#evo-fixed[data-evo-state="talking"] .evo-vector-holder{animation:evoTalk .24s ease-in-out infinite alternate}
#evo-fixed[data-evo-state="happy"] .evo-vector-holder{animation:evoHappy .7s ease-in-out 2}
@keyframes evoThink{0%,100%{transform:translateX(0) rotate(0)}50%{transform:translateX(2px) rotate(1deg)}}
@keyframes evoTalk{from{transform:translateY(0) scale(1)}to{transform:translateY(-1.5px) scale(1.015)}}
@keyframes evoHappy{0%,100%{transform:scale(1)}50%{transform:scale(1.055) translateY(-2px)}}
#evo-fixed .label{position:absolute;right:2px;top:-34px;background:rgba(255,255,255,.96);padding:6px 10px;border-radius:999px;color:#005082;font:600 10px Poppins,sans-serif;white-space:nowrap;box-shadow:0 6px 20px rgba(0,80,130,.16);pointer-events:none}
.evo-heart{position:absolute;left:50%;top:15%;font-size:20px;line-height:1;pointer-events:none;z-index:4;opacity:0;animation:evoHeartFloat 1.45s cubic-bezier(.18,.72,.28,1) forwards;filter:drop-shadow(0 4px 8px rgba(220,50,100,.22))}
@keyframes evoHeartFloat{0%{opacity:0;transform:translate(-50%,8px) scale(.35) rotate(-10deg)}12%{opacity:1;transform:translate(-50%,0) scale(1.05) rotate(0)}100%{opacity:0;transform:translate(calc(-50% + var(--heart-x)), -78px) scale(.78) rotate(var(--heart-r))}}
@keyframes evoFloat{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-9px) rotate(1deg)}}
#evo-panel{pointer-events:auto!important;touch-action:manipulation!important;position:fixed;right:20px;bottom:20px;width:min(390px,calc(100vw - 28px));height:min(600px,calc(100vh - 40px));z-index:2147483646!important;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.9);border-radius:26px;background:rgba(248,253,255,.96);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:0 25px 70px rgba(0,60,100,.28);overflow:hidden;font-family:Poppins,sans-serif;opacity:0;visibility:hidden;transform:translateY(16px) scale(.96);transition:opacity .28s ease,transform .28s ease,visibility 0s linear .28s}
#evo-panel.open{opacity:1;visibility:visible;transform:translateY(0) scale(1);transition:opacity .28s ease,transform .28s ease,visibility 0s}
#evo-panel.closing{opacity:0;visibility:hidden;transform:translateY(16px) scale(.96)}
#evo-panel.evo-keyboard{height:var(--evo-vv-height)!important;bottom:var(--evo-vv-bottom)!important;transform:none!important;transition:opacity .2s ease,visibility 0s}
#evo-panel .eh{padding:15px 18px;background:linear-gradient(135deg,#005082,#009bb4);color:#fff;display:flex;align-items:center;justify-content:space-between}
#evo-panel .eh strong{font-size:18px}#evo-panel .eh span{display:block;font-size:10px;opacity:.85}
#evo-panel .ex{border:0;background:transparent;color:#fff;font-size:25px;cursor:pointer}
#evo-msgs{flex:1;overflow:auto;padding:15px}.em{max-width:86%;padding:10px 13px;border-radius:16px;margin:7px 0;font-size:13px;line-height:1.45}.em.bot{background:#e8f7fa;color:#17485a}.em.user{margin-left:auto;background:#005082;color:#fff}
#evo-panel .ed{padding:7px 14px;font-size:9px;color:#667;background:#f2fafb}
.evo-privacy-gate{font-size:12px!important;border:1px solid #b8dfe7}
.evo-privacy-gate strong{color:#005082}
.evo-privacy-text{margin-top:7px}
.evo-privacy-actions{display:flex;gap:7px;margin-top:10px}
.evo-privacy-actions button{border:0;border-radius:999px;padding:8px 12px;font:600 11px Poppins,sans-serif;cursor:pointer}
.evo-privacy-continue{background:#005082;color:#fff}.evo-privacy-cancel{background:#fff;color:#005082;border:1px solid #cfe1e5!important}
#evo-panel form{display:flex;padding:10px;gap:7px;border-top:1px solid #dcecef;align-items:flex-end;flex-shrink:0}
#evo-panel textarea{flex:1;min-width:0;border:1px solid #cfe1e5;border-radius:14px;padding:10px;resize:none;font:16px/1.35 Poppins,sans-serif;-webkit-text-size-adjust:100%;touch-action:manipulation;outline:none;box-sizing:border-box;max-height:120px}
#evo-panel .send{width:42px;border:0;border-radius:14px;background:#005082;color:#fff;cursor:pointer}
#evo-hide{margin:0 10px 5px;border:0;background:transparent;color:#557;font:10px Poppins;cursor:pointer}
@media(max-width:600px){#evo-panel textarea{font-size:16px!important;line-height:1.4}#evo-fixed{right:8px;bottom:158px;width:118px;height:96px}#evo-fixed .evo-svg{width:118px;height:96px}.evo-label-placeholder{}#evo-fixed .label{top:-29px;right:0;padding:5px 8px;font-size:9px}#evo-panel{right:10px;bottom:10px;width:calc(100vw - 20px);height:min(600px,calc(100vh - 20px))}}
`;
  document.head.appendChild(s);
}
async function build(){
  if(document.getElementById('evo-fixed')||document.getElementById('evo-panel'))return;
  appendStyles();
  root=document.createElement('div');
  root.id='evo-fixed';
  root.setAttribute('aria-label','EVO sağlık asistanı');
  root.setAttribute('role','button');
  root.tabIndex=0;
  root.innerHTML='<div class="label">Ben EVO 👋</div>';
  panel=document.createElement('section');
  panel.id='evo-panel';
  panel.setAttribute('aria-label','EVO sağlık asistanı');
  panel.innerHTML='<div class="eh"><div><strong>EVO</strong><span>Erol Vural Online Dijital Sağlık Asistanı</span></div><button class="ex" aria-label="Kapat">×</button></div><div id="evo-msgs"></div><div class="ed">Genel sağlık bilgilendirmesi içindir; tanı ve kişiye özel tedavi önerisinin yerine geçmez.</div><button id="evo-hide">EVO\'yu gizle</button><form><textarea rows="1" maxlength="1200" placeholder="EVO\'ya sorunuzu yazın…"></textarea><button class="send" aria-label="Gönder">➤</button></form>';
  document.body.appendChild(root);
  document.body.appendChild(panel);
  msgs=panel.querySelector('#evo-msgs');
  ta=panel.querySelector('textarea');
  await buildLayeredCharacter();
  renderChat();
  placeEvo();
  if(get(hiddenKey)==='1')root.classList.add('evo-off');

  panel.querySelector('.ex').onclick=function(e){e.preventDefault();closeChat()};
  panel.querySelector('#evo-hide').onclick=function(e){e.preventDefault();closeChat()};
  root.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openEvo()}});
  if(ta){
    ta.addEventListener('focus',function(){
      // iOS Safari'de klavye açıldığında görsel viewport küçülür. Paneli
      // visualViewport'a göre yeniden konumlandırarak sayfanın yukarı
      // kaymış/zoom olmuş gibi görünmesini engelleriz.
      panel.classList.add('evo-input-focused');
      setTimeout(syncVisualViewport,0);
      setTimeout(syncVisualViewport,120);
      setTimeout(syncVisualViewport,300);
    });
    ta.addEventListener('blur',function(){
      panel.classList.remove('evo-input-focused');
      setTimeout(syncVisualViewport,80);
      setTimeout(syncVisualViewport,350);
    });
  }
  panel.querySelector('form').onsubmit=async function(e){
    e.preventDefault();
    var q=ta.value.trim();
    if(!q)return;
    ta.value='';
    addMsg(q,'user',!isSensitiveHealthMessage(q));
    if(isSensitiveHealthMessage(q)){
      var sensitiveUser=msgs.lastElementChild;
      if(sensitiveUser)sensitiveUser.dataset.sensitive='1';
      showPrivacyGate(q);
      return;
    }
    if(/evo[’']?yu\s+(kaldır|sil)/i.test(q)){
      addMsg('Tamam. EVO bu cihazda kaldırılıyor.','bot');
      setTimeout(removeEvo,350);
      return;
    }
    if(/evo[’']?yu\s+(gizle|kapat|sakla)/i.test(q)){
      addMsg('Tamam. Konuşma penceresini kapatıyorum. Sohbetiniz korunacak.','bot');
      setTimeout(closeChat,350);
      return;
    }
    sendQuestion(q,false);
  };
}
function installPointer(){
  document.addEventListener('pointerdown',function(e){
    if(!root||root.classList.contains('evo-off')||!hit(root,e.clientX,e.clientY))return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    drag.active=true;drag.moved=false;drag.pointerId=e.pointerId;drag.startX=e.clientX;drag.startY=e.clientY;
    var r=root.getBoundingClientRect();drag.originX=r.left;drag.originY=r.top;
    root.classList.add('evo-dragging');
    try{root.setPointerCapture(e.pointerId)}catch(x){}
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  document.addEventListener('pointermove',function(e){
    if(!drag.active||e.pointerId!==drag.pointerId)return;
    var dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    if(Math.abs(dx)>6||Math.abs(dy)>6)drag.moved=true;
    if(drag.moved){
      var x=Math.max(4,Math.min(innerWidth-root.offsetWidth-4,drag.originX+dx));
      var y=Math.max(4,Math.min(innerHeight-root.offsetHeight-4,drag.originY+dy));
      root.style.left=x+'px';root.style.top=y+'px';root.style.right='auto';root.style.bottom='auto';root.dataset.dragged='1';
    }
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  document.addEventListener('pointerup',function(e){
    if(!drag.active||e.pointerId!==drag.pointerId)return;
    drag.active=false;root.classList.remove('evo-dragging');
    try{root.releasePointerCapture(e.pointerId)}catch(x){}
    if(!drag.moved){
      handleEvoTripleTap();
      openEvo();
    }
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  document.addEventListener('pointercancel',function(e){
    if(!drag.active)return;
    drag.active=false;root.classList.remove('evo-dragging');
    try{root.releasePointerCapture(e.pointerId)}catch(x){}
  },true);
}
async function init(){
  await build();
  installPointer();
  window.addEventListener('resize',function(){placeEvo();syncVisualViewport()});
  window.addEventListener('orientationchange',function(){placeEvo();setTimeout(syncVisualViewport,150)});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',syncVisualViewport,{passive:true});
    window.visualViewport.addEventListener('scroll',syncVisualViewport,{passive:true});
  }
  syncVisualViewport();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){init()},{once:true});else init();
})();