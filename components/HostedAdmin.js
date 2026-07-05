"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function emptySiteContent() {
  return {
    meta: { title: "", description: "" },
    profile: {
      name: "",
      chineseName: "",
      role: "",
      subtitle: "",
      location: "",
      shortBio: "",
      about: "",
      portrait: ""
    },
    contact: { email: "", phone: "", wechat: "" },
    categories: [],
    pages: {
      projectsTitle: "",
      projectsIntro: "",
      categoryIntro: "",
      contactTitle: "",
      contactIntro: "",
      aboutEyebrow: "",
      projectsEyebrow: "",
      categoryEyebrow: "",
      contactEyebrow: ""
    }
  };
}

function emptyProject(categories) {
  return {
    id: "",
    slug: "",
    title: "",
    category: categories[0]?.title || "",
    year: "",
    location: "",
    summary: "",
    description: "",
    published: true,
    coverSrc: "",
    images: []
  };
}

function isDraftProject(project) {
  return Boolean(project?.id && project.id.startsWith("draft-"));
}

export default function HostedAdmin({ userEmail, initialSiteContent = null, initialProjects = [], initialStatus = "" }) {
  const router = useRouter();
  const [tab, setTab] = useState("site");
  const [siteContent, setSiteContent] = useState(initialSiteContent || emptySiteContent());
  const [projects, setProjects] = useState(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [siteStatus, setSiteStatus] = useState(
    initialStatus || (initialSiteContent ? "网站设置已加载。" : "正在读取网站设置...")
  );
  const [projectStatus, setProjectStatus] = useState(
    initialStatus || (initialSiteContent ? `已读取 ${initialProjects.length || 0} 个线上相册。` : "正在读取相册...")
  );
  const [loading, setLoading] = useState(!initialSiteContent && !initialStatus);
  const activeProject = useMemo(() => projects.find((project) => project.id === activeProjectId), [projects, activeProjectId]);
  const categoryUsage = useMemo(() => {
    const usage = new Map();
    projects.forEach((project) => {
      const key = (project.category || "").trim();
      if (!key) return;
      usage.set(key, (usage.get(key) || 0) + 1);
    });
    return usage;
  }, [projects]);

  async function loadBootstrap() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/cms/bootstrap", {
        cache: "no-store",
        credentials: "include"
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "读取后台内容失败。");
      }

      const data = await response.json();
      setSiteContent(data.siteContent || emptySiteContent());
      setProjects(data.projects || []);
      setActiveProjectId((current) => current || data.projects?.[0]?.id || "");
      setSiteStatus("网站设置已加载。");
      setProjectStatus(`已读取 ${data.projects?.length || 0} 个线上相册。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取失败，请刷新重试。";
      setSiteStatus(message);
      setProjectStatus(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialSiteContent && !initialStatus) {
      loadBootstrap();
    }
  }, []);

  useEffect(() => {
    if (!activeProjectId && projects[0]?.id) {
      setActiveProjectId(projects[0].id);
    }
  }, [activeProjectId, projects]);

  function updateSiteSection(section, field, value) {
    setSiteContent((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value
      }
    }));
  }

  function updateCategory(index, field, value) {
    setSiteContent((current) => ({
      ...current,
      categories: current.categories.map((category, categoryIndex) => (
        categoryIndex === index
          ? { ...category, [field]: value }
          : category
      ))
    }));
  }

  function updateProject(field, value) {
    setProjects((current) => current.map((project) => (
      project.id === activeProjectId
        ? { ...project, [field]: value }
        : project
    )));
  }

  async function saveSite() {
    setSiteStatus("正在保存网站设置...");
    const response = await fetch("/api/admin/cms/site", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: siteContent })
    });

    const data = await response.json();
    if (!response.ok) {
      setSiteStatus(data.error || "保存失败。");
      return;
    }

    setSiteContent(data.content);
    setSiteStatus("网站设置已保存。");
    router.refresh();
  }

  async function saveProject(project = activeProject) {
    if (!project) return;
    const title = (project.title || "").trim();
    const category = (project.category || "").trim();

    if (!title) {
      setProjectStatus("请先填写相册标题，再保存相册。");
      return null;
    }

    if (!category) {
      setProjectStatus("请先选择拍摄分类，再保存相册。");
      return null;
    }

    setProjectStatus("正在保存相册...");
    const response = await fetch("/api/admin/cms/project", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: isDraftProject(project)
          ? { ...project, id: "" }
          : project
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setProjectStatus(data.error || "保存失败。");
      return null;
    }

    await loadBootstrap();
    setActiveProjectId(data.project.id);
    setProjectStatus("相册已保存。");
    return data.project.id;
  }

  async function createProject() {
    const draftId = `draft-${Date.now()}`;
    const draft = { ...emptyProject(siteContent.categories), id: draftId };
    setProjects((current) => [draft, ...current]);
    setActiveProjectId(draftId);
    setTab("projects");
    setProjectStatus("已创建一个未保存的相册草稿。先填写标题和分类，再点“保存当前相册”。");
  }

  async function deleteProject() {
    if (!activeProjectId) return;
    if (isDraftProject(activeProject)) {
      const remainingProjects = projects.filter((project) => project.id !== activeProjectId);
      setProjects(remainingProjects);
      setActiveProjectId(remainingProjects[0]?.id || "");
      setProjectStatus("草稿相册已移除。");
      return;
    }
    setProjectStatus("正在删除相册...");

    const response = await fetch(`/api/admin/cms/project?projectId=${encodeURIComponent(activeProjectId)}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await response.json();
    if (!response.ok) {
      setProjectStatus(data.error || "删除失败。");
      return;
    }

    await loadBootstrap();
    setProjectStatus("相册已删除。");
  }

  async function uploadFiles(event) {
    const files = [...(event.target.files || [])];
    if (!activeProjectId || files.length === 0) return;
    if (isDraftProject(activeProject)) {
      setProjectStatus("请先保存当前相册，再上传图片。");
      event.target.value = "";
      return;
    }

    setProjectStatus(`正在上传 ${files.length} 张图片...`);
    const formData = new FormData();
    formData.set("projectId", activeProjectId);
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/admin/cms/upload", {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      setProjectStatus(data.error || "上传失败。");
      return;
    }

    await loadBootstrap();
    setActiveProjectId(activeProjectId);
    setProjectStatus("图片已上传。");
    event.target.value = "";
  }

  async function setCover(imageId) {
    const response = await fetch("/api/admin/cms/image", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cover", projectId: activeProjectId, imageId })
    });

    const data = await response.json();
    if (!response.ok) {
      setProjectStatus(data.error || "设置封面失败。");
      return;
    }

    setProjects((current) => current.map((project) => (
      project.id === activeProjectId
        ? { ...project, coverSrc: data.coverSrc }
        : project
    )));
    setProjectStatus("封面已更新。");
    router.refresh();
  }

  async function deleteImage(imageId) {
    setProjectStatus("正在删除图片...");
    const response = await fetch("/api/admin/cms/image", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", imageId })
    });

    const data = await response.json();
    if (!response.ok) {
      setProjectStatus(data.error || "删除失败。");
      return;
    }

    await loadBootstrap();
    setActiveProjectId(data.projectId);
    setProjectStatus("图片已删除。");
  }

  function addCategory() {
    setSiteContent((current) => ({
      ...current,
      categories: [...current.categories, { title: "", summary: "", sortOrder: current.categories.length }]
    }));
    setSiteStatus("已新增一个分类草稿。填写名称后点击“保存网站设置”即可生效。");
  }

  function deleteCategory(index) {
    const category = siteContent.categories[index];
    const title = (category?.title || "").trim();
    const usedCount = title ? (categoryUsage.get(title) || 0) : 0;

    if (usedCount > 0) {
      setSiteStatus(`“${title}” 仍有 ${usedCount} 个相册在使用，先把这些相册改到别的分类后再删除。`);
      return;
    }

    setSiteContent((current) => ({
      ...current,
      categories: current.categories
        .filter((_, categoryIndex) => categoryIndex !== index)
        .map((item, order) => ({ ...item, sortOrder: order }))
    }));
    setSiteStatus(title ? `已移除分类“${title}”，记得保存网站设置。` : "已移除空白分类草稿，记得保存网站设置。");
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <section className="admin-shell">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Online CMS</p>
          <h1>线上管理后台</h1>
          <p className="admin-note">你现在可以直接在网页中上传图片、维护图片库、设置封面，并管理全站文案。</p>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={loadBootstrap}>刷新内容</button>
          <button type="button" onClick={signOut}>退出登录</button>
        </div>
      </div>

      <p className="admin-status">当前账号：{userEmail}</p>

      <div className="admin-tabs" role="tablist" aria-label="后台功能">
        <button type="button" className={tab === "site" ? "active" : ""} onClick={() => setTab("site")}>网站设置</button>
        <button type="button" className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}>相册与图片库</button>
      </div>

      {loading ? (
        <p className="admin-status">正在加载后台内容...</p>
      ) : tab === "site" ? (
        <>
          <div className="admin-actions">
            <button type="button" className="primary" onClick={saveSite}>保存网站设置</button>
          </div>
          <p className="admin-status">{siteStatus}</p>

          <div className="admin-stack">
            <section className="admin-card">
              <div className="admin-card-header">
                <h2>拍摄分类管理</h2>
                <p>这里可以直接新增、改名或删除拍摄分类。改完后点击上方“保存网站设置”即可生效。</p>
              </div>
              <div className="admin-actions">
                <button type="button" onClick={addCategory}>新增拍摄分类</button>
              </div>
              <div className="admin-category-list">
                {siteContent.categories.map((category, index) => (
                  <div className="admin-category-card" key={`${category.title}-${index}`}>
                    <label>
                      分类名称
                      <input value={category.title} onChange={(event) => updateCategory(index, "title", event.target.value)} />
                    </label>
                    <label>
                      分类说明
                      <textarea rows="3" value={category.summary} onChange={(event) => updateCategory(index, "summary", event.target.value)} />
                    </label>
                    <div className="admin-actions">
                      <span className="admin-note">
                        {category.title?.trim()
                          ? `当前有 ${categoryUsage.get(category.title.trim()) || 0} 个相册使用这个分类`
                          : "这是一个还没命名的分类草稿"}
                      </span>
                      <button type="button" onClick={() => deleteCategory(index)}>删除这个分类</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card-header">
                <h2>首页与个人信息</h2>
                <p>支持直接修改主标题、次标题、简介、联系方式和头像链接。</p>
              </div>
              <div className="admin-form admin-form-grid">
                <label>
                  英文名 / 主标题
                  <input value={siteContent.profile.name} onChange={(event) => updateSiteSection("profile", "name", event.target.value)} />
                </label>
                <label>
                  中文名
                  <input value={siteContent.profile.chineseName} onChange={(event) => updateSiteSection("profile", "chineseName", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  主标题下次标题
                  <input value={siteContent.profile.subtitle} onChange={(event) => updateSiteSection("profile", "subtitle", event.target.value)} />
                </label>
                <label>
                  身份标签
                  <input value={siteContent.profile.role} onChange={(event) => updateSiteSection("profile", "role", event.target.value)} />
                </label>
                <label>
                  所在地
                  <input value={siteContent.profile.location} onChange={(event) => updateSiteSection("profile", "location", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  首页简介
                  <textarea rows="4" value={siteContent.profile.shortBio} onChange={(event) => updateSiteSection("profile", "shortBio", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  关于页介绍
                  <textarea rows="6" value={siteContent.profile.about} onChange={(event) => updateSiteSection("profile", "about", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  头像图片地址
                  <input value={siteContent.profile.portrait} onChange={(event) => updateSiteSection("profile", "portrait", event.target.value)} />
                </label>
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card-header">
                <h2>网站基础信息与联系方式</h2>
                <p>浏览器标题、页面描述、邮箱电话和微信都可以在这里改。</p>
              </div>
              <div className="admin-form admin-form-grid">
                <label className="admin-form-span-2">
                  网站标题
                  <input value={siteContent.meta.title} onChange={(event) => updateSiteSection("meta", "title", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  网站描述
                  <textarea rows="3" value={siteContent.meta.description} onChange={(event) => updateSiteSection("meta", "description", event.target.value)} />
                </label>
                <label>
                  邮箱
                  <input value={siteContent.contact.email} onChange={(event) => updateSiteSection("contact", "email", event.target.value)} />
                </label>
                <label>
                  电话
                  <input value={siteContent.contact.phone} onChange={(event) => updateSiteSection("contact", "phone", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  微信
                  <input value={siteContent.contact.wechat} onChange={(event) => updateSiteSection("contact", "wechat", event.target.value)} />
                </label>
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card-header">
                <h2>页面文案</h2>
                <p>这里控制作品页、分类页、联系页、关于页顶部的标题和说明文字。</p>
              </div>
              <div className="admin-form admin-form-grid">
                <label>
                  作品页小标题
                  <small>显示在 `/projects` 页面顶部，例如 Portfolio。</small>
                  <input value={siteContent.pages.projectsEyebrow} onChange={(event) => updateSiteSection("pages", "projectsEyebrow", event.target.value)} />
                </label>
                <label>
                  作品页主标题
                  <small>显示在 `/projects` 页面顶部的大标题。</small>
                  <input value={siteContent.pages.projectsTitle} onChange={(event) => updateSiteSection("pages", "projectsTitle", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  作品页说明
                  <small>显示在 `/projects` 页面顶部标题下方。</small>
                  <textarea rows="3" value={siteContent.pages.projectsIntro} onChange={(event) => updateSiteSection("pages", "projectsIntro", event.target.value)} />
                </label>
                <label>
                  分类页小标题
                  <small>显示在每个分类详情页顶部，例如 Gallery。</small>
                  <input value={siteContent.pages.categoryEyebrow} onChange={(event) => updateSiteSection("pages", "categoryEyebrow", event.target.value)} />
                </label>
                <label>
                  联系页小标题
                  <small>显示在 `/contact` 页面顶部。</small>
                  <input value={siteContent.pages.contactEyebrow} onChange={(event) => updateSiteSection("pages", "contactEyebrow", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  分类页说明
                  <small>显示在每个分类详情页顶部标题下方。</small>
                  <textarea rows="3" value={siteContent.pages.categoryIntro} onChange={(event) => updateSiteSection("pages", "categoryIntro", event.target.value)} />
                </label>
                <label>
                  联系页标题
                  <small>显示在 `/contact` 页的大标题。</small>
                  <input value={siteContent.pages.contactTitle} onChange={(event) => updateSiteSection("pages", "contactTitle", event.target.value)} />
                </label>
                <label>
                  关于页小标题
                  <small>显示在 `/about` 页面顶部。</small>
                  <input value={siteContent.pages.aboutEyebrow} onChange={(event) => updateSiteSection("pages", "aboutEyebrow", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  联系页说明
                  <small>显示在 `/contact` 页面标题下方。</small>
                  <textarea rows="3" value={siteContent.pages.contactIntro} onChange={(event) => updateSiteSection("pages", "contactIntro", event.target.value)} />
                </label>
              </div>
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="admin-actions">
            <button type="button" onClick={createProject}>新建相册</button>
            <button type="button" className="primary" onClick={() => saveProject()}>保存当前相册</button>
            {activeProject ? <button type="button" onClick={deleteProject}>删除当前相册</button> : null}
          </div>
          <p className="admin-status">{projectStatus}</p>

          <div className="admin-layout">
            <aside className="admin-sidebar" aria-label="线上相册">
              {projects.map((project) => (
                <button key={project.id} type="button" className={project.id === activeProjectId ? "active" : ""} onClick={() => setActiveProjectId(project.id)}>
                  <span>{project.title || "未命名相册"}</span>
                  <small>{project.images.length} 张图片</small>
                </button>
              ))}
            </aside>

            {activeProject ? (
              <div className="admin-panel admin-panel-single">
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2>相册信息</h2>
                    <p>先保存相册信息，再继续上传图片会更稳。</p>
                  </div>
                  <div className="admin-form admin-form-grid">
                    <label>
                      相册标题
                      <small>前台会直接显示这个标题。</small>
                      <input value={activeProject.title} onChange={(event) => updateProject("title", event.target.value)} />
                    </label>
                    <label>
                      网址标识
                      <small>留空也可以，保存时会自动用标题生成。</small>
                      <input value={activeProject.slug} onChange={(event) => updateProject("slug", event.target.value)} />
                    </label>
                    <label>
                      拍摄分类
                      <small>会出现在作品分类列表里。</small>
                      <select value={activeProject.category} onChange={(event) => updateProject("category", event.target.value)}>
                        {!activeProject.category ? <option value="">请选择分类</option> : null}
                        {siteContent.categories.map((category) => (
                          <option key={category.title} value={category.title}>{category.title}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      年份
                      <input value={activeProject.year} onChange={(event) => updateProject("year", event.target.value)} />
                    </label>
                    <label>
                      地点
                      <input value={activeProject.location} onChange={(event) => updateProject("location", event.target.value)} />
                    </label>
                    <label className="admin-checkbox">
                      <input type="checkbox" checked={activeProject.published} onChange={(event) => updateProject("published", event.target.checked)} />
                      在网站显示这个相册
                    </label>
                    <label className="admin-form-span-2">
                      相册简介
                      <textarea rows="3" value={activeProject.summary} onChange={(event) => updateProject("summary", event.target.value)} />
                    </label>
                    <label className="admin-form-span-2">
                      相册详细说明
                      <textarea rows="5" value={activeProject.description} onChange={(event) => updateProject("description", event.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2>图片上传与图片库</h2>
                    <p>可以一次上传多张。点击“设为封面”即可替换列表封面图。</p>
                  </div>

                  <div className="admin-upload-row">
                    <input type="file" accept="image/*" multiple onChange={uploadFiles} />
                  </div>

                  {isDraftProject(activeProject) ? (
                    <p className="admin-note">这个相册还是草稿，先保存一次，下面的图片库和删除功能才会生效。</p>
                  ) : null}

                  {activeProject.coverSrc ? (
                    <div className="admin-preview">
                      <img src={activeProject.coverSrc} alt={`${activeProject.title}封面`} />
                    </div>
                  ) : null}

                  <div className="admin-library">
                    {activeProject.images.map((image) => (
                      <article className="admin-library-card" key={image.id}>
                        <div className="admin-library-thumb">
                          <img src={image.src} alt={image.alt} />
                        </div>
                        <div className="admin-library-actions">
                          <button type="button" onClick={() => setCover(image.id)}>设为封面</button>
                          <button type="button" onClick={() => deleteImage(image.id)}>删除图片</button>
                        </div>
                      </article>
                    ))}
                    {activeProject.images.length === 0 ? (
                      <p className="admin-note">这个相册还没有图片，保存相册后就可以直接上传，也能在这里逐张删除。</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="admin-card">
                <p className="admin-note">还没有线上相册，点击“新建相册”开始。</p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
