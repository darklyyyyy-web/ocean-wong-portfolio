export const site = {
  meta: {
    title: "OCEAN WONG王海贵 摄影作品集",
    description: "极简、图片优先的个人摄影作品集。"
  },
  profile: {
    name: "Ocean Wong",
    role: "摄影师",
    location: "南宁 / 可异地拍摄",
    shortBio: "我关注自然光、空间秩序与人物在场感，用安静的画面记录真实、克制而有温度的瞬间。",
    about:
      "我是一名以人像、婚礼商业活动项目为主的摄影师。我的工作方式偏向轻量、安静和长期观察：在拍摄前理解项目气质，在现场保留真实的节奏，在后期控制色彩与留白，让照片有足够的呼吸感。",
    portrait: "/images/about/DSC03110.jpg"
  },
  contact: {
    email: "2693375847@qq.com",
    phone: "+86 17677153325",
    wechat: "Ddddarkly",
  },
  categories: [
    {
      title: "婚礼跟拍",
      summary: "仪式、迎亲、晚宴与真实情绪的完整记录。"
    },
    {
      title: "活动跟拍",
      summary: "发布会、展览、市集、品牌活动与现场纪实。"
    },
    {
      title: "商业拍摄",
      summary: "品牌形象、人物肖像、空间与视觉内容制作。"
    },
    {
      title: "产品摄影",
      summary: "静物、商品、质感细节与电商视觉。"
    },
    {
      title: "运动摄影",
      summary: "赛事、训练、运动员肖像与高能瞬间。"
    }
  ],
  hero: {
    image: "/images/hero/hero.svg",
    title: "静默之中的光",
    subtitle: "Portrait / Space / Documentary",
    year: "2026"
  },
  projects: [
    {
      slug: "quiet-morning",
      title: "清晨之前",
      category: "人像",
      year: "2026",
      location: "南宁",
      cover: "/images/projects/quiet-morning/cover.svg",
      summary: "一组关于晨光、皮肤质感与独处状态的人像练习。",
      description:
        "这组作品拍摄于清晨的室内。画面尽量减少道具，只保留窗、墙面、布料与身体之间的关系，让人物的状态成为照片的中心。",
      images: [
        { src: "/images/projects/quiet-morning/01.svg", alt: "清晨之前作品一", orientation: "landscape" },
        { src: "/images/projects/quiet-morning/02.svg", alt: "清晨之前作品二", orientation: "portrait" },
        { src: "/images/projects/quiet-morning/03.svg", alt: "清晨之前作品三", orientation: "landscape" }
      ]
    },
    {
      slug: "white-room",
      title: "白色房间",
      category: "空间",
      year: "2025",
      location: "杭州",
      cover: "/images/projects/white-room/cover.svg",
      summary: "以建筑线条、窗光与空房间的尺度感为主题的空间项目。",
      description:
        "项目关注室内结构的安静秩序。拍摄时保留自然光进入房间后的细微层次，避免过度修饰，让空间本身的比例和材料成为叙事。",
      images: [
        { src: "/images/projects/white-room/01.svg", alt: "白色房间作品一", orientation: "landscape" },
        { src: "/images/projects/white-room/02.svg", alt: "白色房间作品二", orientation: "landscape" },
        { src: "/images/projects/white-room/03.svg", alt: "白色房间作品三", orientation: "portrait" }
      ]
    },
    {
      slug: "after-rain",
      title: "雨后街道",
      category: "纪实",
      year: "2024",
      location: "苏州",
      cover: "/images/projects/after-rain/cover.svg",
      summary: "雨后城市表面的反光、行人和短暂停留的片刻。",
      description:
        "这是一组散步式拍摄。照片没有预设剧情，只记录雨停之后街道恢复流动前的短暂空隙，以及光线落在水面、玻璃和人群上的变化。",
      images: [
        { src: "/images/projects/after-rain/01.svg", alt: "雨后街道作品一", orientation: "landscape" },
        { src: "/images/projects/after-rain/02.svg", alt: "雨后街道作品二", orientation: "portrait" },
        { src: "/images/projects/after-rain/03.svg", alt: "雨后街道作品三", orientation: "landscape" }
      ]
    }
  ]
};
