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
  var arr=[].slice.call(msgs.children).map(function(d){return {w:d.classList.contains('user')?'user':'bot',text:d.textContent||''}}).slice(-60);
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
function renderChat(){
  var history=loadChat();
  if(history.length) history.forEach(function(m){addMsg(m.text,m.w,false)});
  else addMsg('Merhaba, ben EVO. Obezite, BMI, diyabet ve bariatrik cerrahi hakkında genel bilgi verebilirim. Size nasıl yardımcı olabilirim?','bot',false);
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
#evo-fixed{pointer-events:auto!important;touch-action:none!important;-webkit-tap-highlight-color:transparent;position:fixed;right:12px;bottom:128px;width:118px;height:100px;z-index:2147483647!important;cursor:grab;display:flex;align-items:center;justify-content:center;animation:evoFloat 5s ease-in-out infinite;user-select:none;-webkit-user-select:none}
#evo-fixed.evo-dragging{cursor:grabbing;animation:none!important}
#evo-fixed.evo-returning{animation:none!important;transition:left .68s cubic-bezier(.22,.61,.36,1),top .68s cubic-bezier(.22,.61,.36,1),right .68s cubic-bezier(.22,.61,.36,1),bottom .68s cubic-bezier(.22,.61,.36,1);will-change:left,top,right,bottom}
#evo-fixed.evo-off{display:none}
#evo-fixed .evo-svg{width:118px;height:100px;display:block;pointer-events:none}
#evo-fixed .label{position:absolute;right:2px;top:-34px;background:rgba(255,255,255,.96);padding:6px 10px;border-radius:999px;color:#005082;font:600 10px Poppins,sans-serif;white-space:nowrap;box-shadow:0 6px 20px rgba(0,80,130,.16);pointer-events:none}
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
#evo-panel form{display:flex;padding:10px;gap:7px;border-top:1px solid #dcecef;align-items:flex-end;flex-shrink:0}
#evo-panel textarea{flex:1;min-width:0;border:1px solid #cfe1e5;border-radius:14px;padding:10px;resize:none;font:16px/1.35 Poppins,sans-serif;-webkit-text-size-adjust:100%;touch-action:manipulation;outline:none;box-sizing:border-box;max-height:120px}
#evo-panel .send{width:42px;border:0;border-radius:14px;background:#005082;color:#fff;cursor:pointer}
#evo-hide{margin:0 10px 5px;border:0;background:transparent;color:#557;font:10px Poppins;cursor:pointer}
@media(max-width:600px){#evo-panel textarea{font-size:16px!important;line-height:1.4}#evo-fixed{right:10px;bottom:128px;width:104px;height:88px}#evo-fixed .evo-svg{width:104px;height:88px}#evo-fixed .label{top:-30px;right:0;padding:5px 8px;font-size:9px}#evo-panel{right:10px;bottom:10px;width:calc(100vw - 20px);height:min(600px,calc(100vh - 20px))}}
`;
  document.head.appendChild(s);
}
function build(){
  if(document.getElementById('evo-fixed')||document.getElementById('evo-panel'))return;
  appendStyles();
  root=document.createElement('div');
  root.id='evo-fixed';
  root.setAttribute('aria-label','EVO sağlık asistanı');
  root.setAttribute('role','button');
  root.tabIndex=0;
  root.innerHTML='<div class="label">Ben EVO 👋</div><img class="evo-svg" src="/assets/evo-character.svg" alt="EVO sağlık asistanı">';
  panel=document.createElement('section');
  panel.id='evo-panel';
  panel.setAttribute('aria-label','EVO sağlık asistanı');
  panel.innerHTML='<div class="eh"><div><strong>EVO</strong><span>Erol Vural Sağlık Asistanı</span></div><button class="ex" aria-label="Kapat">×</button></div><div id="evo-msgs"></div><div class="ed">Genel sağlık bilgilendirmesi içindir; tanı ve kişiye özel tedavi önerisinin yerine geçmez.</div><button id="evo-hide">EVO\'yu gizle</button><form><textarea rows="1" maxlength="1200" placeholder="EVO\'ya sorunuzu yazın…"></textarea><button class="send" aria-label="Gönder">➤</button></form>';
  document.body.appendChild(root);
  document.body.appendChild(panel);
  msgs=panel.querySelector('#evo-msgs');
  ta=panel.querySelector('textarea');
  face=root.querySelector('.evo-svg');
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
    addMsg(q,'user');
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
    var w=document.createElement('div');
    w.className='em bot';
    w.textContent='Düşünüyorum…';
    msgs.appendChild(w);
    msgs.scrollTop=msgs.scrollHeight;
    try{
      var r=await fetch('/api/evo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:q,history:[].slice.call(msgs.children).map(function(d){return {role:d.classList.contains('user')?'user':'assistant',content:d.textContent||''}}).slice(-8)})});
      var d=await r.json();
      w.textContent=d.answer||'Bu konuda genel sağlık bilgisi verebilirim. Kişisel tanı ve tedavi kararları için hekiminizle görüşmelisiniz.';
      saveChat();
    }catch(x){
      w.textContent='Şu anda bağlantı kurulamadı. Genel sağlık bilgileri için sorunuzu tekrar deneyebilirsiniz.';
      saveChat();
    }
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
    if(!drag.moved)openEvo();
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  document.addEventListener('pointercancel',function(e){
    if(!drag.active)return;
    drag.active=false;root.classList.remove('evo-dragging');
    try{root.releasePointerCapture(e.pointerId)}catch(x){}
  },true);
}
function init(){
  build();
  installPointer();
  window.addEventListener('resize',function(){placeEvo();syncVisualViewport()});
  window.addEventListener('orientationchange',function(){placeEvo();setTimeout(syncVisualViewport,150)});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',syncVisualViewport,{passive:true});
    window.visualViewport.addEventListener('scroll',syncVisualViewport,{passive:true});
  }
  syncVisualViewport();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();