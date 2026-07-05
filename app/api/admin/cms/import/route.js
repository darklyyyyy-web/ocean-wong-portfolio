import { NextResponse } from "next/server";
import { importLocalProjectToHosted } from "@/lib/hosted-cms";
import { requireAdminApiUser } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await requireAdminApiUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const slug = (body?.slug || "").trim();

  if (!slug) {
    return NextResponse.json({ error: "缺少相册标识。" }, { status: 400 });
  }

  try {
    const result = await importLocalProjectToHosted(slug);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "导入失败。" }, { status: 500 });
  }
}
