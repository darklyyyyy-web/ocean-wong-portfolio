import { getSiteContent } from "@/lib/site-content";

export const metadata = {
  title: "关于我"
};

export default async function AboutPage() {
  const site = await getSiteContent();

  return (
    <section className="section about-grid">
      <div className="text-block">
        <p className="eyebrow">{site.pages.aboutEyebrow}</p>
        <h1>{site.profile.name}</h1>
        <p>{site.profile.about}</p>
        <p>{site.profile.location}</p>
      </div>
      <div className="about-image">
        <img src={site.profile.portrait} alt={`${site.profile.name}肖像`} />
      </div>
    </section>
  );
}
