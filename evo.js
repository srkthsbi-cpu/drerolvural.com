(function(){
'use strict';
if(window.__EVO_LOADED__) return; window.__EVO_LOADED__=true;
const HIDDEN_KEY='drerolvural_evo_hidden';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function hidden(){try{return localStorage.getItem(HIDDEN_KEY)==='1'}catch(_){return false}}
function hide(){try{localStorage.setItem(HIDDEN_KEY,'1')}catch(_){} const e=document.getElementById('evo-assistant');const c=document.getElementById('evo-chat');if(e)e.remove();if(c)c.remove()}
function show(){try{localStorage.removeItem(HIDDEN_KEY)}catch(_){} location.reload()}
const knowledge=[
[/\b(bmi|vücut kitle|vücut kitle indeksi)\b/i,'BMI (Vücut Kitle İndeksi), yetişkinlerde boy ve kilo arasındaki ilişkiyi değerlendirmede kullanılan bir ölçüttür. İsterseniz sitedeki BMI hesaplayıcısını kullanabilirsiniz. BMI tek başına tanı veya tedavi kararı vermez.'],
[/\b(obezite|şişmanlık)\b/i,'Obezite, sağlık üzerinde olumsuz etkileri olabilen fazla yağ dokusunun birikimiyle ilişkili kronik bir durumdur. Nedenleri ve tedavisi kişiden kişiye değişebilir; değerlendirme klinik bilgilerle birlikte yapılır.'],
[/\b(tüp mide|sleeve gastrektomi|mide küçültme)\b/i,'Tüp mide (sleeve gastrektomi), midenin bir bölümünün cerrahi olarak çıkarılmasıyla mide hacminin azaltılmasını amaçlayan bariatrik cerrahi yöntemidir. Uygunluk ve tedavi seçimi kişisel hekim değerlendirmesi gerektirir.'],
[/\b(gastrik bypass|mide bypass|bypass)\b/i,'Gastrik bypass, sindirim sisteminin anatomisini değiştirerek hem mide kapasitesini hem de besinlerin emilim yolunu etkileyen bariatrik cerrahi yöntemlerden biridir. Hangi yöntemin uygun olduğu kişisel değerlendirmeyle belirlenir.'],
[/\b(diyabet|şeker hastalığı|insülin direnci)\b/i,'Tip 2 diyabet ve insülin direnci kilo, beslenme, fiziksel aktivite, genetik ve başka birçok faktörle ilişkilidir. Kişisel tedavi ve ilaç kararları hekim değerlendirmesi gerektirir.'],
[/\b(randevu|iletişim|telefon|adres)\b/i,'Randevu ve iletişim bilgileri için sitenin İletişim bölümünü kullanabilirsiniz. EVO tıbbi randevu onayı veya tanı koyma işlemi yapmaz.']
];
function fallback(q){for(const [re,a] of knowledge)if(re.test(q))return a;return 'Bu konuda genel sağlık bilgisi verebilirim. Sorunuzu biraz daha açık yazarsanız EVO daha iyi yardımcı olabilir. Tanı, kişiye özel tedavi veya ameliyat uygunluğu konusunda kesin karar veremem; bu konular hekim değerlendirmesi gerektirir.'}
function mount(){
 if(hidden()||document.getElementById('evo-assistant'))return;
 const root=document.createElement('div');root.innerHTML='<div id="evo-assistant" aria-label="EVO sağlık asistanı" role="button" tabindex="0"><div class="evo-float"><div class="evo-head"><span class="evo-leaf"></span><span class="evo-ear left"></span><span class="evo-ear right"></span><div class="evo-screen"><i class="evo-brow left"></i><i class="evo-brow right"></i><i class="evo-eye left"></i><i class="evo-eye right"></i><i class="evo-smile"></i></div></div><div class="evo-tip">Ben EVO — Bana sorabilirsiniz</div></div></div><section id="evo-chat" class="evo-chat" aria-label="EVO sohbet penceresi" aria-hidden="true"><header class="evo-chat-head"><div class="evo-mini"></div><div class="evo-headtext"><strong>EVO</strong><span>Erol Vural Sağlık Asistanı</span></div><button class="evo-close" type="button" aria-label="Kapat">×</button></header><div class="evo-messages"></div><div class="evo-disclaimer">Genel sağlık bilgilendirmesi içindir; tanı ve kişiye özel tedavi önerisinin yerine geçmez.</div><button class="evo-hide" type="button">EVO'yu gizle</button><form class="evo-input"><textarea rows="1" maxlength="1200" placeholder="EVO'ya sorunuzu yazın…"></textarea><button class="evo-send" type="submit" aria-label="Gönder">➤</button></form></section>';
 document.body.appendChild(root);
 const bot=document.getElementById('evo-assistant'),chat=document.getElementById('evo-chat'),msgs=chat.querySelector('.evo-messages'),form=chat.querySelector('form'),ta=form.querySelector('textarea');
 function add(text,who){const d=document.createElement('div');d.className='evo-msg '+who;d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}
 function open(){chat.classList.add('open');chat.setAttribute('aria-hidden','false');if(!msgs.children.length)add('Merhaba, ben EVO. Obezite, diyabet, BMI, bariatrik cerrahi ve genel sağlık hakkında bilgi verebilirim. Size nasıl yardımcı olabilirim?','bot');setTimeout(()=>ta.focus(),150)}
 bot.addEventListener('click',open);bot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
 chat.querySelector('.evo-close').onclick=()=>{chat.classList.remove('open');chat.setAttribute('aria-hidden','true')};
 chat.querySelector('.evo-hide').onclick=()=>hide();
 form.addEventListener('submit',async e=>{e.preventDefault();const q=ta.value.trim();if(!q)return;ta.value='';add(q,'user');
 if(/evo[’']?yu\s+(gizle|kapat|sakla)|evo\s*(yu|yu)\s*(sil|kaldır)/i.test(q)){add('Tamam. EVO bu cihazda gizleniyor. İsterseniz siteyi yenileyerek geri getirebilirsiniz.','bot');setTimeout(hide,900);return}
 const wait=document.createElement('div');wait.className='evo-msg bot';wait.textContent='Düşünüyorum…';msgs.appendChild(wait);msgs.scrollTop=msgs.scrollHeight;
 try{const r=await fetch('/api/evo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:q})});const data=await r.json();wait.textContent=data.answer||fallback(q)}catch(_){wait.textContent=fallback(q)}
 msgs.scrollTop=msgs.scrollHeight;
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.EVO={hide,show};
})();