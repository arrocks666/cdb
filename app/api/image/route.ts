import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  if (
    !url.startsWith("https://s.alicdn.com/") &&
    !url.startsWith("https://sc02.alicdn.com/")
  ) {
    return new Response("URL not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.alibaba.com/",
      },
      // Cache at fetch level too
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return new Response("Upstream error", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Cache for 30 days on Netlify's CDN + browser
        "Cache-Control": "public, max-age=2592000, s-maxage=2592000, immutable",
        "CDN-Cache-Control": "public, max-age=2592000",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Failed to fetch image", { status: 500 });
  }
}