import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
    const url = new URL(req.url);

    const searchMethod =
        (url.searchParams.get("searchmethod") || "web").toLowerCase();

    const query = url.searchParams.get("query");

    if (!query) {
        return Response.json({
            error: "Missing query parameter"
        }, { status: 400 });
    }

    try {
        switch (searchMethod) {
            case "web":
                return await webSearch(query);

            case "images":
                return await imageSearch(query);

            case "videos":
                return await videoSearch(query);

            default:
                return Response.json({
                    error: "searchmethod must be web, images or videos"
                }, { status: 400 });
        }
    } catch (err) {
        return Response.json({
            error: String(err)
        }, { status: 500 });
    }
});

async function webSearch(query: string) {
    // Instant Answer API
    const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    );

    const data = await response.json();

    const results = [];

    // Related topics
    for (const topic of data.RelatedTopics || []) {
        if (topic.FirstURL) {
            results.push({
                title: topic.Text,
                url: topic.FirstURL
            });
        }

        if (topic.Topics) {
            for (const t of topic.Topics) {
                results.push({
                    title: t.Text,
                    url: t.FirstURL
                });
            }
        }
    }

    return Response.json({
        query,
        type: "web",
        results
    });
}

async function imageSearch(query: string) {
    const tokenResp = await fetch("https://duckduckgo.com/");
    const html = await tokenResp.text();

    const vqdMatch = html.match(/vqd='([^']+)'/);

    if (!vqdMatch) {
        throw new Error("Couldn't obtain vqd token");
    }

    const vqd = vqdMatch[1];

    const response = await fetch(
        `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}`
    );

    const data = await response.json();

    return Response.json({
        query,
        type: "images",
        results: data.results.map((img: any) => ({
            title: img.title,
            image: img.image,
            thumbnail: img.thumbnail,
            source: img.url
        }))
    });
}

async function videoSearch(query: string) {
    const tokenResp = await fetch("https://duckduckgo.com/");
    const html = await tokenResp.text();

    const vqdMatch = html.match(/vqd='([^']+)'/);

    if (!vqdMatch) {
        throw new Error("Couldn't obtain vqd token");
    }

    const vqd = vqdMatch[1];

    const response = await fetch(
        `https://duckduckgo.com/v.js?q=${encodeURIComponent(query)}&vqd=${vqd}`
    );

    const data = await response.json();

    return Response.json({
        query,
        type: "videos",
        results: data.results.map((video: any) => ({
            title: video.title,
            content: video.content,
            description: video.description,
            source: video.url,
            duration: video.duration
        }))
    });
}
