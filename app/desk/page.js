"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Desk() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [msg, setMsg] = useState("");
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pub, setPub] = useState(false);
  const [handle, setHandle] = useState("");

  async function loadNotes(uid) {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setNotes(data || []);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      if (u) {
        loadNotes(u.id);
        supabase
          .from("profiles")
          .select("handle")
          .eq("id", u.id)
          .maybeSingle()
          .then(({ data }) => setHandle(data?.handle || ""));
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) loadNotes(u.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function ensureProfile(u) {
    const h =
      handle.trim() ||
      (u.email || "reader").split("@")[0].slice(0, 24);
    await supabase.from("profiles").upsert({
      id: u.id,
      handle: h,
      display_name: h,
    });
  }

  async function auth(e) {
    e.preventDefault();
    setMsg("");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) return setMsg(error.message);
      if (data.user) {
        await ensureProfile(data.user);
        setMsg("Account ready. If email confirm is on, check your inbox.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return setMsg(error.message);
    }
  }

  async function magic(e) {
    e.preventDefault();
    setMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/desk" : undefined },
    });
    setMsg(error ? error.message : "Check your email for a sign-in link.");
  }

  async function save(e) {
    e.preventDefault();
    if (!user) return;
    setMsg("");
    await ensureProfile(user);
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      title: title.trim() || "Untitled",
      body: body.trim(),
      is_public: pub,
    });
    if (error) return setMsg(error.message);
    setTitle("");
    setBody("");
    setPub(false);
    loadNotes(user.id);
  }

  async function toggle(n) {
    await supabase
      .from("notes")
      .update({ is_public: !n.is_public, updated_at: new Date().toISOString() })
      .eq("id", n.id);
    loadNotes(user.id);
  }

  async function remove(n) {
    await supabase.from("notes").delete().eq("id", n.id);
    loadNotes(user.id);
  }

  return (
    <div className="wrap">
      <header className="top">
        <Link href="/" className="mark">
          Kiln<em>.</em>
        </Link>
        <nav>
          <Link href="/">Wall</Link>
          <Link href="/desk">Desk</Link>
          {user && (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                supabase.auth.signOut();
              }}
            >
              Sign out
            </a>
          )}
        </nav>
      </header>

      {!user && (
        <section className="hero">
          <div className="kicker">Your desk</div>
          <h1>Come in.</h1>
          <p className="lede">
            Password or a one-time link. Notes stay here until you pin them to
            the wall.
          </p>
          <form onSubmit={auth} style={{ maxWidth: 360, marginTop: 24 }}>
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              minLength={6}
              placeholder="Password (for sign in / up)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              placeholder="Handle (optional)"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
            <div className="row">
              <button type="submit">
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
              <button className="ghost" type="button" onClick={magic}>
                Email me a link
              </button>
            </div>
            <button
              className="ghost"
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Have an account?" : "Need an account?"}
            </button>
            {msg && <div className={msg.includes("ready") || msg.includes("Check") ? "ok" : "err"}>{msg}</div>}
          </form>
        </section>
      )}

      {user && (
        <>
          <section className="hero">
            <div className="kicker">Drawer</div>
            <h1>Write it down.</h1>
            <p className="lede">
              Signed in as {user.email}. Public notes appear on the wall the
              moment you save them.
            </p>
          </section>
          <div className="grid">
            <form className="card" onSubmit={save}>
              <input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                placeholder="The note itself"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={pub}
                  onChange={(e) => setPub(e.target.checked)}
                />
                Pin to the public wall
              </label>
              <button type="submit">Save note</button>
              {msg && <div className="err">{msg}</div>}
            </form>
            <div>
              {notes.map((n) => (
                <article className="card" key={n.id}>
                  <div className="meta">
                    {n.is_public ? "On the wall" : "In the drawer"} ·{" "}
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                  <h2>{n.title}</h2>
                  <p>{n.body}</p>
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="ghost" type="button" onClick={() => toggle(n)}>
                      {n.is_public ? "Make private" : "Make public"}
                    </button>
                    <button className="ghost" type="button" onClick={() => remove(n)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
