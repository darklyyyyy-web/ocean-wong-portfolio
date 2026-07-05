import { NextResponse } from "next/server";
import { getSiteContent, writeLocalSiteContent } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdminEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_ADMIN === "true";
}

export async function GET() {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    content: await getSiteContent()
  });
}

export async function POST(request) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const nextContent = body.content;

  if (!nextContent || typeof nextContent !== "object" || Array.isArray(nextContent)) {
    return NextResponse.json({ error: "保存失败：网站内容格式不正确。" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    content: writeLocalSiteContent(nextContent)
  });
}
