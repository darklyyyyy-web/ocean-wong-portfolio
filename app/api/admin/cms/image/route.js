import { NextResponse } from "next/server";
import { deleteHostedImage, deleteHostedImages, reorderHostedProjectImages, setHostedProjectCover } from "@/lib/hosted-cms";
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

  if (body?.action === "cover") {
    if (!body.projectId || !body.imageId) {
      return NextResponse.json({ error: "缺少封面参数。" }, { status: 400 });
    }

    try {
      const coverSrc = await setHostedProjectCover(body.projectId, body.imageId);
      return NextResponse.json({ ok: true, coverSrc });
    } catch (error) {
      return NextResponse.json({ error: error.message || "设置封面失败。" }, { status: 500 });
    }
  }

  if (body?.action === "delete") {
    if (!body.imageId) {
      return NextResponse.json({ error: "缺少图片参数。" }, { status: 400 });
    }

    try {
      const projectId = await deleteHostedImage(body.imageId);
      return NextResponse.json({ ok: true, projectId });
    } catch (error) {
      return NextResponse.json({ error: error.message || "删除失败。" }, { status: 500 });
    }
  }

  if (body?.action === "deleteMany") {
    if (!body.projectId || !Array.isArray(body.imageIds) || body.imageIds.length === 0) {
      return NextResponse.json({ error: "缺少批量删除参数。" }, { status: 400 });
    }

    try {
      const result = await deleteHostedImages(body.projectId, body.imageIds);
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      return NextResponse.json({ error: error.message || "批量删除失败。" }, { status: 500 });
    }
  }

  if (body?.action === "reorder") {
    if (!body.projectId || !Array.isArray(body.imageIds) || body.imageIds.length === 0) {
      return NextResponse.json({ error: "缺少图片排序参数。" }, { status: 400 });
    }

    try {
      await reorderHostedProjectImages(body.projectId, body.imageIds);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: error.message || "排序失败。" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "不支持的操作。" }, { status: 400 });
}
