import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin());

async function giveTweetInfo(link) {
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


    await page.waitForSelector('div[data-testid="tweetText"]', {visible: true})
    await page.waitForSelector('div[data-testid="User-Name"]', {visible: true})
    const tweet=await page.$eval('div[data-testid="tweetText"]',el=>el.innerText).catch(()=>"N/A")
    const username=await page.$eval('div[data-testid="User-Name"]',el=>el.innerText).catch(()=>"N/A")

    await browser.close();
    return {description:tweet,creatorName:username}
}

export default giveTweetInfo

// (async () => {
//   const websiteData = await giveTweetInfo("https://x.com/Ishansharma7390/status/1887123364243743188");
//   console.log("Website Data:", websiteData);
// })();