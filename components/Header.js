import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";

export default async function Header() {
  const site = await getSiteContent();

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        {site.profile.name}
      </Link>
      <nav className="nav" aria-label="主导航">
        <Link href="/projects">作品</Link>
        <Link href="/about">关于</Link>
        <Link href="/contact">联系</Link>
      </nav>
    </header>
  );
}
