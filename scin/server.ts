Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    const query = url.searchParams.get("query");
    const searchMethod =
      (url.searchParams.get("searchmethod") || "web").toLowerCase();

    if (!query) {
      return Response.json(
        {
          error: "Missing query parameter",
        },
        { status: 400 },
      );
    }

    let categories = "general";

    switch (searchMethod) {
      case "web":
        categories = "general";
        break;

      case "images":
        categories = "images";
        break;

      case "videos":
        categories = "videos";
        break;

      default:
        return Response.json(
          {
            error: "searchmethod must be web, images, or videos",
          },
          { status: 400 },
        );
    }

    const response = await fetch(
      `https://search.sapti.me/search?q=${
        encodeURIComponent(query)
      }&categories=${categories}&format=json`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      },
    );

    if (!response.ok) {
      return Response.json(
        {
          error: `Search server returned ${response.status}`,
        },
        { status: 500 },
      );
    }

    const data = await response.json();

    const results = (data.results || []).map((r: any) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      description: r.content ?? "",
      thumbnail: r.thumbnail ?? "",
      source: r.engine ?? "",
    }));

    return Response.json({
      query,
      type: searchMethod,
      count: results.length,
      results,
    });
  } catch (err) {
    return Response.json(
      {
        error: String(err),
      },
      { status: 500 },
    );
  }
});
