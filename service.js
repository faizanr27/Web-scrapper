import express from "express";
import cors from "cors";
import giveWebsiteInfo from "./WebsiteScrapper.js";
import giveTweetInfo from "./Tweet.js";
import giveYoutubeInfo from "./Youtube.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

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

app.post("/process-url", async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }

        const type = detectUrlType(url);
        let result;

        if (type === "youtube") {
            result = await giveYoutubeInfo(url);
        } else if (type === "tweet") {
            result = await giveTweetInfo(url);
        } else if (type === "website") {
            result = await giveWebsiteInfo(url);
        } else {
            return res.status(400).json({ error: "Unknown URL type" });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
