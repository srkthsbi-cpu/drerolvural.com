from pathlib import Path
from urllib.parse import urljoin,urlparse
from bs4 import BeautifulSoup
import re,json,collections,subprocess
root=Path('/mnt/data/audit6')
htmls=list(root.rglob('*.html'))
# local href/asset checks
hrefs=[]; missing=[]; empty=[]; scriptmiss=[]; imagemiss=[]
for p in htmls:
 s=BeautifulSoup(p.read_text(errors='ignore'),'html.parser')
 for a in s.find_all('a',href=True):
  h=a['href'].strip(); hrefs.append((p,h,a.get_text(' ',strip=True)[:60]))
  if h in ('','#'): empty.append((p.relative_to(root),h,a.get_text(' ',strip=True)))
  if not h or re.match(r'^(https?:|//|mailto:|tel:|whatsapp:|javascript:|#)',h,re.I): continue
  rel=urlparse(urljoin('https://site.test/'+str(p.relative_to(root)),h)).path.lstrip('/')
  q=root/rel
  if not q.exists() and not (root/(rel+'.html')).exists() and not (root/rel/'index.html').exists(): missing.append((str(p.relative_to(root)),h,rel))
 for tag in s.find_all(['script','img','source','iframe'],src=True):
  h=tag['src'].strip()
  if re.match(r'^(https?:|//|data:|blob:)',h,re.I): continue
  rel=urlparse(urljoin('https://site.test/'+str(p.relative_to(root)),h)).path.lstrip('/')
  if not (root/rel).exists(): imagemiss.append((str(p.relative_to(root)),h,rel))
 for tag in s.find_all('link',href=True):
  h=tag['href'].strip()
  if re.match(r'^(https?:|//|data:|blob:|mailto:|tel:)',h,re.I): continue
  rel=urlparse(urljoin('https://site.test/'+str(p.relative_to(root)),h)).path.lstrip('/')
  if not (root/rel).exists() and not (root/(rel+'.html')).exists(): imagemiss.append((str(p.relative_to(root)),h,rel))
 for tag in s.find_all('script',src=True):
  h=tag['src'].strip()
  if re.match(r'^(https?:|//)',h,re.I): continue
  rel=urlparse(urljoin('https://site.test/'+str(p.relative_to(root)),h)).path.lstrip('/')
  if not (root/rel).exists(): scriptmiss.append((str(p.relative_to(root)),h,rel))
# Forms
forms=[]
for p in htmls:
 s=BeautifulSoup(p.read_text(errors='ignore'),'html.parser')
 for f in s.find_all('form'):
  a=(f.get('action') or '').strip()
  if not a: continue
  if not re.match(r'^(https?:|//|javascript:|mailto:)',a,re.I):
   rel=urlparse(urljoin('https://site.test/'+str(p.relative_to(root)),a)).path.lstrip('/')
   if not (root/rel).exists() and not (root/(rel+'.html')).exists(): forms.append((str(p.relative_to(root)),a,rel))
# JS syntax
jserr=[]
for p in root.glob('*.js'):
 r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
 if r.returncode:jserr.append((p.name,r.stderr))
# recovered
rec=json.loads((root/'data/recovered-articles.json').read_text())
rec_missing=[]; rec_short=[]
for x in rec:
 slug=x.get('slug',{}).get('tr',''); p=root/(slug+'.html')
 if not p.exists(): rec_missing.append(slug)
 else:
  s=BeautifulSoup(p.read_text(errors='ignore'),'html.parser'); main=s.find('main'); txt=main.get_text(' ',strip=True) if main else ''
  if len(txt)<600: rec_short.append((slug,len(txt)))
# sitemap
soup=BeautifulSoup((root/'sitemap.xml').read_text(errors='ignore'),'xml'); urls=[u.text for u in soup.find_all('loc')]
# core collision
core={'index','hakkimizda','hizmetler','iletisim','blog','blog-post','saglik-turizmi','404','thank-you','tesekkur','tesekkurler','bedankt','danke','blagodarnost','shukran','faleminderit'}
collisions=[x['slug']['tr'] for x in rec if x['slug']['tr'] in core]
print('HTML',len(htmls))
print('anchors',len(hrefs),'empty',len(empty),'missing local',len(missing))
print('asset/link refs missing',len(imagemiss),'scripts missing',len(scriptmiss),'forms missing',len(forms),'JS syntax errors',len(jserr))
print('recovered',len(rec),'missing html',len(rec_missing),'short',rec_short,'core collisions',collisions)
print('sitemap',len(urls),'unique',len(set(urls)),'recovered-in-sitemap',len({'https://drerolvural.com/'+x['slug']['tr'] for x in rec}&set(urls)))
for name,arr in [('missing',missing),('asset',imagemiss),('scripts',scriptmiss),('forms',forms),('empty',empty)]:
 if arr: print('\n',name,arr[:50])
# worker map vs rec
wt=(root/'_worker.js').read_text(errors='ignore')
map_block=wt[wt.find('const extensionlessTargetFiles'):wt.find('const extensionlessTargetFiles')+20000]
map_keys=set(re.findall(r'\["(/[^"]+)",\s*"([^"]+\.html)"\]',map_block))
map_keys={k for k,v in map_keys}
expected={'/'+x['slug']['tr'] for x in rec}
print('worker article mappings',len(map_keys),'missing',len(expected-map_keys),'extra',len(map_keys-expected))
# route simulations for rec, both slash forms
route_fail=[]
for x in rec:
 slug=x['slug']['tr']
 for path in ['/'+slug,'/'+slug+'/']:
  clean=path.rstrip('/') or '/'
  if clean in expected and (root/(slug+'.html')).exists(): continue
  route_fail.append(path)
print('article route simulation failures',len(route_fail))
