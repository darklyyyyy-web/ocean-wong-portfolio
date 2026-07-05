# 摄影作品集网站

这是一个基于 Next.js 的摄影作品集网站，现在同时支持两种内容来源：

- 本地兜底模式：继续读取 `public/images` 和 `data/*.json`
- 线上后台模式：通过 Supabase 管理登录、网站文案、相册和图片上传

如果你已经部署在 Netlify，推荐直接使用线上后台模式。

## 线上后台架构

- 网站前台：Netlify
- 管理后台：`/admin`
- 登录：Supabase Auth
- 数据：Supabase Postgres
- 图片库：Supabase Storage

## 第一步：创建 Supabase 项目

1. 打开 Supabase，新建一个项目。
2. 进入 SQL Editor。
3. 把 [supabase/schema.sql](/Users/darkly/Documents/作品集/supabase/schema.sql) 全部执行一次。
4. 在 Authentication 里创建你的管理员账号。

## 第二步：配置环境变量

把 [.env.example](/Users/darkly/Documents/作品集/.env.example) 里的变量配到本地和 Netlify：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_BUCKET=portfolio
ADMIN_EMAIL=
```

说明：

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目地址
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase 匿名公钥
- `NEXT_PUBLIC_SUPABASE_BUCKET`：图片桶名称，默认 `portfolio`
- `ADMIN_EMAIL`：允许进入后台的管理员邮箱

## 第三步：登录后台

环境变量配置完成后，访问：

```txt
/admin
```

如果还没登录，会跳转到：

```txt
/admin/login
```

登录后你可以：

- 修改首页主标题、副标题、简介、联系方式
- 修改分类说明和页面引导文案
- 新建相册
- 上传多张图片
- 设置封面图
- 删除图片
- 控制相册是否显示

## 当前内容来源规则

为了避免刚切后台时网页内容突然变空，现在的读取规则是：

1. 优先读取 Supabase 里的线上内容
2. 如果线上内容还没建好，自动回退到本地文件和本地图片

这意味着你可以边上线后台，边慢慢把内容迁移进去。

## 本地开发

安装依赖：

```bash
pnpm install
```

启动：

```bash
pnpm dev
```

构建检查：

```bash
pnpm build
```

## 重要文件

- [app/admin/page.js](/Users/darkly/Documents/作品集/app/admin/page.js)：后台入口
- [components/HostedAdmin.js](/Users/darkly/Documents/作品集/components/HostedAdmin.js)：线上后台界面
- [components/AdminLogin.js](/Users/darkly/Documents/作品集/components/AdminLogin.js)：后台登录页
- [lib/hosted-cms.js](/Users/darkly/Documents/作品集/lib/hosted-cms.js)：线上后台数据逻辑
- [lib/supabase/server.js](/Users/darkly/Documents/作品集/lib/supabase/server.js)：服务端 Supabase 客户端
- [app/api/admin/cms](/Users/darkly/Documents/作品集/app/api/admin/cms)：后台 API

