import { adminEmail } from "@/lib/supabase/config";
import { supabaseBucket } from "@/lib/supabase/config";
import { getLocalProjectBySlug, getLocalProjects } from "@/lib/projects";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalSiteContent } from "@/lib/site-content";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const maxUploadFileSize = 15 * 1024 * 1024;
const localStoragePathPrefix = "local:";

function normalizeCategories(categories, fallbackCategories) {
  const source = Array.isArray(categories) && categories.length > 0
    ? categories
    : fallbackCategories;
  const seen = new Set();

  return source.reduce((list, category, index) => {
    const title = (category?.title || "").trim();
    if (!title || seen.has(title)) {
      return list;
    }

    seen.add(title);
    list.push({
      title,
      summary: category.summary || "",
      sortOrder: category.sortOrder ?? category.sort_order ?? index
    });
    return list;
  }, []);
}

function deriveCategoriesFromProjects(projects = []) {
  const seen = new Set();

  return projects.reduce((list, project) => {
    const title = (project?.category || "").trim();
    if (!title || seen.has(title)) {
      return list;
    }

    seen.add(title);
    list.push({
      title,
      summary: project.summary || "",
      sortOrder: list.length
    });
    return list;
  }, []);
}

function normalizeSiteContent(content) {
  const fallback = getLocalSiteContent();

  return {
    meta: {
      title: content?.meta?.title || fallback.meta.title,
      description: content?.meta?.description || fallback.meta.description
    },
    profile: {
      name: content?.profile?.name || fallback.profile.name,
      chineseName: content?.profile?.chineseName || fallback.profile.chineseName,
      role: content?.profile?.role || fallback.profile.role,
      subtitle: content?.profile?.subtitle || fallback.profile.subtitle,
      location: content?.profile?.location || fallback.profile.location,
      shortBio: content?.profile?.shortBio || fallback.profile.shortBio,
      about: content?.profile?.about || fallback.profile.about,
      portrait: content?.profile?.portrait || fallback.profile.portrait
    },
    contact: {
      email: content?.contact?.email || fallback.contact.email,
      phone: content?.contact?.phone || fallback.contact.phone,
      wechat: content?.contact?.wechat || fallback.contact.wechat
    },
    categories: normalizeCategories(content?.categories, fallback.categories),
    pages: {
      ...fallback.pages,
      ...(content?.pages || {})
    }
  };
}

function toProjectRecord(project) {
  return {
    slug: (project.slug || project.title || `project-${Date.now()}`).trim(),
    title: (project.title || "").trim(),
    category: (project.category || "").trim(),
    year: project.year || "",
    location: project.location || "",
    summary: project.summary || "",
    description: project.description || "",
    published: project.published !== false
  };
}

function formatHostedProject(project) {
  return {
    id: project.id,
    source: "hosted",
    slug: project.slug,
    title: project.title,
    category: project.category,
    year: project.year || "",
    location: project.location || "",
    summary: project.summary || "",
    description: project.description || "",
    coverSrc: project.cover_image_url || project.project_images?.[0]?.public_url || "",
    published: project.published !== false,
    images: (project.project_images || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => ({
        id: image.id,
        src: image.public_url,
        storagePath: image.storage_path,
        alt: image.alt || `${project.title}作品图`,
        width: image.width,
        height: image.height
      }))
  };
}

function mergeAdminProjects(localProjects, hostedProjects) {
  const localMap = new Map(localProjects.map((project) => [project.slug, project]));
  const map = new Map(localProjects.map((project) => [project.slug, {
    ...project,
    localSourceAvailable: true,
    localImageCount: project.images.length
  }]));

  hostedProjects.forEach((project) => {
    const localProject = localMap.get(project.slug);
    map.set(project.slug, {
      ...project,
      localSourceAvailable: Boolean(localProject),
      localImageCount: localProject?.images?.length || 0
    });
  });

  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
}

function isManagedStoragePath(storagePath) {
  return Boolean(storagePath && !String(storagePath).startsWith(localStoragePathPrefix));
}

export async function getHostedAdminBootstrap() {
  const supabase = await getSupabaseServerClient();
  const [{ data: settings }, { data: categories }, { data: projects }, { data: userData }, localProjects] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("categories").select("title, summary, sort_order").order("sort_order", { ascending: true }),
    supabase
      .from("projects")
      .select("id, slug, title, category, year, location, summary, description, cover_image_url, published, created_at, project_images(id, public_url, storage_path, alt, width, height, sort_order)")
      .order("created_at", { ascending: false }),
    supabase.auth.getUser()
    ,
    Promise.resolve(getLocalProjects({ includeDrafts: true }))
  ]);
  const hostedProjects = (projects || []).map(formatHostedProject);

  const content = normalizeSiteContent({
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
    categories: normalizeCategories(
      [
        ...(categories || []).map((category) => ({
          title: category.title,
          summary: category.summary || "",
          sortOrder: category.sort_order || 0
        })),
        ...deriveCategoriesFromProjects(hostedProjects),
        ...deriveCategoriesFromProjects(localProjects)
      ],
      getLocalSiteContent().categories
    ),
    pages: settings?.pages || {}
  });
  const authUser = userData?.data?.user || null;

  return {
    user: authUser ? {
      email: authUser.email,
      isAdmin: !adminEmail || authUser.email === adminEmail
    } : null,
    siteContent: content,
    projects: mergeAdminProjects(localProjects, hostedProjects)
  };
}

