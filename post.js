/* Erol Vural - Blog detay motoru v3 */
(() => {
  'use strict';
  const LANGS = ['tr','en','de','ar','ru','az','sq','nl','es'];
  const LABELS = {
    tr:{notFound:'İçerik bulunamadı',missing:'Bu makalenin seçilen dilde içeriği bulunmuyor.',back:'Uzman\'ından Bilgiler',expert:'Uzman'},
    en:{notFound:'Content not found',missing:'This article is not available in the selected language.',back:'Expert Insights',expert:'Expert'},
    de:{notFound:'Inhalt nicht gefunden',missing:'Dieser Artikel ist in der ausgewählten Sprache nicht verfügbar.',back:'Fachinformationen',expert:'Experte'},
    ar:{notFound:'المحتوى غير موجود',missing:'هذه المقالة غير متاحة باللغة المحددة.',back:'معلومات الخبير',expert:'الاختصاصي'},
    ru:{notFound:'Материал не найден',missing:'Эта статья недоступна на выбранном языке.',back:'Экспертные материалы',expert:'Специалист'},
    az:{notFound:'Məzmun tapılmadı',missing:'Bu məqalə seçilmiş dildə mövcud deyil.',back:'Mütəxəssis məlumatları',expert:'Mütəxəssis'},
    sq:{notFound:'Përmbajtja nuk u gjet',missing:'Ky artikull nuk është i disponueshëm në gjuhën e zgjedhur.',back:'Informacion nga eksperti',expert:'Ekspert'},
    nl:{notFound:'Inhoud niet gevonden',missing:'Dit artikel is niet beschikbaar in de geselecteerde taal.',back:'Expertinformatie',expert:'Expert'},
    es:{notFound:'Contenido no encontrado',missing:'Este artículo no está disponible en el idioma seleccionado.',back:'Información del experto',expert:'Experto'}
  };
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const normalize = l => LANGS.includes(String(l||'').toLowerCase()) ? String(l).toLowerCase() : 'tr';
  const getLang = () => normalize(new URLSearchParams(location.search).get('lang') || (typeof window.siteLanguage==='function' ? window.siteLanguage() : localStorage.getItem('siteLanguage') || document.documentElement.lang || 'tr'));
  async function readJSON(url){ const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  function siteBase(){ const script=Array.from(document.scripts).find(s=>/(?:^|\/)site\.js(?:\?|$)/.test(s.src)); return script?new URL('./',script.src):new URL('./',document.baseURI); }
  function assetUrl(path){ return new URL(String(path).replace(/^\//,''),siteBase()).href; }
  function apiUrl(path){ return new URL(String(path).replace(/^\//,''),siteBase()).href; }
  async function loadPost(slug){
    const candidates=[slug, decodeURIComponent(slug||'')].filter(Boolean);
    try { const x=await readJSON(apiUrl('api/public?type=blog&slug='+encodeURIComponent(candidates[0]))); if(x && !x.error) return x; } catch(_) {}
    const data=await readJSON(assetUrl('data/blogs.json'));
    const found=data.find(p=>candidates.includes(String(p.id)) || candidates.some(s=>Object.values(p.slug||{}).map(String).includes(s)));
    if(found) return found;
    try {
      const recovered=await readJSON(assetUrl('data/recovered-articles.json'));
      const rp=recovered.find(p=>candidates.includes(String(p.id)) || candidates.some(s=>Object.values(p.slug||{}).map(String).includes(s)));
      if(rp && rp.slug?.tr){ location.replace('/'+encodeURIComponent(rp.slug.tr).replace(/%2F/g,'/')); return null; }
    } catch(_) {}
    return null;
  }
  function formatContent(raw){
    let text=String(raw||'').trim();
    // Existing Turkish articles contain simple HTML. Keep safe formatting without executing arbitrary HTML.
    if(/<\/?(p|h2|h3|strong|em|ul|ol|li|br)\b/i.test(text)){
      text=text.replace(/<h2[^>]*>/gi,'\n\n[[H2]]').replace(/<h3[^>]*>/gi,'\n\n[[H3]]').replace(/<\/h[23]>/gi,'\n\n').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<li[^>]*>/gi,'\n• ').replace(/<\/(li|ul|ol|p)>/gi,'\n').replace(/<strong[^>]*>/gi,'').replace(/<\/strong>/gi,'').replace(/<em[^>]*>/gi,'').replace(/<\/em>/gi,'').replace(/<[^>]+>/g,'');
    }
    return text.split(/\n{2,}|(?=\[\[H[23]\]\])/).map(part=>part.trim()).filter(Boolean).map(part=>{
      if(part.startsWith('[[H2]]')) return '<h2>'+esc(part.replace(/^\[\[H2\]\]/,'' ).trim())+'</h2>';
      if(part.startsWith('[[H3]]')) return '<h3>'+esc(part.replace(/^\[\[H3\]\]/,'' ).trim())+'</h3>';
      const lines=part.split('\n').map(x=>x.trim()).filter(Boolean);
      if(lines.length>1 && lines.every(x=>x.startsWith('• '))) return '<ul>'+lines.map(x=>'<li>'+esc(x.slice(2))+'</li>').join('')+'</ul>';
      return '<p>'+esc(part).replace(/\n/g,'<br>')+'</p>';
    }).join('');
  }
  async function renderBlogPost(lang=getLang()){
    const root=document.getElementById('post'); if(!root)return;
    const b=await loadPost(new URLSearchParams(location.search).get('slug')||'');
    const labels=LABELS[lang]||LABELS.tr;
    if(!b){root.innerHTML=`<h1>${esc(labels.notFound)}</h1><p>${esc(labels.missing)}</p>`;return;}
    // No cross-language fallback: a foreign page must never show Turkish content.
    if(!b.title?.[lang] || !b.content?.[lang]){root.innerHTML=`<h1>${esc(labels.notFound)}</h1><p>${esc(labels.missing)}</p>`;return;}
    const title=b.title[lang], category=b.category?.[lang]||'', desc=b.description?.[lang]||'';
    document.documentElement.lang=lang; document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    document.title=(b.meta_title?.[lang]||title)+' | Doç. Dr. Erol Vural';
    const meta=document.querySelector('meta[name="description"]'); if(meta)meta.content=b.meta_description?.[lang]||desc;
    const canonicalSlug = b.slug?.[lang] || b.slug?.tr || new URLSearchParams(location.search).get('slug') || '';
    if (canonicalSlug) {
      const canonical = new URL(location.href);
      canonical.pathname = '/blog/' + encodeURIComponent(canonicalSlug).replace(/%2F/g,'/');
      canonical.search = lang === 'tr' ? '' : '?lang=' + encodeURIComponent(lang);
      canonical.hash = '';
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
      link.href = canonical.href;
      const og = document.querySelector('meta[property="og:url"]');
      if (og) og.setAttribute('content', canonical.href);
    }
    const content=formatContent(b.content[lang]);
    root.innerHTML=`<h1>${esc(title)}</h1><div class="meta">${esc(labels.expert)} · Doç. Dr. Erol Vural${category?' · '+esc(category):''}</div>${desc?`<div class="lead"><p>${esc(desc)}</p></div>`:''}<div class="content">${content}</div>`;
    const back=document.querySelector('[data-blog-back]'); if(back)back.textContent=labels.back;
  }
  window.renderBlogPost=renderBlogPost;
  document.addEventListener('DOMContentLoaded',()=>renderBlogPost(getLang()));
})();
