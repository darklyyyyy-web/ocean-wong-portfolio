import { getSiteContent } from "@/lib/site-content";

export const metadata = {
  title: "联系方式"
};

export default async function ContactPage() {
  const site = await getSiteContent();

  return (
    <section className="section-narrow">
      <p className="eyebrow">{site.pages.contactEyebrow}</p>
      <h1 className="page-title">{site.pages.contactTitle}</h1>
      <p className="intro">{site.pages.contactIntro}</p>
      <ul className="contact-list">
        <li>邮箱：<a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></li>
        <li>电话：<a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a></li>
        <li>微信：{site.contact.wechat}</li>
      </ul>
    </section>
  );
}
