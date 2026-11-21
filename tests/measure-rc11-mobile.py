import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
base=Path(__file__).parent.parent
p=Path(__file__).parent/'fixtures/rc11-mobile-lesson.html'
def fixture(version):
 import re
 html=p.read_text()
 html=re.sub(r'<link rel="stylesheet" href="../../(.*?)">',lambda m:'<style>'+ (base/m.group(1)).read_text()+'</style>',html)
 html=re.sub(r'<script>const rc11=new URLSearchParams.*?</script>', '', html,flags=re.S)
 html=html.replace('<script src="../../js/features/rc10-teacher-fast-path.js"></script>','<script>'+ (base/'js/features/rc10-teacher-fast-path.js').read_text()+'</script>')
 html=re.sub(r'<script>if\(rc11\).*?</script>', '<script>'+((base/'js/features/rc11-teacher-flow.js').read_text() if version=='rc11' else '')+'</script>', html)
 return html
async def measure(browser, version):
 page=await browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 failures=[]
 page.on('pageerror',lambda error:failures.append(str(error)))
 await page.set_content(fixture(version),wait_until='load')
 if version=='rc11':await page.add_style_tag(content=(base/'css/platform/rc11-teacher-flow.css').read_text())
 await page.wait_for_timeout(400)
 before=await page.evaluate('''() => {const btn=document.querySelector('#ia30NextButton');const rect=btn.getBoundingClientRect();const card=document.querySelector('#ia21SessionStudent').getBoundingClientRect();return {nextTop:Math.round(rect.top),nextVisible:rect.top>=0&&rect.bottom<=innerHeight-68,studentCardHeight:Math.round(card.height),scrollY:Math.round(scrollY),saveButtonCount:document.querySelectorAll('#saveSendSessionBtn').length}}''')
 await page.locator('#ia30NextButton').click()
 after=await page.evaluate("() => ({step:document.querySelector('#pg-session').dataset.iaSessionStep,scrollY:Math.round(scrollY)})")
 await page.screenshot(path=f'/mnt/data/IMAM-RC11-MOBILE-{version.upper()}.png',full_page=False)
 await page.close()
 return {'before':before,'after':after,'javascriptErrors':failures}
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
  r={v:await measure(browser,v) for v in ('rc10','rc11')}
  await browser.close()
  print(json.dumps(r,ensure_ascii=False,indent=2))
  assert all(not v['javascriptErrors'] for v in r.values()),'browser JS failure'
  assert r['rc11']['before']['studentCardHeight']<r['rc10']['before']['studentCardHeight'],'compact card must shrink'
  assert r['rc11']['before']['nextVisible'],'next button should be visible without scrolling'
  assert r['rc11']['before']['saveButtonCount']==1,'single send'
  assert r['rc10']['after']['step']==r['rc11']['after']['step']=='new','navigation must preserve stage flow'
asyncio.run(main())
