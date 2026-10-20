#!/usr/bin/env python3
"""Static interface baseline. This is NOT a rendered-device audit.
Run: python scripts/measure-ui.py --root . --out review/current.json
Run: python scripts/measure-ui.py --zip /path/to/beta8.zip --out review/baseline.json
"""
import argparse,csv,json,re,zipfile
from pathlib import Path
from bs4 import BeautifulSoup
ap=argparse.ArgumentParser();ap.add_argument('--root');ap.add_argument('--zip');ap.add_argument('--out',required=True);ap.add_argument('--inventory')
a=ap.parse_args();root=Path(a.root or '.')
zipf=zipfile.ZipFile(a.zip) if a.zip else None
names=zipf.namelist() if zipf else []
pre=names[0].split('/')[0]+'/' if zipf else ''
def get(name):
 try:return zipf.read(pre+name).decode('utf-8') if zipf else (root/name).read_text(encoding='utf-8')
 except(KeyError,FileNotFoundError):return ''
html=get('index.html');soup=BeautifulSoup(html,'html.parser')
cssnames=[]
for tag in soup.find_all('link',rel='stylesheet'):
 url=tag.get('href','').split('?')[0];
 if url and url not in cssnames:cssnames.append(url)
css='\n'.join(get(name) for name in cssnames)
buttons=soup.find_all('button');ids=[t.get('id','') for t in soup.find_all(attrs={'id':True})]
css_colors=re.findall(r'#[0-9a-fA-F]{3,8}\b',css)
metrics={'mode':'static code inspection, no browser computed CSS','css_links':len(cssnames),'css_total_bytes':sum(len(get(name).encode('utf-8')) for name in cssnames),'css_important':css.count('!important'),'css_color_tokens_total':len(css_colors),'css_hex_distinct':len(set(x.lower() for x in css_colors)),'css_font_sizes_distinct':len(set(re.findall(r'font-size\s*:\s*([^;\}]+)',css))),'css_radius_distinct':len(set(re.findall(r'border-radius\s*:\s*([^;\}]+)',css))),'css_z_index_distinct':len(set(re.findall(r'z-index\s*:\s*([^;\}]+)',css))),'inline_styles':len(soup.find_all(attrs={'style':True})),'inline_onclick':len(soup.find_all(attrs={'onclick':True})),'buttons_in_index':len(buttons),'buttons_without_class':sum(not b.get('class') for b in buttons),'pages_static':len(soup.select('.pg[id]')),'duplicate_ids':sorted(set(k for k in ids if ids.count(k)>1))}
for pageid in ['pg-session','pg-settings','pg-compare']:
 page=soup.select_one('#'+pageid)
 metrics[pageid]={'buttons':len(page.select('button')) if page else 0,'inputs':len(page.select('input,select,textarea')) if page else 0}
if a.inventory:
 rows=[]
 for t in soup.find_all(['button','input','select','textarea']):
  cur=t
  while cur and not (cur.name=='div' and 'pg' in (cur.get('class') or [])):cur=cur.parent
  page=cur.get('id') if cur else 'shared'
  label=' '.join(t.stripped_strings)[:100] or t.get('aria-label') or t.get('placeholder') or ''
  handler=t.get('onclick') or t.get('onchange') or t.get('oninput') or ''
  cls=' '.join(t.get('class',[]))
  typ='danger' if re.search(r'btn-red|delete|حذف|مسح|إلغاء الحساب',str(label)+' '+handler,re.I) else ('primary' if re.search(r'btn-g\b|saveSession|ابدأ',cls+' '+handler+' '+label) else 'secondary')
  rows.append({'page':page,'tag':t.name,'id':t.get('id',''),'text_or_label':label,'class':cls,'handler':handler,'role_estimate':typ,'aria_label':t.get('aria-label',''),'has_inline_style':int(t.has_attr('style'))})
 dest=Path(a.inventory);dest.parent.mkdir(parents=True,exist_ok=True)
 with dest.open('w',encoding='utf-8-sig',newline='') as fd:
  writer=csv.DictWriter(fd,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
metrics['source']=a.zip if zipf else str(root)
out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(metrics,ensure_ascii=False,indent=2))
