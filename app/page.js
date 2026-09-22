"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

function nextHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export default function Home() {
  const [notes, setNotes] = useState([]);
  const [hour, setHour] = useState(null);
  const [log, setLog] = useState([]);
  const [left, setLeft] = useState("");

  useEffect(() => {
    supabase
      .from("notes")
      .select("id,title,body,created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(24)
      .then(({ data }) => setNotes(data || []));
    supabase
      .from("hours")
      .select("headline,editorial,slot")
      .order("slot", { ascending: false })
      .limit(1)
      .then(({ data }) => setHour(data?.[0] || null));
    supabase
      .from("feature_log")
      .select("title,body,shipped_at")
      .order("shipped_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setLog(data || []));
  }, []);

  useEffect(() => {
    const tick = () => {
      const ms = nextHour() - Date.now();
      const m = Math.max(0, Math.floor(ms / 60000));
      const s = Math.max(0, Math.floor((ms % 60000) / 1000));
      setLeft(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <Link href="/" className="mark">
          Kiln<em>.</em>
        </Link>
        <nav>
          <Link href="/">Wall</Link>
          <Link href="/desk">Desk</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="kicker">This hour</div>
        <h1>{hour?.headline || "The kiln is warm"}</h1>
        <p className="lede">
          {hour?.editorial ||
            "A public wall for notes people meant to keep. Private by default. Visible only if you pin them."}
        </p>
        <div className="clock">
          Next edition in <b>{left}</b>
        </div>
      </section>

      <div className="grid">
        <div>
          <div className="kicker">On the wall</div>
          {notes.length === 0 && (
            <p className="lede">Nothing public yet. Sign in and pin a note.</p>
          )}
          {notes.map((n) => (
            <article className="note" key={n.id}>
              <h3>{n.title}</h3>
              <div className="meta">
                {new Date(n.created_at).toLocaleString()}
              </div>
              <p>{n.body}</p>
            </article>
          ))}
        </div>
        <aside>
          <div className="card">
            <h2>How it works</h2>
            <p>
              Make an account at the desk. Drafts stay in your drawer. Tick
              “public” and the note lands here for anyone walking past.
            </p>
          </div>
          {log.map((f) => (
            <div className="card" key={f.shipped_at + f.title}>
              <div className="meta">Hourly change</div>
              <h2>{f.title}</h2>
              <p>{f.body}</p>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