export async function saveHostedSiteContent(content) {
  const supabase = await getSupabaseServerClient();
  const nextContent = normalizeSiteContent(content);
  const categoriesToSave = normalizeCategories(nextContent.categories, []);

  const { error: siteError } = await supabase.from("site_settings").upsert({
    id: 1,
    meta_title: nextContent.meta.title,
    meta_description: nextContent.meta.description,
    profile_name: nextContent.profile.name,
    profile_chinese_name: nextContent.profile.chineseName,
    profile_role: nextContent.profile.role,
    profile_subtitle: nextContent.profile.subtitle,
    profile_location: nextContent.profile.location,
    profile_short_bio: nextContent.profile.shortBio,
    profile_about: nextContent.profile.about,
    profile_portrait: nextContent.profile.portrait,
    contact_email: nextContent.contact.email,
    contact_phone: nextContent.contact.phone,
    contact_wechat: nextContent.contact.wechat,
    pages: nextContent.pages
  });

  if (siteError) {
    throw siteError;
  }

  await supabase.from("categories").delete().gte("sort_order", 0);

  if (categoriesToSave.length > 0) {
    const { error: categoryError } = await supabase.from("categories").insert(
      categoriesToSave.map((category, index) => ({
        title: category.title,
        summary: category.summary,
        sort_order: category.sortOrder ?? index
      }))
    );

    if (categoryError) {
      throw categoryError;
    }
  }

  return {
    ...nextContent,
    categories: categoriesToSave
  };
}

export async function renameHostedProjectCategories(renamePairs = []) {
  const supabase = await getSupabaseServerClient();
  const pairs = renamePairs
    .map((item) => ({
      from: (item?.from || "").trim(),
      to: (item?.to || "").trim()
    }))
    .filter((item) => item.from && item.to && item.from !== item.to);

  for (const pair of pairs) {
    const { error } = await supabase
      .from("projects")
      .update({ category: pair.to })
      .eq("category", pair.from);

    if (error) {
      throw error;
    }
  }
}

