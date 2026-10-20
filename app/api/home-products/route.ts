import { NextResponse } from "next/server";
import { parseHomeProductOffset } from "@/lib/home/products";
import { getHomeProductPage } from "@/lib/home/repository";

export async function GET(request: Request) {
  const offset = parseHomeProductOffset(new URL(request.url).searchParams.get("offset"));
  if (offset === null) return NextResponse.json({ error: "Невалидна страница." }, { status: 400 });
  try {
    return NextResponse.json(await getHomeProductPage(offset), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Продуктите не могат да се заредят." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
