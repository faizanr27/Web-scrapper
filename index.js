import puppeteer from 'puppeteer';

async function giveWebsiteInfo(link) {
    const browser = await puppeteer.launch({
        headless: true,  // Runs in headless mode for faster execution
        args: ['--no-sandbox', '--disable-setuid-sandbox']  // Helps run Puppeteer in environments like cloud functions
    });

    const page = await browser.newPage();

    // Block unnecessary requests (images, stylesheets, fonts) to speed up loading
    // await page.setRequestInterception(true);
    // page.on('request', (req) => {
    //     if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
    //         req.abort();  // Blocks images, fonts, and stylesheets
    //     } else {
    //         req.continue();  // Allows other resources like scripts and HTML to load
    //     }
    // });

    await page.goto(link, { waitUntil: "domcontentloaded" });

    // Extract the title and meta description
    const title = await page.title();
    const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => "N/A");

    // Extract all text content from the body
    const allText = await page.$eval('div', el => el.innerText).catch(() => "N/A");

    // Extract all image URLs
    const imageUrls = await page.$$eval('img', imgs => imgs.map(img => img.src));

    // Extract all links (URLs)
    const links = await page.$$eval('a', anchors => anchors.map(a => a.href));
    const screenShot = await page.screenshot({path: `${title}.png`})

    // Extract favicon URL
    const faviconUrl = await page.$eval('link[rel="icon"], link[rel="shortcut icon"]', el => el.href).catch(() => "N/A");

    // Extract OpenGraph metadata
    const ogMetadata = await page.evaluate(() => {
        const metaTags = document.querySelectorAll('meta[property^="og:"]');
        const metadata = {};
        metaTags.forEach(tag => {
            const property = tag.getAttribute('property').replace('og:', '');
            metadata[property] = tag.getAttribute('content');
        });
        return metadata;
    }).catch(() => ({}));

    // Extract canonical URL
    const canonicalUrl = await page.$eval('link[rel="canonical"]', el => el.href).catch(() => "N/A");

    // Extract all meta tags
    const allMetaTags = await page.evaluate(() => {
        const metaTags = document.querySelectorAll('meta');
        const metaData = {};
        metaTags.forEach(tag => {
            const name = tag.getAttribute('name') || tag.getAttribute('property') || tag.getAttribute('charset');
            if (name) {
                metaData[name] = tag.getAttribute('content') || tag.getAttribute('charset');
            }
        });
        return metaData;
    }).catch(() => ({}));


    await browser.close();

    return {
        title: title,
        description: description,
        allText: allText,
        imageUrls: imageUrls,
        links: links,
        faviconUrl: faviconUrl,
        ogMetadata: ogMetadata,
        canonicalUrl: canonicalUrl,
        allMetaTags: allMetaTags,
    };
}

// Example usage:
(async () => {
    const websiteData = await giveWebsiteInfo("https://dev-blogg.vercel.app/post/679939ef26a41251f6321331");
    console.log("Website Data:", websiteData.allText);
})();