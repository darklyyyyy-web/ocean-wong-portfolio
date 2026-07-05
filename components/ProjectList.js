import Link from "next/link";

export default function ProjectList({ projects }) {
  return (
    <div className="project-list">
      {projects.map((project, index) => (
        <Link className="project-row" href={project.href} key={project.slug}>
          <div className="project-cover">
            <img src={project.coverSrc} alt={`${project.title}封面`} loading={index === 0 ? "eager" : "lazy"} />
          </div>
          <div>
            <p className="project-kicker">{project.category} / {project.year}</p>
            <h2>{project.title}</h2>
            <p>{project.summary}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
