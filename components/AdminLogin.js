"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("请输入管理员账号。");

  async function handleSubmit(event) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatus("后台尚未完成环境配置。");
      return;
    }

    setStatus("正在登录...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message || "登录失败，请检查邮箱和密码。");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <section className="admin-shell admin-auth-shell">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Online CMS</p>
          <h1>后台登录</h1>
          <p className="admin-note">登录后就可以在线管理首页文案、相册信息和图片库。</p>
        </div>
      </div>

      <form className="admin-card admin-auth-card" onSubmit={handleSubmit}>
        <div className="admin-form">
          <label>
            邮箱
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            密码
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
        </div>
        <div className="admin-actions">
          <button type="submit" className="primary">登录后台</button>
        </div>
        <p className="admin-status">{status}</p>
      </form>
    </section>
  );
}

