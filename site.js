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
    en: {"menu.press":"In the Press","about.pressIntro":"Explore selected media and scientific-event coverage featuring Assoc. Prof. Dr. Erol Vural.","press.eyebrow":"Press Archive","press.title":"In the Press","press.intro":"Selected verifiable interviews, health reports and professional event records featuring Assoc. Prof. Dr. Erol Vural from previous years.","press.selected":"Selected Coverage","press.sourceNote":"Sources: archives of the respective publishers","press.tagHealth":"Interview · Health","press.tagObesity":"Interview · Obesity","press.tagMetabolic":"Metabolic Surgery","press.news1Title":"What is not widely known about sleeve gastrectomy","press.news2Title":"Who may be considered for bariatric surgery?","press.news3Title":"Report on metabolic surgery for diabetes in Istanbul","press.news1Summary":"The İHA health report compiles statements by Dr. Erol Vural about sleeve gastrectomy, its potential benefits and limitations, and postoperative weight management.","press.news2Summary":"The report includes a Q&A with Dr. Erol Vural about bariatric surgery, patient assessment, eligibility criteria and preoperative preparation.","press.news3Summary":"The report presents statements by Dr. Erol Vural about metabolic surgery and approaches related to type 2 diabetes. Its headline mentions an 83% success rate; that figure is not independently evaluated on this page.","press.read":"Read the report","press.editorialLabel":"Editorial note:","press.editorial":"This page is a selected press archive. Headlines and medical or statistical statements belong to their respective publishers; inclusion here does not guarantee a medical outcome or constitute independent verification.","press.scientificTitle":"Scientific event record","press.scientificText":"The 2023 proceedings of the Turkish Obesity Surgery Association include a scientific presentation by Erol Vural titled “Early results and complication risks of vertical clip gastroplasty.”","press.scientificLink":"View the 2023 proceedings"},
    de: {"menu.press":"In der Presse","about.pressIntro":"Hier finden Sie eine Auswahl von Presseberichten und wissenschaftlichen Veranstaltungsnachweisen über Doç. Dr. Erol Vural.","press.eyebrow":"Pressearchiv","press.title":"In der Presse","press.intro":"Ausgewählte überprüfbare Interviews, Gesundheitsberichte und berufliche Veranstaltungsnachweise über Doç. Dr. Erol Vural aus früheren Jahren.","press.selected":"Ausgewählte Berichte","press.sourceNote":"Quellen: Archive der jeweiligen Herausgeber","press.tagHealth":"Interview · Gesundheit","press.tagObesity":"Interview · Adipositas","press.tagMetabolic":"Metabolische Chirurgie","press.news1Title":"Was über die Schlauchmagen-Operation weniger bekannt ist","press.news2Title":"Für wen kommt eine bariatrische Operation infrage?","press.news3Title":"Bericht über metabolische Chirurgie bei Diabetes in Istanbul","press.read":"Zum Bericht","press.editorialLabel":"Redaktioneller Hinweis:","press.editorial":"Diese Seite ist als ausgewähltes Pressearchiv zusammengestellt. Überschriften sowie medizinische oder statistische Angaben stammen von den jeweiligen Herausgebern; ihre Aufnahme stellt keine Garantie eines medizinischen Ergebnisses und keine unabhängige Bestätigung dar.","press.scientificTitle":"Wissenschaftlicher Veranstaltungsnachweis","press.scientificText":"Im Tagungsband 2023 der Türkischen Gesellschaft für Adipositaschirurgie ist ein wissenschaftlicher Vortrag von Erol Vural verzeichnet.","press.scientificLink":"Tagungsband ansehen"},
    ar: {"menu.press":"في الصحافة","about.pressIntro":"يمكنكم الاطلاع على مجموعة مختارة من التغطيات الصحفية والسجلات العلمية المتعلقة بـ Doç. Dr. Erol Vural.","press.eyebrow":"أرشيف الصحافة","press.title":"في الصحافة","press.intro":"مجموعة مختارة من المقابلات والتقارير الصحية وسجلات الفعاليات المهنية القابلة للتحقق من السنوات السابقة حول Doç. Dr. Erol Vural.","press.selected":"تغطيات مختارة","press.sourceNote":"المصادر: أرشيفات الجهات الناشرة المعنية","press.tagHealth":"مقابلة · صحة","press.tagObesity":"مقابلة · سمنة","press.tagMetabolic":"جراحة الأيض","press.news1Title":"ما لا يُعرف على نطاق واسع عن تكميم المعدة","press.news2Title":"من يمكن أن يخضع لجراحة السمنة؟","press.news3Title":"تقرير عن جراحة الأيض لمرض السكري في إسطنبول","press.read":"اقرأ التقرير","press.editorialLabel":"ملاحظة تحريرية:","press.editorial":"أُعدت هذه الصفحة كأرشيف صحفي مختار. العناوين والعبارات الطبية أو الإحصائية تعود إلى الجهات الناشرة؛ وإدراجها هنا لا يضمن نتيجة طبية ولا يعني التحقق المستقل منها.","press.scientificTitle":"سجل فعالية علمية","press.scientificText":"يتضمن كتاب وقائع عام 2023 للجمعية التركية لجراحة السمنة عرضاً علمياً باسم Erol Vural.","press.scientificLink":"عرض كتاب الوقائع"},
    ru: {"menu.press":"В прессе","about.pressIntro":"Здесь представлены избранные публикации в СМИ и сведения о научных мероприятиях с участием Doç. Dr. Erol Vural.","press.eyebrow":"Архив прессы","press.title":"В прессе","press.intro":"Избранные проверяемые интервью, медицинские публикации и сведения о профессиональных мероприятиях с участием Doç. Dr. Erol Vural за предыдущие годы.","press.selected":"Избранные публикации","press.sourceNote":"Источники: архивы соответствующих издателей","press.tagHealth":"Интервью · Здоровье","press.tagObesity":"Интервью · Ожирение","press.tagMetabolic":"Метаболическая хирургия","press.news1Title":"Что важно знать об операции продольной резекции желудка","press.news2Title":"Кому может быть показана бариатрическая хирургия?","press.news3Title":"Материал о метаболической хирургии при диабете в Стамбуле","press.read":"Перейти к публикации","press.editorialLabel":"Редакционная заметка:","press.editorial":"Эта страница является подборкой публикаций в СМИ. Заголовки и медицинские или статистические утверждения принадлежат соответствующим издателям; размещение здесь не гарантирует медицинский результат и не означает независимой проверки.","press.scientificTitle":"Научное мероприятие","press.scientificText":"В сборнике материалов Турецкой ассоциации бариатрической хирургии за 2023 год указано научное выступление Erol Vural.","press.scientificLink":"Открыть сборник"},
    az: {"menu.press":"Mətbuatda Biz","about.pressIntro":"Doç. Dr. Erol Vural haqqında mətbuatda və elmi tədbirlərdə yayımlanmış seçilmiş materiallara baxa bilərsiniz.","press.eyebrow":"Mətbuat arxivi","press.title":"Mətbuatda Biz","press.intro":"Doç. Dr. Erol Vural haqqında əvvəlki illərdə yayımlanmış, yoxlanıla bilən seçilmiş müsahibələr, səhiyyə xəbərləri və peşəkar tədbir qeydləri.","press.selected":"Seçilmiş materiallar","press.sourceNote":"Mənbələr: müvafiq nəşriyyatların arxivləri","press.tagHealth":"Müsahibə · Səhiyyə","press.tagObesity":"Müsahibə · Piylənmə","press.tagMetabolic":"Metabolik cərrahiyyə","press.news1Title":"Mədə kiçiltmə əməliyyatı haqqında az bilinənlər","press.news2Title":"Piylənmə cərrahiyyəsi kimlər üçün nəzərdən keçirilə bilər?","press.news3Title":"İstanbulda diabet üçün metabolik cərrahiyyə haqqında xəbər","press.read":"Xəbərə keç","press.editorialLabel":"Redaksiya qeydi:","press.editorial":"Bu səhifə seçilmiş mətbuat arxivi kimi hazırlanıb. Xəbər başlıqları və tibbi və ya statistik ifadələr müvafiq nəşriyyatlara aiddir; burada yer alması tibbi nəticəyə zəmanət vermir və müstəqil təsdiq demək deyil.","press.scientificTitle":"Elmi tədbir qeydi","press.scientificText":"Türkiyə Piylənmə Cərrahiyyəsi Assosiasiyasının 2023-cü il bildiriş kitabında Erol Vuralın elmi təqdimatı qeyd olunur.","press.scientificLink":"Bildiriş kitabına bax"},
    sq: {"menu.press":"Në media","about.pressIntro":"Shikoni një përzgjedhje të artikujve në media dhe të dhënave nga veprimtari shkencore që lidhen me Doç. Dr. Erol Vural.","press.eyebrow":"Arkivi i medias","press.title":"Në media","press.intro":"Intervista, lajme shëndetësore dhe të dhëna të verifikueshme nga veprimtari profesionale të viteve të mëparshme lidhur me Doç. Dr. Erol Vural.","press.selected":"Materiale të përzgjedhura","press.sourceNote":"Burimet: arkivat e botuesve përkatës","press.tagHealth":"Intervistë · Shëndet","press.tagObesity":"Intervistë · Obezitet","press.tagMetabolic":"Kirurgji metabolike","press.news1Title":"Çfarë nuk dihet gjerësisht për gastrektominë në mëngë","press.news2Title":"Kush mund të merret në konsideratë për kirurgji bariatrike?","press.news3Title":"Raport mbi kirurgjinë metabolike për diabetin në Stamboll","press.read":"Lexo raportin","press.editorialLabel":"Shënim editorial:","press.editorial":"Kjo faqe është përgatitur si një arkiv i përzgjedhur i medias. Titujt dhe deklaratat mjekësore ose statistikore u përkasin botuesve përkatës; përfshirja këtu nuk garanton rezultat mjekësor dhe nuk nënkupton verifikim të pavarur.","press.scientificTitle":"Regjistër i një veprimtarie shkencore","press.scientificText":"Në librin e abstrakteve të Shoqatës Turke të Kirurgjisë së Obezitetit të vitit 2023 figuron një prezantim shkencor i Erol Vural.","press.scientificLink":"Shiko librin e abstrakteve"},
    nl: {"menu.press":"In de pers","about.pressIntro":"Bekijk een selectie van perspublicaties en wetenschappelijke evenementgegevens over Doç. Dr. Erol Vural.","press.eyebrow":"Persarchief","press.title":"In de pers","press.intro":"Een selectie van verifieerbare interviews, gezondheidsartikelen en gegevens over professionele evenementen uit eerdere jaren over Doç. Dr. Erol Vural.","press.selected":"Geselecteerde publicaties","press.sourceNote":"Bronnen: archieven van de betreffende uitgevers","press.tagHealth":"Interview · Gezondheid","press.tagObesity":"Interview · Obesitas","press.tagMetabolic":"Metabole chirurgie","press.news1Title":"Wat minder bekend is over een sleeve-gastrectomie","press.news2Title":"Voor wie kan bariatrische chirurgie worden overwogen?","press.news3Title":"Bericht over metabole chirurgie bij diabetes in Istanbul","press.read":"Naar het artikel","press.editorialLabel":"Redactionele opmerking:","press.editorial":"Deze pagina is samengesteld als een geselecteerd persarchief. Koppen en medische of statistische uitspraken zijn afkomstig van de betreffende uitgevers; opname hier garandeert geen medisch resultaat en betekent geen onafhankelijke verificatie.","press.scientificTitle":"Registratie van een wetenschappelijke bijeenkomst","press.scientificText":"In het congresboek 2023 van de Turkse Vereniging voor Obesitaschirurgie staat een wetenschappelijke presentatie van Erol Vural.","press.scientificLink":"Bekijk het congresboek"},
    es: {"menu.press":"En la prensa","about.pressIntro":"Consulte una selección de publicaciones de prensa y registros de actividades científicas relacionados con el Dr. Erol Vural.","press.eyebrow":"Archivo de prensa","press.title":"En la prensa","press.intro":"Una selección de entrevistas, noticias sanitarias y registros de actividades profesionales verificables de años anteriores relacionados con el Dr. Erol Vural.","press.selected":"Publicaciones seleccionadas","press.sourceNote":"Fuentes: archivos de los respectivos medios","press.tagHealth":"Entrevista · Salud","press.tagObesity":"Entrevista · Obesidad","press.tagMetabolic":"Cirugía metabólica","press.news1Title":"Lo que no se conoce ampliamente sobre la gastrectomía en manga","press.news2Title":"¿Quién puede ser considerado para una cirugía bariátrica?","press.news3Title":"Reportaje sobre cirugía metabólica para la diabetes en Estambul","press.read":"Ver el reportaje","press.editorialLabel":"Nota editorial:","press.editorial":"Esta página se ha preparado como un archivo de prensa seleccionado. Los titulares y las afirmaciones médicas o estadísticas pertenecen a sus respectivos medios; su inclusión aquí no garantiza un resultado médico ni implica una verificación independiente.","press.scientificTitle":"Registro de actividad científica","press.scientificText":"El libro de actas de 2023 de la Asociación Turca de Cirugía de la Obesidad incluye una presentación científica de Erol Vural.","press.scientificLink":"Consultar el libro de actas"}
  };
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
  if(!document.getElementById('global-qa-css')){const style=document.createElement('style');style.id='global-qa-css';style.textContent='html,body{max-width:100%;overflow-x:hidden}img,svg,video,iframe{max-width:100%;height:auto}button,a,input,textarea,select{touch-action:manipulation}a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid rgba(0,155,180,.35);outline-offset:3px}.site-slide img{width:100%;display:block}.card,.service-card,.featured-card,.about-container,.contact-form{max-width:100%}.content img,.article-content img{display:block;margin:20px auto;border-radius:14px}table{width:100%;border-collapse:collapse;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}@media(max-width:992px){header{padding-left:16px!important;padding-right:16px!important}.header-right{gap:8px!important}nav{max-height:calc(100vh - 80px);overflow:auto}.whatsapp-floating-btn{right:16px!important;bottom:16px!important;width:54px!important;height:54px!important;font-size:29px!important}}@media(max-width:600px){section{padding-left:18px!important;padding-right:18px!important}.contact-info,.contact-form{min-width:0!important;width:100%}.contact-form{padding:24px!important}.about-container{padding:24px!important}.services-grid{grid-template-columns:1fr!important;gap:18px!important}.whatsapp-cta-box{margin-left:auto!important;margin-right:auto!important;width:100%!important}}';document.head.appendChild(style);}
  document.querySelectorAll('form button:not([type])').forEach(b=>b.type='submit');
  document.querySelectorAll('a[href=""],a[href="#"]').forEach(a=>{if(a.dataset.allowHash==='1')return;const hasClick=a.hasAttribute('onclick')||a.dataset.action||a.getAttribute('role')==='button';if(hasClick)a.addEventListener('click',e=>{if(a.getAttribute('href')==='#')e.preventDefault();});});
})();
