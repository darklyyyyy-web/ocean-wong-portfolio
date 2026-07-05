import { NextResponse } from "next/server";
import { deleteHostedProject, saveHostedProject } from "@/lib/hosted-cms";
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
  if (!body?.project || typeof body.project !== "object") {
    return NextResponse.json({ error: "相册数据格式不正确。" }, { status: 400 });
  }

  try {
    const project = await saveHostedProject(body.project);
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json({ error: error.message || "保存失败。" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await requireAdminApiUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "缺少 projectId。" }, { status: 400 });
  }

  try {
    await deleteHostedProject(projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "删除失败。" }, { status: 500 });
  }
}
