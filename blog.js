/* Erol Vural - SEO blog liste motoru */
(() => {
  'use strict';
  const LANGS = ['tr','en','de','ar','ru','az','sq','nl','es'];
  const FALLBACK_MORE = {tr:'Makaleyi Oku',en:'Read Article',de:'Artikel lesen',ar:'اقرأ المقال',ru:'Читать статью',az:'Məqaləni oxu',sq:'Lexo artikullin',nl:'Artikel lezen',es:'Leer artículo'};
  const EMPTY = {tr:'Aramanızla eşleşen makale bulunamadı.',en:'No articles match your search.',de:'Keine passenden Artikel gefunden.',ar:'لا توجد مقالات مطابقة للبحث.',ru:'Подходящих статей не найдено.',az:'Axtarışa uyğun məqalə tapılmadı.',sq:'Nuk u gjetën artikuj që përputhen.',nl:'Geen overeenkomende artikelen gevonden.',es:'No se encontraron artículos que coincidan con su búsqueda.'};
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const normalize = l => LANGS.includes(String(l||'').toLowerCase()) ? String(l).toLowerCase() : 'tr';
  function getLang(){ return normalize(typeof window.siteLanguage==='function' ? window.siteLanguage() : localStorage.getItem('siteLanguage') || document.documentElement.lang || 'tr'); }
  async function readJSON(url){ const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  function siteBase(){ const script=Array.from(document.scripts).find(s=>/(?:^|\/)site\.js(?:\?|$)/.test(s.src)); return script?new URL('./',script.src):new URL('./',document.baseURI); }
  function assetUrl(path){ return new URL(String(path).replace(/^\//,''),siteBase()).href; }
  function apiUrl(path){ return new URL(String(path).replace(/^\//,''),siteBase()).href; }
  async function loadPosts(){
    let posts=[];
    try { const d=await readJSON(assetUrl('data/blogs.json')); if(Array.isArray(d)) posts=d.filter(x=>x&&x.published!==false); } catch(e) { console.warn('Statik blog verisi okunamadı, API deneniyor.',e); }
    try { const d=await readJSON(apiUrl('api/public?type=blogs')); if(Array.isArray(d)&&d.length) posts=d.filter(x=>x&&x.published!==false); } catch(e) { console.warn('Blog API kullanılamadı; paket içi içerikler kullanılacak.',e); }
    try { const r=await readJSON(assetUrl('data/recovered-articles.json')); if(Array.isArray(r)) posts=posts.concat(r.filter(x=>x&&x.published!==false)); } catch(e) { console.warn('Yeni makale manifesti okunamadı.',e); }
    if(posts.length){
      const seen=new Set();
      posts=posts.filter(p=>{
        const key=String(p.id||p.slug?.tr||p.slug?.en||'');
        if(!key || seen.has(key)) return false;
        seen.add(key); return true;
      });
      return posts;
    }
    throw new Error('Blog verisi yüklenemedi.');
  }
  function textFor(map,lang,fallback=''){ return map?.[lang] || fallback; }
  function hasLang(post, lang){
    if(!post || !post.title || !post.description || !post.slug) return false;
    if(post.recovered) return lang === 'tr' && !!post.title.tr && !!post.description.tr && !!post.slug.tr;
    return !!(post.title[lang] && post.description[lang] && post.content && post.content[lang] && post.slug[lang]);
  }
  function articleUrl(post,lang){
    if(post.recovered) return `/${encodeURIComponent(post.slug.tr).replace(/%2F/g,'/')}`;
    const slug = post.slug?.[lang] || post.id || '';
    return `blog-post.html?slug=${encodeURIComponent(slug)}&lang=${encodeURIComponent(lang)}`;
  }
  function localText(post,key,lang,fallback=''){
    if(post?.recovered) return textFor(post[key],lang,post[key]?.tr || fallback);
    return textFor(post[key],lang,fallback);
  }
  let allPosts=[], activeCategory='all';
  function categories(lang){
    const set=new Map(); allPosts.filter(p=>hasLang(p,lang)).forEach(p=>{const c=localText(p,'category',lang,''); const key=p.category?.tr||c; if(!set.has(key)) set.set(key,c);}); return [...set.entries()];
  }
  function renderFilters(lang){
    const el=document.getElementById('blogFilters'); if(!el)return;
    const allLabel = ({tr:'Tümü',en:'All',de:'Alle',ar:'الكل',ru:'Все',az:'Hamısı',sq:'Të gjitha',nl:'Alles'})[lang] || 'All';
    el.innerHTML='<button class="filter active" data-cat="all">'+esc(allLabel)+'</button>'+categories(lang).map(([key,label])=>`<button class="filter" data-cat="${esc(key)}">${esc(label)}</button>`).join('');
    el.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{activeCategory=btn.dataset.cat;el.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b===btn));render(lang);}));
  }
  function render(lang){
    const q=(document.getElementById('blogSearch')?.value||'').trim().toLocaleLowerCase('tr-TR');
    let posts=allPosts.filter(p=>p.published!==false).filter(p=>hasLang(p,lang)).filter(p=>activeCategory==='all'||(p.category?.tr||'Genel')===activeCategory).filter(p=>{
      if(!q)return true; const hay=[localText(p,'title',lang,''),localText(p,'description',lang,''),localText(p,'category',lang,''),p.title?.tr||'',p.description?.tr||'',p.keywords?.tr||''].join(' ').toLocaleLowerCase('tr-TR'); return hay.includes(q);
    });
    const more=FALLBACK_MORE[lang]||FALLBACK_MORE.tr;
    const featured=document.getElementById('featuredPost');
    const lead=posts.find(p=>p.featured) || posts[0];
    if(featured){
      featured.innerHTML=lead?`<div class="featured-card"><div class="featured-visual"><i class="fas ${esc(lead.icon||'fa-file-medical')}" aria-hidden="true"></i></div><div class="featured-body"><span class="badge">${esc(localText(lead,'category',lang,''))}</span><h3>${esc(localText(lead,'title',lang,''))}</h3><p>${esc(localText(lead,'description',lang,''))}</p><a class="read" href="${esc(articleUrl(lead,lang))}">${esc(more)} <i class="fas fa-arrow-right"></i></a></div></div>`:'<div class="empty">'+esc(EMPTY[lang]||EMPTY.en)+'</div>';
    }
    const grid=document.getElementById('blogGrid'); if(!grid)return;
    grid.innerHTML=posts.map(p=>{const title=localText(p,'title',lang,'');const desc=localText(p,'description',lang,'');const cat=localText(p,'category',lang,'');return `<article class="card"><div class="card-top"><i class="fas ${esc(p.icon||'fa-file-medical')}" aria-hidden="true"></i></div><div class="card-body"><span class="badge">${esc(cat)}</span><h3>${esc(title)}</h3><p>${esc(desc)}</p><a class="read" href="${esc(articleUrl(p,lang))}">${esc(more)} <i class="fas fa-arrow-right"></i></a></div></article>`}).join('') || '<div class="empty">'+esc(EMPTY[lang]||EMPTY.en)+'</div>';
  }
  async function renderBlogCards(lang=getLang()){
    try{ allPosts=await loadPosts(); renderFilters(lang); render(lang); }
    catch(e){ console.error(e); const g=document.getElementById('blogGrid'); if(g)g.innerHTML='<div class="empty"><strong>'+esc(({tr:'İçerikler şu anda yüklenemiyor.',en:'Content is currently unavailable.',de:'Inhalte sind derzeit nicht verfügbar.',ar:'المحتوى غير متاح حالياً.',ru:'Материалы сейчас недоступны.',az:'Məzmun hazırda əlçatan deyil.',sq:'Përmbajtja nuk është e disponueshme tani.',nl:'Inhoud is momenteel niet beschikbaar.'})[getLang()]||'Content is currently unavailable.')+'</strong></div>'; }
  }
  window.renderBlogCards=renderBlogCards;
  document.addEventListener('DOMContentLoaded',()=>{ const s=document.getElementById('blogSearch'); if(s)s.addEventListener('input',()=>render(getLang())); renderBlogCards(getLang()); });
})();
