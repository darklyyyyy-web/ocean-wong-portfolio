"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const uploadBatchSize = 8;

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

function summarizeProjects(projects = []) {
  const hostedCount = projects.filter((project) => project.source === "hosted").length;
  const localCount = projects.filter((project) => project.source === "local").length;
  const draftCount = projects.filter((project) => isDraftProject(project)).length;

  return {
    hostedCount,
    localCount,
    draftCount
  };
}

function createProjectStatus(projects = []) {
  const summary = summarizeProjects(projects);

  if (summary.localCount > 0) {
    return `已识别 ${projects.length} 个案例，其中 ${summary.hostedCount} 个已接入线上后台，${summary.localCount} 个还在网站原始图库里，点进去后可一键导入。`;
  }

  return `已读取 ${summary.hostedCount} 个线上案例。`;
}

function naturalCompare(a = "", b = "") {
  return String(a).localeCompare(String(b), "zh-CN", { numeric: true, sensitivity: "base" });
}

function parseSortableImageName(value = "") {
  const original = String(value).trim();
  const normalized = original.toLowerCase();
  const extensionless = normalized.replace(/\.[a-z0-9]+$/i, "");
  const compact = extensionless.replace(/[\s_-]+/g, "");

  const dateMatch = compact.match(/^(\d{4})(\d{2})(\d{2})(\d{0,6})$/);
  if (dateMatch) {
    return {
      type: "date",
      group: `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}`,
      order: Number(`${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}${dateMatch[4] || ""}`),
      fallback: original
    };
  }

  const serialMatch = extensionless.match(/^([a-z]+)[\s_-]*(\d+)$/i);
  if (serialMatch) {
    return {
      type: "serial",
      group: serialMatch[1].toLowerCase(),
      order: Number(serialMatch[2]),
      fallback: original
    };
  }

  return {
    type: "text",
    group: extensionless,
    order: null,
    fallback: original
  };
}

function compareImageNames(a = "", b = "") {
  const left = parseSortableImageName(a);
  const right = parseSortableImageName(b);

  if (left.type !== right.type) {
    const typeOrder = { date: 0, serial: 1, text: 2 };
    return typeOrder[left.type] - typeOrder[right.type];
  }

  const groupCompare = naturalCompare(left.group, right.group);
  if (groupCompare !== 0) {
    return groupCompare;
  }

  if (left.order !== null || right.order !== null) {
    return (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER);
  }

  return naturalCompare(left.fallback, right.fallback);
}

function getSortableImageName(image) {
  if (image?.fileName) {
    return image.fileName;
  }

  if (image?.storagePath) {
    const storageName = image.storagePath.split("/").pop() || image.storagePath;
    if (image.storagePath.startsWith("local:")) {
      return storageName;
    }
    return storageName.replace(/^\d+-/, "");
  }

  if (image?.alt) {
    return image.alt;
  }

  return image?.src?.split("/").pop() || "";
}

