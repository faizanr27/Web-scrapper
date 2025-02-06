import giveWebsiteInfo from "./WebsiteScrapper.js";
import giveTweetInfo from "./Tweet.js";
import giveYoutubeInfo from "./Youtube.js";

// Function to detect the type of URL
function detectUrlType(url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        return "youtube";
    } else if (url.includes("twitter.com") || url.includes("x.com")) {
        return "tweet";
    } else {
        return "website";
    }
}

// Function to process a given URL
async function processUrl(url) {
    const type = detectUrlType(url);

    if (type === "youtube") {
        return await giveYoutubeInfo(url);
    } else if (type === "tweet") {
        return await giveTweetInfo(url);
    } else if (type === "website") {
        return await giveWebsiteInfo(url);
    } else {
        return { error: "Unknown URL type" };
    }
}

// Example URLs
const urls = [
    "https://x.com/__faizanr__/status/1885052479689429001",
    "https://youtu.be/G9VbtcsPKT0?si=4bm2AmUj6dnz_NIY",
    "https://hacktogsoc.vercel.app/roadmap"
];

// Process all URLs dynamically
const results = await Promise.all(urls.map(processUrl));

console.log(results);
