import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-auth";
import { renameHostedProjectCategories, saveHostedSiteContent } from "@/lib/hosted-cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await requireAdminApiUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body?.content || typeof body.content !== "object") {
    return NextResponse.json({ error: "网站设置格式不正确。" }, { status: 400 });
  }

  try {
    const content = await saveHostedSiteContent(body.content);
    if (Array.isArray(body.renamePairs) && body.renamePairs.length > 0) {
      await renameHostedProjectCategories(body.renamePairs);
    }
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    return NextResponse.json({ error: error.message || "保存失败。" }, { status: 500 });
  }
}