export default function HostedAdmin({ userEmail, initialSiteContent = null, initialProjects = [], initialStatus = "" }) {
  const router = useRouter();
  const [tab, setTab] = useState("site");
  const [projectView, setProjectView] = useState("category");
  const [siteContent, setSiteContent] = useState(initialSiteContent || emptySiteContent());
  const [savedSiteContent, setSavedSiteContent] = useState(initialSiteContent || emptySiteContent());
  const [projects, setProjects] = useState(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeCategoryTitle, setActiveCategoryTitle] = useState("");
  const [siteStatus, setSiteStatus] = useState(
    initialStatus || (initialSiteContent ? "网站设置已加载。" : "正在读取网站设置...")
  );
  const [projectStatus, setProjectStatus] = useState(
    initialStatus || (initialSiteContent ? createProjectStatus(initialProjects) : "正在读取案例...")
  );
  const [selectedImageIds, setSelectedImageIds] = useState([]);
  const [loading, setLoading] = useState(!initialSiteContent);
  const activeProject = useMemo(() => projects.find((project) => project.id === activeProjectId), [projects, activeProjectId]);
  const activeProjectIsLocal = activeProject?.source === "local";
  const canSyncFromWebsite = Boolean(activeProject?.localSourceAvailable);
  const projectSummary = useMemo(() => summarizeProjects(projects), [projects]);
  const totalImageCount = useMemo(() => projects.reduce((total, project) => total + (project.images?.length || 0), 0), [projects]);
  const categoryUsage = useMemo(() => {
    const usage = new Map();
    projects.forEach((project) => {
      const key = (project.category || "").trim();
      if (!key) return;
      usage.set(key, (usage.get(key) || 0) + 1);
    });
    return usage;
  }, [projects]);
  const categorySummaries = useMemo(() => siteContent.categories.map((category) => ({
    title: (category.title || "").trim(),
    projectCount: categoryUsage.get((category.title || "").trim()) || 0,
    imageCount: projects
      .filter((project) => (project.category || "").trim() === (category.title || "").trim())
      .reduce((total, project) => total + (project.images?.length || 0), 0)
  })), [categoryUsage, projects, siteContent.categories]);
  const categoryGroups = useMemo(() => {
    const groups = siteContent.categories
      .map((category) => {
        const title = (category.title || "").trim();
        const categoryProjects = projects.filter((project) => (project.category || "").trim() === title);

        return {
          title,
          summary: category.summary || "",
          projects: categoryProjects,
          imageCount: categoryProjects.reduce((total, project) => total + (project.images?.length || 0), 0),
          coverSrc: categoryProjects[0]?.coverSrc || ""
        };
      })
      .filter((group) => group.title);

    const uncategorizedProjects = projects.filter((project) => {
      const title = (project.category || "").trim();
      return title && !groups.some((group) => group.title === title);
    });

    if (uncategorizedProjects.length > 0) {
      groups.push({
        title: "未归类",
        summary: "这些案例的分类名称还没有出现在上面的五大分类里。",
        projects: uncategorizedProjects,
        imageCount: uncategorizedProjects.reduce((total, project) => total + (project.images?.length || 0), 0),
        coverSrc: uncategorizedProjects[0]?.coverSrc || ""
      });
    }

    return groups;
  }, [projects, siteContent.categories]);
  const activeCategory = useMemo(() => (
    categoryGroups.find((group) => group.title === activeCategoryTitle) || categoryGroups[0] || null
  ), [activeCategoryTitle, categoryGroups]);

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
      setSavedSiteContent(data.siteContent || emptySiteContent());
      setProjects(data.projects || []);
      setActiveProjectId((current) => current || data.projects?.[0]?.id || "");
      setSiteStatus("网站设置已加载。");
      setProjectStatus(createProjectStatus(data.projects || []));
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取失败，请刷新重试。";
      setSiteStatus(message);
      setProjectStatus(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialSiteContent) {
      loadBootstrap();
    }
  }, [initialSiteContent]);

  useEffect(() => {
    if (!activeProjectId && projects[0]?.id) {
      setActiveProjectId(projects[0].id);
    }
  }, [activeProjectId, projects]);

  useEffect(() => {
    setSelectedImageIds([]);
  }, [activeProjectId]);

  useEffect(() => {
    if (activeProject?.category?.trim()) {
      setActiveCategoryTitle(activeProject.category.trim());
      return;
    }

    if (!activeCategoryTitle && categoryGroups[0]?.title) {
      setActiveCategoryTitle(categoryGroups[0].title);
    }
  }, [activeProject?.category, activeCategoryTitle, categoryGroups]);

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
    const previousTitle = (siteContent.categories[index]?.title || "").trim();
    setSiteContent((current) => ({
      ...current,
      categories: current.categories.map((category, categoryIndex) => (
        categoryIndex === index
          ? { ...category, [field]: value }
          : category
      ))
    }));

    if (field === "title") {
      const nextTitle = value.trim();
      setProjects((current) => current.map((project) => (
        (project.category || "").trim() === previousTitle
          ? { ...project, category: nextTitle }
          : project
      )));
    }
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
    const renamePairs = savedSiteContent?.categories
      ?.map((category, index) => {
        const previousTitle = (category?.title || "").trim();
        const nextTitle = (siteContent.categories[index]?.title || "").trim();
        return previousTitle && nextTitle && previousTitle !== nextTitle
          ? { from: previousTitle, to: nextTitle }
          : null;
      })
      .filter(Boolean) || [];

    const response = await fetch("/api/admin/cms/site", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: siteContent, renamePairs })
    });

    const data = await response.json();
    if (!response.ok) {
      setSiteStatus(data.error || "保存失败。");
      return;
    }

    setSiteContent(data.content);
    setSavedSiteContent(data.content);
    setSiteStatus("网站设置已保存。");
    router.refresh();
  }

  async function saveProject(project = activeProject) {
    if (!project) return;
    if (project.source === "local") {
      setProjectStatus("这个案例还在网站原始图库里，请先点“导入到线上后台”，导入后再在线修改。");
      return null;
    }
    const title = (project.title || "").trim();
    const category = (project.category || "").trim();

    if (!title) {
      setProjectStatus("请先填写案例名称，再保存案例。");
      return null;
    }

    if (!category) {
      setProjectStatus("请先选择拍摄大类，再保存案例。");
      return null;
    }

    setProjectStatus("正在保存案例...");
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
    setProjectStatus("案例已保存。");
    return data.project.id;
  }

  async function createProject(categoryTitle = "") {
    const draftId = `draft-${Date.now()}`;
    const fallbackCategory = categoryTitle || activeCategory?.title || activeProject?.category || siteContent.categories[0]?.title || "";
    const draft = {
      ...emptyProject(siteContent.categories),
      id: draftId,
      category: fallbackCategory
    };
    setProjects((current) => [draft, ...current]);
    setActiveProjectId(draftId);
    if (fallbackCategory) {
      setActiveCategoryTitle(fallbackCategory);
    }
    setTab("projects");
    setProjectView("album");
    setProjectStatus("已创建一个未保存的案例草稿。先填写案例名称和大类，再点“保存当前案例”。");
  }

  async function deleteProject() {
    if (!activeProjectId) return;
    if (activeProject?.source === "local") {
      setProjectStatus("这个案例还没接入线上后台，目前不能直接删除。");
      return;
    }
    if (isDraftProject(activeProject)) {
      const remainingProjects = projects.filter((project) => project.id !== activeProjectId);
      setProjects(remainingProjects);
      setActiveProjectId(remainingProjects[0]?.id || "");
      setProjectStatus("草稿案例已移除。");
      return;
    }
    setProjectStatus("正在删除案例...");

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
    setProjectStatus("案例已删除。");
  }

  async function uploadFiles(event) {
    const files = [...(event.target.files || [])];
    if (!activeProjectId || files.length === 0) return;
    if (activeProject?.source === "local") {
      setProjectStatus("这个案例还在网站原始图库里，请先导入到线上后台，再上传或替换图片。");
      event.target.value = "";
      return;
    }
    if (isDraftProject(activeProject)) {
      setProjectStatus("请先保存当前案例，再上传图片。");
      event.target.value = "";
      return;
    }

    let uploadedCount = 0;

    for (let index = 0; index < files.length; index += uploadBatchSize) {
      const batch = files.slice(index, index + uploadBatchSize);
      setProjectStatus(`正在上传第 ${index + 1} 到 ${index + batch.length} 张，共 ${files.length} 张...`);

      const formData = new FormData();
      formData.set("projectId", activeProjectId);
      batch.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/admin/cms/upload", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        await loadBootstrap();
        setActiveProjectId(activeProjectId);
        setProjectStatus(data.error || `上传在第 ${uploadedCount + 1} 张附近中断了，已成功上传 ${uploadedCount} 张。你可以继续补传剩余图片。`);
        event.target.value = "";
        return;
      }

      uploadedCount += batch.length;
    }

    await loadBootstrap();
    setActiveProjectId(activeProjectId);
    setProjectStatus(`图片已上传，共完成 ${uploadedCount} 张。`);
    event.target.value = "";
  }

  async function setCover(imageId) {
    if (activeProject?.source === "local") {
      setProjectStatus("请先导入这个案例，再在线设置封面。");
      return;
    }
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
    if (activeProject?.source === "local") {
      setProjectStatus("请先导入这个案例，再在线删除图片。");
      return;
    }
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

  async function deleteSelectedImages() {
    if (!activeProject || activeProject.source === "local" || selectedImageIds.length === 0) {
      return;
    }

    setProjectStatus(`正在删除选中的 ${selectedImageIds.length} 张图片...`);
    const response = await fetch("/api/admin/cms/image", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteMany",
        projectId: activeProject.id,
        imageIds: selectedImageIds
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setProjectStatus(data.error || "批量删除失败。");
      return;
    }

    setSelectedImageIds([]);
    await loadBootstrap();
    setActiveProjectId(data.projectId);
    setProjectStatus(`已删除 ${data.deletedCount || selectedImageIds.length} 张图片。`);
  }

  async function moveImage(imageId, direction) {
    if (!activeProject) return;
    if (activeProject.source === "local") {
      setProjectStatus("请先导入这个案例，再在线调整图片顺序。");
      return;
    }
    const currentIndex = activeProject.images.findIndex((image) => image.id === imageId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= activeProject.images.length) {
      return;
    }

    const reorderedImages = [...activeProject.images];
    const [movedImage] = reorderedImages.splice(currentIndex, 1);
    reorderedImages.splice(targetIndex, 0, movedImage);

    await persistImageOrder(reorderedImages, "正在保存图片顺序...", "图片顺序已更新。");
    router.refresh();
  }

  async function persistImageOrder(reorderedImages, loadingMessage, successMessage) {
    setProjects((current) => current.map((project) => (
      project.id === activeProjectId
        ? { ...project, images: reorderedImages }
        : project
    )));
    setProjectStatus(loadingMessage);

    const response = await fetch("/api/admin/cms/image", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder",
        projectId: activeProjectId,
        imageIds: reorderedImages.map((image) => image.id)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setProjectStatus(data.error || "排序失败。");
      await loadBootstrap();
      setActiveProjectId(activeProjectId);
      return;
    }

    setProjectStatus(successMessage);
  }

  async function moveSelectedImages(position) {
    if (!activeProject || activeProject.source === "local" || selectedImageIds.length === 0) {
      return;
    }

    const selectedIdSet = new Set(selectedImageIds);
    const selectedImages = activeProject.images.filter((image) => selectedIdSet.has(image.id));
    const unselectedImages = activeProject.images.filter((image) => !selectedIdSet.has(image.id));
    const reorderedImages = position === "top"
      ? [...selectedImages, ...unselectedImages]
      : [...unselectedImages, ...selectedImages];

    await persistImageOrder(
      reorderedImages,
      position === "top" ? "正在把已选图片移到前面..." : "正在把已选图片移到后面...",
      position === "top" ? "已把选中图片移到最前面。" : "已把选中图片移到最后面。"
    );
    router.refresh();
  }

  async function sortImagesByFilename() {
    if (!activeProject || activeProject.source === "local" || activeProject.images.length === 0) {
      return;
    }

    const sortedImages = [...activeProject.images].sort((a, b) => (
      compareImageNames(getSortableImageName(a), getSortableImageName(b))
    ));

    setProjects((current) => current.map((project) => (
      project.id === activeProjectId
        ? { ...project, images: sortedImages }
        : project
    )));
    setProjectStatus("正在按文件名排序...");

    const response = await fetch("/api/admin/cms/image", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sortByFilename",
        projectId: activeProject.id
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setProjectStatus(data.error || "按文件名排序失败。");
      await loadBootstrap();
      setActiveProjectId(activeProject.id);
      return;
    }

    await loadBootstrap();
    setActiveProjectId(activeProject.id);
    setProjectStatus("已经按文件名重新排序。");
  }

  async function importProject(projectOverride = null) {
    const targetProject = projectOverride || activeProject;
    if (!targetProject || !targetProject.localSourceAvailable) return;

    setProjectStatus(`正在同步“${targetProject.title}”的网站原图...`);
    const response = await fetch("/api/admin/cms/import", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: targetProject.slug })
    });

    const data = await response.json();
    if (!response.ok) {
      setProjectStatus(data.error || "导入失败。");
      return;
    }

    await loadBootstrap();
    setActiveProjectId(data.projectId);
    setProjectStatus("网站原图已经同步到线上后台，现在可以直接改封面、顺序、显示数量和文字了。");
  }

  function toggleImageSelection(imageId) {
    setSelectedImageIds((current) => (
      current.includes(imageId)
        ? current.filter((id) => id !== imageId)
        : [...current, imageId]
    ));
  }

  function toggleSelectAllImages() {
    if (!activeProject) return;
    if (selectedImageIds.length === activeProject.images.length) {
      setSelectedImageIds([]);
      return;
    }

    setSelectedImageIds(activeProject.images.map((image) => image.id));
  }

  function addCategory() {
    setSiteContent((current) => ({
      ...current,
      categories: [...current.categories, { title: "", summary: "", sortOrder: current.categories.length }]
    }));
    setSiteStatus("已新增一个分类草稿。填写名称后点击“保存网站设置”即可生效。");
  }

  function moveCategory(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= siteContent.categories.length) {
      return;
    }

    setSiteContent((current) => {
      const nextCategories = [...current.categories];
      const [movedCategory] = nextCategories.splice(index, 1);
      nextCategories.splice(nextIndex, 0, movedCategory);
      return {
        ...current,
        categories: nextCategories.map((category, order) => ({ ...category, sortOrder: order }))
      };
    });
    setSiteStatus("分类顺序已调整，记得保存网站设置。");
  }

  function deleteCategory(index) {
    const category = siteContent.categories[index];
    const title = (category?.title || "").trim();
    const usedCount = title ? (categoryUsage.get(title) || 0) : 0;

    if (usedCount > 0) {
      setSiteStatus(`“${title}” 仍有 ${usedCount} 个案例在使用，先把这些案例改到别的分类后再删除。`);
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

  function openProject(projectId) {
    setActiveProjectId(projectId);
  }

  function openCategory(title) {
    setActiveCategoryTitle(title);
    const firstProject = projects.find((project) => (project.category || "").trim() === title);
    if (firstProject?.id) {
      setActiveProjectId(firstProject.id);
    }
  }

  function renderProjectEditor() {
    if (!activeProject) {
      return (
        <div className="admin-card">
          <p className="admin-note">还没有可管理的案例，点击“新建案例”或从左侧选择网站现有案例导入。</p>
        </div>
      );
    }

    return (
      <div className="admin-panel admin-panel-single">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>案例信息</h2>
            <p>
              {activeProjectIsLocal
                ? "这个案例已经在网站前台显示，但还没接入线上后台。先点上方“导入网站原图”，导入后就能在线改大类、案例名、封面、图片顺序和数量。"
                : canSyncFromWebsite
                  ? "这里已经是线上可管理案例。如果你发现图片数量不对，点上方“重新同步网站原图”就会用网站现有原图重新生成完整图片列表。"
                  : "这里先决定案例属于哪个拍摄大类，再给它起一个前台要显示的案例名。以后你要改“婚礼跟拍”里的具体婚礼，就主要在这个区域和下面的图片库里操作。"}
            </p>
          </div>
          <div className="admin-form admin-form-grid">
            <label>
              案例名称 / 次级分类名
              <small>前台进入大类后，会先显示这个名称供访客选择。</small>
              <input disabled={activeProjectIsLocal} value={activeProject.title} onChange={(event) => updateProject("title", event.target.value)} />
            </label>
            <label>
              网址标识
              <small>留空也可以，保存时会自动用标题生成。</small>
              <input disabled={activeProjectIsLocal} value={activeProject.slug} onChange={(event) => updateProject("slug", event.target.value)} />
            </label>
            <label>
              拍摄大类
              <small>比如婚礼跟拍、商业拍摄、活动跟拍。</small>
              <select disabled={activeProjectIsLocal} value={activeProject.category} onChange={(event) => updateProject("category", event.target.value)}>
                {!activeProject.category ? <option value="">请选择分类</option> : null}
                {siteContent.categories.map((category) => (
                  <option key={category.title} value={category.title}>{category.title}</option>
                ))}
              </select>
            </label>
            <label>
              年份
              <input disabled={activeProjectIsLocal} value={activeProject.year} onChange={(event) => updateProject("year", event.target.value)} />
            </label>
            <label>
              地点
              <input disabled={activeProjectIsLocal} value={activeProject.location} onChange={(event) => updateProject("location", event.target.value)} />
            </label>
            <label className="admin-checkbox">
              <input disabled={activeProjectIsLocal} type="checkbox" checked={activeProject.published} onChange={(event) => updateProject("published", event.target.checked)} />
              在网站显示这个案例
            </label>
            <label className="admin-form-span-2">
              案例简介
              <textarea disabled={activeProjectIsLocal} rows="3" value={activeProject.summary} onChange={(event) => updateProject("summary", event.target.value)} />
            </label>
            <label className="admin-form-span-2">
              案例详细说明
              <textarea disabled={activeProjectIsLocal} rows="5" value={activeProject.description} onChange={(event) => updateProject("description", event.target.value)} />
            </label>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2>图片上传与图片库</h2>
            <p>
              {activeProjectIsLocal
                ? "下面这些是网站当前正在使用的原始图片。导入后，这里会变成可直接操作的线上图库。"
                : canSyncFromWebsite
                  ? `这里现在显示的是线上可管理图片库。当前线上有 ${activeProject.images.length} 张，如果和网站原图数量不一致，可以点上方“重新同步网站原图”。`
                  : "可以一次上传多张。每张图都支持上移、下移、设为封面和删除，前台瀑布流会按这里的顺序显示。"}
            </p>
          </div>

          {!activeProjectIsLocal ? (
            <>
              <div className="admin-upload-row">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple onChange={uploadFiles} />
              </div>
              <p className="admin-note">建议上传 JPG、PNG、WebP、AVIF 或 GIF，单张不超过 15MB。系统会自动分批上传，减少一次性失败的概率。</p>
            </>
          ) : (
            <p className="admin-note">导入完成后，你就可以在这里直接上传新图、删图、换封面和调整顺序。</p>
          )}

          {isDraftProject(activeProject) ? (
            <p className="admin-note">这个案例还是草稿，先保存一次，下面的图片库和删除功能才会生效。</p>
          ) : null}

          {activeProject.coverSrc ? (
            <div className="admin-preview">
              <img src={activeProject.coverSrc} alt={`${activeProject.title}封面`} />
            </div>
          ) : null}

          {!activeProjectIsLocal && activeProject.images.length > 0 ? (
            <div className="admin-actions">
              <button type="button" onClick={sortImagesByFilename}>按文件名排序</button>
              <button type="button" onClick={toggleSelectAllImages}>
                {selectedImageIds.length === activeProject.images.length ? "取消全选" : "全选图片"}
              </button>
              <button type="button" onClick={() => moveSelectedImages("top")} disabled={selectedImageIds.length === 0}>已选移到最前</button>
              <button type="button" onClick={() => moveSelectedImages("bottom")} disabled={selectedImageIds.length === 0}>已选移到最后</button>
              <button type="button" onClick={() => setSelectedImageIds([])} disabled={selectedImageIds.length === 0}>清空选择</button>
              <button type="button" onClick={deleteSelectedImages} disabled={selectedImageIds.length === 0}>
                删除已选 {selectedImageIds.length > 0 ? `${selectedImageIds.length} 张` : ""}
              </button>
            </div>
          ) : null}

          <div className="admin-library">
            {activeProject.images.map((image, imageIndex) => (
              <article className="admin-library-card" key={image.id}>
                <div className="admin-library-thumb">
                  <img src={image.src} alt={image.alt} />
                </div>
                <div className="admin-library-actions">
                  {!activeProjectIsLocal ? (
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedImageIds.includes(image.id)}
                        onChange={() => toggleImageSelection(image.id)}
                      />
                      选中这张
                    </label>
                  ) : null}
                  <span className="admin-note">
                    第 {imageIndex + 1} 张
                    {activeProject.coverSrc === image.src ? " · 当前封面" : ""}
                  </span>
                  <span className="admin-note">{getSortableImageName(image)}</span>
                  {activeProjectIsLocal ? (
                    <span className="admin-note">导入后可在这里直接管理</span>
                  ) : (
                    <>
                      <button type="button" onClick={() => moveImage(image.id, -1)} disabled={imageIndex === 0}>上移</button>
                      <button type="button" onClick={() => moveImage(image.id, 1)} disabled={imageIndex === activeProject.images.length - 1}>下移</button>
                      <button type="button" onClick={() => setCover(image.id)}>设为封面</button>
                      <button type="button" onClick={() => deleteImage(image.id)}>删除图片</button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {activeProject.images.length === 0 ? (
              <p className="admin-note">这个案例还没有图片，保存案例后就可以直接上传，也能在这里逐张删除。</p>
            ) : null}
          </div>
        </div>
      </div>
    );
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

      <p className="admin-status">
        当前账号：{userEmail}
        {` · 已接入 ${projectSummary.hostedCount} 个线上案例`}
        {projectSummary.localCount ? ` · 待导入 ${projectSummary.localCount} 个网站现有案例` : ""}
      </p>

      <div className="admin-tabs" role="tablist" aria-label="后台功能">
        <button type="button" className={tab === "site" ? "active" : ""} onClick={() => setTab("site")}>网站设置</button>
        <button type="button" className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}>案例与图片库</button>
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
              <div className="admin-form admin-form-grid">
                <div className="admin-category-card">
                  <strong>{siteContent.categories.length}</strong>
                  <span className="admin-note">当前分类数量</span>
                </div>
                <div className="admin-category-card">
                  <strong>{projects.length}</strong>
                  <span className="admin-note">当前可见案例数量</span>
                </div>
                <div className="admin-category-card">
                  <strong>{totalImageCount}</strong>
                  <span className="admin-note">当前图片总数</span>
                </div>
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
                          ? `当前有 ${categorySummaries[index]?.projectCount || 0} 个案例，合计 ${categorySummaries[index]?.imageCount || 0} 张图片`
                          : "这是一个还没命名的分类草稿"}
                      </span>
                      <button type="button" onClick={() => moveCategory(index, -1)} disabled={index === 0}>上移分类</button>
                      <button type="button" onClick={() => moveCategory(index, 1)} disabled={index === siteContent.categories.length - 1}>下移分类</button>
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
                <p>这部分是在改前台各个页面顶部显示的文字，不是案例内容本身。下面每个输入框都对应网站上的一个标题或说明。</p>
              </div>
              <div className="admin-form admin-form-grid">
                <label>
                  作品页小标题
                  <small>显示在 `/projects` 页面顶部，例如 Portfolio。</small>
                  <input value={siteContent.pages.projectsEyebrow} onChange={(event) => updateSiteSection("pages", "projectsEyebrow", event.target.value)} placeholder="例如：Portfolio" />
                </label>
                <label>
                  作品页主标题
                  <small>显示在 `/projects` 页面顶部的大标题。</small>
                  <input value={siteContent.pages.projectsTitle} onChange={(event) => updateSiteSection("pages", "projectsTitle", event.target.value)} placeholder="例如：拍摄类型" />
                </label>
                <label className="admin-form-span-2">
                  作品页说明
                  <small>显示在 `/projects` 页面顶部标题下方。</small>
                  <textarea rows="3" value={siteContent.pages.projectsIntro} onChange={(event) => updateSiteSection("pages", "projectsIntro", event.target.value)} placeholder="例如：先选择拍摄大类，再进入每个具体项目。" />
                </label>
                <label>
                  分类页小标题
                  <small>显示在每个分类详情页顶部，例如 Gallery。</small>
                  <input value={siteContent.pages.categoryEyebrow} onChange={(event) => updateSiteSection("pages", "categoryEyebrow", event.target.value)} placeholder="例如：Gallery" />
                </label>
                <label>
                  联系页小标题
                  <small>显示在 `/contact` 页面顶部。</small>
                  <input value={siteContent.pages.contactEyebrow} onChange={(event) => updateSiteSection("pages", "contactEyebrow", event.target.value)} placeholder="例如：Contact" />
                </label>
                <label className="admin-form-span-2">
                  分类页说明
                  <small>显示在每个分类详情页顶部标题下方。</small>
                  <textarea rows="3" value={siteContent.pages.categoryIntro} onChange={(event) => updateSiteSection("pages", "categoryIntro", event.target.value)} placeholder="例如：这个大类下的照片会直接显示在这里。" />
                </label>
                <label>
                  联系页标题
                  <small>显示在 `/contact` 页的大标题。</small>
                  <input value={siteContent.pages.contactTitle} onChange={(event) => updateSiteSection("pages", "contactTitle", event.target.value)} placeholder="例如：联系我" />
                </label>
                <label>
                  关于页小标题
                  <small>显示在 `/about` 页面顶部。</small>
                  <input value={siteContent.pages.aboutEyebrow} onChange={(event) => updateSiteSection("pages", "aboutEyebrow", event.target.value)} placeholder="例如：About" />
                </label>
                <label className="admin-form-span-2">
                  联系页说明
                  <small>显示在 `/contact` 页面标题下方。</small>
                  <textarea rows="3" value={siteContent.pages.contactIntro} onChange={(event) => updateSiteSection("pages", "contactIntro", event.target.value)} placeholder="例如：欢迎咨询婚礼、活动、商业、产品或运动拍摄。" />
                </label>
              </div>
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="admin-tabs" role="tablist" aria-label="整理方式">
            <button type="button" className={projectView === "category" ? "active" : ""} onClick={() => setProjectView("category")}>按分类整理</button>
            <button type="button" className={projectView === "album" ? "active" : ""} onClick={() => setProjectView("album")}>按案例逐个编辑</button>
          </div>
          <div className="admin-actions">
            <button type="button" onClick={() => createProject()}>新建案例</button>
            {projectView === "category" && activeCategory ? (
              <button type="button" className="primary" onClick={() => createProject(activeCategory.title)}>
                在{activeCategory.title}下新建案例
              </button>
            ) : null}
            {canSyncFromWebsite ? <button type="button" onClick={importProject}>{activeProjectIsLocal ? "导入网站原图" : "重新同步网站原图"}</button> : null}
            {!activeProjectIsLocal ? (
              <button type="button" onClick={() => saveProject()}>保存当前案例</button>
            ) : null}
            {activeProject && !activeProjectIsLocal ? <button type="button" onClick={deleteProject}>删除当前案例</button> : null}
          </div>
          <p className="admin-status">{projectStatus}</p>

          {projectView === "category" ? (
            <div className="admin-category-workspace">
              <aside className="admin-category-browser" aria-label="分类列表">
                {categoryGroups.map((group) => (
                  <button
                    key={group.title}
                    type="button"
                    className={activeCategory?.title === group.title ? "active" : ""}
                    onClick={() => openCategory(group.title)}
                  >
                    <span>{group.title}</span>
                    <small>{group.projects.length} 个案例 · {group.imageCount} 张图</small>
                  </button>
                ))}
              </aside>

              <div className="admin-stack">
                {activeCategory ? (
                  <>
                    <section className="admin-card">
                      <div className="admin-card-header">
                        <h2>{activeCategory.title}</h2>
                        <p>{activeCategory.summary || "先选分类，再选案例，最后整理图片。整个流程会更接近你平时整理作品的习惯。"}</p>
                      </div>
                      <div className="admin-actions">
                        <button type="button" className="primary" onClick={() => createProject(activeCategory.title)}>
                          在这个分类下新建案例
                        </button>
                      </div>
                      <div className="admin-form admin-form-grid">
                        <div className="admin-category-card">
                          <strong>{activeCategory.projects.length}</strong>
                          <span className="admin-note">这个分类下的案例数</span>
                        </div>
                        <div className="admin-category-card">
                          <strong>{activeCategory.imageCount}</strong>
                          <span className="admin-note">这个分类下的图片数</span>
                        </div>
                        <div className="admin-category-card">
                          <strong>{activeCategory.projects.filter((project) => project.source === "hosted").length}</strong>
                          <span className="admin-note">已接入线上后台</span>
                        </div>
                      </div>
                    </section>

                    <section className="admin-card">
                      <div className="admin-card-header">
                        <h2>这个分类下的案例</h2>
                        <p>先选大类，再从下面点进具体案例去删图、换封面、排序，会比直接在全部案例里翻找轻松很多。</p>
                      </div>
                      <div className="admin-album-grid">
                        {activeCategory.projects.map((project) => (
                          <article className="admin-album-card" key={project.id}>
                            {project.coverSrc ? (
                              <div className="admin-album-cover">
                                <img src={project.coverSrc} alt={`${project.title}封面`} />
                              </div>
                            ) : null}
                            <div className="admin-album-body">
                              <h3>{project.title || "未命名案例"}</h3>
                              <p className="admin-note">
                                {project.source === "local" ? "网站现有案例，需先导入" : "线上可直接编辑"}
                                {` · ${project.images.length} 张图`}
                              </p>
                              <div className="admin-actions">
                                <button type="button" className="primary" onClick={() => openProject(project.id)}>打开这个案例</button>
                                {project.localSourceAvailable ? (
                                  <button type="button" onClick={() => importProject(project)}>
                                    {project.source === "local" ? "导入网站原图" : "重新同步原图"}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        ))}
                        {activeCategory.projects.length === 0 ? (
                          <p className="admin-note">这个分类下还没有案例，现在就可以直接新建一个。</p>
                        ) : null}
                      </div>
                    </section>

                    {activeProject && (activeProject.category || "").trim() === activeCategory.title ? renderProjectEditor() : null}
                  </>
                ) : (
                  <div className="admin-card">
                    <p className="admin-note">先创建分类，或者先导入案例后再开始整理。</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="admin-layout">
              <aside className="admin-sidebar" aria-label="案例列表">
                {projects.map((project) => (
                  <button key={project.id} type="button" className={project.id === activeProjectId ? "active" : ""} onClick={() => setActiveProjectId(project.id)}>
                    <span>{project.title || "未命名案例"}</span>
                    <small>{project.source === "local" ? `网站现有案例 · ${project.images.length} 张图片` : `${project.images.length} 张图片`}</small>
                  </button>
                ))}
              </aside>
              {renderProjectEditor()}
            </div>
          )}
        </>
      )}
    </section>
  );
}