export async function saveHostedProject(project) {
  const supabase = await getSupabaseServerClient();
  const nextProject = toProjectRecord(project);

  const payload = {
    slug: nextProject.slug,
    title: nextProject.title,
    category: nextProject.category,
    year: nextProject.year,
    location: nextProject.location,
    summary: nextProject.summary,
    description: nextProject.description,
    published: nextProject.published
  };

  let query = supabase.from("projects").upsert(payload, { onConflict: "slug" }).select("id").single();

  if (project.id) {
    query = supabase.from("projects").update(payload).eq("id", project.id).select("id").single();
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function importLocalProjectToHosted(projectSlug) {
  const localProject = getLocalProjectBySlug(projectSlug, { includeDrafts: true });
  if (!localProject) {
    throw new Error("没有找到这个网站现有相册，请刷新后重试。");
  }

  const supabase = await getSupabaseServerClient();
  const payload = toProjectRecord(localProject);
  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .upsert(payload, { onConflict: "slug" })
    .select("id")
    .single();

  if (projectError) {
    throw projectError;
  }

  const projectId = projectRow.id;
  const { data: existingImages, error: existingImagesError } = await supabase
    .from("project_images")
    .select("id, storage_path")
    .eq("project_id", projectId);

  if (existingImagesError) {
    throw existingImagesError;
  }

  if (existingImages?.length) {
    const managedPaths = existingImages
      .map((image) => image.storage_path)
      .filter(isManagedStoragePath);

    if (managedPaths.length) {
      await supabase.storage.from(supabaseBucket).remove(managedPaths);
    }

    await supabase.from("project_images").delete().eq("project_id", projectId);
  }

  const imageRows = localProject.images.map((image, index) => ({
    project_id: projectId,
    storage_path: `${localStoragePathPrefix}${localProject.folderName}/${image.fileName}`,
    public_url: image.src,
    alt: image.alt || `${localProject.title}作品图`,
    width: image.width,
    height: image.height,
    sort_order: index
  }));

  if (imageRows.length > 0) {
    const { error: imageInsertError } = await supabase.from("project_images").insert(imageRows);
    if (imageInsertError) {
      throw imageInsertError;
    }
  }

  const coverImage = localProject.images.find((image) => image.fileName === localProject.cover) || localProject.images[0];
  const coverSrc = coverImage?.src || "";

  const { error: coverError } = await supabase
    .from("projects")
    .update({ cover_image_url: coverSrc || null })
    .eq("id", projectId);

  if (coverError) {
    throw coverError;
  }

  return {
    projectId
  };
}

export async function deleteHostedProject(projectId) {
  const supabase = await getSupabaseServerClient();
  const { data: images } = await supabase.from("project_images").select("storage_path").eq("project_id", projectId);

  const managedPaths = (images || []).map((image) => image.storage_path).filter(isManagedStoragePath);

  if (managedPaths.length) {
    await supabase.storage.from(supabaseBucket).remove(managedPaths);
  }

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    throw error;
  }
}

export async function uploadHostedImages(projectId, files) {
  const supabase = await getSupabaseServerClient();
  const uploaded = [];
  const { data: existingImages } = await supabase
    .from("project_images")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const startingSortOrder = (existingImages?.[0]?.sort_order ?? -1) + 1;

  for (const [index, file] of files.entries()) {
    if (!allowedImageTypes.has(file.type)) {
      throw new Error(`不支持上传 ${file.name}。请上传 JPG、PNG、WebP、AVIF 或 GIF 图片。`);
    }

    if (file.size > maxUploadFileSize) {
      throw new Error(`${file.name} 超过 15MB，请压缩后再上传。`);
    }

    const safeName = file.name.replace(/\s+/g, "-");
    const storagePath = `${projectId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(supabaseBucket).upload(storagePath, file, {
      contentType: file.type,
      upsert: false
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabase.storage.from(supabaseBucket).getPublicUrl(storagePath);
    const { data: imageRow, error: rowError } = await supabase
      .from("project_images")
      .insert({
        project_id: projectId,
        storage_path: storagePath,
        public_url: publicData.publicUrl,
        alt: safeName,
        sort_order: startingSortOrder + index
      })
      .select("id, public_url, storage_path, alt")
      .single();

    if (rowError) {
      throw rowError;
    }

    uploaded.push({
      id: imageRow.id,
      src: imageRow.public_url,
      storagePath: imageRow.storage_path,
      alt: imageRow.alt
    });
  }

  const { data: project } = await supabase.from("projects").select("cover_image_url").eq("id", projectId).single();
  if (!project?.cover_image_url && uploaded[0]) {
    await supabase.from("projects").update({ cover_image_url: uploaded[0].src }).eq("id", projectId);
  }

  return uploaded;
}

export async function setHostedProjectCover(projectId, imageId) {
  const supabase = await getSupabaseServerClient();
  const { data: image, error } = await supabase
    .from("project_images")
    .select("public_url")
    .eq("id", imageId)
    .eq("project_id", projectId)
    .single();

  if (error) {
    throw error;
  }

  const { error: updateError } = await supabase.from("projects").update({ cover_image_url: image.public_url }).eq("id", projectId);
  if (updateError) {
    throw updateError;
  }

  return image.public_url;
}

export async function deleteHostedImage(imageId) {
  const supabase = await getSupabaseServerClient();
  const { data: image, error } = await supabase.from("project_images").select("id, project_id, storage_path, public_url").eq("id", imageId).single();

  if (error) {
    throw error;
  }

  if (isManagedStoragePath(image.storage_path)) {
    await supabase.storage.from(supabaseBucket).remove([image.storage_path]);
  }
  await supabase.from("project_images").delete().eq("id", imageId);

  const { data: project } = await supabase.from("projects").select("cover_image_url").eq("id", image.project_id).single();
  if (project?.cover_image_url === image.public_url) {
    const { data: nextImage } = await supabase
      .from("project_images")
      .select("public_url")
      .eq("project_id", image.project_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    await supabase.from("projects").update({ cover_image_url: nextImage?.public_url || null }).eq("id", image.project_id);
  }

  return image.project_id;
}

export async function reorderHostedProjectImages(projectId, imageIds = []) {
  const supabase = await getSupabaseServerClient();
  const normalizedIds = imageIds.filter(Boolean);

  const { data: images, error } = await supabase
    .from("project_images")
    .select("id")
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  const existingIds = new Set((images || []).map((image) => image.id));
  if (normalizedIds.length !== existingIds.size || normalizedIds.some((id) => !existingIds.has(id))) {
    throw new Error("图片排序数据不完整，请刷新后重试。");
  }

  for (const [index, imageId] of normalizedIds.entries()) {
    const { error: updateError } = await supabase
      .from("project_images")
      .update({ sort_order: index })
      .eq("id", imageId)
      .eq("project_id", projectId);

    if (updateError) {
      throw updateError;
    }
  }
}
