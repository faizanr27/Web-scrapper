import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());
import fs from "fs/promises";

async function giveWebsiteInfo(url) {
  let browser = null;
  let page = null;
  const content = [];

  try {
    browser = await puppeteer.launch({
      headless: true, // Headless mode for speed
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    page = await browser.newPage();

    // Block unnecessary resources (images are needed, so don't block them)
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (
        ["stylesheet", "font", "media", "other"].includes(req.resourceType()) ||
        req.url().includes("cookie") ||
        req.url().includes("consent")
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    // Extract text and images in order
    const extractedData = await page.evaluate(() => {
      let elements = document.body.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, pre, a, img, ul, ol, li, header, code, blockquote"
      );
      let result = [];
      const customClass = "custom-style";
      const customStyles =
        "font-family: Arial, sans-serif; line-height: 1.5; color: #333;";

      elements = Array.from(elements).filter((el) => !el.closest("footer"));
      elements = Array.from(elements).filter((el) => !el.closest("nav"));

      elements.forEach((el) => {
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
          let codeElement = el.querySelector("code");
          if (codeElement) {
            result.push(
              `<pre style="color:#333; padding:15px; background-color:#f5f5f5; overflow-x: auto; border-radius: 5px; font-family: monospace; font-size: 14px; box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);"><code class="language-shell">${codeElement.innerText}</code></pre>`
            );
          } else {
            result.push(
              `<pre style="color:#333; padding:15px; background-color:#f5f5f5; overflow-x: auto; border-radius: 5px; font-family: monospace; font-size: 14px; box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);">${el.innerText}</pre>`
            );
          }
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

      const title = document.title;
      const body = document.body.innerText;
      const imageUrls = Array.from(document.querySelectorAll("img")).map(
        (img) => img.src
      );

      return { result1: { title, body, imageUrls }, result2: result.join("") };
    });

    const htmlContent = `
      <html>
      <head><title>Scraped Data</title></head>
      <body style="font-family:sans-serif; padding:20px;">
        ${extractedData.result2}
      </body>
      </html>
    `;

    await fs.writeFile("output.html", htmlContent);
    content.push(extractedData.result1);

    try {
      const textContent = `${extractedData.result1.title}\n\n${extractedData.result1.body}\n\n${extractedData.result1.imageUrls}`;
      await fs.writeFile('webpage.txt', textContent, 'utf-8');
      console.log("Plain text with title saved successfully.");
    } catch (error) {
      console.error("Error saving file:", error);
    }

    console.log("✅ Scraped content saved to output.html");
    return content;

  } catch (error) {
    console.error("Error:", error.message);
    return { error: error.message };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (err) {
        console.error("❌ Error closing page:", err.message);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error("❌ Error closing browser:", err.message);
      }
    }
  }
}

export default giveWebsiteInfo;
