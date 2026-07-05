import Link from "next/link";
import { getCategories } from "@/lib/projects";
import { getSiteContent } from "@/lib/site-content";

export const metadata = {
  title: "作品集"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectsPage() {
  const [site, categories] = await Promise.all([
    getSiteContent(),
    getCategories()
  ]);

  return (
    <>
      <section className="section">
        <p className="eyebrow">{site.pages.projectsEyebrow}</p>
        <h1 className="page-title">{site.pages.projectsTitle}</h1>
        <p className="intro">{site.pages.projectsIntro}</p>
      </section>
      <section className="section category-grid">
        {categories.map((category, index) => (
          <Link className="category-card" href={category.href} key={category.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{category.title}</h2>
            <p>{category.summary}</p>
            <small>{category.projectCount} 个项目</small>
          </Link>
        ))}
      </section>
    </>
  );
}
