import express from "express";
import cors from "cors";
import giveWebsiteInfo from "./WebsiteScrapper.js";
import giveTweetInfo from "./Tweet.js";
import giveYoutubeInfo from "./Youtube.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(`${process.env.GEMINI_API_KEY}`);
const model1 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const model2 = genAI.getGenerativeModel({ model: "text-embedding-004" });

// Store embeddings with metadata
const allMemories = [];

async function createEmbeddings(content) {
    const result = await model2.embedContent(content.trim());
    return result.embedding.values;
}
export async function createQueryEmbeddings(query){
    const result = await model2.embedContent(query.trim());
    return result.embedding.values
}

function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, v1, i) => sum + v1 * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
    return dotProduct / (magnitude1 * magnitude2);
}

// Detect URL type
function detectUrlType(url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        return "youtube";
    } else if (url.includes("twitter.com") || url.includes("x.com")) {
        return "tweet";
    } else {
        return "website";
    }
}

// Process URL and store embeddings
app.post("/process-url", async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "URL is required" });

        const type = detectUrlType(url);
        let result;

        if (type === "youtube") {
            result = await giveYoutubeInfo(url);
        } else if (type === "tweet") {
            result = await giveTweetInfo(url);
        } else {
            result = await giveWebsiteInfo(url);
        }

        // console.log(result)

        let content;
        if (Array.isArray(result) && result.length > 0 ) {
            const firstItem = result[0]; // Extract the first object from the array

            if(type ==="website"){
                content = `${firstItem.title || ""} ${firstItem.body || ""}`;
            }


        }
        else if (type === "youtube") {
            content = `${result.title || ""} ${result.description || ""} ${result.content?.map(item => item.text).join("\n") || ""}`;
        } else if (type === "tweet") {
            content = `${result.description || ""} by ${result.creatorName || ""}`;  // Fix: Use creatorName
        }
        else {
            content = "N/A"; // Default if the result is empty
        }

        console.log("Final Content:", content);// Debugging log



        const embeddings = await createEmbeddings(JSON.stringify(content).trim());
        allMemories.push({ url, content, embeddings });

        res.json({ message: "Embeddings stored", url, result });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});


// Query embeddings and find the most relevant content
app.post("/query-embeddings", async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "Query is required" });

        const queryEmbeddings = await createQueryEmbeddings(query);

        // Create array of memories with similarity scores
        const memoryEmbeddingScore = allMemories.map((memory) => ({
            ...memory,
            score: cosineSimilarity(memory.embeddings, queryEmbeddings),
        }));

        // Sort in descending order of similarity
        memoryEmbeddingScore.sort((a, b) => b.score - a.score);

        // Filter top 10 relevant memories with score > 0.55
        const memoriesToBeSent = memoryEmbeddingScore
            .slice(0, 10)
            .filter((memory) => memory.score > 0.55)
            .map((memory) => {
                const tempMemory = memory;
                delete tempMemory.embeddings;
                delete tempMemory.score;
                return tempMemory;
            });

        // Find best match from stored embeddings
        let bestMatch = null;
        let highestSimilarity = -1;

        for (const item of allMemories) {
            const similarity = cosineSimilarity(queryEmbeddings, item.embeddings);
            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = item;
            }
        }

        if (!bestMatch || !bestMatch.content || bestMatch.content.title === "N/A") {
            return res.json({ message: "No relevant content found", memories: memoriesToBeSent });
        }
        // console.log({best : bestMatch})

        const prompt = `You are an AI assistant. Given the user's query and the best matching content, generate a concise and meaningful response.
                        User Query: "${query}"
                        Relevant Content: "${bestMatch.content || ""}"
                        Provide a clear and informative summary based on the relevant content.`;


        const result = await model1.generateContent(prompt);
        const summary = result.response.candidates[0]?.content || "No summary found";

        res.json({ summary, bestMatch });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
