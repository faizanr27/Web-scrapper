import puppeteer from 'puppeteer';

async function giveWebsiteInfo(link) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
    } else {
        req.continue();
    }
  });

  await page.goto(link, { waitUntil: "domcontentloaded" });

  const titlee=await page.title()
  const descriptionn=await page.$eval('meta[name="description"]',el=>el.content).catch(()=>"N/A")
  const logoUrl1=await page.$eval('meta[name="og:image"',el=>el.content).catch(()=>undefined)
  const logoUrl2=await page.$eval('meta[name="twitter:image"',el=>el.content).catch(()=>undefined)

  await browser.close()
  return {title:titlee,description:descriptionn,logoUrl:logoUrl1||logoUrl2||"N/A"}
}

(async () => {
  const websiteData = await giveWebsiteInfo("https://dev-blogg.vercel.app/post/679939ef26a41251f6321331");
  console.log("Website Data:", websiteData);
})();