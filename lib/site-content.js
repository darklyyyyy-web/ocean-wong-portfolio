import fs from "fs";
import path from "path";
import { site as defaultSite } from "@/data/site";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const siteContentFile = path.join(process.cwd(), "data", "site-content.json");

const defaultPages = {
  projectsTitle: "拍摄类型",
  projectsIntro: "先选择拍摄大类，再进入每个具体项目。项目文件夹仍然由本地后台自动识别。",
  categoryIntro: "这个大类下的照片会直接显示在这里。你仍然可以在后台用项目文件夹批量管理照片。",
  contactTitle: "联系我",
  contactIntro: "欢迎咨询婚礼、活动、商业、产品或运动拍摄，也可以聊聊长期合作与影像内容制作。",
  aboutEyebrow: "About",
  projectsEyebrow: "Portfolio",
  categoryEyebrow: "Gallery",
  contactEyebrow: "Contact"
};

const defaultContent = {
  meta: defaultSite.meta,
  profile: {
    ...defaultSite.profile,
    chineseName: "王海贵",
    subtitle: "婚礼 / 活动 / 商业 / 产品 / 运动摄影"
  },
  contact: defaultSite.contact,
  categories: defaultSite.categories,
  pages: defaultPages
};

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function mergeCategories(categories = []) {
  const map = new Map(defaultContent.categories.map((category) => [category.title, category]));

  categories.forEach((category) => {
    if (!category?.title) return;
    map.set(category.title, {
      ...map.get(category.title),
      ...category
    });
  });

  return [...map.values()];
}

function mergeSiteContent(content) {
  return {
    meta: {
      ...defaultContent.meta,
      ...(content?.meta || {})
    },
    profile: {
      ...defaultContent.profile,
      ...(content?.profile || {})
    },
    contact: {
      ...defaultContent.contact,
      ...(content?.contact || {})
    },
    categories: mergeCategories(content?.categories),
    pages: {
      ...defaultContent.pages,
      ...(content?.pages || {})
    }
  };
}

export function getLocalSiteContent() {
  return mergeSiteContent(readJson(siteContentFile));
}

export function writeLocalSiteContent(content) {
  const nextContent = mergeSiteContent(content);
  fs.writeFileSync(siteContentFile, `${JSON.stringify(nextContent, null, 2)}\n`, "utf8");
  return nextContent;
}

async function getHostedSiteContent() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return null;
    }

    const [{ data: settings }, { data: categories }] = await Promise.all([
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("categories").select("title, summary, sort_order").order("sort_order", { ascending: true })
    ]);

    if (!settings && (!categories || categories.length === 0)) {
      return null;
    }

    return mergeSiteContent({
      meta: {
        title: settings?.meta_title,
        description: settings?.meta_description
      },
      profile: {
        name: settings?.profile_name,
        chineseName: settings?.profile_chinese_name,
        role: settings?.profile_role,
        subtitle: settings?.profile_subtitle,
        location: settings?.profile_location,
        shortBio: settings?.profile_short_bio,
        about: settings?.profile_about,
        portrait: settings?.profile_portrait
      },
      contact: {
        email: settings?.contact_email,
        phone: settings?.contact_phone,
        wechat: settings?.contact_wechat
      },
      categories: categories || [],
      pages: settings?.pages || {}
    });
  } catch {
    return null;
  }
}

export async function getSiteContent() {
  const hosted = await getHostedSiteContent();
  if (hosted) {
    return hosted;
  }

  return getLocalSiteContent();
}
