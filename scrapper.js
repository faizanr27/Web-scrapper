import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrape(url) {
  let page = null;
  try {
    const browser = await puppeteer.launch({
      headless: true,  // Headless mode for speed
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();

    // Block unnecessary resources (images are needed, so don't block them)
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["stylesheet", "font", "media", "other"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    // Extract text and images in order
    const extractedData = await page.evaluate(() => {
      // Select all relevant elements
      let elements = document.body.querySelectorAll("p, h1, h2, h3, h4, h5, h6, pre, a, img, ul, ol, li, header, code, blockquote");
      let result = [];

      // Define custom styles
      const customClass = 'custom-style';
      const customStyles = 'font-family: Arial, sans-serif; line-height: 1.5; color: #333;';

      // Iterate through each element
      elements.forEach((el) => {
        // // Skip processing if the element is already inside a processed parent (e.g., <li> inside <ul>)

        // Process each element based on its tag name
        if (el.tagName === "P") {
          result.push(
            `<p class="${customClass}" style="${customStyles}">${el.innerText}</p>`
          );
        } else if (el.tagName === "H1") {
          result.push(
            `<h1 class="${customClass}" style="${customStyles}">${el.innerText}</h1>`
          );
        } else if (el.tagName === "H2") {
          result.push(
            `<h2 class="${customClass}" style="${customStyles}">${el.innerText}</h2>`
          );
        } else if (el.tagName === "H3") {
          result.push(
            `<h3 class="${customClass}" style="${customStyles}">${el.innerText}</h3>`
          );
        } else if (el.tagName === "H4") {
          result.push(
            `<h4 class="${customClass}" style="${customStyles}">${el.innerText}</h4>`
          );
        } else if (el.tagName === "H5") {
          result.push(
            `<h5 class="${customClass}" style="${customStyles}">${el.innerText}</h5>`
          );
        } else if (el.tagName === "H6") {
          result.push(
            `<h6 class="${customClass}" style="${customStyles}">${el.innerText}</h6>`
          );
        } else if (el.tagName === "PRE") {
          // Check if there's a <code> element inside the <pre>
          let codeElement = el.querySelector("code");
          if (codeElement) {
            // If <code> exists, use its content
            result.push(
              `<pre style="color: #d1d5db; background-color: #00000080; overflow-x: auto;"><code class="${customClass}" style="${customStyles}">${codeElement.innerText}</code></pre>`
            );
          }
          // } else {
          //   // If no <code> element, use the <pre> content directly
          //   result.push(
          //     `<pre class="${customClass}" style="${customStyles}">${el.innerText}</pre>`
          //   );
          // }
        } else if (el.tagName === "A") {
          result.push(
            `<a class="${customClass}" style="${customStyles}" href="${el.href}" target="_blank">${el.innerText}</a>`
          );
        } else if (el.tagName === "CODE") {
          result.push(
            `<code class="${customClass}" style="${customStyles}">${el.innerText}</code>`
          );
        } else if (el.tagName === "BLOCKQUOTE") {
          result.push(`
            <blockquote class="${customClass}" style="${customStyles};
              font-weight: 500;
              font-style: italic;
              color: var(--tw-prose-quotes);
              border-inline-start-width: .25rem;
              border-inline-start-color: var(--tw-prose-quote-borders);
              quotes: '“' '”' '‘' '’';
              margin-top: 1.6em;
              margin-bottom: 1.6em;
              padding-inline-start: 1em;
            ">${el.innerText}</blockquote>`);
        } else if (el.tagName === "HEADER") {
          result.push(
            `<header class="${customClass}" style="${customStyles}">${el.innerText}</header>`
          );
        } else if (el.tagName === "IMG") {
          result.push(
            `<img src="${el.src}" alt="image" style="max-width:100%"/>`
          );
        } else if (el.tagName === "UL" || el.tagName === "OL") {
          // Handle lists
          let listItems = el.querySelectorAll("li");
          let listContent = Array.from(listItems)
            .map(
              (li) =>
                `<li class="${customClass}" style="${customStyles}">${li.innerText}</li>`
            )
            .join("");
          result.push(
            `<${el.tagName.toLowerCase()} class="${customClass}" style="${customStyles}">${listContent}</${el.tagName.toLowerCase()}>`
          );
        }
      });

      return result.join("");
    });
    // extractedData.forEach((item) => {
    //   if (item.type === "text") {
    //     console.log("📝 Text:", item.content);
    //   } else {
    //     console.log("🖼️ Image:", item.src);
    //   }
    // });

    const htmlContent = `
    <html>
    <head><title>Scraped Data</title></head>
    <body style="font-family:sans-serif; padding:20px;">
      <h2>Extracted Content</h2>
      ${extractedData}
    </body>
    </html>
  `;

  fs.writeFileSync("output.html", htmlContent);
  console.log("✅ Scraped content saved to output.html");

  } catch (error) {
    return { error: error.message };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

(async () => {
  await scrape("https://www.freecodecamp.org/news/web-scraping-in-javascript-with-puppeteer/");
  // console.log("Extracted Data:", JSON.stringify(websiteData, null, 2));
})();
