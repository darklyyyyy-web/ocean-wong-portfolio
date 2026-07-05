import CategoryGallery from "@/components/CategoryGallery";
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
      <CategoryGallery projects={projects} />
    </>
  );
}
