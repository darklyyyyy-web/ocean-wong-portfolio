import Link from "next/link";
import { notFound } from "next/navigation";
import { decodeCategorySlug, getProjectBySlug } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { project } = await params;
  const currentProject = await getProjectBySlug(project);

  if (!currentProject) {
    return {
      title: "案例不存在"
    };
  }

  return {
    title: currentProject.title
  };
}

export default async function ProjectDetailPage({ params }) {
  const { category, project } = await params;
  const categoryTitle = decodeCategorySlug(category);
  const currentProject = await getProjectBySlug(project);

  if (!currentProject || currentProject.category !== categoryTitle) {
    notFound();
  }

  return (
    <>
      <section className="detail-hero">
        <p className="project-kicker">
          <Link href={currentProject.categoryHref}>{categoryTitle}</Link>
          {" / "}
          {currentProject.year || "未填写年份"}
        </p>
        <h1 className="detail-title">{currentProject.title}</h1>
        <div className="detail-meta">
          <span>{currentProject.location || "地点待补充"}</span>
          <span>{currentProject.images.length} 张照片</span>
          <span>{currentProject.published === false ? "未公开" : "公开展示中"}</span>
        </div>
        {currentProject.summary ? <p className="detail-lead">{currentProject.summary}</p> : null}
        {currentProject.description && currentProject.description !== currentProject.summary ? (
          <p className="detail-lead">{currentProject.description}</p>
        ) : null}
      </section>

      <section className="free-gallery">
        {currentProject.images.map((image) => (
          <figure className="free-image" key={image.id || image.src}>
            <img src={image.src} alt={image.alt} loading="lazy" />
          </figure>
        ))}
      </section>
    </>
  );
}
