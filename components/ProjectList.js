import Image from "next/image";
import Link from "next/link";

export default function ProjectList({ projects }) {
  return (
    <div className="project-list">
      {projects.map((project, index) => (
        <Link className="project-row" href={project.href} key={project.slug}>
          <div className="project-cover">
            <Image src={project.coverSrc} alt={`${project.title}封面`} fill sizes="(max-width: 760px) 100vw, 68vw" priority={index === 0} />
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
