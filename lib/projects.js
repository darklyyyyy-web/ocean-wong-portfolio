import fs from "fs";
import path from "path";
import { getSiteContent } from "@/lib/site-content";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const projectImagesRoot = process.env.PROJECT_IMAGES_ROOT || (
  fs.existsSync(path.join(process.cwd(), "public", "images", "projects-optimized"))
    ? "projects-optimized"
    : "projects"
);
const projectsDir = path.join(process.cwd(), "public", "images", projectImagesRoot);
const metadataFile = path.join(process.cwd(), "data", "projects.json");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);
const defaultImageSize = { width: 1600, height: 1067 };

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function isImage(fileName) {
  return imageExtensions.has(path.extname(fileName).toLowerCase());
}

function publicImagePath(folderName, fileName) {
  return `/${["images", projectImagesRoot, folderName, fileName].map(encodeURIComponent).join("/")}`;
}

function decodeSlug(slug) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function listProjectFolders() {
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  return fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((item) => item.isDirectory() && !item.name.startsWith("."))
    .map((item) => item.name)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function listImages(folderName) {
  const folderPath = path.join(projectsDir, folderName);

  return fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((item) => item.isFile() && isImage(item.name))
    .map((item) => item.name)
    .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
}

function readImageSize(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  try {
    if (extension === ".svg") {
      const svg = fs.readFileSync(filePath, "utf8");
      const viewBox = svg.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
      if (viewBox) {
        return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
      }
    }

    if (extension === ".png") {
      const buffer = fs.readFileSync(filePath);
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    if (extension === ".jpg" || extension === ".jpeg") {
      const buffer = fs.readFileSync(filePath);
      let offset = 2;

      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);

        if (marker >= 0xc0 && marker <= 0xc3) {
          return {
            width: buffer.readUInt16BE(offset + 7),
            height: buffer.readUInt16BE(offset + 5)
          };
        }

        offset += 2 + length;
      }
    }
  } catch {
    return defaultImageSize;
  }

  return defaultImageSize;
}

function pickCover(images, metadataCover) {
  if (metadataCover && images.includes(metadataCover)) {
    return metadataCover;
  }

  const namedCover = images.find((fileName) => path.basename(fileName, path.extname(fileName)).toLowerCase() === "cover");
  return namedCover || images[0] || "";
}

function mergeProjects(localProjects, hostedProjects) {
  const map = new Map(localProjects.map((project) => [project.slug, project]));

  hostedProjects.forEach((project) => {
    map.set(project.slug, project);
  });

  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
}

export function categorySlug(title) {
  return encodeURIComponent(title);
}

export function decodeCategorySlug(slug) {
  return decodeSlug(slug);
}

export function projectHref(category, slug) {
  return `/projects/${categorySlug(category)}/${encodeURIComponent(slug)}`;
}

export function getProjectMetadata() {
  return readJson(metadataFile);
}

export function writeProjectMetadata(metadata) {
  fs.writeFileSync(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

export function getLocalProjects({ includeDrafts = false } = {}) {
  const metadata = getProjectMetadata();

  return listProjectFolders()
    .map((folderName) => {
      const images = listImages(folderName);
      const item = metadata[folderName] || {};
      const cover = pickCover(images, item.cover);

      return {
        id: `local-${folderName}`,
        source: "local",
        slug: folderName,
        folderName,
        title: item.title || folderName,
        category: item.category || "拍摄项目",
        year: item.year || "",
        location: item.location || "",
        summary: item.summary || "从文件夹自动识别的作品项目，可在本地后台补充简介。",
        description: item.description || item.summary || "这个项目来自本地作品文件夹。你可以在本地后台里补充完整项目说明。",
        cover,
        coverSrc: cover ? publicImagePath(folderName, cover) : "",
        categoryHref: `/projects/${categorySlug(item.category || "拍摄项目")}`,
        href: projectHref(item.category || "拍摄项目", folderName),
        published: item.published !== false,
        images: images.map((fileName) => ({
          id: `local-${folderName}-${fileName}`,
          ...readImageSize(path.join(projectsDir, folderName, fileName)),
          fileName,
          src: publicImagePath(folderName, fileName),
          alt: `${item.title || folderName} ${fileName}`
        }))
      };
    })
    .filter((project) => includeDrafts || project.published)
    .filter((project) => project.images.length > 0);
}

export function getLocalProjectBySlug(slug, options) {
  const decodedSlug = decodeSlug(slug);
  return getLocalProjects(options).find((project) => project.slug === decodedSlug);
}

export function getLocalProjectImageFilePath(folderName, fileName) {
  return path.join(projectsDir, folderName, fileName);
}

async function getHostedProjects({ includeDrafts = false } = {}) {
  if (!hasSupabaseConfig()) {
    return [];
  }

  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return [];
    }

    let query = supabase
      .from("projects")
      .select("id, slug, title, category, year, location, summary, description, cover_image_url, published, project_images(id, public_url, alt, sort_order, width, height)")
      .order("created_at", { ascending: false });

    if (!includeDrafts) {
      query = query.eq("published", true);
    }

    const { data } = await query;

    return (data || [])
      .map((project) => {
        const images = (project.project_images || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((image) => ({
            id: image.id,
            src: image.public_url,
            alt: image.alt || `${project.title}作品图`,
            width: image.width || defaultImageSize.width,
            height: image.height || defaultImageSize.height
          }));

        return {
          id: project.id,
          source: "hosted",
          slug: project.slug,
          title: project.title,
          category: project.category,
          year: project.year || "",
          location: project.location || "",
          summary: project.summary || "",
          description: project.description || project.summary || "",
          coverSrc: project.cover_image_url || images[0]?.src || "",
          categoryHref: `/projects/${categorySlug(project.category)}`,
          href: projectHref(project.category, project.slug),
          published: project.published !== false,
          images
        };
      })
      .filter((project) => project.images.length > 0);
  } catch {
    return [];
  }
}

export async function getProjects(options = {}) {
  const [localProjects, hostedProjects] = await Promise.all([
    Promise.resolve(getLocalProjects(options)),
    getHostedProjects(options)
  ]);

  return mergeProjects(localProjects, hostedProjects);
}

export async function getCategories() {
  const [site, projects] = await Promise.all([
    getSiteContent(),
    getProjects()
  ]);

  return site.categories.map((category) => {
    const categoryProjects = projects.filter((project) => project.category === category.title);

    return {
      ...category,
      slug: category.title,
      href: `/projects/${categorySlug(category.title)}`,
      projectCount: categoryProjects.length,
      coverSrc: categoryProjects[0]?.coverSrc || ""
    };
  });
}

export async function getProjectBySlug(slug, options) {
  const decodedSlug = decodeSlug(slug);
  const projects = await getProjects(options);
  return projects.find((project) => project.slug === decodedSlug);
}

export async function getProjectsByCategory(category, options) {
  const decodedCategory = decodeCategorySlug(category);
  const projects = await getProjects(options);
  return projects.filter((project) => project.category === decodedCategory);
}

export async function getCategoryGallery(category, options) {
  const projects = await getProjectsByCategory(category, options);

  return projects.map((project) => ({
    id: project.id,
    slug: project.slug,
    title: project.title,
    category: project.category,
    year: project.year,
    location: project.location,
    summary: project.summary,
    description: project.description,
    coverSrc: project.coverSrc,
    href: project.href,
    categoryHref: project.categoryHref,
    images: project.images
  }));
}
