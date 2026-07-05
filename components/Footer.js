import { getSiteContent } from "@/lib/site-content";

export default async function Footer() {
  const site = await getSiteContent();

  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} {site.profile.name}</span>
      <span>{site.profile.role} · {site.profile.location}</span>
    </footer>
  );
}
