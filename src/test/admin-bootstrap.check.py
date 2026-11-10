import asyncio,json,os
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':1800})
  page=await context.new_page()
  with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f: minted=json.load(f)
  await page.goto('http://localhost:8080')
  await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[minted['storage_key'],json.dumps(minted['session'])])
  result=await page.evaluate('''async () => {
    const {supabase}=await import('/src/integrations/supabase/client.ts');
    const cases=[['MUIGAID.GATHIA@GMAIL.COM','2026-11-10T06:08:00Z',true],['muigaid.gathia@gmail.com',null,false],['other@gmail.com','2026-11-10T06:08:00Z',false],['coffeechampionsassociation@gmail.com','2026-11-10T06:08:00Z',true]];
    const outcomes=[];
    for(const [email,confirmed,expected] of cases){
      const {data,error}=await supabase.rpc('is_confirmed_bootstrap_admin',{account_email:email,confirmed_at:confirmed});
      outcomes.push(!error && data===expected);
    }
    return outcomes;
  }''')
  print('Verified email, unverified denial, unrelated email denial, association preservation:',result)
  assert all(result)
  await browser.close()
asyncio.run(main())
