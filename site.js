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
