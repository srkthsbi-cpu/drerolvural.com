from pathlib import Path
from bs4 import BeautifulSoup
root=Path('/mnt/data/v14gallerywork')
trust_imgs=[
'https://images.pexels.com/photos/5206923/pexels-photo-5206923.jpeg?cs=srgb&dl=pexels-karola-g-5206923.jpg&fm=jpg',
'https://images.pexels.com/photos/16571733/pexels-photo-16571733.jpeg?cs=srgb&dl=pexels-zandatsu-16571733.jpg&fm=jpg',
'https://images.pexels.com/photos/7108329/pexels-photo-7108329.jpeg?cs=srgb&dl=pexels-pavel-danilyuk-7108329.jpg&fm=jpg',
'https://images.pexels.com/photos/6129147/pexels-photo-6129147.jpeg?cs=srgb&dl=pexels-rdne-6129147.jpg&fm=jpg',
'https://images.pexels.com/photos/12081340/pexels-photo-12081340.jpeg?cs=srgb&dl=pexels-timothy-huliselan-205951426-12081340.jpg&fm=jpg',
'https://images.pexels.com/photos/7108389/pexels-photo-7108389.jpeg?cs=srgb&dl=pexels-pavel-danilyuk-7108389.jpg&fm=jpg']
trust_alts=['Sağlık çalışanı ve hasta iletişimi','Modern hastane ve tıbbi ekipman','Hastane kabul ve yönlendirme','Sağlık ekibi iletişimi','Hasta bakım odası','Klinik ortam ve ekipman']
titles=['Güvenli iletişim','Tıbbi altyapı','Karşılama ve koordinasyon','Ekip iletişimi','Hasta güvenliği','Klinik ortam']
descs=['Hasta ile sağlık ekibi arasında açık, anlaşılır ve güvene dayalı iletişim önemlidir.','Modern tıbbi ekipman ve uygun klinik altyapı, değerlendirme ve bakım sürecinin önemli parçalarıdır.','Uluslararası hastanın hastane içindeki yönlendirme ve koordinasyon sürecini önceden bilmesi belirsizliği azaltır.','Tedavi sürecinde sağlık profesyonelleri arasındaki koordinasyon, bakımın sürekliliğini destekler.','Hasta güvenliği; değerlendirme, izlem ve gerektiğinde hızlı klinik müdahale süreçlerinin birlikte ele alınmasını gerektirir.','Temiz, düzenli ve amaca uygun klinik ortam, tedavi sürecinin fiziksel altyapısını oluşturur.']
for p in root.rglob('*.html'):
    if 'erol_admin' in str(p): continue
    soup=BeautifulSoup(p.read_text(encoding='utf8',errors='ignore'),'html.parser')
    # Remove the decision-support image card showing the doctor again.
    for sec in soup.select('.section-visual'):
        if sec.find('img') and 'doctor-portrait' in sec.find('img').get('src',''):
            sec.decompose()
    # Trust: six unique, context-relevant stock images.
    for sec in soup.select('.trust-cards'):
        cards=sec.find_all('article',recursive=False)
        for i,card in enumerate(cards[:6]):
            im=card.find('img')
            if im:
                im['src']=trust_imgs[i]; im['alt']=trust_alts[i]
            h=card.find('h3'); pp=card.find('p')
            if h: h.string=titles[i]
            if pp: pp.string=descs[i]
        for card in cards[6:]: card.decompose()
    # Ensure project image assets are never repeated within a page.
    seen=set(); next_demo=7
    for img in soup.find_all('img'):
        src=img.get('src','')
        if not src or src.startswith('http') or src in ('logo1.png','logo2.png'): continue
        if src in seen:
            # Replace repeat with next unique local demo asset.
            while True:
                candidate=f'demo-resim-{next_demo}.svg'
                if (root/'international-assets'/candidate).exists():
                    prefix='../' if p.parent!=root else ''
                    new=prefix+'international-assets/'+candidate
                    if new not in seen:
                        break
                next_demo+=1
            img['src']=new
            img['alt']=img.get('alt') or f'Demo visual {next_demo}'
            seen.add(new)
            next_demo+=1
        else:
            seen.add(src)
    p.write_text(str(soup),encoding='utf8')
