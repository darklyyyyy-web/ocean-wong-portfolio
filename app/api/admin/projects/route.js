import { NextResponse } from "next/server";
import { getProjectMetadata, getProjects, writeProjectMetadata } from "@/lib/projects";

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
    projects: await getProjects({ includeDrafts: true }),
    metadata: getProjectMetadata()
  });
}

export async function POST(request) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const nextMetadata = body.metadata;

  if (!nextMetadata || typeof nextMetadata !== "object" || Array.isArray(nextMetadata)) {
    return NextResponse.json({ error: "保存失败：项目数据格式不正确。" }, { status: 400 });
  }

  writeProjectMetadata(nextMetadata);

  return NextResponse.json({
    ok: true,
    projects: await getProjects({ includeDrafts: true }),
    metadata: getProjectMetadata()
  });
}
