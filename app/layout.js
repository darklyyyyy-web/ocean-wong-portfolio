import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSiteContent } from "@/lib/site-content";

export async function generateMetadata() {
  const site = await getSiteContent();

  return {
    title: {
      default: site.meta.title,
      template: `%s | ${site.profile.name}`
    },
    description: site.meta.description
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
