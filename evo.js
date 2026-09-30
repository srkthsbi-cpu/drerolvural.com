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
const EVO_I18N={
tr:{morning:'Günaydın! Ben EVO. Size nasıl yardımcı olabilirim?',day:'İyi günler! Ben EVO. Size nasıl yardımcı olabilirim?',evening:'İyi akşamlar! Ben EVO. Size nasıl yardımcı olabilirim?',night:'İyi geceler! Ben EVO. Size nasıl yardımcı olabilirim?',label:'Ben EVO 👋',subtitle:'Erol Vural Online Dijital Sağlık Asistanı',close:'Kapat',hide:"EVO'yu gizle",disclaimer:'Genel sağlık bilgilendirmesi içindir; tanı ve kişiye özel tedavi önerisinin yerine geçmez.',placeholder:"EVO'ya sorunuzu yazın…",send:'Gönder',thinking:'Düşünüyorum…',offline:'Şu anda bağlantı kurulamadı. Genel sağlık bilgileri için sorunuzu tekrar deneyebilirsiniz.',privacyTitle:'Gizlilik uyarısı',privacyBody:'Bu mesaj kişisel sağlık bilgileri içerebilir. Sağlık verileri, KVKK kapsamında özel nitelikli kişisel verilerdir. EVO yanıt oluşturabilmek için bu bilgiyi işleyebilir. Lütfen kişisel kimlik bilgilerinizi paylaşmayın.',privacyContinue:'Devam et',privacyCancel:'İptal',privacyResponse:'Bu mesaj kişisel sağlık bilgileri içeriyor olabilir. Yanıt oluşturabilmem için önce gizlilik onayını vermeniz gerekiyor.',cancelResponse:'Tamam. Kişisel sağlık bilgilerinizi göndermeden de genel bilgi sorabilirsiniz.'},
en:{morning:'Good morning! I’m EVO. How can I help you?',day:'Good afternoon! I’m EVO. How can I help you?',evening:'Good evening! I’m EVO. How can I help you?',night:'Good night! I’m EVO. How can I help you?',label:'EVO 👋',subtitle:'Erol Vural Online Digital Health Assistant',close:'Close',hide:'Hide EVO',disclaimer:'For general health information only; it does not replace diagnosis or personalized medical advice.',placeholder:'Ask EVO your question…',send:'Send',thinking:'Thinking…',offline:'I could not connect right now. Please try your question again.',privacyTitle:'Privacy notice',privacyBody:'This message may contain personal health information. Health data may be specially protected personal data. EVO may process it to generate a response. Please do not share identifying information.',privacyContinue:'Continue',privacyCancel:'Cancel',privacyResponse:'This message may contain personal health information. I need your privacy consent before generating a response.',cancelResponse:'Okay. You can also ask general questions without sending personal health information.'},
de:{morning:'Guten Morgen! Ich bin EVO. Wie kann ich Ihnen helfen?',day:'Guten Tag! Ich bin EVO. Wie kann ich Ihnen helfen?',evening:'Guten Abend! Ich bin EVO. Wie kann ich Ihnen helfen?',night:'Gute Nacht! Ich bin EVO. Wie kann ich Ihnen helfen?',label:'EVO 👋',subtitle:'Digitaler Gesundheitsassistent von Erol Vural',close:'Schließen',hide:'EVO ausblenden',disclaimer:'Nur zur allgemeinen Gesundheitsinformation; ersetzt keine Diagnose oder individuelle medizinische Beratung.',placeholder:'Stellen Sie EVO Ihre Frage…',send:'Senden',thinking:'Ich denke nach…',offline:'Die Verbindung konnte derzeit nicht hergestellt werden. Bitte versuchen Sie es erneut.',privacyTitle:'Datenschutzhinweis',privacyBody:'Diese Nachricht kann persönliche Gesundheitsdaten enthalten. EVO kann diese Daten zur Erstellung einer Antwort verarbeiten. Bitte teilen Sie keine identifizierenden Daten.',privacyContinue:'Weiter',privacyCancel:'Abbrechen',privacyResponse:'Diese Nachricht kann persönliche Gesundheitsdaten enthalten. Vor der Antwort ist Ihre Datenschutzzustimmung erforderlich.',cancelResponse:'In Ordnung. Sie können auch allgemeine Fragen stellen, ohne persönliche Gesundheitsdaten zu senden.'},
ar:{morning:'صباح الخير! أنا EVO. كيف يمكنني مساعدتك؟',day:'نهارك سعيد! أنا EVO. كيف يمكنني مساعدتك؟',evening:'مساء الخير! أنا EVO. كيف يمكنني مساعدتك؟',night:'تصبح على خير! أنا EVO. كيف يمكنني مساعدتك؟',label:'EVO 👋',subtitle:'المساعد الصحي الرقمي لـ Erol Vural',close:'إغلاق',hide:'إخفاء EVO',disclaimer:'للمعلومات الصحية العامة فقط، ولا يحل محل التشخيص أو الاستشارة الطبية الشخصية.',placeholder:'اكتب سؤالك إلى EVO…',send:'إرسال',thinking:'أفكر…',offline:'تعذر الاتصال حالياً. يرجى المحاولة مرة أخرى.',privacyTitle:'تنبيه الخصوصية',privacyBody:'قد تحتوي هذه الرسالة على معلومات صحية شخصية. قد يعالج EVO هذه المعلومات لإنشاء الرد. يرجى عدم مشاركة بيانات التعريف الشخصية.',privacyContinue:'متابعة',privacyCancel:'إلغاء',privacyResponse:'قد تحتوي هذه الرسالة على معلومات صحية شخصية. أحتاج إلى موافقتك على الخصوصية قبل إنشاء الرد.',cancelResponse:'حسناً. يمكنك أيضاً طرح أسئلة عامة دون إرسال معلومات صحية شخصية.'},
ru:{morning:'Доброе утро! Я EVO. Чем могу помочь?',day:'Добрый день! Я EVO. Чем могу помочь?',evening:'Добрый вечер! Я EVO. Чем могу помочь?',night:'Доброй ночи! Я EVO. Чем могу помочь?',label:'EVO 👋',subtitle:'Цифровой медицинский помощник Erol Vural',close:'Закрыть',hide:'Скрыть EVO',disclaimer:'Только для общей медицинской информации; не заменяет диагностику или индивидуальную медицинскую консультацию.',placeholder:'Задайте вопрос EVO…',send:'Отправить',thinking:'Думаю…',offline:'Сейчас не удалось установить соединение. Попробуйте ещё раз.',privacyTitle:'Уведомление о конфиденциальности',privacyBody:'Это сообщение может содержать персональные медицинские данные. EVO может обрабатывать их для формирования ответа. Не отправляйте идентифицирующие данные.',privacyContinue:'Продолжить',privacyCancel:'Отмена',privacyResponse:'Это сообщение может содержать персональные медицинские данные. Перед ответом необходимо ваше согласие на обработку данных.',cancelResponse:'Хорошо. Вы также можете задавать общие вопросы без отправки персональных медицинских данных.'},
az:{morning:'Sabahınız xeyir! Mən EVO. Sizə necə kömək edə bilərəm?',day:'Gününüz xeyir! Mən EVO. Sizə necə kömək edə bilərəm?',evening:'Axşamınız xeyir! Mən EVO. Sizə necə kömək edə bilərəm?',night:'Gecəniz xeyrə! Mən EVO. Sizə necə kömək edə bilərəm?',label:'EVO 👋',subtitle:'Erol Vural Onlayn Rəqəmsal Sağlamlıq Köməkçisi',close:'Bağla',hide:'EVO-nu gizlət',disclaimer:'Yalnız ümumi sağlamlıq məlumatı üçündür; diaqnoz və fərdi tibbi məsləhəti əvəz etmir.',placeholder:'Sualınızı EVO-ya yazın…',send:'Göndər',thinking:'Düşünürəm…',offline:'Hazırda bağlantı qurmaq mümkün olmadı. Sualınızı yenidən göndərin.',privacyTitle:'Məxfilik bildirişi',privacyBody:'Bu mesaj şəxsi sağlamlıq məlumatları ehtiva edə bilər. EVO cavab yaratmaq üçün bu məlumatları emal edə bilər. Şəxsi identifikasiya məlumatlarını paylaşmayın.',privacyContinue:'Davam et',privacyCancel:'Ləğv et',privacyResponse:'Bu mesaj şəxsi sağlamlıq məlumatları ehtiva edə bilər. Cavab yaratmazdan əvvəl məxfilik razılığınız lazımdır.',cancelResponse:'Oldu. Şəxsi sağlamlıq məlumatları göndərmədən də ümumi suallar verə bilərsiniz.'},
sq:{morning:'Mirëmëngjes! Jam EVO. Si mund t’ju ndihmoj?',day:'Mirëdita! Jam EVO. Si mund t’ju ndihmoj?',evening:'Mirëmbrëma! Jam EVO. Si mund t’ju ndihmoj?',night:'Natën e mirë! Jam EVO. Si mund t’ju ndihmoj?',label:'EVO 👋',subtitle:'Asistenti digjital i shëndetit i Erol Vural',close:'Mbyll',hide:'Fshih EVO',disclaimer:'Vetëm për informacion të përgjithshëm shëndetësor; nuk zëvendëson diagnozën ose këshillën mjekësore individuale.',placeholder:'Bëjini pyetjen tuaj EVO-s…',send:'Dërgo',thinking:'Po mendoj…',offline:'Nuk u lidh dot tani. Ju lutemi provoni përsëri.',privacyTitle:'Njoftim privatësie',privacyBody:'Ky mesazh mund të përmbajë të dhëna personale shëndetësore. EVO mund t’i përpunojë për të krijuar një përgjigje. Mos ndani të dhëna identifikuese.',privacyContinue:'Vazhdo',privacyCancel:'Anulo',privacyResponse:'Ky mesazh mund të përmbajë të dhëna personale shëndetësore. Para përgjigjes kërkohet pëlqimi juaj për privatësinë.',cancelResponse:'Në rregull. Mund të bëni edhe pyetje të përgjithshme pa dërguar të dhëna personale shëndetësore.'},
nl:{morning:'Goedemorgen! Ik ben EVO. Hoe kan ik u helpen?',day:'Goedendag! Ik ben EVO. Hoe kan ik u helpen?',evening:'Goedenavond! Ik ben EVO. Hoe kan ik u helpen?',night:'Goedenacht! Ik ben EVO. Hoe kan ik u helpen?',label:'EVO 👋',subtitle:'Digitale gezondheidsassistent van Erol Vural',close:'Sluiten',hide:'EVO verbergen',disclaimer:'Alleen voor algemene gezondheidsinformatie; vervangt geen diagnose of persoonlijk medisch advies.',placeholder:'Stel EVO uw vraag…',send:'Versturen',thinking:'Even nadenken…',offline:'Er kon momenteel geen verbinding worden gemaakt. Probeer het opnieuw.',privacyTitle:'Privacyverklaring',privacyBody:'Dit bericht kan persoonlijke gezondheidsgegevens bevatten. EVO kan deze gegevens verwerken om een antwoord te maken. Deel geen identificerende gegevens.',privacyContinue:'Doorgaan',privacyCancel:'Annuleren',privacyResponse:'Dit bericht kan persoonlijke gezondheidsgegevens bevatten. Uw privacytoestemming is nodig voordat ik antwoord kan geven.',cancelResponse:'Prima. U kunt ook algemene vragen stellen zonder persoonlijke gezondheidsgegevens te sturen.'},
es:{morning:'¡Buenos días! Soy EVO. ¿Cómo puedo ayudarle?',day:'¡Buenas tardes! Soy EVO. ¿Cómo puedo ayudarle?',evening:'¡Buenas noches! Soy EVO. ¿Cómo puedo ayudarle?',night:'¡Buenas noches! Soy EVO. ¿Cómo puedo ayudarle?',label:'EVO 👋',subtitle:'Asistente digital de salud de Erol Vural',close:'Cerrar',hide:'Ocultar EVO',disclaimer:'Solo para información general de salud; no sustituye el diagnóstico ni el consejo médico personalizado.',placeholder:'Escriba su pregunta a EVO…',send:'Enviar',thinking:'Pensando…',offline:'No se pudo establecer la conexión. Inténtelo de nuevo.',privacyTitle:'Aviso de privacidad',privacyBody:'Este mensaje puede contener información personal de salud. EVO puede procesarla para generar una respuesta. No comparta datos identificativos.',privacyContinue:'Continuar',privacyCancel:'Cancelar',privacyResponse:'Este mensaje puede contener información personal de salud. Necesito su consentimiento de privacidad antes de generar una respuesta.',cancelResponse:'De acuerdo. También puede hacer preguntas generales sin enviar información personal de salud.'}
};
function evoLang(){var l=(document.documentElement&&document.documentElement.lang)||get('siteLanguage')||'tr';l=String(l).toLowerCase().split('-')[0];return EVO_I18N[l]?l:'tr';}
function evoText(k){return (EVO_I18N[evoLang()]||EVO_I18N.tr)[k]||EVO_I18N.tr[k]||k;}
const EVO_COMMANDS={tr:{remove:'Tamam. EVO bu cihazda kaldırılıyor.',hide:'Tamam. Konuşma penceresini kapatıyorum. Sohbetiniz korunacak.'},en:{remove:'Okay. EVO is being removed from this device.',hide:'Okay. I’m closing the chat window. Your conversation will be kept.'},de:{remove:'In Ordnung. EVO wird von diesem Gerät entfernt.',hide:'In Ordnung. Ich schließe das Chatfenster. Ihre Unterhaltung bleibt erhalten.'},ar:{remove:'حسناً. سيتم إزالة EVO من هذا الجهاز.',hide:'حسناً. سأغلق نافذة المحادثة. ستبقى محادثتك محفوظة.'},ru:{remove:'Хорошо. EVO будет удалён с этого устройства.',hide:'Хорошо. Я закрываю окно чата. Ваша беседа будет сохранена.'},az:{remove:'Oldu. EVO bu cihazdan silinir.',hide:'Oldu. Söhbət pəncərəsini bağlayıram. Söhbətiniz qorunacaq.'},sq:{remove:'Në rregull. EVO po hiqet nga kjo pajisje.',hide:'Në rregull. Po mbyll dritaren e bisedës. Biseda juaj do të ruhet.'},nl:{remove:'Prima. EVO wordt van dit apparaat verwijderd.',hide:'Prima. Ik sluit het chatvenster. Uw gesprek blijft bewaard.'},es:{remove:'De acuerdo. EVO se eliminará de este dispositivo.',hide:'De acuerdo. Cierro la ventana de chat. Su conversación se conservará.'}};
function evoCommand(k){var d=EVO_COMMANDS[evoLang()]||EVO_COMMANDS.tr;return d[k]||EVO_COMMANDS.tr[k];}
function getTimeGreeting(){
  var now=new Date();
  var parts=new Intl.DateTimeFormat(evoLang()==='tr'?'tr-TR':evoLang(),{timeZone:'Europe/Istanbul',hour:'numeric',hour12:false}).formatToParts(now);
  var hour=Number((parts.find(function(p){return p.type==='hour'})||{}).value||0);
  if(hour>=5&&hour<11)return evoText('morning');
  if(hour>=11&&hour<17)return evoText('day');
  if(hour>=17&&hour<21)return evoText('evening');
  return evoText('night');
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
function buildLayeredCharacter(){
  if(!root)return;
  // Claude tarafından hazırlanan gerçek EVO SVG'yi doğrudan kullan.
  // Inline fetch/fallback yok: böylece eski bozuk fallback karakteri asla gösterilmez.
  var img=document.createElement('img');
  img.className='evo-svg evo-claude';
  img.src='/assets/evo-user.png?v=20260930-32';
  img.alt='EVO sağlık asistanı';
  img.draggable=false;
  root.appendChild(img);
  var faceFx=document.createElement('div');
  faceFx.className='evo-face-fx';
  faceFx.innerHTML='<i class="evo-brow evo-brow-l"></i><i class="evo-brow evo-brow-r"></i><i class="evo-lid evo-lid-l"></i><i class="evo-lid evo-lid-r"></i><i class="evo-mouth"></i>';
  root.appendChild(faceFx);
  face=img;
  layered=true;
  setEvoState('idle');
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
function applyEvoLanguage(resetChat){
  if(!root||!panel)return;
  var l=evoLang(), t=EVO_I18N[l]||EVO_I18N.tr;
  root.setAttribute('aria-label',t.label.replace(' 👋',''));
  var label=root.querySelector('.label'); if(label)label.textContent=t.label;
  var strong=panel.querySelector('.eh strong'); if(strong)strong.textContent='EVO';
  var sub=panel.querySelector('.eh span'); if(sub)sub.textContent=t.subtitle;
  var ex=panel.querySelector('.ex'); if(ex){ex.textContent='×';ex.setAttribute('aria-label',t.close)}
  var hide=panel.querySelector('#evo-hide'); if(hide)hide.textContent=t.hide;
  var ed=panel.querySelector('.ed'); if(ed)ed.textContent=t.disclaimer;
  if(ta){ta.placeholder=t.placeholder;ta.setAttribute('aria-label',t.placeholder)}
  var send=panel.querySelector('.send'); if(send)send.setAttribute('aria-label',t.send);
  panel.setAttribute('aria-label',t.label.replace(' 👋',''));
  panel.dir=l==='ar'?'rtl':'ltr';
  if(resetChat){
    try{localStorage.removeItem(chatKey)}catch(e){}
    if(msgs){msgs.innerHTML='';addMsg(getTimeGreeting(),'bot',false)}
  }
}
function watchEvoLanguage(){
  if(!document.documentElement||document.documentElement.dataset.evoLangWatch==='1')return;
  document.documentElement.dataset.evoLangWatch='1';
  var last=evoLang();
  new MutationObserver(function(){var next=evoLang();if(next!==last){last=next;applyEvoLanguage(true)}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
}
function showPrivacyGate(q){
  var box=document.createElement('div');
  box.className='em bot evo-privacy-gate';
  box.dataset.sensitive='1';
  var t=EVO_I18N[evoLang()]||EVO_I18N.tr; box.innerHTML='<strong>'+t.privacyTitle+'</strong><br>'+t.privacyBody+'<div class="evo-privacy-text">'+t.privacyBody+'</div><div class="evo-privacy-actions"><button type="button" class="evo-privacy-continue">'+t.privacyContinue+'</button><button type="button" class="evo-privacy-cancel">'+t.privacyCancel+'</button></div>';
  msgs.appendChild(box);
  msgs.scrollTop=msgs.scrollHeight;
  box.querySelector('.evo-privacy-continue').onclick=function(){
    box.remove();
    sendQuestion(q,true);
  };
  box.querySelector('.evo-privacy-cancel').onclick=function(){
    box.remove();
    addMsg(evoText('cancelResponse'),'bot');
  };
}
function sendQuestion(q,privacyConsent){
  var w=document.createElement('div');
  w.className='em bot';
  w.textContent=evoText('thinking');
  setEvoState('thinking');
  msgs.appendChild(w);
  msgs.scrollTop=msgs.scrollHeight;
  fetch('/api/evo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:q,language:evoLang(),privacyConsent:!!privacyConsent,history:[].slice.call(msgs.children).filter(function(d){return d.dataset.sensitive!=='1'}).map(function(d){return {role:d.classList.contains('user')?'user':'assistant',content:d.textContent||''}}).slice(-8)})})
  .then(function(r){return r.json()})
  .then(function(d){
    if(d.needsPrivacyConsent){
      w.textContent=evoText('privacyResponse');
      return;
    }
    w.textContent=d.answer||'Bu konuda genel sağlık bilgisi verebilirim. Kişisel tanı ve tedavi kararları için hekiminizle görüşmelisiniz.';
    setEvoState(isThanksMessage(q)?'happy':'talking');
    if(isThanksMessage(q))setTimeout(showEvoHearts,120);
    setTimeout(function(){setEvoState('idle')},900);
    saveChat();
  })
  .catch(function(){
    w.textContent=evoText('offline');
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
#evo-fixed{pointer-events:auto!important;touch-action:none!important;-webkit-tap-highlight-color:transparent;position:fixed;right:12px;bottom:150px;width:150px;height:102px;z-index:2147483647!important;cursor:grab;display:flex;align-items:center;justify-content:center;animation:evoFloat 5s ease-in-out infinite;user-select:none;-webkit-user-select:none}
#evo-fixed.evo-dragging{cursor:grabbing;animation:none!important}
#evo-fixed.evo-returning{animation:none!important;transition:left .68s cubic-bezier(.22,.61,.36,1),top .68s cubic-bezier(.22,.61,.36,1),right .68s cubic-bezier(.22,.61,.36,1),bottom .68s cubic-bezier(.22,.61,.36,1);will-change:left,top,right,bottom}
#evo-fixed.evo-off{display:none}
#evo-fixed .evo-vector-holder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;filter:drop-shadow(0 10px 18px rgba(0,110,160,.16));transform-origin:center bottom}
#evo-fixed .evo-vector-holder .evo-svg{width:100%;height:100%;display:block;pointer-events:none;overflow:visible}
#evo-fixed > .evo-svg{position:absolute;left:0;top:50%;width:100%;height:auto;max-height:100%;display:block;pointer-events:none;overflow:visible;transform:translateY(-50%);filter:drop-shadow(0 10px 18px rgba(0,110,160,.16))}
#evo-fixed .evo-fallback{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,110,160,.16))}
#evo-fixed[data-evo-state="thinking"] .evo-vector-holder{animation:evoThink .9s ease-in-out infinite}
#evo-fixed[data-evo-state="talking"] .evo-vector-holder{animation:evoTalk .24s ease-in-out infinite alternate}
#evo-fixed[data-evo-state="happy"] .evo-vector-holder{animation:evoHappy .7s ease-in-out 2}
@keyframes evoThink{0%,100%{transform:translateX(0) rotate(0)}50%{transform:translateX(2px) rotate(1deg)}}
@keyframes evoTalk{from{transform:translateY(0) scale(1)}to{transform:translateY(-1.5px) scale(1.015)}}
@keyframes evoHappy{0%,100%{transform:scale(1)}50%{transform:scale(1.055) translateY(-2px)}}
#evo-fixed .evo-face-fx{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:visible}
#evo-fixed .evo-brow{position:absolute;top:38%;width:18%;height:4px;border-radius:999px;background:rgba(48,226,255,.92);filter:blur(.15px) drop-shadow(0 0 4px rgba(48,226,255,.8));transform-origin:center}
#evo-fixed .evo-brow-l{left:28%;transform:rotate(-8deg)}
#evo-fixed .evo-brow-r{right:28%;transform:rotate(8deg)}
#evo-fixed .evo-lid{position:absolute;top:50%;width:19%;height:12%;border-radius:50%;background:rgba(4,15,35,.94);transform:scaleY(0);transform-origin:center;box-shadow:0 0 5px rgba(4,15,35,.55)}
#evo-fixed .evo-lid-l{left:25%}.evo-lid-r{right:25%}
#evo-fixed .evo-mouth{position:absolute;left:41%;top:68%;width:18%;height:5px;border-radius:999px;background:#39e7ff;filter:drop-shadow(0 0 4px rgba(57,231,255,.9));transform:scaleY(.8);transform-origin:center}
#evo-fixed[data-evo-state="talking"] .evo-mouth{animation:evoMouth .18s ease-in-out infinite alternate}
#evo-fixed[data-evo-state="happy"] .evo-mouth{animation:evoSmile .7s ease-in-out 2}
#evo-fixed[data-evo-state="thinking"] .evo-brow-l{animation:evoBrowL .9s ease-in-out infinite}
#evo-fixed[data-evo-state="thinking"] .evo-brow-r{animation:evoBrowR .9s ease-in-out infinite}
@keyframes evoBlink{0%,43%,100%{transform:scaleY(0)}47%,53%{transform:scaleY(1)}}
@keyframes evoMouth{from{transform:scaleY(.45)}to{transform:scaleY(1.55)}}
@keyframes evoSmile{0%,100%{transform:scaleY(.8) scaleX(1)}50%{transform:scaleY(1.7) scaleX(1.15)}}
@keyframes evoBrowL{0%,100%{transform:rotate(-8deg) translateY(0)}50%{transform:rotate(-14deg) translateY(-2px)}}
@keyframes evoBrowR{0%,100%{transform:rotate(8deg) translateY(0)}50%{transform:rotate(14deg) translateY(-2px)}}
#evo-fixed .evo-lid-l,#evo-fixed .evo-lid-r{animation:evoBlink 4.8s ease-in-out infinite}
#evo-fixed .label{position:absolute;right:-8px;top:-2px;z-index:20;background:rgba(255,255,255,.96);padding:6px 10px;border-radius:999px;color:#005082;font:600 10px Poppins,sans-serif;white-space:nowrap;box-shadow:0 6px 20px rgba(0,80,130,.16);pointer-events:none}
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
@media(max-width:600px){#evo-panel textarea{font-size:16px!important;line-height:1.4}#evo-fixed{right:8px;bottom:158px;width:118px;height:96px}#evo-fixed .evo-svg{width:118px;height:auto;max-height:96px}.evo-label-placeholder{}#evo-fixed .label{top:-2px;right:-8px;padding:5px 8px;font-size:9px;z-index:20}#evo-panel{right:10px;bottom:10px;width:calc(100vw - 20px);height:min(600px,calc(100vh - 20px))}}
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
  root.innerHTML='<div class="label">'+evoText('label')+'</div>';
  panel=document.createElement('section');
  panel.id='evo-panel';
  panel.setAttribute('aria-label','EVO sağlık asistanı');
  panel.innerHTML='<div class="eh"><div><strong>EVO</strong><span>Erol Vural Online Dijital Sağlık Asistanı</span></div><button class="ex" aria-label="Kapat">×</button></div><div id="evo-msgs"></div><div class="ed">Genel sağlık bilgilendirmesi içindir; tanı ve kişiye özel tedavi önerisinin yerine geçmez.</div><button id="evo-hide">EVO\'yu gizle</button><form><textarea rows="1" maxlength="1200" placeholder="EVO\'ya sorunuzu yazın…"></textarea><button class="send" aria-label="Gönder">➤</button></form>';
  document.body.appendChild(root);
  document.body.appendChild(panel);
  msgs=panel.querySelector('#evo-msgs');
  ta=panel.querySelector('textarea');
  await buildLayeredCharacter();
  applyEvoLanguage(false);
  renderChat();
  watchEvoLanguage();
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
      addMsg(evoCommand('remove'),'bot');
      setTimeout(removeEvo,350);
      return;
    }
    if(/evo[’']?yu\s+(gizle|kapat|sakla)/i.test(q)){
      addMsg(evoCommand('hide'),'bot');
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