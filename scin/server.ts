async function getVQD(query: string): Promise<string> {
    const resp = await fetch(
        `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    );

    const text = await resp.text();

    const match =
        text.match(/vqd="([^"]+)"/) ||
        text.match(/vqd='([^']+)'/) ||
        text.match(/vqd=([^\&]+)/);

    if (!match) {
        throw new Error("Failed to obtain vqd token");
    }

    return match[1];
}

Deno.serve(async (req) => {
    try {
        const url = new URL(req.url);

        const method = (url.searchParams.get("searchmethod") || "web")
            .toLowerCase();

        const query = url.searchParams.get("query");

        if (!query) {
            return Response.json(
                {
                    error: "Missing query parameter"
                },
                { status: 400 }
            );
        }

        if (method === "web") {
            const r = await fetch(
                `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
            );

            const data = await r.json();

            const results: any[] = [];

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
                type: "web",
                query,
                results
            });
        }

        const vqd = await getVQD(query);

        if (method === "images") {
            const r = await fetch(
                `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}`
            );

            const data = await r.json();

            return Response.json({
                type: "images",
                query,
                results: data.results.map((x: any) => ({
                    title: x.title,
                    image: x.image,
                    thumbnail: x.thumbnail,
                    source: x.url
                }))
            });
        }

        if (method === "videos") {
            const r = await fetch(
                `https://duckduckgo.com/v.js?q=${encodeURIComponent(query)}&vqd=${vqd}`
            );

            const data = await r.json();

            return Response.json({
                type: "videos",
                query,
                results: data.results.map((x: any) => ({
                    title: x.title,
                    content: x.content,
                    description: x.description,
                    source: x.url,
                    duration: x.duration
                }))
            });
        }

        return Response.json(
            {
                error: "searchmethod must be web, images, or videos"
            },
            { status: 400 }
        );
    } catch (err) {
        return Response.json(
            {
                error: String(err)
            },
            { status: 500 }
        );
    }
});
