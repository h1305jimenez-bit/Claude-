import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timer);
    const active = res.status < 400;
    return NextResponse.json({ active, httpStatus: res.status });
  } catch {
    clearTimeout(timer);
    return NextResponse.json({ active: null, httpStatus: null });
  }
}
