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

export default function HostedAdmin({ userEmail }) {
  const router = useRouter();
  const [tab, setTab] = useState("site");
  const [siteContent, setSiteContent] = useState(emptySiteContent());
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [siteStatus, setSiteStatus] = useState("正在读取网站设置...");
  const [projectStatus, setProjectStatus] = useState("正在读取相册...");
  const [loading, setLoading] = useState(true);
  const activeProject = useMemo(() => projects.find((project) => project.id === activeProjectId), [projects, activeProjectId]);

  async function loadBootstrap() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/cms/bootstrap", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("load bootstrap failed");
      }

      const data = await response.json();
      setSiteContent(data.siteContent || emptySiteContent());
      setProjects(data.projects || []);
      setActiveProjectId((current) => current || data.projects?.[0]?.id || "");
      setSiteStatus("网站设置已加载。");
      setProjectStatus(`已读取 ${data.projects?.length || 0} 个线上相册。`);
    } catch {
      setSiteStatus("读取失败，请刷新重试。");
      setProjectStatus("读取失败，请刷新重试。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBootstrap();
  }, []);

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

    setProjectStatus("正在保存相册...");
    const response = await fetch("/api/admin/cms/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project })
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
    const draft = emptyProject(siteContent.categories);
    const newId = await saveProject(draft);
    if (newId) {
      setTab("projects");
    }
  }

  async function deleteProject() {
    if (!activeProjectId) return;
    setProjectStatus("正在删除相册...");

    const response = await fetch(`/api/admin/cms/project?projectId=${encodeURIComponent(activeProjectId)}`, {
      method: "DELETE"
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

    setProjectStatus(`正在上传 ${files.length} 张图片...`);
    const formData = new FormData();
    formData.set("projectId", activeProjectId);
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/admin/cms/upload", {
      method: "POST",
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
    const response = await fetch("/api/admin/cms/image", {
      method: "POST",
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
                <h2>分类与页面文案</h2>
                <p>支持增加分类、修改分类说明，以及作品页和联系页的引导文字。</p>
              </div>
              <div className="admin-form admin-form-grid">
                <label>
                  作品页小标题
                  <input value={siteContent.pages.projectsEyebrow} onChange={(event) => updateSiteSection("pages", "projectsEyebrow", event.target.value)} />
                </label>
                <label>
                  作品页主标题
                  <input value={siteContent.pages.projectsTitle} onChange={(event) => updateSiteSection("pages", "projectsTitle", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  作品页说明
                  <textarea rows="3" value={siteContent.pages.projectsIntro} onChange={(event) => updateSiteSection("pages", "projectsIntro", event.target.value)} />
                </label>
                <label>
                  分类页小标题
                  <input value={siteContent.pages.categoryEyebrow} onChange={(event) => updateSiteSection("pages", "categoryEyebrow", event.target.value)} />
                </label>
                <label>
                  联系页小标题
                  <input value={siteContent.pages.contactEyebrow} onChange={(event) => updateSiteSection("pages", "contactEyebrow", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  分类页说明
                  <textarea rows="3" value={siteContent.pages.categoryIntro} onChange={(event) => updateSiteSection("pages", "categoryIntro", event.target.value)} />
                </label>
                <label>
                  联系页标题
                  <input value={siteContent.pages.contactTitle} onChange={(event) => updateSiteSection("pages", "contactTitle", event.target.value)} />
                </label>
                <label>
                  关于页小标题
                  <input value={siteContent.pages.aboutEyebrow} onChange={(event) => updateSiteSection("pages", "aboutEyebrow", event.target.value)} />
                </label>
                <label className="admin-form-span-2">
                  联系页说明
                  <textarea rows="3" value={siteContent.pages.contactIntro} onChange={(event) => updateSiteSection("pages", "contactIntro", event.target.value)} />
                </label>
              </div>

              <div className="admin-subsection">
                <div className="admin-actions">
                  <button
                    type="button"
                    onClick={() => setSiteContent((current) => ({
                      ...current,
                      categories: [...current.categories, { title: "", summary: "", sortOrder: current.categories.length }]
                    }))}
                  >
                    新增拍摄分类
                  </button>
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
                    </div>
                  ))}
                </div>
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
                      <input value={activeProject.title} onChange={(event) => updateProject("title", event.target.value)} />
                    </label>
                    <label>
                      网址标识
                      <input value={activeProject.slug} onChange={(event) => updateProject("slug", event.target.value)} />
                    </label>
                    <label>
                      拍摄分类
                      <select value={activeProject.category} onChange={(event) => updateProject("category", event.target.value)}>
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

