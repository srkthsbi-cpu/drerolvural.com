/* Erol Vural - ortak site motoru
   9 dil + kalıcı dil seçimi + banner slider + mobil menü + form yardımcıları
*/
(() => {
  'use strict';

  const LANGS = [
    { code: 'tr', label: 'TR', name: '🇹🇷 Türkçe' },
    { code: 'en', label: 'EN', name: '🇬🇧 English' },
    { code: 'de', label: 'DE', name: '🇩🇪 Deutsch' },
    { code: 'ar', label: 'AR', name: '🇸🇦 العربية' },
    { code: 'ru', label: 'RU', name: '🇷🇺 Русский' },
    { code: 'az', label: 'AZ', name: '🇦🇿 Azərbaycanca' },
    { code: 'sq', label: 'AL', name: '🇦🇱 Shqip' },
    { code: 'nl', label: 'NL', name: '🇳🇱 Nederlands' },
    { code: 'es', label: 'ES', name: '🇪🇸 Español' }
  ];
  const SUPPORTED = new Set(LANGS.map(x => x.code));
  const DEFAULT_LANG = 'tr';
  const RUNTIME_I18N = {
    en: {"menu.press":"In the Press","about.pressIntro":"Explore selected media and scientific-event coverage featuring Assoc. Prof. Dr. Erol Vural.","press.eyebrow":"Press Archive","press.title":"In the Press","press.intro":"Selected verifiable interviews, health reports and professional event records featuring Assoc. Prof. Dr. Erol Vural from previous years.","press.selected":"Selected Coverage","press.sourceNote":"Sources: archives of the respective publishers","press.tagInterviewHealth":"Interview · Health","press.tagInterviewObesity":"Interview · Obesity","press.tagMetabolic":"Metabolic Surgery","press.story1Title":"What is not widely known about sleeve gastrectomy","press.story2Title":"Who may be considered for bariatric surgery?","press.story3Title":"Report on metabolic surgery for diabetes in Istanbul","press.story1Summary":"The İHA health report compiles statements by Dr. Erol Vural about sleeve gastrectomy, its potential benefits and limitations, and postoperative weight management.","press.story2Summary":"The report includes a Q&A with Dr. Erol Vural about bariatric surgery, patient assessment, eligibility criteria and preoperative preparation.","press.story3Summary":"The report presents statements by Dr. Erol Vural about metabolic surgery and approaches related to type 2 diabetes. Its headline mentions an 83% success rate; that figure is not independently evaluated on this page.","press.read":"Read the report","press.editorialLabel":"Editorial note:","press.editorialText":"This page is a selected press archive. Headlines and medical or statistical statements belong to their respective publishers; inclusion here does not guarantee a medical outcome or constitute independent verification.","press.scientificTitle":"Scientific event record","press.scientificText":"The 2023 proceedings of the Turkish Obesity Surgery Association include a scientific presentation by Erol Vural titled “Early results and complication risks of vertical clip gastroplasty.”","press.viewProceedings":"View the 2023 proceedings"},
    de: {"menu.press":"In der Presse","about.pressIntro":"Hier finden Sie eine Auswahl von Presseberichten und wissenschaftlichen Veranstaltungsnachweisen über Doç. Dr. Erol Vural.","press.eyebrow":"Pressearchiv","press.title":"In der Presse","press.intro":"Ausgewählte überprüfbare Interviews, Gesundheitsberichte und berufliche Veranstaltungsnachweise über Doç. Dr. Erol Vural aus früheren Jahren.","press.selected":"Ausgewählte Berichte","press.sourceNote":"Quellen: Archive der jeweiligen Herausgeber","press.tagInterviewHealth":"Interview · Gesundheit","press.tagInterviewObesity":"Interview · Adipositas","press.tagMetabolic":"Metabolische Chirurgie","press.story1Title":"Was über die Schlauchmagen-Operation weniger bekannt ist","press.story2Title":"Für wen kommt eine bariatrische Operation infrage?","press.story3Title":"Bericht über metabolische Chirurgie bei Diabetes in Istanbul","press.read":"Zum Bericht","press.editorialLabel":"Redaktioneller Hinweis:","press.editorialText":"Diese Seite ist als ausgewähltes Pressearchiv zusammengestellt. Überschriften sowie medizinische oder statistische Angaben stammen von den jeweiligen Herausgebern; ihre Aufnahme stellt keine Garantie eines medizinischen Ergebnisses und keine unabhängige Bestätigung dar.","press.scientificTitle":"Wissenschaftlicher Veranstaltungsnachweis","press.scientificText":"Im Tagungsband 2023 der Türkischen Gesellschaft für Adipositaschirurgie ist ein wissenschaftlicher Vortrag von Erol Vural verzeichnet.","press.viewProceedings":"Tagungsband ansehen"},
    ar: {"menu.press":"في الصحافة","about.pressIntro":"يمكنكم الاطلاع على مجموعة مختارة من التغطيات الصحفية والسجلات العلمية المتعلقة بـ Doç. Dr. Erol Vural.","press.eyebrow":"أرشيف الصحافة","press.title":"في الصحافة","press.intro":"مجموعة مختارة من المقابلات والتقارير الصحية وسجلات الفعاليات المهنية القابلة للتحقق من السنوات السابقة حول Doç. Dr. Erol Vural.","press.selected":"تغطيات مختارة","press.sourceNote":"المصادر: أرشيفات الجهات الناشرة المعنية","press.tagInterviewHealth":"مقابلة · صحة","press.tagInterviewObesity":"مقابلة · سمنة","press.tagMetabolic":"جراحة الأيض","press.story1Title":"ما لا يُعرف على نطاق واسع عن تكميم المعدة","press.story2Title":"من يمكن أن يخضع لجراحة السمنة؟","press.story3Title":"تقرير عن جراحة الأيض لمرض السكري في إسطنبول","press.read":"اقرأ التقرير","press.editorialLabel":"ملاحظة تحريرية:","press.editorialText":"أُعدت هذه الصفحة كأرشيف صحفي مختار. العناوين والعبارات الطبية أو الإحصائية تعود إلى الجهات الناشرة؛ وإدراجها هنا لا يضمن نتيجة طبية ولا يعني التحقق المستقل منها.","press.scientificTitle":"سجل فعالية علمية","press.scientificText":"يتضمن كتاب وقائع عام 2023 للجمعية التركية لجراحة السمنة عرضاً علمياً باسم Erol Vural.","press.viewProceedings":"عرض كتاب الوقائع"},
    ru: {"menu.press":"В прессе","about.pressIntro":"Здесь представлены избранные публикации в СМИ и сведения о научных мероприятиях с участием Doç. Dr. Erol Vural.","press.eyebrow":"Архив прессы","press.title":"В прессе","press.intro":"Избранные проверяемые интервью, медицинские публикации и сведения о профессиональных мероприятиях с участием Doç. Dr. Erol Vural за предыдущие годы.","press.selected":"Избранные публикации","press.sourceNote":"Источники: архивы соответствующих издателей","press.tagInterviewHealth":"Интервью · Здоровье","press.tagInterviewObesity":"Интервью · Ожирение","press.tagMetabolic":"Метаболическая хирургия","press.story1Title":"Что важно знать об операции продольной резекции желудка","press.story2Title":"Кому может быть показана бариатрическая хирургия?","press.story3Title":"Материал о метаболической хирургии при диабете в Стамбуле","press.read":"Перейти к публикации","press.editorialLabel":"Редакционная заметка:","press.editorialText":"Эта страница является подборкой публикаций в СМИ. Заголовки и медицинские или статистические утверждения принадлежат соответствующим издателям; размещение здесь не гарантирует медицинский результат и не означает независимой проверки.","press.scientificTitle":"Научное мероприятие","press.scientificText":"В сборнике материалов Турецкой ассоциации бариатрической хирургии за 2023 год указано научное выступление Erol Vural.","press.viewProceedings":"Открыть сборник"},
    az: {"menu.press":"Mətbuatda Biz","about.pressIntro":"Doç. Dr. Erol Vural haqqında mətbuatda və elmi tədbirlərdə yayımlanmış seçilmiş materiallara baxa bilərsiniz.","press.eyebrow":"Mətbuat arxivi","press.title":"Mətbuatda Biz","press.intro":"Doç. Dr. Erol Vural haqqında əvvəlki illərdə yayımlanmış, yoxlanıla bilən seçilmiş müsahibələr, səhiyyə xəbərləri və peşəkar tədbir qeydləri.","press.selected":"Seçilmiş materiallar","press.sourceNote":"Mənbələr: müvafiq nəşriyyatların arxivləri","press.tagInterviewHealth":"Müsahibə · Səhiyyə","press.tagInterviewObesity":"Müsahibə · Piylənmə","press.tagMetabolic":"Metabolik cərrahiyyə","press.story1Title":"Mədə kiçiltmə əməliyyatı haqqında az bilinənlər","press.story2Title":"Piylənmə cərrahiyyəsi kimlər üçün nəzərdən keçirilə bilər?","press.story3Title":"İstanbulda diabet üçün metabolik cərrahiyyə haqqında xəbər","press.read":"Xəbərə keç","press.editorialLabel":"Redaksiya qeydi:","press.editorialText":"Bu səhifə seçilmiş mətbuat arxivi kimi hazırlanıb. Xəbər başlıqları və tibbi və ya statistik ifadələr müvafiq nəşriyyatlara aiddir; burada yer alması tibbi nəticəyə zəmanət vermir və müstəqil təsdiq demək deyil.","press.scientificTitle":"Elmi tədbir qeydi","press.scientificText":"Türkiyə Piylənmə Cərrahiyyəsi Assosiasiyasının 2023-cü il bildiriş kitabında Erol Vuralın elmi təqdimatı qeyd olunur.","press.viewProceedings":"Bildiriş kitabına bax"},
    sq: {"menu.press":"Në media","about.pressIntro":"Shikoni një përzgjedhje të artikujve në media dhe të dhënave nga veprimtari shkencore që lidhen me Doç. Dr. Erol Vural.","press.eyebrow":"Arkivi i medias","press.title":"Në media","press.intro":"Intervista, lajme shëndetësore dhe të dhëna të verifikueshme nga veprimtari profesionale të viteve të mëparshme lidhur me Doç. Dr. Erol Vural.","press.selected":"Materiale të përzgjedhura","press.sourceNote":"Burimet: arkivat e botuesve përkatës","press.tagInterviewHealth":"Intervistë · Shëndet","press.tagInterviewObesity":"Intervistë · Obezitet","press.tagMetabolic":"Kirurgji metabolike","press.story1Title":"Çfarë nuk dihet gjerësisht për gastrektominë në mëngë","press.story2Title":"Kush mund të merret në konsideratë për kirurgji bariatrike?","press.story3Title":"Raport mbi kirurgjinë metabolike për diabetin në Stamboll","press.read":"Lexo raportin","press.editorialLabel":"Shënim editorial:","press.editorialText":"Kjo faqe është përgatitur si një arkiv i përzgjedhur i medias. Titujt dhe deklaratat mjekësore ose statistikore u përkasin botuesve përkatës; përfshirja këtu nuk garanton rezultat mjekësor dhe nuk nënkupton verifikim të pavarur.","press.scientificTitle":"Regjistër i një veprimtarie shkencore","press.scientificText":"Në librin e abstrakteve të Shoqatës Turke të Kirurgjisë së Obezitetit të vitit 2023 figuron një prezantim shkencor i Erol Vural.","press.viewProceedings":"Shiko librin e abstrakteve"},
    nl: {"menu.press":"In de pers","about.pressIntro":"Bekijk een selectie van perspublicaties en wetenschappelijke evenementgegevens over Doç. Dr. Erol Vural.","press.eyebrow":"Persarchief","press.title":"In de pers","press.intro":"Een selectie van verifieerbare interviews, gezondheidsartikelen en gegevens over professionele evenementen uit eerdere jaren over Doç. Dr. Erol Vural.","press.selected":"Geselecteerde publicaties","press.sourceNote":"Bronnen: archieven van de betreffende uitgevers","press.tagInterviewHealth":"Interview · Gezondheid","press.tagInterviewObesity":"Interview · Obesitas","press.tagMetabolic":"Metabole chirurgie","press.story1Title":"Wat minder bekend is over een sleeve-gastrectomie","press.story2Title":"Voor wie kan bariatrische chirurgie worden overwogen?","press.story3Title":"Bericht over metabole chirurgie bij diabetes in Istanbul","press.read":"Naar het artikel","press.editorialLabel":"Redactionele opmerking:","press.editorialText":"Deze pagina is samengesteld als een geselecteerd persarchief. Koppen en medische of statistische uitspraken zijn afkomstig van de betreffende uitgevers; opname hier garandeert geen medisch resultaat en betekent geen onafhankelijke verificatie.","press.scientificTitle":"Registratie van een wetenschappelijke bijeenkomst","press.scientificText":"In het congresboek 2023 van de Turkse Vereniging voor Obesitaschirurgie staat een wetenschappelijke presentatie van Erol Vural.","press.viewProceedings":"Bekijk het congresboek"},
    es: {"menu.press":"En la prensa","about.pressIntro":"Consulte una selección de publicaciones de prensa y registros de actividades científicas relacionados con el Dr. Erol Vural.","press.eyebrow":"Archivo de prensa","press.title":"En la prensa","press.intro":"Una selección de entrevistas, noticias sanitarias y registros de actividades profesionales verificables de años anteriores relacionados con el Dr. Erol Vural.","press.selected":"Publicaciones seleccionadas","press.sourceNote":"Fuentes: archivos de los respectivos medios","press.tagInterviewHealth":"Entrevista · Salud","press.tagInterviewObesity":"Entrevista · Obesidad","press.tagMetabolic":"Cirugía metabólica","press.story1Title":"Lo que no se conoce ampliamente sobre la gastrectomía en manga","press.story2Title":"¿Quién puede ser considerado para una cirugía bariátrica?","press.story3Title":"Reportaje sobre cirugía metabólica para la diabetes en Estambul","press.read":"Ver el reportaje","press.editorialLabel":"Nota editorial:","press.editorialText":"Esta página se ha preparado como un archivo de prensa seleccionado. Los titulares y las afirmaciones médicas o estadísticas pertenecen a sus respectivos medios; su inclusión aquí no garantiza un resultado médico ni implica una verificación independiente.","press.scientificTitle":"Registro de actividad científica","press.scientificText":"El libro de actas de 2023 de la Asociación Turca de Cirugía de la Obesidad incluye una presentación científica de Erol Vural.","press.viewProceedings":"Consultar el libro de actas"}
  };
  Object.assign(RUNTIME_I18N.de, {"press.story1Summary":"Der Gesundheitsbericht der İHA fasst Aussagen von Dr. Erol Vural zur Schlauchmagen-Operation, zu möglichen Vorteilen und Grenzen sowie zur Gewichtskontrolle nach der Operation zusammen.","press.story2Summary":"Der Bericht enthält ein Gespräch mit Dr. Erol Vural über die Adipositaschirurgie, die Patientenauswahl, Eignungskriterien und die Vorbereitung vor der Operation.","press.story3Summary":"Der Bericht gibt Aussagen von Dr. Erol Vural zur metabolischen Chirurgie bei Typ-2-Diabetes wieder. Die Überschrift nennt eine Erfolgsrate von 83 %; diese Zahl wird auf dieser Seite nicht unabhängig bewertet."});
  Object.assign(RUNTIME_I18N.ar, {"press.story1Summary":"يجمع تقرير İHA الصحي تصريحات د. إيرول فورال حول كيفية إجراء تكميم المعدة والفوائد والقيود المحتملة وإدارة الوزن بعد الجراحة.","press.story2Summary":"يتضمن التقرير حواراً مع د. إيرول فورال حول نطاق جراحة السمنة وتقييم المريض ومعايير الملاءمة والتحضير قبل الجراحة.","press.story3Summary":"ينقل التقرير تصريحات د. إيرول فورال حول جراحة الأيض والأساليب الجراحية المرتبطة بالسكري من النوع الثاني. ويذكر العنوان نسبة نجاح قدرها 83%؛ ولا تُقيّم هذه النسبة بشكل مستقل في هذه الصفحة."});
  Object.assign(RUNTIME_I18N.ru, {"press.story1Summary":"В медицинском материале İHA собраны комментарии доктора Эрол Вурал о проведении продольной резекции желудка, возможных преимуществах и ограничениях, а также контроле веса после операции.","press.story2Summary":"В публикации приведено интервью с доктором Эрол Вурал о бариатрической хирургии, оценке пациента, критериях подходящего лечения и подготовке к операции.","press.story3Summary":"В публикации приведены комментарии доктора Эрол Вурал о метаболической хирургии и хирургических подходах при диабете 2 типа. В заголовке указана эффективность 83%; эта цифра на данной странице независимо не оценивается."});
  Object.assign(RUNTIME_I18N.az, {"press.story1Summary":"İHA-nın səhiyyə xəbərində Dr. Erol Vuralın mədə kiçiltmə əməliyyatının aparılması, mümkün üstünlükləri və məhdudiyyətləri, həmçinin əməliyyatdan sonrakı çəki idarəetməsi barədə açıqlamaları təqdim olunur.","press.story2Summary":"Materialda Dr. Erol Vural ilə piylənmə cərrahiyyəsinin əhatəsi, pasiyentin qiymətləndirilməsi, uyğunluq meyarları və əməliyyata hazırlıq barədə sual-cavab yer alır.","press.story3Summary":"Materialda Dr. Erol Vuralın metabolik cərrahiyyə və 2-ci tip diabetlə bağlı cərrahi yanaşmalar haqqında açıqlamaları verilir. Başlıqda 83% uğur göstəricisi qeyd olunur; bu rəqəm bu səhifədə müstəqil şəkildə qiymətləndirilmir."});
  Object.assign(RUNTIME_I18N.sq, {"press.story1Summary":"Raporti shëndetësor i İHA përmbledh deklaratat e Dr. Erol Vural mbi gastrektominë në mëngë, përfitimet dhe kufizimet e mundshme dhe menaxhimin e peshës pas operacionit.","press.story2Summary":"Raporti përfshin një pyetje-përgjigje me Dr. Erol Vural mbi fushën e kirurgjisë bariatrike, vlerësimin e pacientit, kriteret e përshtatshmërisë dhe përgatitjen para operacionit.","press.story3Summary":"Raporti paraqet deklarata të Dr. Erol Vural mbi kirurgjinë metabolike dhe qasjet kirurgjikale për diabetin e tipit 2. Titulli përmend një normë suksesi prej 83%; kjo shifër nuk vlerësohet në mënyrë të pavarur në këtë faqe."});
  Object.assign(RUNTIME_I18N.nl, {"press.story1Summary":"Het gezondheidsbericht van İHA bundelt uitspraken van dr. Erol Vural over de uitvoering van een sleeve-gastrectomie, mogelijke voordelen en beperkingen en gewichtsbeheersing na de operatie.","press.story2Summary":"Het artikel bevat een vraaggesprek met dr. Erol Vural over bariatrische chirurgie, patiëntbeoordeling, geschiktheidscriteria en voorbereiding op de operatie.","press.story3Summary":"Het artikel geeft verklaringen van dr. Erol Vural over metabole chirurgie en chirurgische benaderingen bij diabetes type 2. De kop noemt een succespercentage van 83%; dit cijfer wordt op deze pagina niet onafhankelijk beoordeeld."});
  Object.assign(RUNTIME_I18N.es, {"press.story1Summary":"El reportaje sanitario de İHA recopila declaraciones del Dr. Erol Vural sobre cómo se realiza la gastrectomía en manga, sus posibles ventajas y limitaciones y el control del peso después de la cirugía.","press.story2Summary":"El reportaje incluye una entrevista con el Dr. Erol Vural sobre el alcance de la cirugía bariátrica, la evaluación del paciente, los criterios de elegibilidad y la preparación preoperatoria.","press.story3Summary":"El reportaje recoge declaraciones del Dr. Erol Vural sobre la cirugía metabólica y los enfoques quirúrgicos relacionados con la diabetes tipo 2. El titular menciona una tasa de éxito del 83 %; esta cifra no se evalúa de forma independiente en esta página."});
  const STORAGE_KEY = 'siteLanguage';
  const queryLang = new URLSearchParams(location.search).get('lang');
  let currentLang = normalize(queryLang || localStorage.getItem(STORAGE_KEY) || document.documentElement.lang || DEFAULT_LANG);
  let translations = {};
  let bannerTimer = null;

  // Site kökünü, bu scriptin gerçek konumundan bul. Böylece /blog/ altındaki
  // sayfalarda da lang/*.json ve diğer ortak dosyalar doğru yerden yüklenir.
  const SITE_BASE = (() => {
    const script = Array.from(document.scripts).find(s => /(?:^|\/)site\.js(?:\?|$)/.test(s.src));
    return script ? new URL('./', script.src) : new URL('./', document.baseURI);
  })();
  const siteAsset = path => new URL(String(path).replace(/^\//, ''), SITE_BASE).href;
  const siteApi = path => new URL(String(path).replace(/^\//, ''), SITE_BASE).href;

  function normalize(lang) {
    lang = String(lang || '').toLowerCase().split('-')[0];
    return SUPPORTED.has(lang) ? lang : DEFAULT_LANG;
  }

  function getPath(obj, path) {
    if (!path) return null;
    if (Object.prototype.hasOwnProperty.call(obj || {}, path)) return obj[path];
    return path.split('.').reduce((v, k) => (v && Object.prototype.hasOwnProperty.call(v, k)) ? v[k] : null, obj);
  }

  function setText(el, value) {
    // JSON içerikleri metin olarak uygulanır; böylece çeviri dosyası HTML çalıştırmaz.
    el.textContent = String(value);
  }

  async function fetchLanguage(lang) {
    const response = await fetch(new URL(`lang/${lang}.json`, SITE_BASE), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Dil dosyası yüklenemedi: ${lang}`);
    const json = await response.json();
    return json.translations || json;
  }

  async function applyLanguage(lang) {
    currentLang = normalize(lang);
    try {
      translations = await fetchLanguage(currentLang);
    translations = { ...translations, ...(RUNTIME_I18N[currentLang] || {}) };
    } catch (error) {
      console.error(error);
      if (currentLang !== DEFAULT_LANG) {
        currentLang = DEFAULT_LANG;
        translations = await fetchLanguage(DEFAULT_LANG).catch(() => ({}));
      }
    }

    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl-site', currentLang === 'ar');
    localStorage.setItem(STORAGE_KEY, currentLang);
    try {
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('lang');
      history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    } catch (_) {}

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const value = getPath(translations, el.getAttribute('data-i18n'));
      if (value !== null && value !== undefined) setText(el, value);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const value = getPath(translations, el.getAttribute('data-i18n-placeholder'));
      if (value !== null && value !== undefined) el.setAttribute('placeholder', String(value));
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const value = getPath(translations, el.getAttribute('data-i18n-title'));
      if (value !== null && value !== undefined) el.setAttribute('title', String(value));
    });

    document.querySelectorAll('[data-i18n-meta]').forEach(el => { const value = getPath(translations, el.getAttribute('data-i18n-meta')); if (value !== null && value !== undefined) el.setAttribute('content', String(value)); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { const value = getPath(translations, el.getAttribute('data-i18n-aria')); if (value !== null && value !== undefined) el.setAttribute('aria-label', String(value)); });

    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
      const value = getPath(translations, el.getAttribute('data-i18n-alt'));
      if (value !== null && value !== undefined) el.setAttribute('alt', String(value));
    });

    // Menü: hem yeni data-i18n hem eski data-menu-key yapısını destekler.
    const menuKeys = { home: 'menu.home', about: 'menu.about', services: 'menu.services', blog: 'menu.blog', press: 'menu.press', contact: 'menu.contact' };
    document.querySelectorAll('[data-menu-key]').forEach(el => {
      const value = getPath(translations, menuKeys[el.dataset.menuKey]);
      if (value !== null && value !== undefined) setText(el, value);
    });

    renderLanguageMenu();
    updateLanguageUI();
    const internationalLinks = {tr:'/saglik-turizmi.html',en:'/en/health-tourism.html',de:'/de/gesundheitstourismus.html',ar:'/ar/alsiyaaha-alssihiyya.html',ru:'/ru/medturizm.html',az:'/az/saglamliq-turizmi.html',sq:'/sq/turizmi-shendetesor.html',nl:'/nl/medisch-toerisme.html',es:'/es/turismo-sanitario.html'};
    document.querySelectorAll('[data-international-link]').forEach(el => { if (internationalLinks[currentLang]) el.setAttribute('href', internationalLinks[currentLang]); });
    updatePageSEO();
    if (document.getElementById('siteBannerSlider')) await loadBanners();
    if (window.renderBlogCards) window.renderBlogCards(currentLang, translations);
    if (window.renderBlogPost) window.renderBlogPost(currentLang, translations);
  }

  function renderLanguageMenu() {
    const menu = document.getElementById('langMenuContent') || document.getElementById('lm');
    if (!menu) return;
    // Menü kaynağı tek merkezden üretilir: eski HTML'de 3 dil kalsa bile burada 8 dil görünür.
    menu.innerHTML = LANGS.map(info =>
      `<button type="button" data-lang="${info.code}" role="menuitem" aria-label="${escapeAttr(info.name.replace(/^\S+\s/, ''))}">${escapeAttr(info.name)}</button>`
    ).join('');
    menu.querySelectorAll('[data-lang]').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        event.stopPropagation();
        await setLanguage(btn.dataset.lang);
      });
    });
  }

  function updateLanguageUI() {
    const info = LANGS.find(x => x.code === currentLang) || LANGS[0];
    document.querySelectorAll('#currentLangText, [data-current-language]').forEach(el => {
      el.textContent = info.label;
    });
    document.querySelectorAll('.lang-content [data-lang], .langmenu [data-lang]').forEach(btn => {
      const active = btn.dataset.lang === currentLang;
      btn.setAttribute('aria-current', active ? 'true' : 'false');
      btn.classList.toggle('active', active);
    });
  }

  function updatePageSEO() {
    const titleKey = document.body?.dataset?.pageTitleKey;
    const descriptionKey = document.body?.dataset?.pageDescriptionKey;
    const title = titleKey ? getPath(translations, titleKey) : null;
    const description = descriptionKey ? getPath(translations, descriptionKey) : null;
    if (title) document.title = String(title);
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', String(description));
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogTitle && title) ogTitle.setAttribute('content', String(title));
    if (ogDescription && description) ogDescription.setAttribute('content', String(description));
  }

  function toggleLangMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('langMenuContent');
    if (!menu) return;
    menu.classList.toggle('show');
  }

  function closeLangMenu() {
    document.getElementById('langMenuContent')?.classList.remove('show');
  }

  async function setLanguage(lang) {
    lang = normalize(lang);
    closeLangMenu();
    await applyLanguage(lang);
  }

  function toggleMenu() {
    const nav = document.getElementById('navMenu');
    if (!nav) return;
    const open = nav.classList.toggle('active');
    document.querySelectorAll('.mobile-menu-btn').forEach(btn => {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    });
  }

  function closeMenu() {
    document.getElementById('navMenu')?.classList.remove('active');
    document.querySelectorAll('.mobile-menu-btn').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Menüyü aç');
    });
  }

  function bindMobileMenu() {
    const nav = document.getElementById('navMenu');
    if (!nav) return;
    document.querySelectorAll('.mobile-menu-btn').forEach(btn => {
      if (btn.dataset.qaBound === '1') return;
      btn.dataset.qaBound = '1';
      // Legacy HTML files may still contain onclick="toggleMenu()".
      // Remove that inline handler before attaching the single shared listener
      // so one tap cannot toggle the mobile menu twice.
      if (btn.getAttribute('onclick')) btn.removeAttribute('onclick');
      btn.addEventListener('click', event => {
        event.preventDefault();
        toggleMenu();
      });
    });
  }

  async function loadBanners() {
    const slider = document.getElementById('siteBannerSlider');
    if (!slider) return;
    try {
      const response = await fetch(siteApi('api/public?type=banners'), { cache: 'no-store' });
      if (!response.ok) throw new Error('Banner API kullanılamıyor');
      const data = await response.json();
      const banners = Array.isArray(data) ? data.filter(x => x.enabled !== 0 && x.enabled !== false).slice(0, 3) : [];
      if (banners.length) renderBanners(slider, banners);
      else throw new Error('Aktif banner bulunamadı');
    } catch (error) {
      console.warn('Banner API fallback:', error);
      // Cloudflare/D1 kurulmadan önce de ana sayfa çalışsın.
      renderBanners(slider, [
        { desktop_file: 'banner2.png', mobile_file: '', alt: { tr: 'Doç. Dr. Erol Vural' } },
        { desktop_file: 'banner1.png', mobile_file: '', alt: { tr: 'Doç. Dr. Erol Vural' } },
        { desktop_file: 'banner3.png', mobile_file: '', alt: { tr: 'Doç. Dr. Erol Vural' } }
      ]);
    }
  }

  function renderBanners(slider, banners) {
    clearInterval(bannerTimer);
    slider.innerHTML = banners.map((b, i) => {
      const altMap = b.alt && typeof b.alt === 'object' ? b.alt : {};
      const alt = altMap[currentLang] || altMap.tr || 'Doç. Dr. Erol Vural';
      const desktop = b.desktop_file ? new URL(b.desktop_file.replace(/^\//,''), SITE_BASE).href : siteAsset('banner1.png');
      const mobile = b.mobile_file ? new URL(b.mobile_file.replace(/^\//,''), SITE_BASE).href : '';
      return `<div class="site-slide${i === 0 ? ' active' : ''}"><picture>${mobile ? `<source media="(max-width:700px)" srcset="${escapeAttr(mobile)}">` : ''}<img src="${escapeAttr(desktop)}" alt="${escapeAttr(alt)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}></picture></div>`;
    }).join('');

    let index = 0;
    if (banners.length > 1) {
      bannerTimer = setInterval(() => {
        const slides = slider.querySelectorAll('.site-slide');
        if (slides.length < 2) return;
        slides[index].classList.remove('active');
        index = (index + 1) % slides.length;
        slides[index].classList.add('active');
      }, 5000);
    }
  }

  function escapeAttr(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function setupForms() {
    const form = document.getElementById('contactForm');
    const success = document.getElementById('successMessage');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = currentLang === 'tr' ? 'Gönderiliyor…' : 'Sending…'; }
      try {
        const response = await fetch(new URL(form.action || 'api/contact', SITE_BASE).href, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Form gönderilemedi');
        form.reset();
        form.style.display = 'none';
        if (success) success.style.display = 'block';
      } catch (err) {
        console.error(err);
        alert(currentLang === 'tr' ? 'Bir hata oluştu, lütfen tekrar deneyin.' : 'An error occurred. Please try again.');
      } finally {
        if (button) { button.disabled = false; button.textContent = button.dataset.originalText || button.textContent; }
      }
    });
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('.lang-dropdown')) closeLangMenu();
    if (event.target.closest('nav a')) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeLangMenu(); closeMenu(); }
  });

  window.toggleLangMenu = toggleLangMenu;
  window.setLanguage = setLanguage;
  window.changeLanguage = setLanguage; // eski sayfa çağrılarını da destekle
  window.toggleMenu = toggleMenu;
  window.closeMenu = closeMenu;
  window.siteLanguage = () => currentLang;
  window.siteTranslation = getPath;

  document.addEventListener('DOMContentLoaded', async () => {
    // Bind the mobile menu from the shared script as well as the Worker
    // fallback. The binder removes legacy inline handlers, preventing
    // double-toggle behavior on older HTML files.
    bindMobileMenu();
    setupForms();
    await applyLanguage(currentLang);
  });

})();
(function globalQAFixes(){
  const routeMap={'index.html':'/','./index.html':'/','/index.html':'/','hakkimizda.html':'/hakkimizda','./hakkimizda.html':'/hakkimizda','/hakkimizda.html':'/hakkimizda','hizmetler.html':'/hizmetler','./hizmetler.html':'/hizmetler','/hizmetler.html':'/hizmetler','blog.html':'/blog','./blog.html':'/blog','/blog.html':'/blog','iletisim.html':'/iletisim','./iletisim.html':'/iletisim','/iletisim.html':'/iletisim','basinda-biz.html':'/basinda-biz','./basinda-biz.html':'/basinda-biz','/basinda-biz.html':'/basinda-biz','saglik-turizmi.html':'/saglik-turizmi','./saglik-turizmi.html':'/saglik-turizmi','/saglik-turizmi.html':'/saglik-turizmi'};
  const langs=['tr','en','de','ar','ru','az','sq','nl','es'];
  function cleanInternalLink(raw){
    if(!raw || /^(?:https?:|mailto:|tel:|javascript:|data:|#)/i.test(raw)) return raw;
    try{const u=new URL(raw,location.href);if(u.origin!==location.origin)return raw;let p=u.pathname;if(routeMap[p])p=routeMap[p];else{for(const l of langs){const prefix='/'+l+'/';if(p===prefix+'index.html')p=prefix;else if(p.startsWith(prefix)&&p.endsWith('.html'))p=p.slice(0,-5);}}u.pathname=p;return u.pathname+u.search+u.hash;}catch(_){return raw;}
  }
  document.querySelectorAll('a[href]').forEach(a=>{const href=a.getAttribute('href'),fixed=cleanInternalLink(href);if(fixed&&fixed!==href)a.setAttribute('href',fixed);if(a.target==='_blank'&&/^https?:/i.test(a.href)){const rel=new Set((a.getAttribute('rel')||'').split(/\\s+/).filter(Boolean));rel.add('noopener');rel.add('noreferrer');a.setAttribute('rel',[...rel].join(' '));}});
  if(!document.querySelector('meta[name="robots"][content*="noindex"]')){const canonical=new URL(location.href);canonical.search='';canonical.hash='';if(canonical.pathname.endsWith('.html'))canonical.pathname=cleanInternalLink(canonical.pathname);if(canonical.pathname==='/index.html')canonical.pathname='/';let link=document.querySelector('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link);}link.href=canonical.href;const og=document.querySelector('meta[property="og:url"]');if(og)og.setAttribute('content',canonical.href);}
  if(!document.getElementById('global-qa-css')){const style=document.createElement('style');style.id='global-qa-css';style.textContent='html,body{max-width:100%;width:100%;overflow-x:hidden}*,*:before,*:after{box-sizing:border-box}img,svg,video,iframe{max-width:100%;height:auto}button,a,input,textarea,select{touch-action:manipulation}a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid rgba(0,155,180,.35);outline-offset:3px}.site-slide img{width:100%;display:block}.card,.service-card,.featured-card,.about-container,.contact-form{max-width:100%}.content img,.article-content img{display:block;margin:20px auto;border-radius:14px}table{width:100%;border-collapse:collapse;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}@media(max-width:992px){header{padding-left:16px!important;padding-right:16px!important;min-height:74px}.logo img{max-height:58px!important;width:auto!important}.header-right{gap:8px!important}nav{max-width:100vw;max-height:calc(100vh - 74px);overflow:auto}.contact-container,.services-wrapper,.about-container,.featured-card{width:100%;max-width:100%}}@media(max-width:768px){header{padding:8px 14px!important;min-height:72px}.header-right{gap:7px!important}.mobile-menu-btn{display:flex!important;min-width:44px!important;min-height:44px!important}nav{top:72px!important;left:-100%;width:100%!important;max-height:calc(100vh - 72px);overflow-y:auto}nav.active{left:0!important}nav ul{width:100%;padding:16px 12px!important;gap:10px!important}nav ul li,nav ul li a{width:100%;text-align:center}.hero,.inner-hero{margin-top:72px!important;padding:34px 18px!important}.hero h1,.inner-hero h1{font-size:clamp(28px,8vw,38px)!important;line-height:1.18!important}.hero p,.inner-hero p{font-size:16px!important;line-height:1.55!important}main,section,article,.container,.content,.page-container{width:100%!important;max-width:100%!important}.contact-section{padding:30px 14px!important}.contact-container{display:flex!important;flex-direction:column!important;flex-wrap:nowrap!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:22px!important;gap:28px!important;overflow:hidden!important}.contact-info,.contact-form{display:block!important;flex:0 1 auto!important;width:100%!important;min-width:0!important;max-width:100%!important}.contact-info h2,.contact-form h2{font-size:24px!important;line-height:1.3!important;max-width:100%!important}.info-item{width:100%!important;min-width:0!important}.info-text{min-width:0!important;max-width:100%!important}.info-text p{overflow-wrap:anywhere!important;word-break:break-word!important}.contact-form input,.contact-form textarea,.contact-form button{width:100%!important;max-width:100%!important}.contact-form textarea{min-height:150px}.services-grid{grid-template-columns:1fr!important;gap:18px!important}.service-row,.service-row.reverse{width:100%!important;margin-left:0!important;margin-right:0!important}.article-content{font-size:16px!important;line-height:1.75!important}footer{padding:30px 16px!important}.social-links,.social-icons,.footer-social{display:flex!important;flex-wrap:wrap!important;justify-content:center!important;gap:14px!important}.whatsapp-floating-btn,.whatsapp{right:14px!important;bottom:14px!important;width:56px!important;height:56px!important;font-size:29px!important}}@media(max-width:420px){.logo img{max-height:52px!important}.lang-btn,.langicon,.lang{width:78px!important;min-width:78px!important}.contact-container{padding:18px!important;border-radius:16px!important}.contact-section{padding-left:10px!important;padding-right:10px!important}.info-icon{margin-right:10px!important}.contact-form h2,.contact-info h2{font-size:22px!important}}';document.head.appendChild(style);}
  document.querySelectorAll('form button:not([type])').forEach(b=>b.type='submit');
  document.querySelectorAll('a[href=""],a[href="#"]').forEach(a=>{if(a.dataset.allowHash==='1')return;const hasClick=a.hasAttribute('onclick')||a.dataset.action||a.getAttribute('role')==='button';if(hasClick)a.addEventListener('click',e=>{if(a.getAttribute('href')==='#')e.preventDefault();});});
})();
