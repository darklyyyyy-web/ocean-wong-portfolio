import ProjectList from "@/components/ProjectList";
import { decodeCategorySlug, getCategoryGallery } from "@/lib/projects";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { category } = await params;
  const title = decodeCategorySlug(category);

  return {
    title
  };
}

export default async function CategoryPage({ params }) {
  const { category } = await params;
  const title = decodeCategorySlug(category);
  const [projects, site] = await Promise.all([
    getCategoryGallery(category),
    getSiteContent()
  ]);

  return (
    <>
      <section className="section category-heading">
        <p className="eyebrow">{site.pages.categoryEyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="intro">{site.pages.categoryIntro}</p>
      </section>
      {projects.length > 0 ? (
        <section className="section">
          <ProjectList projects={projects} />
        </section>
      ) : (
        <section className="section">
          <p className="empty-note">这个大类下暂时还没有可查看的案例。</p>
        </section>
      )}
    </>
  );
}
