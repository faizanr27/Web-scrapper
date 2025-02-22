import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';


puppeteer.use(StealthPlugin());

async function giveYoutubeInfo(link) {
    const browser = await puppeteer.launch({
        headless: true, // Set to true for headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        await page.goto(link, { waitUntil: "networkidle0" });
        console.log("Page loaded");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ✅ Get the title properly
        let title = await page.evaluate(() => {
            return document.querySelector("#title > h1")?.textContent.trim() || "N/A";
        });

        console.log("Video Title:", title);

        // ✅ Click the "Show More" button if available
        try {
            await page.waitForSelector("#bottom-row", { timeout: 5000 });
            console.log("Found Show More button");
            await new Promise(resolve => setTimeout(resolve, 1000));

            await page.click("#bottom-row > #description");
            console.log("Clicked Show More");

            await page.waitForSelector("#description-inner", { timeout: 5000 });
        } catch (error) {
            console.warn("Show More button not found or not clickable:", error);
        }


        await new Promise(resolve => setTimeout(resolve, 1000));

        // ✅ Extract video description
        let description = await page.evaluate(() => {
            return document.querySelector("#description-inline-expander > yt-attributed-string > span > span:nth-child(1)")?.textContent.trim() || "N/A";
        });

        if (description === "N/A") {
            description = await page.evaluate(() => {
                return document.querySelector("meta[name='description']")?.content || "N/A";
            });
        }

        console.log("Video Description:", description);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ✅ Click the transcript button
        try {
            await page.waitForSelector('#primary-button', { timeout: 5000 });
            console.log("Found Transcript Button");

            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise(resolve => setTimeout(resolve, 1000));

            await page.evaluate(() => {
                document.querySelector('#primary-button > ytd-button-renderer > yt-button-shape > button')?.click();
            });

            await page.waitForSelector('#segments-container', { timeout: 5000 }); // Ensure transcript is loaded
        } catch (error) {
            console.warn("Transcript button not found or not clickable:", error);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        // ✅ Extract transcript segments
        let content = await page.$$eval(
            '#segments-container > ytd-transcript-segment-renderer',
            elements => elements.map(el =>
                {
                    let text = el.querySelector('div > yt-formatted-string')?.textContent.trim() || "N/A";
                    let timestamp = el.querySelector('div > div > div')?.textContent.trim() || "N/A";
                    // const finalText = `${timestamp}: ${text}\n`;
                    // return finalText
                    return {timestamp, text}
                }
            )
        );
        const timeToSeconds = (time) => {
            let parts = time.split(':').map(Number);
            return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
        };

        // Grouping transcript segments into 18-second chunks
        let groupedTranscript = [];
        let tempText = "";
        let startTime = content.length ? content[0].timestamp : "0:00";
        let endTime = "";

        content.forEach((segment, index) => {
            let currentTime = timeToSeconds(segment.timestamp);
            let startTimeSec = timeToSeconds(startTime);

            if (currentTime - startTimeSec < 18) {
                // Continue appending text within 18-sec window
                tempText += " " + segment.text;
            } else {
                // Store the completed chunk and start a new one
                endTime = content[index - 1]?.timestamp || segment.timestamp;
                groupedTranscript.push(`${startTime} - ${endTime}: ${tempText.trim()}`);
                startTime = segment.timestamp; // Start new chunk
                tempText = segment.text; // Reset text
            }
        });

        // Push the last remaining chunk
        if (tempText) {
            endTime = content[content.length - 1]?.timestamp || startTime;
            groupedTranscript.push(`${startTime} - ${endTime}: ${tempText.trim()}`);
        }

        console.log(groupedTranscript.join("\n"));

        const finalText = `Title: ${title}\n\nDescription: ${description}\n\nTranscript:\n${groupedTranscript.join("\n")}`;
        // await fs.writeFile('transcript.txt', finalText, 'utf-8');
        console.log("Transcript saved successfully.");

        console.log("All transcript segments:", groupedTranscript.join("\n"));
        await new Promise(resolve => setTimeout(resolve, 2000));

        await browser.close();

        return {
            title,
            description,
            content
        };
    } catch (error) {
        console.error("Error during page navigation or interaction:", error);
        await browser.close();
        return {
            title: "N/A",
            description: "N/A",
            content: "N/A"
        };
    }
}
export default giveYoutubeInfo
// Example usage:
// (async () => {
//     const websiteData = await giveYoutubeInfo("https://youtu.be/CfadZa96V-s?si=Fw9VxolMHGn3iPgJ");
//     console.log("Website Data:", websiteData);
// })();
