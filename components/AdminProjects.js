"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

function createMetadata(projects, metadata) {
  return Object.fromEntries(
    projects.map((project) => [
      project.slug,
      {
        title: metadata[project.slug]?.title || project.title,
        category: metadata[project.slug]?.category || project.category,
        year: metadata[project.slug]?.year || project.year,
        location: metadata[project.slug]?.location || project.location,
        summary: metadata[project.slug]?.summary || project.summary,
        description: metadata[project.slug]?.description || project.description,
        cover: metadata[project.slug]?.cover || project.cover,
        published: metadata[project.slug]?.published !== false
      }
    ])
  );
}

function emptySiteContent() {
  return {
    meta: {
      title: "",
      description: ""
    },
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
    contact: {
      email: "",
      phone: "",
      wechat: ""
    },
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

export default function AdminProjects() {
  const [tab, setTab] = useState("site");
  const [projects, setProjects] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [siteContent, setSiteContent] = useState(emptySiteContent());
  const [activeSlug, setActiveSlug] = useState("");
  const [projectStatus, setProjectStatus] = useState("正在扫描本地项目文件夹...");
  const [siteStatus, setSiteStatus] = useState("正在读取网站设置...");
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingSite, setIsLoadingSite] = useState(true);
  const activeProject = useMemo(() => projects.find((project) => project.slug === activeSlug), [projects, activeSlug]);
  const activeMeta = activeSlug ? metadata[activeSlug] : null;
  const activeCoverSrc = useMemo(() => (
    activeProject?.images.find((image) => image.fileName === activeMeta?.cover)?.src || activeProject?.coverSrc || ""
  ), [activeMeta?.cover, activeProject]);

  async function loadProjects() {
    setIsLoadingProjects(true);
    setProjectStatus("正在扫描本地项目文件夹...");
    try {
      const response = await fetch("/api/admin/projects", { cache: "no-store" });
      if (!response.ok) throw new Error("load projects failed");
      const data = await response.json();
      const nextMetadata = createMetadata(data.projects, data.metadata || {});

      setProjects(data.projects);
      setMetadata(nextMetadata);
      setActiveSlug((current) => current || data.projects[0]?.slug || "");
      setProjectStatus(`已识别 ${data.projects.length} 个项目。`);
    } catch {
      setProjectStatus("扫描失败，请确认项目正在本地运行。");
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function loadSiteContent() {
    setIsLoadingSite(true);
    setSiteStatus("正在读取网站设置...");
    try {
      const response = await fetch("/api/admin/site-content", { cache: "no-store" });
      if (!response.ok) throw new Error("load site content failed");
      const data = await response.json();
      setSiteContent(data.content || emptySiteContent());
      setSiteStatus("网站设置已加载。");
    } catch {
      setSiteStatus("读取失败，请稍后刷新重试。");
    } finally {
      setIsLoadingSite(false);
    }
  }

  useEffect(() => {
    loadProjects();
    loadSiteContent();
  }, []);

  function updateActive(field, value) {
    setMetadata((current) => ({
      ...current,
      [activeSlug]: {
        ...current[activeSlug],
        [field]: value
      }
    }));
  }

  function updateSiteSection(section, field, value) {
    setSiteContent((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value
      }
    }));
  }

  function updateCategorySummary(title, summary) {
    setSiteContent((current) => ({
      ...current,
      categories: current.categories.map((category) => (
        category.title === title
          ? { ...category, summary }
          : category
      ))
    }));
  }

  async function saveProjects() {
    setProjectStatus("正在保存相册设置...");
    const response = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata })
    });

    if (!response.ok) {
      setProjectStatus("保存失败，请稍后再试。");
      return;
    }

    const data = await response.json();
    setProjects(data.projects);
    setMetadata(createMetadata(data.projects, data.metadata || {}));
    setProjectStatus("相册设置已保存，前台刷新后会显示最新内容。");
  }

  async function saveSiteContent() {
    setSiteStatus("正在保存网站设置...");
    const response = await fetch("/api/admin/site-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: siteContent })
    });

    if (!response.ok) {
      setSiteStatus("保存失败，请稍后再试。");
      return;
    }

    const data = await response.json();
    setSiteContent(data.content || emptySiteContent());
    setSiteStatus("网站设置已保存，前台刷新后会显示最新内容。");
  }

  return (
    <section className="admin-shell">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Local Studio</p>
          <h1>本地作品后台</h1>
          <p className="admin-note">你现在可以在这里管理网站主标题、次标题、联系方式、分类说明，以及每个相册的封面和介绍文字。</p>
        </div>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="后台功能">
        <button type="button" className={tab === "site" ? "active" : ""} onClick={() => setTab("site")}>网站设置</button>
        <button type="button" className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}>相册管理</button>
      </div>

      {tab === "site" ? (
        isLoadingSite ? (
          <p className="admin-status">正在读取网站设置...</p>
        ) : (
          <>
            <div className="admin-actions">
              <button type="button" onClick={loadSiteContent}>重新读取</button>
              <button type="button" className="primary" onClick={saveSiteContent}>保存网站设置</button>
            </div>

            <p className="admin-status">{siteStatus}</p>

            <div className="admin-stack">
              <section className="admin-card">
                <div className="admin-card-header">
                  <h2>首页与个人信息</h2>
                  <p>可以修改主标题、主标题下的次标题、简介和头像路径。</p>
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
                    头像图片路径
                    <input value={siteContent.profile.portrait} onChange={(event) => updateSiteSection("profile", "portrait", event.target.value)} placeholder="/images/about/DSC03110.jpg" />
                  </label>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-header">
                  <h2>网站基础信息</h2>
                  <p>这里的内容会影响浏览器标题和页面基础描述。</p>
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
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-header">
                  <h2>联系方式</h2>
                  <p>会同步显示在首页信息区、联系页和页脚。</p>
                </div>
                <div className="admin-form admin-form-grid">
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
                  <h2>分类说明与页面文案</h2>
                  <p>这里适合维护分类卡片文案、分类页说明和联系页引导语。</p>
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
                    关于页小标题
                    <input value={siteContent.pages.aboutEyebrow} onChange={(event) => updateSiteSection("pages", "aboutEyebrow", event.target.value)} />
                  </label>
                  <label>
                    联系页标题
                    <input value={siteContent.pages.contactTitle} onChange={(event) => updateSiteSection("pages", "contactTitle", event.target.value)} />
                  </label>
                  <label className="admin-form-span-2">
                    联系页说明
                    <textarea rows="3" value={siteContent.pages.contactIntro} onChange={(event) => updateSiteSection("pages", "contactIntro", event.target.value)} />
                  </label>
                </div>

                <div className="admin-subsection">
                  <h3>各拍摄分类说明</h3>
                  <div className="admin-category-list">
                    {siteContent.categories.map((category) => (
                      <label key={category.title}>
                        {category.title}
                        <textarea rows="3" value={category.summary} onChange={(event) => updateCategorySummary(category.title, event.target.value)} />
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </>
        )
      ) : isLoadingProjects ? (
        <p className="admin-status">正在扫描本地项目文件夹...</p>
      ) : !activeProject || !activeMeta ? (
        <>
          <p className="admin-note">还没有识别到项目。请把照片文件夹放入 `public/images/projects/` 或 `public/images/projects-optimized/`，然后点击重新扫描。</p>
          <div className="admin-actions">
            <button type="button" onClick={loadProjects}>重新扫描</button>
          </div>
        </>
      ) : (
        <>
          <div className="admin-actions">
            <button type="button" onClick={loadProjects}>重新扫描</button>
            <button type="button" className="primary" onClick={saveProjects}>保存相册设置</button>
          </div>

          <p className="admin-status">{projectStatus}</p>

          <div className="admin-layout">
            <aside className="admin-sidebar" aria-label="已识别项目">
              {projects.map((project) => (
                <button
                  type="button"
                  className={project.slug === activeSlug ? "active" : ""}
                  onClick={() => setActiveSlug(project.slug)}
                  key={project.slug}
                >
                  <span>{metadata[project.slug]?.title || project.title}</span>
                  <small>{project.images.length} 张图片</small>
                </button>
              ))}
            </aside>

            <div className="admin-panel">
              <div className="admin-preview">
                {activeCoverSrc ? (
                  <Image src={activeCoverSrc} alt={`${activeMeta.title}封面预览`} fill sizes="(max-width: 900px) 100vw, 420px" priority />
                ) : null}
              </div>

              <div className="admin-form">
                <label>
                  相册标题
                  <input value={activeMeta.title} onChange={(event) => updateActive("title", event.target.value)} />
                </label>
                <label>
                  拍摄大类
                  <select value={activeMeta.category} onChange={(event) => updateActive("category", event.target.value)}>
                    {siteContent.categories.map((category) => (
                      <option value={category.title} key={category.title}>{category.title}</option>
                    ))}
                  </select>
                </label>
                <label>
                  年份
                  <input value={activeMeta.year} onChange={(event) => updateActive("year", event.target.value)} />
                </label>
                <label>
                  地点
                  <input value={activeMeta.location} onChange={(event) => updateActive("location", event.target.value)} />
                </label>
                <label>
                  列表简介
                  <textarea rows="3" value={activeMeta.summary} onChange={(event) => updateActive("summary", event.target.value)} />
                </label>
                <label>
                  相册详情说明
                  <textarea rows="5" value={activeMeta.description} onChange={(event) => updateActive("description", event.target.value)} />
                </label>
                <label>
                  封面图片
                  <select value={activeMeta.cover} onChange={(event) => updateActive("cover", event.target.value)}>
                    {activeProject.images.map((image) => (
                      <option value={image.fileName} key={image.fileName}>{image.fileName}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-checkbox">
                  <input type="checkbox" checked={activeMeta.published} onChange={(event) => updateActive("published", event.target.checked)} />
                  在网站中显示这个相册
                </label>
              </div>
            </div>
          </div>

          <div className="admin-thumbs">
            {activeProject.images.map((image) => (
              <button
                type="button"
                className={activeMeta.cover === image.fileName ? "active" : ""}
                onClick={() => updateActive("cover", image.fileName)}
                key={image.src}
              >
                <Image src={image.src} alt={image.alt} fill sizes="130px" />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
