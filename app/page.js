import Link from "next/link";
import { getCategories } from "@/lib/projects";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [site, categories] = await Promise.all([
    getSiteContent(),
    getCategories()
  ]);
  const archiveLayouts = [
    "100%",
    "92%",
    "84%",
    "76%",
    "68%"
  ];

  return (
    <section className="index-shell">
      <aside className="index-info">
        <p className="index-small">Ocean Wong Studio</p>
        <div className="index-name-block">
          <h1>{site.profile.name}</h1>
          <p className="index-cn-name">{site.profile.chineseName}</p>
          <p className="index-subtitle">{site.profile.subtitle}</p>
        </div>
        <div className="index-portrait">
          <img src={site.profile.portrait} alt={`${site.profile.name}个人形象`} />
        </div>
        <p>{site.profile.shortBio}</p>
        <dl>
          <div>
            <dt>Base</dt>
            <dd>{site.profile.location}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>{site.contact.email}</dd>
          </div>
          <div>
            <dt>Wechat</dt>
            <dd>{site.contact.wechat}</dd>
          </div>
        </dl>
        <Link className="text-link" href="/about">关于我</Link>
      </aside>

      <div className="index-categories">
        <p className="index-small">Services / Portfolio</p>
        <div className="category-title-list">
          {categories.map((category, index) => (
            <Link
              className="category-title-row"
              href={category.href}
              key={category.title}
              style={{
                "--idle-width": archiveLayouts[index % archiveLayouts.length]
              }}
            >
              {category.coverSrc ? (
                <img className="category-title-image" src={category.coverSrc} alt={`${category.title}封面`} />
              ) : (
                <span className="category-title-empty" aria-hidden="true" />
              )}
              <span className="category-title-index">{String(index + 1).padStart(2, "0")}</span>
              <strong>{category.title}</strong>
              <small>
                <span>ARCHIVE / ROLL {String(index + 1).padStart(2, "0")}</span>
                <span>{category.projectCount} 组照片</span>
              </small>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
