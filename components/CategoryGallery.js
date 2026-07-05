"use client";

import { useMemo, useState } from "react";

const batchSize = 3;

export default function CategoryGallery({ projects }) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const visibleProjects = useMemo(() => projects.slice(0, visibleCount), [projects, visibleCount]);
  const remainingCount = Math.max(projects.length - visibleProjects.length, 0);

  if (projects.length === 0) {
    return (
      <section className="section">
        <p className="empty-note">这个大类下暂时还没有显示中的项目。</p>
      </section>
    );
  }

  return (
    <>
      <section className="section project-stack">
        {visibleProjects.map((project, projectIndex) => (
          <article className="project-detail-block" key={project.id || project.slug}>
            <div className="project-detail-head">
              <p className="project-kicker">
                {String(projectIndex + 1).padStart(2, "0")} / {project.year || "未填写年份"}
              </p>
              <h2>{project.title}</h2>
              {project.summary ? <p className="project-detail-summary">{project.summary}</p> : null}
              {project.location ? <p className="project-detail-location">{project.location}</p> : null}
            </div>

            <div className="free-gallery category-photo-flow">
              {project.images.map((image) => (
                <figure className="free-image" key={image.id || image.src}>
                  <img
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                  />
                </figure>
              ))}
            </div>
          </article>
        ))}
      </section>

      {remainingCount > 0 ? (
        <div className="load-more-wrap">
          <button
            className="load-more-button"
            type="button"
            onClick={() => setVisibleCount((current) => current + batchSize)}
          >
            查看更多项目
            <span>还有 {remainingCount} 组</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
