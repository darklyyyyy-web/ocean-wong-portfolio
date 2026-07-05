import { NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/admin-auth";
import { uploadHostedImages } from "@/lib/hosted-cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await requireAdminApiUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const projectId = formData.get("projectId");
  const files = formData.getAll("files").filter((item) => item instanceof File);

  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "缺少相册 ID。" }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "请选择至少一张图片。" }, { status: 400 });
  }

  try {
    const images = await uploadHostedImages(projectId, files);
    return NextResponse.json({ ok: true, images });
  } catch (error) {
    return NextResponse.json({ error: error.message || "上传失败。" }, { status: 500 });
  }
}
