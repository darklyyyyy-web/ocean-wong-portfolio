import { adminEmail } from "@/lib/supabase/config";
import { supabaseBucket } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalSiteContent } from "@/lib/site-content";

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

export async function getHostedAdminBootstrap() {
  const supabase = await getSupabaseServerClient();
  const [{ data: settings }, { data: categories }, { data: projects }, { data: userData }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("categories").select("title, summary, sort_order").order("sort_order", { ascending: true }),
    supabase
      .from("projects")
      .select("id, slug, title, category, year, location, summary, description, cover_image_url, published, created_at, project_images(id, public_url, storage_path, alt, width, height, sort_order)")
      .order("created_at", { ascending: false }),
    supabase.auth.getUser()
  ]);

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
    categories: (categories || []).map((category) => ({
      title: category.title,
      summary: category.summary || "",
      sortOrder: category.sort_order || 0
    })),
    pages: settings?.pages || {}
  });

  return {
    user: userData.data.user ? {
      email: userData.data.user.email,
      isAdmin: !adminEmail || userData.data.user.email === adminEmail
    } : null,
    siteContent: content,
    projects: (projects || []).map((project) => ({
      id: project.id,
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
    }))
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

export async function deleteHostedProject(projectId) {
  const supabase = await getSupabaseServerClient();
  const { data: images } = await supabase.from("project_images").select("storage_path").eq("project_id", projectId);

  if (images?.length) {
    await supabase.storage.from(supabaseBucket).remove(images.map((image) => image.storage_path));
  }

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    throw error;
  }
}

export async function uploadHostedImages(projectId, files) {
  const supabase = await getSupabaseServerClient();
  const uploaded = [];

  for (const file of files) {
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
        alt: safeName
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
  const { data: image, error } = await supabase.from("project_images").select("public_url").eq("id", imageId).single();

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

  await supabase.storage.from(supabaseBucket).remove([image.storage_path]);
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
