import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Papa from "papaparse";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { supabase } from "./lib/supabaseClient";

const BLUE = "#003087";

const MD_CARD = { background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" };
const MD_INPUT = { width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 10px", fontSize: 12, boxSizing: "border-box" };
const MD_BTN = { background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" };

const S = {
  na:    { label: "Not Started", color: "#6B7280", bg: "#F9FAFB" },
  red:   { label: "Red",         color: "#DC2626", bg: "#FEF2F2" },
  amber: { label: "Amber",       color: "#D97706", bg: "#FFFBEB" },
  green: { label: "Green",       color: "#059669", bg: "#ECFDF5" },
};

const AVATAR_PALETTE = {
  a1: "linear-gradient(135deg,#F59E0B,#DC2626)",
  a2: "linear-gradient(135deg,#003087,#2563EB)",
  a3: "linear-gradient(135deg,#059669,#10B981)",
  a4: "linear-gradient(135deg,#7C3AED,#A855F7)",
  a5: "#9CA3AF",
};
function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function compareKpiNumbers(a, b) {
  const partsA = String(a || "0").split(".").map(n => parseInt(n, 10) || 0);
  const partsB = String(b || "0").split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = not checked yet
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const loadedOnce = React.useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((evt, sess) => {
      if (evt === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setSession(sess);
        return;
      }
      // Ignore no-op refresh events once we've already loaded — Supabase
      // re-checks the session on every tab focus, which was remounting
      // the whole app and resetting whatever tab/view the admin was on.
      setSession(prev => {
        if (loadedOnce.current && prev && sess && prev.user.id === sess.user.id) {
          return prev; // same user, same session — don't trigger a re-fetch
        }
        return sess;
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setProfile(null); setProfileLoading(false); loadedOnce.current = false; return; }
    (async () => {
      if (!loadedOnce.current) setProfileLoading(true);
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(data);
      setProfileLoading(false);
      loadedOnce.current = true;
    })();
  }, [session]);

  if (recoveryMode) return <ResetPasswordScreen onDone={() => setRecoveryMode(false)} />;
  if (session === undefined) return <Loading />;
  if (!session) return <AuthScreen />;
  if (profileLoading || !profile) return <Loading />;

  return profile.role === "admin" ? <AdminApp profile={profile} /> : <UserApp profile={profile} />;
}

function Loading({ label = "Loading..." }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #003087", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#6B7280", fontSize: 14 }}>{label}</p>
      </div>
    </div>
  );
}

/* ================= AUTH ================= */

function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setErr("Passwords don't match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (e2) {
      setErr(e2.message || "Something went wrong. Please try the reset link again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 32, width: 360, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: BLUE, marginBottom: 4 }}>Set a New Password</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>KIET KPI Dashboard</div>

        {done ? (
          <>
            <div style={{ fontSize: 13, color: "#059669", marginBottom: 16 }}>Password updated. You can continue to the dashboard now.</div>
            <button onClick={onDone} style={{ width: "100%", background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Continue
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" required minLength={6}
              style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 10, boxSizing: "border-box" }} />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" required minLength={6}
              style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 14, boxSizing: "border-box" }} />
            {err && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 12 }}>{err}</div>}
            <button type="submit" disabled={busy} style={{ width: "100%", background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {busy ? "Please wait..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        const redirectTo = window.location.origin + import.meta.env.BASE_URL;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        setErr("If that email has an account, a reset link has been sent. Check your inbox.");
      } else if (mode === "signup") {
        const redirectTo = window.location.origin + import.meta.env.BASE_URL;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName }, emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        setErr("Account created. Log in below. If you don't see your KPIs yet, ask the admin to assign your position.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e2) {
      console.error("Auth error:", e2);
      const msg = (e2 && (e2.message || e2.error_description || e2.msg)) ||
        "Something went wrong. Please try again, or contact the Registrar Office if it persists.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  const isGoodMsg = err.startsWith("Account created") || err.startsWith("If that email");

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <form onSubmit={submit} style={{ background: "white", borderRadius: 16, padding: 32, width: 360, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: BLUE, marginBottom: 4 }}>KIET KPI Dashboard</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>SHEC KPI Compliance — Registrar Office</div>

        {mode === "signup" && (
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" required
            style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 10, boxSizing: "border-box" }} />
        )}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required
          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 10, boxSizing: "border-box" }} />
        {mode !== "forgot" && (
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required minLength={6}
            style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 14, boxSizing: "border-box" }} />
        )}

        {err && <div style={{ fontSize: 12, color: isGoodMsg ? "#059669" : "#DC2626", marginBottom: 12 }}>{err}</div>}

        <button type="submit" disabled={busy} style={{ width: "100%", background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
          {busy ? "Please wait..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
        </button>

        <div style={{ textAlign: "center", fontSize: 12, color: "#6B7280", display: "flex", flexDirection: "column", gap: 6 }}>
          {mode === "login" && (
            <>
              <div>New here? <a onClick={() => { setMode("signup"); setErr(""); }} style={{ color: BLUE, cursor: "pointer", fontWeight: 600 }}>Create an account</a></div>
              <div><a onClick={() => { setMode("forgot"); setErr(""); }} style={{ color: BLUE, cursor: "pointer", fontWeight: 600 }}>Forgot password?</a></div>
            </>
          )}
          {mode === "signup" && (
            <div>Already have an account? <a onClick={() => { setMode("login"); setErr(""); }} style={{ color: BLUE, cursor: "pointer", fontWeight: 600 }}>Log in</a></div>
          )}
          {mode === "forgot" && (
            <div><a onClick={() => { setMode("login"); setErr(""); }} style={{ color: BLUE, cursor: "pointer", fontWeight: 600 }}>Back to log in</a></div>
          )}
        </div>
      </form>
    </div>
  );
}

/* ================= SHARED CHROME ================= */

function Sidebar({ items, comingSoonItems = [], activeId, onSelect, brandTitle, brandSubtitle, profile, onOpenProfile, onLogout, mobileOpen, onClose }) {
  return (
    <>
      <style>{`
        .kiet-sidebar { width: 232px; }
        .kiet-hamburger { display: none; }
        .kiet-sidebar-close { display: none; }
        @media (max-width: 768px) {
          .kiet-sidebar {
            position: fixed; top: 0; left: 0; height: 100vh; z-index: 60;
            transform: translateX(-100%);
            transition: transform 0.22s ease;
            box-shadow: 2px 0 16px rgba(0,0,0,0.25);
          }
          .kiet-sidebar.kiet-open { transform: translateX(0); }
          .kiet-hamburger { display: flex; }
          .kiet-sidebar-close { display: block; }
        }
      `}</style>
      <div className={`no-print kiet-sidebar${mobileOpen ? " kiet-open" : ""}`} style={{ background: BLUE, display: "flex", flexDirection: "column", flexShrink: 0, minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <img src={`${import.meta.env.BASE_URL}kiet-logo.jpg`} alt="KIET" style={{ height: 34, borderRadius: 6, background: "white", padding: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{brandTitle}</div>
            <div style={{ color: "#93C5FD", fontSize: 10, marginTop: 2 }}>{brandSubtitle}</div>
          </div>
          <div className="kiet-sidebar-close" onClick={onClose} style={{ color: "white", fontSize: 18, cursor: "pointer", padding: "2px 6px" }}>✕</div>
        </div>

        <div style={{ padding: "14px 16px 6px", color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>Workspace</div>
        {items.map(it => (
          <div key={it.id} onClick={() => { onSelect(it.id); onClose?.(); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", margin: "1px 8px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: activeId === it.id ? "white" : "transparent", color: activeId === it.id ? BLUE : "rgba(255,255,255,0.8)" }}>
            <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>{it.icon}</span> {it.label}
          </div>
        ))}

        {comingSoonItems.length > 0 && (
          <>
            <div style={{ padding: "14px 16px 6px", color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>Coming Soon</div>
            {comingSoonItems.map(it => (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", margin: "1px 8px", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.35)", cursor: "default" }}>
                <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>{it.icon}</span> {it.label}
                <span style={{ marginLeft: "auto", background: "#7C3AED", color: "white", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>soon</span>
              </div>
            ))}
          </>
        )}

        <div onClick={() => { onOpenProfile(); onClose?.(); }} style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.12)", padding: 12, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: AVATAR_PALETTE[profile?.avatar_key] || AVATAR_PALETTE.a1, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
            {initialsOf(profile?.full_name)}
          </div>
          <div>
            <div style={{ color: "white", fontSize: 12, fontWeight: 700 }}>{profile?.full_name}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{activeId === "profile" ? "Editing profile" : "View Profile →"}</div>
          </div>
        </div>
        <div onClick={onLogout} style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>
          Log Out
        </div>
      </div>
      {mobileOpen && (
        <div className="no-print" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 55 }} />
      )}
    </>
  );
}

function AppShell({ nav, activeId, onSelect, brandTitle, brandSubtitle, profile, onOpenProfile, onLogout, pageTitle, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "'Segoe UI',system-ui,sans-serif", display: "flex" }}>
      <Sidebar
        items={nav.items} comingSoonItems={nav.comingSoon || []}
        activeId={activeId} onSelect={onSelect}
        brandTitle={brandTitle} brandSubtitle={brandSubtitle}
        profile={profile} onOpenProfile={onOpenProfile} onLogout={onLogout}
        mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div className="no-print" style={{ height: 54, background: "white", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 12, padding: "0 22px", flexShrink: 0 }}>
          <div className="kiet-hamburger" onClick={() => setMobileOpen(true)} style={{ alignItems: "center", justifyContent: "center", width: 30, height: 30, cursor: "pointer", fontSize: 18, color: BLUE }}>☰</div>
          <div style={{ fontWeight: 700, color: "#1F2937", fontSize: 15 }}>{pageTitle}</div>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}


function ProfileScreen({ profile, onUpdated }) {
  const [form, setForm] = useState({
    full_name: profile.full_name || "",
    designation: profile.designation || "",
    phone: profile.phone || "",
    secondary_email: profile.secondary_email || "",
    avatar_key: profile.avatar_key || "a1",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name.trim(),
      designation: form.designation.trim() || null,
      phone: form.phone.trim() || null,
      secondary_email: form.secondary_email.trim() || null,
      avatar_key: form.avatar_key,
    }).eq("id", profile.id);
    setBusy(false);
    setMsg(error ? error.message : "Profile updated.");
    if (!error) onUpdated?.({ ...profile, ...form });
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 24px 60px" }}>
      <div style={{ background: "white", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: AVATAR_PALETTE[form.avatar_key], display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
            {initialsOf(form.full_name)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1F2937" }}>{form.full_name || "Your name"}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>Choose an avatar color</div>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.keys(AVATAR_PALETTE).map(k => (
                <div key={k} onClick={() => setForm(f => ({ ...f, avatar_key: k }))}
                  style={{ width: 28, height: 28, borderRadius: "50%", background: AVATAR_PALETTE[k], cursor: "pointer", border: form.avatar_key === k ? `2px solid ${BLUE}` : "2px solid transparent" }} />
              ))}
            </div>
          </div>
        </div>

        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Full Name</label>
        <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 12, marginBottom: 12, boxSizing: "border-box" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
          <div>
            <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Designation (your actual title)</label>
            <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Assistant Registrar"
              style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 12, marginBottom: 12, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="03xx-xxxxxxx"
              style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 12, marginBottom: 12, boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: -6, marginBottom: 14 }}>
          This is separate from whatever KPI position an admin has assigned you — they don't have to match.
        </div>

        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Secondary Email (optional)</label>
        <input value={form.secondary_email} onChange={e => setForm(f => ({ ...f, secondary_email: e.target.value }))} placeholder="personal@example.com"
          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 12, marginBottom: 16, boxSizing: "border-box" }} />

        {msg && <div style={{ fontSize: 12, color: msg === "Profile updated." ? "#059669" : "#DC2626", marginBottom: 10 }}>{msg}</div>}
        <button onClick={save} disabled={busy} style={{ background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {busy ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* ================= USER APP ================= */

function UserApp({ profile }) {
  const [assignments, setAssignments] = useState(null);
  const [selected, setSelected] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [view, setView] = useState("kpis"); // kpis | approvals | profile
  const [profileData, setProfileData] = useState(profile);
  const logout = () => supabase.auth.signOut();

  const ASSIGNMENT_SELECT = "id, campus_code, status, submitted_at, approved_at, deadline, sent_date, received_date, correspondence_notes, reports_to_assignment_id, position:positions(id,name,reports_to_position_id), campuses(name)";

  const loadAssignments = async () => {
    const { data } = await supabase.from("assignments").select(ASSIGNMENT_SELECT).eq("user_id", profile.id);
    setAssignments(data || []);
    return data || [];
  };

  const loadPendingApprovals = async (myAssignments) => {
    // Positions I hold — anyone whose position reports_to one of these, at a matching campus, and is 'submitted'.
    if (myAssignments.length === 0) { setPendingApprovals([]); return; }
    const myAssignmentIds = new Set(myAssignments.map(a => a.id));
    const mine = myAssignments.reduce((acc, a) => { acc[a.position.id] = a.campus_code; return acc; }, {});
    const { data: candidates } = await supabase
      .from("assignments")
      .select("id, campus_code, status, reports_to_assignment_id, position:positions(id,name,reports_to_position_id), campuses(name), user:profiles!user_id(full_name)")
      .eq("status", "submitted");
    const relevant = (candidates || []).filter(c => {
      // Person-to-person override takes priority if set.
      if (c.reports_to_assignment_id) return myAssignmentIds.has(c.reports_to_assignment_id);
      const parentId = c.position.reports_to_position_id;
      if (!parentId || !(parentId in mine)) return false;
      const myCampus = mine[parentId];
      return myCampus === c.campus_code || myCampus === "ALL" || c.campus_code === "ALL";
    });
    setPendingApprovals(relevant);
  };

  useEffect(() => {
    (async () => {
      const data = await loadAssignments();
      if (data.length === 1) setSelected(data[0]);
      loadPendingApprovals(data);
    })();
  }, [profile.id]);

  const refreshAfterStatusChange = async () => {
    const data = await loadAssignments();
    if (selected) setSelected(data.find(a => a.id === selected.id) || null);
    loadPendingApprovals(data);
  };

  if (assignments === null) return <Loading />;

  const navItems = [
    { id: "kpis", icon: "📊", label: "My KPIs" },
    ...(pendingApprovals.length > 0 ? [{ id: "approvals", icon: "✅", label: `Approvals (${pendingApprovals.length})` }] : []),
    { id: "notifications", icon: "🔔", label: "Notifications" },
  ];

  const shellProps = {
    nav: { items: navItems },
    activeId: view,
    onSelect: setView,
    brandTitle: "KIET KPI Dashboard",
    brandSubtitle: profileData.full_name,
    profile: profileData,
    onOpenProfile: () => setView("profile"),
    onLogout: logout,
  };

  if (view === "profile") {
    return (
      <AppShell {...shellProps} pageTitle="My Profile">
        <ProfileScreen profile={profileData} onUpdated={setProfileData} />
      </AppShell>
    );
  }

  if (view === "notifications") {
    return (
      <AppShell {...shellProps} pageTitle="Notifications">
        <NotificationsScreen isAdmin={false} />
      </AppShell>
    );
  }

  if (assignments.length === 0) {
    return (
      <AppShell {...shellProps} pageTitle="My KPIs">
        <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center", color: "#6B7280", fontSize: 14, padding: "0 16px" }}>
          No position has been assigned to your account yet. Please contact the Registrar Office to be assigned to your KPI position(s).
        </div>
      </AppShell>
    );
  }

  if (view === "approvals") {
    return (
      <AppShell {...shellProps} pageTitle="Approvals">
        <div style={{ maxWidth: 700, margin: "20px auto", display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 60px" }}>
          {pendingApprovals.map(a => (
            <div key={a.id} style={{ background: "white", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#1F2937", fontSize: 14 }}>{a.position.name}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>{a.user?.full_name} · {a.campuses?.name || a.campus_code}</div>
              </div>
              <button onClick={() => { setSelected(a); setView("kpis"); }} style={{ fontSize: 12, color: BLUE, background: "none", border: `1px solid ${BLUE}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>Review</button>
            </div>
          ))}
          {pendingApprovals.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 13 }}>Nothing pending.</div>}
        </div>
      </AppShell>
    );
  }

  if (!selected) {
    return (
      <AppShell {...shellProps} pageTitle="Select a Position">
        <div style={{ maxWidth: 600, margin: "40px auto", display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>
          {assignments.map(a => (
            <button key={a.id} onClick={() => setSelected(a)} style={{ textAlign: "left", background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: 16, cursor: "pointer" }}>
              <div style={{ fontWeight: 700, color: "#1F2937", fontSize: 14 }}>{a.position.name}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{a.campuses?.name || a.campus_code}</div>
            </button>
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell {...shellProps} pageTitle={`${selected.position.name} · ${selected.campuses?.name || selected.campus_code}`}>
      {assignments.length > 1 && (
        <div className="no-print" style={{ padding: "10px 24px 0" }}>
          <button onClick={() => setSelected(null)} style={{ fontSize: 12, color: BLUE, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            ← Switch position
          </button>
        </div>
      )}
      <KpiEntry assignment={selected} onStatusChange={refreshAfterStatusChange} personName={profileData.full_name} />
    </AppShell>
  );
}

/* ================= KPI ENTRY (shared by user view + admin edit modal) ================= */

function KpiEntry({ assignment, isAdmin, onStatusChange, personName: personNameProp }) {
  const [areas, setAreas] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [entries, setEntries] = useState({});
  const [openArea, setOpenArea] = useState(null);
  const [saving, setSaving] = useState({});
  const [canApprove, setCanApprove] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [corr, setCorr] = useState({
    deadline: assignment.deadline || "", sent_date: assignment.sent_date || "",
    received_date: assignment.received_date || "", correspondence_notes: assignment.correspondence_notes || "",
  });

  const isFinalAuthority = !assignment.position.reports_to_position_id && !assignment.reports_to_assignment_id; // no supervisor either way — self-approves

  useEffect(() => {
    (async () => {
      const { data: areaRows } = await supabase
        .from("kpi_areas").select("*").eq("position_id", assignment.position.id).order("area_number");
      setAreas(areaRows || []);

      const areaIds = (areaRows || []).map(a => a.id);
      if (areaIds.length === 0) { setKpis([]); return; }

      const { data: kpiRows } = await supabase
        .from("kpis").select("*").in("area_id", areaIds).order("kpi_number");
      setKpis((kpiRows || []).slice().sort((a, b) => compareKpiNumbers(a.kpi_number, b.kpi_number)));

      const { data: entryRows } = await supabase
        .from("kpi_entries").select("*").eq("assignment_id", assignment.id);
      const map = {};
      (entryRows || []).forEach(e => { map[e.kpi_id] = e; });
      setEntries(map);

      // Can the logged-in user approve this? Person-to-person override
      // takes priority if set, otherwise fall back to whoever holds the
      // position this one reports to (matching campus).
      if (!isAdmin) {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess?.session?.user?.id;
        if (uid) {
          if (assignment.reports_to_assignment_id) {
            const { data: overrideA } = await supabase
              .from("assignments").select("user_id").eq("id", assignment.reports_to_assignment_id).single();
            setCanApprove(overrideA?.user_id === uid);
          } else if (assignment.position.reports_to_position_id) {
            const { data: mine } = await supabase
              .from("assignments").select("campus_code")
              .eq("user_id", uid).eq("position_id", assignment.position.reports_to_position_id);
            const match = (mine || []).some(m => m.campus_code === assignment.campus_code || m.campus_code === "ALL");
            setCanApprove(match);
          }
        }
      }
    })();
  }, [assignment.id, assignment.position.id]);

  const save = async (kpiId, fields) => {
    setSaving(s => ({ ...s, [kpiId]: true }));
    const payload = { assignment_id: assignment.id, kpi_id: kpiId, ...fields };
    const { data, error } = await supabase
      .from("kpi_entries")
      .upsert(payload, { onConflict: "assignment_id,kpi_id" })
      .select().single();
    if (!error) setEntries(prev => ({ ...prev, [kpiId]: data }));
    setSaving(s => ({ ...s, [kpiId]: false }));
  };

  const personName = personNameProp || assignment.user?.full_name || "";
  const campusLabel = assignment.campuses?.name || assignment.campus_code || "";

  const exportExcel = () => {
    let rows = "";
    (areas || []).forEach(area => {
      rows += `<tr><td colspan="8" style="background:#003087;color:#ffffff;font-weight:bold;padding:6px;">Area ${area.area_number}: ${escapeHtml(area.area_name)}</td></tr>`;
      rows += `<tr style="background:#F3F4F6;font-weight:bold;"><td>KPI #</td><td>Label</td><td>Baseline</td><td>Year 1</td><td>Year 2</td><td>Year 3</td><td>Benchmark</td><td>Actual</td></tr>`;
      kpis.filter(k => k.area_id === area.id).forEach(k => {
        const e = entries[k.id] || {};
        rows += `<tr><td>${escapeHtml(k.kpi_number)}</td><td>${escapeHtml(k.label)}</td><td>${escapeHtml(e.baseline || "")}</td><td>${escapeHtml(e.yr1_target || "")}</td><td>${escapeHtml(e.yr2_target || "")}</td><td>${escapeHtml(e.yr3_target || "")}</td><td>${escapeHtml(e.benchmark || "")}</td><td>${escapeHtml(e.actual || "")}</td></tr>`;
      });
    });
    const html = `<html><head><meta charset="UTF-8"></head><body>
      <table border="1">
        <tr><td colspan="8" style="font-size:16px;font-weight:bold;">KIET KPI Report</td></tr>
        <tr><td>Position</td><td colspan="7">${escapeHtml(assignment.position.name)}</td></tr>
        <tr><td>Name</td><td colspan="7">${escapeHtml(personName)}</td></tr>
        <tr><td>Campus</td><td colspan="7">${escapeHtml(campusLabel)}</td></tr>
        <tr><td></td></tr>
        ${rows}
      </table>
    </body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `KPI_${assignment.position.name.replace(/[^a-zA-Z0-9]/g, "_")}.xls`;
    link.click();
  };


  const submitForApproval = async () => {
    setWorkflowBusy(true);
    const newStatus = isFinalAuthority ? "approved" : "submitted";
    const patch = { status: newStatus, submitted_at: new Date().toISOString() };
    if (isFinalAuthority) {
      const { data: sess } = await supabase.auth.getSession();
      patch.approved_at = new Date().toISOString();
      patch.approved_by = sess?.session?.user?.id || null;
    }
    const { error } = await supabase.from("assignments").update(patch).eq("id", assignment.id);
    if (!error) onStatusChange?.(newStatus);
    setWorkflowBusy(false);
  };

  const approve = async () => {
    setWorkflowBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const { error } = await supabase.from("assignments").update({
      status: "approved", approved_at: new Date().toISOString(), approved_by: sess?.session?.user?.id || null,
    }).eq("id", assignment.id);
    if (!error) onStatusChange?.("approved");
    setWorkflowBusy(false);
  };

  const saveCorrespondence = async () => {
    await supabase.from("assignments").update({
      deadline: corr.deadline || null, sent_date: corr.sent_date || null,
      received_date: corr.received_date || null, correspondence_notes: corr.correspondence_notes || null,
    }).eq("id", assignment.id);
  };

  if (areas === null) return <Loading />;

  const statusBadge = {
    draft: { label: "Draft", color: "#6B7280", bg: "#F9FAFB" },
    submitted: { label: "Submitted — Awaiting Approval", color: "#D97706", bg: "#FFFBEB" },
    approved: { label: "Approved", color: "#059669", bg: "#ECFDF5" },
  }[assignment.status || "draft"];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px 60px" }}>
      <div className="no-print" style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <span style={{ background: statusBadge.bg, color: statusBadge.color, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>{statusBadge.label}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.print()} style={{ fontSize: 11, color: "#6B7280", background: "none", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>🖨️ Print / Save PDF</button>
          <button onClick={exportExcel} style={{ fontSize: 11, color: "#6B7280", background: "none", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>📊 Export Excel</button>
          {!isAdmin && (assignment.status || "draft") === "draft" && (
            <button onClick={submitForApproval} disabled={workflowBusy} style={{ fontSize: 11, color: "white", background: BLUE, border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700 }}>
              {workflowBusy ? "Submitting..." : isFinalAuthority ? "Submit (Final Approval)" : "Submit for Approval"}
            </button>
          )}
          {!isAdmin && assignment.status === "submitted" && canApprove && (
            <button onClick={approve} disabled={workflowBusy} style={{ fontSize: 11, color: "white", background: "#059669", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700 }}>
              {workflowBusy ? "Approving..." : "Approve"}
            </button>
          )}
          {isAdmin && assignment.status !== "approved" && (
            <button onClick={approve} disabled={workflowBusy} style={{ fontSize: 11, color: "white", background: "#059669", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700 }}>
              {workflowBusy ? "Approving..." : "Approve (admin override)"}
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="no-print" style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1F2937", marginBottom: 10 }}>Correspondence Tracking</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 8 }}>
            {[["sent_date", "Guide Sent"], ["deadline", "Deadline"], ["received_date", "Received"]].map(([f, lbl]) => (
              <div key={f}>
                <label style={{ fontSize: 10, color: "#9CA3AF", display: "block", marginBottom: 2 }}>{lbl}</label>
                <input type="date" value={corr[f]} onChange={e => setCorr(c => ({ ...c, [f]: e.target.value }))}
                  style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 8px", fontSize: 12, boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <textarea value={corr.correspondence_notes} onChange={e => setCorr(c => ({ ...c, correspondence_notes: e.target.value }))}
            placeholder="Follow-up notes (e.g. reminder sent, phone call made...)" rows={2}
            style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 8px", fontSize: 12, boxSizing: "border-box", marginBottom: 8 }} />
          <button onClick={saveCorrespondence} style={{ fontSize: 11, color: "white", background: BLUE, border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 600 }}>Save Correspondence Info</button>
        </div>
      )}

      <style>{`
        @media print {
          body > *:not(.kiet-print-report) { display: none !important; }
          .kiet-print-report {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important; padding: 12px !important;
            max-height: none !important; overflow: visible !important;
            background: white !important;
          }
          .kiet-print-report table { page-break-inside: auto; }
          .kiet-print-report tr { page-break-inside: avoid; page-break-after: auto; }
          .kiet-print-report thead { display: table-header-group; }
          .kiet-print-report .kiet-print-area-title { page-break-after: avoid; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .kiet-print-report { display: none; }
      `}</style>

      <div className="kiet-screen-only">
      {areas.length === 0 && (
        <div style={{ background: "white", borderRadius: 12, padding: 20, color: "#9CA3AF", fontSize: 13 }}>
          No KPI areas defined for this position yet.
        </div>
      )}
      {areas.map(area => {
        const areaKpis = kpis.filter(k => k.area_id === area.id);
        const filled = areaKpis.filter(k => entries[k.id] && entries[k.id].status !== "na").length;
        const pct = areaKpis.length ? Math.round((filled / areaKpis.length) * 100) : 0;
        const tc = pct >= 80 ? "#059669" : pct >= 40 ? "#D97706" : "#DC2626";
        const open = openArea === area.id;
        return (
          <div key={area.id} style={{ background: "white", borderRadius: 14, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div onClick={() => setOpenArea(open ? null : area.id)} style={{ padding: 16, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1F2937" }}>Area {area.area_number}: {area.area_name}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{areaKpis.length} KPIs{areaKpis.length === 0 ? " — not yet added" : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: tc }}>{pct}%</span>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{open ? "▲" : "▼"}</span>
              </div>
            </div>
            {open && areaKpis.map(k => {
              const e = entries[k.id] || {};
              return (
                <div key={k.id} style={{ borderTop: "1px solid #F3F4F6", padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 2 }}>{k.kpi_number} — {k.label}</div>
                  {k.lower_is_better && <div style={{ fontSize: 10, color: "#7C3AED", marginBottom: 6 }}>Lower is better</div>}
                  {k.notes && <div style={{ fontSize: 10, color: "#D97706", marginBottom: 6 }}>{k.notes}</div>}
                  {(k.formula || k.data_source) && (
                    <div style={{ fontSize: 11, color: "#6B7280", background: "#F9FAFB", borderRadius: 8, padding: "6px 10px", marginBottom: 10, lineHeight: 1.4 }}>
                      {k.formula && <div><strong style={{ color: "#374151" }}>Formula:</strong> {k.formula}</div>}
                      {k.data_source && <div><strong style={{ color: "#374151" }}>Data source:</strong> {k.data_source}</div>}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8, marginBottom: 8 }}>
                    {[
                      ["baseline", "Baseline", k.baseline_guidance],
                      ["yr1_target", "Year 1", k.target_guidance],
                      ["yr2_target", "Year 2", null],
                      ["yr3_target", "Year 3", null],
                      ["benchmark", "Benchmark", k.benchmark_guidance],
                      ["actual", "Actual", null],
                    ].map(([f, lbl, guidance]) => (
                      <div key={f}>
                        <label style={{ fontSize: 10, color: "#9CA3AF", display: "block", marginBottom: 2 }}>{lbl}</label>
                        <input defaultValue={e[f] || ""} onBlur={ev => save(k.id, { [f]: ev.target.value })}
                          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 8px", fontSize: 12, boxSizing: "border-box" }} />
                        {guidance && <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 2, lineHeight: 1.3 }}>{guidance}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                    {Object.entries(S).map(([val, cfg]) => (
                      <button key={val} onClick={() => save(k.id, { status: val })}
                        style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid", fontSize: 10, fontWeight: 600, cursor: "pointer", borderColor: (e.status || "na") === val ? cfg.color : "#E5E7EB", background: (e.status || "na") === val ? cfg.color : "white", color: (e.status || "na") === val ? "white" : cfg.color }}>
                        {cfg.label}
                      </button>
                    ))}
                    {saving[k.id] && <span style={{ fontSize: 10, color: "#9CA3AF", alignSelf: "center" }}>Saving...</span>}
                  </div>
                  <input defaultValue={e.notes || ""} onBlur={ev => save(k.id, { notes: ev.target.value })} placeholder="Notes..."
                    style={{ width: "100%", border: "1px solid #F3F4F6", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: "#6B7280", boxSizing: "border-box" }} />
                </div>
              );
            })}
          </div>
        );
      })}
      </div>

      {createPortal(
      <div className="kiet-print-report" style={{ fontFamily: "'Segoe UI',Arial,sans-serif", color: "#111827" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "3px solid #003087", paddingBottom: 10, marginBottom: 14 }}>
          <img src={`${import.meta.env.BASE_URL}kiet-logo.jpg`} alt="KIET" style={{ height: 54 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#003087" }}>Karachi Institute of Economics & Technology (KIET)</div>
            <div style={{ fontSize: 12, color: "#374151" }}>KPI Performance Report</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16 }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px", fontWeight: 700, width: "15%", background: "#F3F4F6" }}>Position</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px", width: "35%" }}>{assignment.position.name}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px", fontWeight: 700, width: "15%", background: "#F3F4F6" }}>Campus</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px", width: "35%" }}>{campusLabel}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px", fontWeight: 700, background: "#F3F4F6" }}>Name</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px" }}>{personName}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px", fontWeight: 700, background: "#F3F4F6" }}>Status</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px" }}>{statusBadge.label}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px", fontWeight: 700, background: "#F3F4F6" }}>Submitted</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px" }}>{assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleDateString() : "—"}</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px", fontWeight: 700, background: "#F3F4F6" }}>Approved</td>
              <td style={{ border: "1px solid #D1D5DB", padding: "5px 8px" }}>{assignment.approved_at ? new Date(assignment.approved_at).toLocaleDateString() : "—"}</td>
            </tr>
          </tbody>
        </table>

        {areas.map(area => (
          <div key={area.id} style={{ marginBottom: 14 }}>
            <div className="kiet-print-area-title" style={{ background: "#003087", color: "white", fontWeight: 700, fontSize: 11, padding: "6px 10px" }}>
              Area {area.area_number}: {area.area_name}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ background: "#F3F4F6" }}>
                  <th style={{ border: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "left", width: "4%" }}>#</th>
                  <th style={{ border: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "left", width: "32%" }}>KPI</th>
                  <th style={{ border: "1px solid #D1D5DB", padding: "4px 6px", width: "10%" }}>Baseline</th>
                  <th style={{ border: "1px solid #D1D5DB", padding: "4px 6px", width: "9%" }}>Year 1</th>
                  <th style={{ border: "1px solid #D1D5DB", padding: "4px 6px", width: "9%" }}>Year 2</th>
                  <th style={{ border: "1px solid #D1D5DB", padding: "4px 6px", width: "9%" }}>Year 3</th>
                  <th style={{ border: "1px solid #D1D5DB", padding: "4px 6px", width: "10%" }}>Benchmark</th>
                  <th style={{ border: "1px solid #D1D5DB", padding: "4px 6px", width: "9%" }}>Actual</th>
                  <th style={{ border: "1px solid #D1D5DB", padding: "4px 6px", width: "8%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {kpis.filter(k => k.area_id === area.id).map(k => {
                  const e = entries[k.id] || {};
                  const st = S[e.status || "na"];
                  return (
                    <tr key={k.id}>
                      <td style={{ border: "1px solid #D1D5DB", padding: "4px 6px" }}>{k.kpi_number}</td>
                      <td style={{ border: "1px solid #D1D5DB", padding: "4px 6px" }}>{k.label}</td>
                      <td style={{ border: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "center" }}>{e.baseline || ""}</td>
                      <td style={{ border: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "center" }}>{e.yr1_target || ""}</td>
                      <td style={{ border: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "center" }}>{e.yr2_target || ""}</td>
                      <td style={{ border: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "center" }}>{e.yr3_target || ""}</td>
                      <td style={{ border: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "center" }}>{e.benchmark || ""}</td>
                      <td style={{ border: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "center", fontWeight: 700 }}>{e.actual || ""}</td>
                      <td style={{ border: "1px solid #D1D5DB", padding: "4px 6px", textAlign: "center", color: st.color, fontWeight: 700 }}>{st.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        <div style={{ marginTop: 20, breakInside: "avoid" }}>
          <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>Comments / Remarks</div>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ borderBottom: "1px solid #9CA3AF", height: 20 }} />
          ))}
        </div>

        <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between", breakInside: "avoid" }}>
          {["Prepared by", "Verified by", "Approved by"].map(role => (
            <div key={role} style={{ width: "30%" }}>
              <div style={{ borderTop: "1px solid #111827", paddingTop: 6, fontSize: 10, textAlign: "center" }}>
                {role}<br />Name / Signature / Date
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, fontSize: 9, color: "#9CA3AF", textAlign: "center", borderTop: "1px solid #E5E7EB", paddingTop: 6 }}>
          Generated from the KIET KPI Compliance Dashboard on {new Date().toLocaleDateString()}
        </div>
      </div>,
      document.body
      )}
    </div>
  );
}

/* ================= ADMIN APP ================= */

function AdminApp({ profile }) {
  const [tab, setTab] = useState(() => sessionStorage.getItem("kiet-admin-tab") || "tracker");
  const [profileData, setProfileData] = useState(profile);
  const logout = () => supabase.auth.signOut();

  const changeTab = (t) => {
    setTab(t);
    sessionStorage.setItem("kiet-admin-tab", t);
  };

  const ADMIN_NAV = [
    { id: "tracker", icon: "📋", label: "Tracker" },
    { id: "approvals", icon: "✅", label: "Approvals" },
    { id: "users", icon: "👥", label: "Users & Assignments" },
    { id: "master", icon: "🗂️", label: "Master Data" },
    { id: "history", icon: "🕒", label: "History" },
    { id: "orgchart", icon: "🏛️", label: "Org Chart" },
    { id: "notifications", icon: "🔔", label: "Notifications" },
  ];
  const ADMIN_COMING_SOON = [
    { id: "bulk", icon: "➕", label: "Bulk Onboarding" },
  ];
  const PAGE_TITLES = { tracker: "Tracker", approvals: "Approvals", users: "Users & Assignments", master: "Master Data", history: "History", orgchart: "Org Chart", notifications: "Notifications", profile: "My Profile" };

  return (
    <AppShell
      nav={{ items: ADMIN_NAV, comingSoon: ADMIN_COMING_SOON }}
      activeId={tab}
      onSelect={changeTab}
      brandTitle="KIET KPI Dashboard"
      brandSubtitle="Registrar Office"
      profile={profileData}
      onOpenProfile={() => changeTab("profile")}
      onLogout={logout}
      pageTitle={PAGE_TITLES[tab] || ""}
    >
      {tab === "tracker" ? <AdminTracker />
        : tab === "approvals" ? <AdminApprovals />
        : tab === "users" ? <AdminUsers />
        : tab === "master" ? <AdminMasterData />
        : tab === "history" ? <AdminHistory />
        : tab === "orgchart" ? <AdminOrgChart />
        : tab === "notifications" ? <NotificationsScreen isAdmin={true} />
        : tab === "profile" ? <ProfileScreen profile={profileData} onUpdated={setProfileData} />
        : null}
    </AppShell>
  );
}

function NotificationsScreen({ isAdmin }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("notification_log")
        .select("id, created_at, notif_type, email_to, status, channel, assignment:assignments(position:positions(name), campus_code, campuses(name)), recipient:profiles!recipient_user_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows(data || []);
    })();
  }, []);

  const TYPE_LABEL = {
    submitted: { label: "Submission alert", color: "#D97706", bg: "#FFFBEB" },
    approved: { label: "Approval confirmation", color: "#059669", bg: "#ECFDF5" },
    deadline_reminder: { label: "Deadline reminder", color: "#DC2626", bg: "#FEF2F2" },
  };
  const CHANNEL_LABEL = {
    email: { label: "Email", color: "#1D4ED8", bg: "#EFF6FF" },
    whatsapp: { label: "WhatsApp", color: "#059669", bg: "#ECFDF5" },
  };

  if (rows === null) return <Loading />;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 24px 60px" }}>
      <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>
        {isAdmin
          ? "Every notification sent by the system so far (email and WhatsApp) — submissions, approvals, and deadline reminders, across all users."
          : "Notifications sent to you (email and WhatsApp) — submissions awaiting your approval, approval confirmations, and deadline reminders."}
      </div>
      {rows.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", marginTop: 40 }}>No notifications sent yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(r => {
          const t = TYPE_LABEL[r.notif_type] || { label: r.notif_type, color: "#6B7280", bg: "#F9FAFB" };
          const c = CHANNEL_LABEL[r.channel] || { label: r.channel || "email", color: "#6B7280", bg: "#F9FAFB" };
          return (
            <div key={r.id} style={{ background: "white", borderRadius: 12, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.color, background: t.bg, padding: "2px 8px", borderRadius: 10 }}>{t.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, padding: "2px 8px", borderRadius: 10 }}>{c.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#1F2937" }}>{r.assignment?.position?.name || "—"}</span>
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>
                  {isAdmin && r.recipient?.full_name ? `To ${r.recipient.full_name} · ` : ""}
                  {r.assignment?.campuses?.name || r.assignment?.campus_code} · {r.email_to}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>{new Date(r.created_at).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminOrgChart() {
  const [positions, setPositions] = useState(null);
  const [holdersByPosition, setHoldersByPosition] = useState({});

  useEffect(() => {
    (async () => {
      const { data: pos } = await supabase.from("positions").select("id, name, reports_to_position_id, kpi_source").order("name");
      const { data: asg } = await supabase.from("assignments").select("position_id, campus_code, campuses(name), user:profiles!user_id(full_name)");
      const map = {};
      (asg || []).forEach(a => {
        if (!map[a.position_id]) map[a.position_id] = [];
        map[a.position_id].push({ name: a.user?.full_name || "(unnamed)", campus: a.campuses?.name || a.campus_code });
      });
      setPositions(pos || []);
      setHoldersByPosition(map);
    })();
  }, []);

  if (positions === null) return <Loading />;

  const byParent = {};
  positions.forEach(p => {
    const key = p.reports_to_position_id || "root";
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(p);
  });
  const roots = byParent["root"] || [];

  return (
    <div style={{ padding: "20px 24px 60px" }}>
      <style>{`
        .kiet-orgchart { text-align: center; }
        .kiet-orgchart ul { padding-top: 20px; position: relative; }
        .kiet-orgchart ul::after { content: ''; display: table; clear: both; }
        .kiet-orgchart li {
          float: left; text-align: center;
          list-style-type: none;
          position: relative;
          padding: 20px 10px 0 10px;
        }
        .kiet-orgchart li::before, .kiet-orgchart li::after {
          content: '';
          position: absolute; top: 0; right: 50%;
          border-top: 2px solid #CBD5E1;
          width: 50%; height: 20px;
        }
        .kiet-orgchart li::after { right: auto; left: 50%; border-left: 2px solid #CBD5E1; }
        .kiet-orgchart li:only-child::after, .kiet-orgchart li:only-child::before { display: none; }
        .kiet-orgchart li:only-child { padding-top: 0; }
        .kiet-orgchart li:first-child::before, .kiet-orgchart li:last-child::after { border: 0 none; }
        .kiet-orgchart li:last-child::before { border-right: 2px solid #CBD5E1; border-radius: 0 5px 0 0; }
        .kiet-orgchart li:first-child::after { border-radius: 5px 0 0 0; }
        .kiet-orgchart ul ul::before {
          content: '';
          position: absolute; top: 0; left: 50%;
          border-left: 2px solid #CBD5E1;
          width: 0; height: 20px;
        }
        .kiet-orgbox {
          display: inline-block;
          border: 1px solid #E5E7EB; border-radius: 10px;
          padding: 10px 14px; background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          min-width: 160px; text-align: left;
        }
      `}</style>
      <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>
        Built from each position's "reports to" setting in Master Data. Positions with no reporting line set (including those still undecided) appear as top-level here. Scroll sideways if the chart is wider than your screen.
      </div>
      <div style={{ overflowX: "auto", paddingBottom: 20 }}>
        <div className="kiet-orgchart">
          <ul style={{ display: "inline-block" }}>
            {roots.map(p => <OrgChartNode key={p.id} position={p} byParent={byParent} holdersByPosition={holdersByPosition} />)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function OrgChartNode({ position: p, byParent, holdersByPosition }) {
  const children = byParent[p.id] || [];
  const holders = holdersByPosition[p.id] || [];
  return (
    <li>
      <div className="kiet-orgbox">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#1F2937" }}>{p.name}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, color: (p.kpi_source || "SHEC") === "SHEC" ? "#1D4ED8" : "#7C3AED", background: (p.kpi_source || "SHEC") === "SHEC" ? "#EFF6FF" : "#F5F3FF" }}>
            {p.kpi_source || "SHEC"}
          </span>
        </div>
        {holders.length > 0 ? (
          holders.map((h, i) => <div key={i} style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{h.name} · {h.campus}</div>)
        ) : (
          <div style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}>Vacant</div>
        )}
      </div>
      {children.length > 0 && (
        <ul>
          {children.map(c => <OrgChartNode key={c.id} position={c} byParent={byParent} holdersByPosition={holdersByPosition} />)}
        </ul>
      )}
    </li>
  );
}

function AdminTracker() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("cards"); // cards | analytics
  const [sourceFilter, setSourceFilter] = useState("all"); // all | SHEC | KIET

  const load = async () => {
    const { data } = await supabase
      .from("assignments")
      .select("id, campus_code, status, deadline, sent_date, received_date, correspondence_notes, reports_to_assignment_id, campuses(name), position:positions(id,name,category,reports_to_position_id,kpi_source), user:profiles!user_id(full_name)")
      .order("id");
    setRows(data || []);
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    await load();
  };

  if (rows === null) return <Loading />;

  const statusColor = { draft: "#6B7280", submitted: "#D97706", approved: "#059669" };
  const filteredRows = sourceFilter === "all" ? rows : rows.filter(a => (a.position.kpi_source || "SHEC") === sourceFilter);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 60px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[["cards", "📋 Cards"], ["analytics", "📊 Analytics"]].map(([id, lbl]) => (
            <button key={id} onClick={() => setView(id)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid " + (view === id ? BLUE : "#E5E7EB"), cursor: "pointer", fontSize: 12, fontWeight: 600, background: view === id ? BLUE : "white", color: view === id ? "white" : "#6B7280" }}>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["all", "All"], ["SHEC", "SHEC-Mandated"], ["KIET", "KIET-Internal"]].map(([id, lbl]) => (
            <button key={id} onClick={() => setSourceFilter(id)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid " + (sourceFilter === id ? BLUE : "#E5E7EB"), cursor: "pointer", fontSize: 11, fontWeight: 600, background: sourceFilter === id ? BLUE : "white", color: sourceFilter === id ? "white" : "#6B7280" }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
      {view === "analytics" ? <AdminAnalytics rows={filteredRows} onSelectAssignment={setEditing} /> : (() => {
        const renderCard = a => (
          <div key={a.id} onClick={() => setEditing(a)} style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: "pointer", borderTop: `4px solid ${statusColor[a.status || "draft"]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1F2937" }}>{a.position.name}</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: (a.position.kpi_source || "SHEC") === "SHEC" ? BLUE : "#7C3AED", background: (a.position.kpi_source || "SHEC") === "SHEC" ? "#EFF6FF" : "#F5F3FF", padding: "2px 6px", borderRadius: 10 }}>
                {(a.position.kpi_source || "SHEC") === "SHEC" ? "SHEC" : "KIET"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{a.campuses?.name || a.campus_code}</div>
            <div style={{ fontSize: 11, color: BLUE, fontWeight: 600, marginTop: 6 }}>{a.user?.full_name || "Unassigned"}</div>
            <div style={{ fontSize: 10, color: statusColor[a.status || "draft"], fontWeight: 700, marginTop: 6, textTransform: "uppercase" }}>{a.status || "draft"}</div>
            {a.deadline && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Deadline: {a.deadline}</div>}
          </div>
        );

        if (filteredRows.length === 0) {
          return <div style={{ color: "#9CA3AF", fontSize: 13 }}>No assignments in this view yet.</div>;
        }

        if (sourceFilter !== "all") {
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
              {filteredRows.map(renderCard)}
            </div>
          );
        }

        const shecRows = filteredRows.filter(a => (a.position.kpi_source || "SHEC") === "SHEC");
        const kietRows = filteredRows.filter(a => (a.position.kpi_source || "SHEC") === "KIET");

        return (
          <>
            {shecRows.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                  SHEC-Mandated Positions ({shecRows.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, marginBottom: 24 }}>
                  {shecRows.map(renderCard)}
                </div>
              </>
            )}
            {kietRows.length > 0 && (
              <>
                <div style={{ height: 2, background: "linear-gradient(to right, transparent, #E5E7EB 15%, #E5E7EB 85%, transparent)", marginBottom: 20 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                  KIET-Internal Positions ({kietRows.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
                  {kietRows.map(renderCard)}
                </div>
              </>
            )}
          </>
        );
      })()}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
          <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 900, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
            <div className="no-print" style={{ background: BLUE, padding: "16px 22px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{editing.position.name}</div>
                <div style={{ color: "#93C5FD", fontSize: 11 }}>{editing.user?.full_name} · {editing.campuses?.name || editing.campus_code}</div>
              </div>
              <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", color: "#93C5FD", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            <KpiEntry assignment={editing} isAdmin={true} onStatusChange={refresh} />
          </div>
        </div>
      )}
    </div>
  );
}

function AdminApprovals() {
  const [pending, setPending] = useState(null);
  const [approved, setApproved] = useState([]);
  const [editing, setEditing] = useState(null);

  const SELECT = "id, campus_code, status, deadline, sent_date, received_date, correspondence_notes, reports_to_assignment_id, approved_at, campuses(name), position:positions(id,name,category,reports_to_position_id,kpi_source), user:profiles!user_id(full_name), approver:profiles!approved_by(full_name)";

  const load = async () => {
    const { data: p } = await supabase.from("assignments").select(SELECT).eq("status", "submitted").order("id");
    const { data: a } = await supabase.from("assignments").select(SELECT).eq("status", "approved").order("approved_at", { ascending: false }).limit(20);
    setPending(p || []);
    setApproved(a || []);
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    await load();
    setEditing(null);
  };

  if (pending === null) return <Loading />;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 24px 60px" }}>
      <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>
        Everything currently in "Submitted" status, across all positions and campuses, waiting on an approval decision. As admin, you can always review and approve (override) regardless of who the actual supervisor is.
      </div>
      {pending.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", margin: "20px 0 30px" }}>Nothing pending approval right now.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 30 }}>
        {pending.map(a => (
          <div key={a.id} style={{ background: "white", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#1F2937", fontSize: 14 }}>{a.position.name}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>{a.user?.full_name || "Unassigned"} · {a.campuses?.name || a.campus_code}</div>
              {a.deadline && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Deadline: {a.deadline}</div>}
            </div>
            <button onClick={() => setEditing(a)} style={{ fontSize: 12, color: BLUE, background: "none", border: `1px solid ${BLUE}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>Review</button>
          </div>
        ))}
      </div>

      {approved.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Recently Approved</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {approved.map(a => (
              <div key={a.id} style={{ background: "white", borderRadius: 12, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", opacity: 0.9 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#1F2937", fontSize: 13 }}>{a.position.name}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>{a.user?.full_name || "Unassigned"} · {a.campuses?.name || a.campus_code}</div>
                  <div style={{ fontSize: 11, color: "#059669", marginTop: 2 }}>
                    Approved by {a.approver?.full_name || "unknown"}{a.approved_at ? ` on ${new Date(a.approved_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <button onClick={() => setEditing(a)} style={{ fontSize: 11, color: "#6B7280", background: "none", border: "1px solid #E5E7EB", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontWeight: 600 }}>View</button>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
          <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 900, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
            <div className="no-print" style={{ background: BLUE, padding: "16px 22px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{editing.position.name}</div>
                <div style={{ color: "#93C5FD", fontSize: 11 }}>{editing.user?.full_name} · {editing.campuses?.name || editing.campus_code}</div>
              </div>
              <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", color: "#93C5FD", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            <KpiEntry assignment={editing} isAdmin={true} onStatusChange={refresh} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= ANALYTICS ================= */

function AdminAnalytics({ rows, onSelectAssignment }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [{ data: areas }, { data: kpis }, { data: entries }] = await Promise.all([
        supabase.from("kpi_areas").select("id, position_id"),
        supabase.from("kpis").select("id, area_id"),
        supabase.from("kpi_entries").select("assignment_id, status"),
      ]);

      const areaToPosition = {};
      (areas || []).forEach(a => { areaToPosition[a.id] = a.position_id; });

      const kpiCountByPosition = {};
      (kpis || []).forEach(k => {
        const posId = areaToPosition[k.area_id];
        if (posId) kpiCountByPosition[posId] = (kpiCountByPosition[posId] || 0) + 1;
      });

      const entriesByAssignment = {};
      (entries || []).forEach(e => {
        if (!entriesByAssignment[e.assignment_id]) entriesByAssignment[e.assignment_id] = [];
        entriesByAssignment[e.assignment_id].push(e.status);
      });

      const statusTotals = { green: 0, amber: 0, red: 0, na: 0 };
      const perAssignment = rows.map(a => {
        const total = kpiCountByPosition[a.position.id] || 0;
        const statuses = entriesByAssignment[a.id] || [];
        let green = 0, amber = 0, red = 0;
        statuses.forEach(s => {
          if (s === "green") green++;
          else if (s === "amber") amber++;
          else if (s === "red") red++;
        });
        const filled = green + amber + red;
        const na = Math.max(total - filled, 0);
        statusTotals.green += green; statusTotals.amber += amber; statusTotals.red += red; statusTotals.na += na;
        const pct = total ? Math.round((filled / total) * 100) : 0;
        return { assignment: a, total, filled, pct };
      });

      setData({ perAssignment, statusTotals });
    })();
  }, [rows]);

  if (!data) return <Loading />;

  const { perAssignment, statusTotals } = data;
  const pieData = [
    { name: "Green", value: statusTotals.green, color: "#059669" },
    { name: "Amber", value: statusTotals.amber, color: "#D97706" },
    { name: "Red", value: statusTotals.red, color: "#DC2626" },
    { name: "Not Started", value: statusTotals.na, color: "#9CA3AF" },
  ].filter(d => d.value > 0);

  const overallPct = perAssignment.length
    ? Math.round(perAssignment.reduce((s, p) => s + p.pct, 0) / perAssignment.length) : 0;
  const complete = perAssignment.filter(p => p.pct === 100).length;
  const notStarted = perAssignment.filter(p => p.pct === 0).length;
  const tc = (pct) => pct >= 80 ? "#059669" : pct >= 40 ? "#D97706" : "#DC2626";

  const exportCsv = async () => {
    const { data: entries } = await supabase
      .from("kpi_entries")
      .select("assignment_id, kpi_id, baseline, yr1_target, yr2_target, yr3_target, benchmark, actual, status, notes, kpis(kpi_number, label, area_id, kpi_areas(area_name, position_id))");
    const rowsForCsv = (entries || []).map(e => {
      const a = rows.find(r => r.id === e.assignment_id);
      return {
        Position: a?.position.name || "",
        Person: a?.user?.full_name || "",
        Campus: a?.campuses?.name || a?.campus_code || "",
        Area: e.kpis?.kpi_areas?.area_name || "",
        "KPI #": e.kpis?.kpi_number || "",
        "KPI Label": e.kpis?.label || "",
        Baseline: e.baseline || "",
        "Year 1": e.yr1_target || "",
        "Year 2": e.yr2_target || "",
        "Year 3": e.yr3_target || "",
        Benchmark: e.benchmark || "",
        Actual: e.actual || "",
        Status: e.status || "",
        Notes: e.notes || "",
      };
    });
    const csv = Papa.unparse(rowsForCsv);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kiet-kpi-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={exportCsv} style={{ background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          ⬇ Export All KPI Data (CSV)
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
        {[
          { label: "Assignments", val: perAssignment.length, color: BLUE },
          { label: "Avg Completion", val: overallPct + "%", color: tc(overallPct) },
          { label: "Fully Complete", val: complete, color: "#059669" },
          { label: "Not Started", val: notStarted, color: "#9CA3AF" },
        ].map(s => (
          <div key={s.label} style={{ background: "white", borderLeft: `4px solid ${s.color}`, borderRadius: 10, padding: "12px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ color: s.color, fontSize: 24, fontWeight: 700 }}>{s.val}</div>
            <div style={{ color: "#6B7280", fontSize: 11, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 20 }}>
        <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 16 }}>KPI Status Distribution</div>
          {pieData.length === 0 ? <div style={{ color: "#9CA3AF", fontSize: 13 }}>No KPI data entered yet.</div> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v + " KPIs", n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B7280" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 16 }}>Completion % by Assignment</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perAssignment.map(p => ({ name: p.assignment.user?.full_name || p.assignment.position.name, pct: p.pct }))} margin={{ bottom: 60 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={v => [`${v}%`, "Completion"]} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {perAssignment.map((p, i) => <Cell key={i} fill={tc(p.pct)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflowX: "auto" }}>
        <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 16 }}>Full Summary</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
              {["Position", "Person", "Campus", "KPIs", "Filled", "Completion"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "#9CA3AF", fontSize: 10 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {perAssignment.map(p => (
              <tr key={p.assignment.id} onClick={() => onSelectAssignment(p.assignment)} style={{ borderBottom: "1px solid #F9FAFB", cursor: "pointer" }}>
                <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1F2937", whiteSpace: "nowrap" }}>{p.assignment.position.name}</td>
                <td style={{ padding: "8px 10px", color: "#6B7280" }}>{p.assignment.user?.full_name || "—"}</td>
                <td style={{ padding: "8px 10px", color: "#9CA3AF", fontSize: 11 }}>{p.assignment.campuses?.name || p.assignment.campus_code}</td>
                <td style={{ padding: "8px 10px", color: "#6B7280" }}>{p.total}</td>
                <td style={{ padding: "8px 10px", color: "#6B7280" }}>{p.filled}</td>
                <td style={{ padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ height: 4, width: 60, background: "#F3F4F6", borderRadius: 99 }}><div style={{ height: "100%", width: `${p.pct}%`, background: tc(p.pct), borderRadius: 99 }} /></div>
                    <span style={{ color: tc(p.pct), fontWeight: 700, fontSize: 11 }}>{p.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {perAssignment.length === 0 && <tr><td colSpan={6} style={{ padding: 8, color: "#9CA3AF" }}>No assignments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchableSelect({ value, onChange, options, placeholder = "Select..." }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef(null);

  useEffect(() => {
    const onDocClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find(o => String(o.id) === String(value));
  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        value={open ? query : (selected ? selected.label : "")}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        placeholder={placeholder}
        style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px", fontSize: 12, boxSizing: "border-box" }}
      />
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "white", border: "1px solid #E5E7EB", borderRadius: 8, marginTop: 2, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
          <div
            onMouseDown={e => { e.preventDefault(); onChange(""); setQuery(""); setOpen(false); }}
            style={{ padding: "7px 10px", fontSize: 12, color: "#9CA3AF", cursor: "pointer" }}
          >
            Select...
          </div>
          {filtered.map(o => (
            <div key={o.id}
              onMouseDown={e => { e.preventDefault(); onChange(o.id); setQuery(""); setOpen(false); }}
              style={{ padding: "7px 10px", fontSize: 12, cursor: "pointer", background: String(o.id) === String(value) ? "#EFF6FF" : "white" }}
            >
              {o.label}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: "7px 10px", fontSize: 12, color: "#9CA3AF" }}>No matches</div>}
        </div>
      )}
    </div>
  );
}

function AdminUsers() {
  const [profiles, setProfiles] = useState(null);
  const [positions, setPositions] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ userId: "", positionId: "", campusCode: "", shiftId: "" });
  const [msg, setMsg] = useState("");

  const [reassigning, setReassigning] = useState(null);
  const [reassignTo, setReassignTo] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ full_name: "", phone: "", date_of_joining: "" });
  const [settingOverride, setSettingOverride] = useState(null); // assignment id
  const [overrideTo, setOverrideTo] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const loadAll = async () => {
    const [{ data: p }, { data: pos }, { data: camp }, { data: sh }, { data: asn }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("positions").select("*").order("name"),
      supabase.from("campuses").select("*").order("name"),
      supabase.from("shifts").select("*").order("name"),
      supabase.from("assignments").select("id,user_id,campus_code,shift_id,reports_to_assignment_id,position:positions(id,name),campuses(name),shifts(name)"),
    ]);
    setProfiles(p || []); setPositions(pos || []); setCampuses(camp || []); setShifts(sh || []); setAssignments(asn || []);
  };

  useEffect(() => { loadAll(); }, []);

  const addAssignment = async () => {
    if (!form.userId || !form.positionId || !form.campusCode) { setMsg("Pick a user, position, and campus."); return; }
    const { error } = await supabase.from("assignments").insert({
      user_id: form.userId, position_id: form.positionId, campus_code: form.campusCode,
      shift_id: form.shiftId || null,
    });
    setMsg(error ? error.message : "Assignment added.");
    if (!error) { loadAll(); setForm({ userId: "", positionId: "", campusCode: "", shiftId: "" }); }
  };

  const removeAssignment = async (id) => {
    if (!window.confirm("Remove this assignment? The person's KPI entries for it will stay in the database but won't be reachable from the UI unless reassigned again.")) return;
    await supabase.from("assignments").delete().eq("id", id);
    loadAll();
  };

  const saveReassign = async (id) => {
    if (!reassignTo) return;
    const { error } = await supabase.from("assignments").update({ user_id: reassignTo }).eq("id", id);
    if (!error) { setReassigning(null); setReassignTo(""); loadAll(); }
  };

  const saveOverride = async (id) => {
    const { error } = await supabase.from("assignments").update({ reports_to_assignment_id: overrideTo || null }).eq("id", id);
    if (!error) { setSettingOverride(null); setOverrideTo(""); loadAll(); }
  };

  const toggleAdmin = async (id, current) => {
    await supabase.from("profiles").update({ role: current === "admin" ? "user" : "admin" }).eq("id", id);
    loadAll();
  };

  const saveUserEdit = async (id) => {
    const { error } = await supabase.from("profiles").update({
      full_name: userForm.full_name.trim(),
      phone: userForm.phone.trim() || null,
      date_of_joining: userForm.date_of_joining || null,
    }).eq("id", id);
    if (!error) { setEditingUser(null); loadAll(); }
    else alert(error.message);
  };

  if (profiles === null) return <Loading />;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 4 }}>Add a Position Assignment</div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12 }}>
          The person must have signed up at least once before they appear here. Need a new position, campus, or shift first? Add it under Master Data.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Person</label>
            <SearchableSelect
              value={form.userId}
              onChange={id => setForm(f => ({ ...f, userId: id }))}
              options={profiles.map(p => ({ id: p.id, label: p.full_name }))}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Position</label>
            <SearchableSelect
              value={form.positionId}
              onChange={id => setForm(f => ({ ...f, positionId: id }))}
              options={positions.map(p => ({ id: p.id, label: p.name }))}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Campus</label>
            <select value={form.campusCode} onChange={e => setForm(f => ({ ...f, campusCode: e.target.value }))} style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px", fontSize: 12 }}>
              <option value="">Select...</option>
              {campuses.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Shift (optional)</label>
            <select value={form.shiftId} onChange={e => setForm(f => ({ ...f, shiftId: e.target.value }))} style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px", fontSize: 12 }}>
              <option value="">—</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button onClick={addAssignment} style={{ background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>
        </div>
        {msg && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 8 }}>{msg}</div>}
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflowX: "auto" }}>
        <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 4 }}>All Assignments</div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12 }}>
          "Reports To" defaults to whoever holds the parent position (set under Master Data). Use Override here only when a specific case needs to bypass that general rule — e.g. a person reporting directly to a named individual instead of the position.
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
              {["Position", "Campus", "Shift", "Person", "Reports To (override)", "Action"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#9CA3AF", fontSize: 10 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                <td style={{ padding: "8px", fontWeight: 600, color: "#1F2937", whiteSpace: "nowrap" }}>{a.position.name}</td>
                <td style={{ padding: "8px", color: "#9CA3AF" }}>{a.campuses?.name || a.campus_code}</td>
                <td style={{ padding: "8px", color: "#9CA3AF" }}>{a.shifts?.name || "—"}</td>
                <td style={{ padding: "8px", color: "#6B7280", minWidth: 180 }}>
                  {reassigning === a.id ? (
                    <SearchableSelect
                      value={reassignTo}
                      onChange={id => setReassignTo(id)}
                      options={profiles.map(p => ({ id: p.id, label: p.full_name }))}
                      placeholder="Select new person..."
                    />
                  ) : (
                    profiles.find(p => p.id === a.user_id)?.full_name || "Unassigned"
                  )}
                </td>
                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                  {settingOverride === a.id ? (
                    <select value={overrideTo} onChange={e => setOverrideTo(e.target.value)} style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", fontSize: 11, maxWidth: 200 }}>
                      <option value="">— Use position default —</option>
                      {assignments.filter(o => o.id !== a.id).map(o => (
                        <option key={o.id} value={o.id}>
                          {profiles.find(p => p.id === o.user_id)?.full_name || "Unassigned"} ({o.position.name})
                        </option>
                      ))}
                    </select>
                  ) : a.reports_to_assignment_id ? (
                    (() => {
                      const overrideA = assignments.find(o => o.id === a.reports_to_assignment_id);
                      const overrideName = overrideA ? (profiles.find(p => p.id === overrideA.user_id)?.full_name || "Unassigned") : "—";
                      return <span style={{ color: "#7C3AED", fontWeight: 600 }}>{overrideName} (override)</span>;
                    })()
                  ) : (
                    <span style={{ color: "#9CA3AF" }}>Position default</span>
                  )}
                </td>
                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                  {reassigning === a.id ? (
                    <>
                      <button onClick={() => saveReassign(a.id)} style={{ fontSize: 11, color: "#059669", background: "none", border: "1px solid #059669", borderRadius: 6, padding: "3px 8px", cursor: "pointer", marginRight: 4 }}>Save</button>
                      <button onClick={() => { setReassigning(null); setReassignTo(""); }} style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>Cancel</button>
                    </>
                  ) : settingOverride === a.id ? (
                    <>
                      <button onClick={() => saveOverride(a.id)} style={{ fontSize: 11, color: "#059669", background: "none", border: "1px solid #059669", borderRadius: 6, padding: "3px 8px", cursor: "pointer", marginRight: 4 }}>Save</button>
                      <button onClick={() => { setSettingOverride(null); setOverrideTo(""); }} style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setReassigning(a.id); setReassignTo(a.user_id || ""); }} style={{ fontSize: 11, color: BLUE, background: "none", border: `1px solid ${BLUE}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", marginRight: 4 }}>Reassign</button>
                      <button onClick={() => { setSettingOverride(a.id); setOverrideTo(a.reports_to_assignment_id || ""); }} style={{ fontSize: 11, color: "#7C3AED", background: "none", border: "1px solid #7C3AED", borderRadius: 6, padding: "3px 8px", cursor: "pointer", marginRight: 4 }}>Override</button>
                      <button onClick={() => removeAssignment(a.id)} style={{ fontSize: 11, color: "#DC2626", background: "none", border: "1px solid #DC2626", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>Remove</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "8px", color: "#9CA3AF" }}>No assignments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontWeight: 700, color: "#1F2937" }}>All Users ({profiles.length})</div>
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or phone..."
            style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 10px", fontSize: 12, width: 240, boxSizing: "border-box" }} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
              {["Name", "Phone", "Joined", "Role", "Assignments", "Action"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#9CA3AF", fontSize: 10 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {profiles
              .filter(p => !userSearch || (p.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) || (p.phone || "").includes(userSearch))
              .map(p => {
              const their = assignments.filter(a => a.user_id === p.id);
              const isEditing = editingUser === p.id;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                  <td style={{ padding: "8px", fontWeight: 600, color: "#1F2937", whiteSpace: "nowrap" }}>
                    {isEditing ? (
                      <input value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))}
                        style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", fontSize: 12, width: 130 }} />
                    ) : p.full_name}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {isEditing ? (
                      <input value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} placeholder="03xx-xxxxxxx"
                        style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", fontSize: 12, width: 110 }} />
                    ) : (p.phone || "—")}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {isEditing ? (
                      <input type="date" value={userForm.date_of_joining} onChange={e => setUserForm(f => ({ ...f, date_of_joining: e.target.value }))}
                        style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", fontSize: 12 }} />
                    ) : (p.date_of_joining || "—")}
                  </td>
                  <td style={{ padding: "8px" }}>{p.role}</td>
                  <td style={{ padding: "8px", color: "#6B7280" }}>
                    {their.length === 0 ? "—" : their.map(a => `${a.position.name} (${a.campuses?.name || a.campus_code})`).join(", ")}
                  </td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => saveUserEdit(p.id)} style={{ fontSize: 11, color: "#059669", background: "none", border: "1px solid #059669", borderRadius: 6, padding: "3px 8px", cursor: "pointer", marginRight: 4 }}>Save</button>
                        <button onClick={() => setEditingUser(null)} style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 8px", cursor: "pointer", marginRight: 4 }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => { setEditingUser(p.id); setUserForm({ full_name: p.full_name || "", phone: p.phone || "", date_of_joining: p.date_of_joining || "" }); }} style={{ fontSize: 11, color: BLUE, background: "none", border: `1px solid ${BLUE}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", marginRight: 4 }}>Edit</button>
                    )}
                    <button onClick={() => toggleAdmin(p.id, p.role)} style={{ fontSize: 11, color: BLUE, background: "none", border: `1px solid ${BLUE}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>
                      {p.role === "admin" ? "Revoke Admin" : "Make Admin"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= MASTER DATA ================= */

function SimpleList({ title, table, items, newVal, setNewVal, placeholder, editing, setEditing, addSimple, renameSimple }) {
  return (
    <div style={MD_CARD}>
      <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder={placeholder} style={MD_INPUT} />
        <button onClick={() => addSimple(table, { name: newVal.trim() }, () => setNewVal(""))} style={MD_BTN}>Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
        {items.map(it => (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            {editing?.table === table && editing?.key === it.id ? (
              <>
                <input value={editing.value} onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                  style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 6px", fontSize: 12 }} />
                <button onClick={() => renameSimple(table, "id", it.id, "name", editing.value)} style={{ color: "#059669", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Save</button>
                <button onClick={() => setEditing(null)} style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, color: "#374151" }}>{it.name}</span>
                <button onClick={() => setEditing({ table, key: it.id, value: it.name })} style={{ color: BLUE, background: "none", border: "none", cursor: "pointer" }}>Edit</button>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 12 }}>none yet</div>}
      </div>
    </div>
  );
}

function AdminMasterData() {
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [newDept, setNewDept] = useState("");
  const [newLevel, setNewLevel] = useState("");
  const [newShift, setNewShift] = useState("");
  const [newCamp, setNewCamp] = useState({ code: "", name: "" });
  const [newPos, setNewPos] = useState({ name: "", levelId: "", departmentId: "", reportsToId: "", source: "KIET" });

  const [editing, setEditing] = useState(null); // { table, key, field, value }

  const [importPositionId, setImportPositionId] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [importing, setImporting] = useState(false);

  const loadAll = async () => {
    const [{ data: d }, { data: l }, { data: s }, { data: p }, { data: c }] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("position_levels").select("*").order("name"),
      supabase.from("shifts").select("*").order("name"),
      supabase.from("positions").select("*, level:position_levels(name), department:departments(name), reports_to:reports_to_position_id(name)").order("name"),
      supabase.from("campuses").select("*").order("name"),
    ]);
    setDepartments(d || []); setLevels(l || []); setShifts(s || []); setPositions(p || []); setCampuses(c || []);
    setLoaded(true);
  };

  useEffect(() => { loadAll(); }, []);

  const addSimple = async (table, payload, resetFn) => {
    const { error } = await supabase.from(table).insert(payload);
    if (!error) { loadAll(); resetFn(); }
    else alert(error.message);
  };

  const renameSimple = async (table, matchCol, matchVal, field, value) => {
    const { error } = await supabase.from(table).update({ [field]: value }).eq(matchCol, matchVal);
    if (!error) { setEditing(null); loadAll(); }
    else alert(error.message);
  };

  const addPosition = async () => {
    if (!newPos.name.trim()) return;
    const { error } = await supabase.from("positions").insert({
      name: newPos.name.trim(),
      level_id: newPos.levelId || null,
      department_id: newPos.departmentId || null,
      reports_to_position_id: newPos.reportsToId || null,
      kpi_source: newPos.source,
    });
    if (!error) { loadAll(); setNewPos({ name: "", levelId: "", departmentId: "", reportsToId: "", source: "KIET" }); }
    else alert(error.message);
  };

  const updatePositionField = async (id, field, value) => {
    const { error } = await supabase.from("positions").update({ [field]: value || null }).eq("id", id);
    if (!error) loadAll();
    else alert(error.message);
  };

  const handleImportFile = (file) => {
    if (!importPositionId) { setImportMsg("Pick a position first."); return; }
    setImporting(true);
    setImportMsg("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          // 1. Resolve/create kpi_areas for every distinct area_number in the file.
          const areaNumbers = [...new Set(rows.map(r => String(r.area_number).trim()))];
          const { data: existingAreas } = await supabase
            .from("kpi_areas").select("*").eq("position_id", importPositionId);
          const areaMap = {}; // area_number -> id
          (existingAreas || []).forEach(a => { areaMap[String(a.area_number)] = a.id; });

          for (const num of areaNumbers) {
            if (areaMap[num]) continue;
            const sample = rows.find(r => String(r.area_number).trim() === num);
            const { data: inserted, error } = await supabase
              .from("kpi_areas")
              .insert({
                position_id: importPositionId,
                area_number: parseInt(num, 10),
                area_name: (sample.area_name || "").trim(),
                kpi_count: rows.filter(r => String(r.area_number).trim() === num).length,
              })
              .select().single();
            if (error) throw error;
            areaMap[num] = inserted.id;
          }

          // 2. Upsert every KPI row against (area_id, kpi_number).
          const kpiRows = rows.map(r => ({
            area_id: areaMap[String(r.area_number).trim()],
            kpi_number: (r.kpi_number || "").trim(),
            label: (r.label || "").trim(),
            formula: (r.formula || "").trim() || null,
            data_source: (r.data_source || "").trim() || null,
            baseline_guidance: (r.baseline_guidance || "").trim() || null,
            target_guidance: (r.target_guidance || "").trim() || null,
            benchmark_guidance: (r.benchmark_guidance || "").trim() || null,
            lower_is_better: String(r.lower_is_better || "").trim().toLowerCase() === "true"
              || String(r.lower_is_better || "").trim().toLowerCase() === "yes",
            notes: (r.notes || "").trim() || null,
          })).filter(r => r.area_id && r.kpi_number);

          const { error: kpiError } = await supabase
            .from("kpis")
            .upsert(kpiRows, { onConflict: "area_id,kpi_number" });
          if (kpiError) throw kpiError;

          setImportMsg(`Imported ${kpiRows.length} KPIs across ${areaNumbers.length} areas.`);
          loadAll();
        } catch (err) {
          setImportMsg("Error: " + err.message);
        } finally {
          setImporting(false);
        }
      },
      error: (err) => { setImportMsg("Error reading file: " + err.message); setImporting(false); },
    });
  };

  if (!loaded) return <Loading />;

  const card = MD_CARD;
  const input = MD_INPUT;
  const smallBtn = MD_BTN;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 24px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        <SimpleList title="Departments" table="departments" items={departments} newVal={newDept} setNewVal={setNewDept} placeholder="e.g. Computer Science" editing={editing} setEditing={setEditing} addSimple={addSimple} renameSimple={renameSimple} />
        <SimpleList title="Position Levels" table="position_levels" items={levels} newVal={newLevel} setNewVal={setNewLevel} placeholder="e.g. Deputy Manager" editing={editing} setEditing={setEditing} addSimple={addSimple} renameSimple={renameSimple} />
        <SimpleList title="Shifts" table="shifts" items={shifts} newVal={newShift} setNewVal={setNewShift} placeholder="e.g. Morning" editing={editing} setEditing={setEditing} addSimple={addSimple} renameSimple={renameSimple} />
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>Campuses</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={newCamp.code} onChange={e => setNewCamp(c => ({ ...c, code: e.target.value }))} placeholder="Code (e.g. EC)" style={{ ...input, width: 120 }} />
          <input value={newCamp.name} onChange={e => setNewCamp(c => ({ ...c, name: e.target.value }))} placeholder="Full name" style={input} />
          <button onClick={() => addSimple("campuses", { code: newCamp.code.trim().toUpperCase(), name: newCamp.name.trim() }, () => setNewCamp({ code: "", name: "" }))} style={smallBtn}>Add</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {campuses.map(c => (
            <div key={c.code} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              {editing?.table === "campuses" && editing?.key === c.code ? (
                <>
                  <span style={{ color: "#9CA3AF" }}>{c.code}</span>
                  <input value={editing.value} onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                    style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 6px", fontSize: 12 }} />
                  <button onClick={() => renameSimple("campuses", "code", c.code, "name", editing.value)} style={{ color: "#059669", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Save</button>
                  <button onClick={() => setEditing(null)} style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, color: "#374151" }}>{c.name} <span style={{ color: "#9CA3AF" }}>({c.code})</span></span>
                  <button onClick={() => setEditing({ table: "campuses", key: c.code, value: c.name })} style={{ color: BLUE, background: "none", border: "none", cursor: "pointer" }}>Edit</button>
                </>
              )}
            </div>
          ))}
          {campuses.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 12 }}>none yet</div>}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 4 }}>Bulk Import KPIs (CSV)</div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12, lineHeight: 1.5 }}>
          Upload a CSV for one position instead of asking for SQL each time. Columns (header row required):
          <code style={{ display: "block", background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, marginTop: 4, fontSize: 10 }}>
            area_number, area_name, kpi_number, label, formula, data_source, baseline_guidance, target_guidance, benchmark_guidance, lower_is_better, notes
          </code>
          Only area_number, area_name, kpi_number, and label are required — the rest can be left blank. Re-uploading the same position updates existing KPIs instead of duplicating them.
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={importPositionId} onChange={e => setImportPositionId(e.target.value)} style={{ ...input, width: 240 }}>
            <option value="">Select position to import into...</option>
            {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="file" accept=".csv" disabled={importing}
            onChange={e => e.target.files[0] && handleImportFile(e.target.files[0])} style={{ fontSize: 12 }} />
        </div>
        {importing && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>Importing...</div>}
        {importMsg && <div style={{ fontSize: 11, color: importMsg.startsWith("Error") ? "#DC2626" : "#059669", marginTop: 8 }}>{importMsg}</div>}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 4 }}>Positions / Designations</div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12 }}>
          "Reports to" sets the general org rule for this position (e.g. HoD → Dean). Per-person overrides can be added later if a specific case differs.
          <strong> Source</strong> separates the 15 original SHEC-mandated positions from KIET's own internal staff/faculty positions being added over time.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 0.8fr auto", gap: 8, marginBottom: 16 }}>
          <input value={newPos.name} onChange={e => setNewPos(f => ({ ...f, name: e.target.value }))} placeholder="Position name" style={input} />
          <select value={newPos.levelId} onChange={e => setNewPos(f => ({ ...f, levelId: e.target.value }))} style={input}>
            <option value="">Level...</option>
            {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={newPos.departmentId} onChange={e => setNewPos(f => ({ ...f, departmentId: e.target.value }))} style={input}>
            <option value="">Department...</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={newPos.reportsToId} onChange={e => setNewPos(f => ({ ...f, reportsToId: e.target.value }))} style={input}>
            <option value="">Reports to...</option>
            {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={newPos.source} onChange={e => setNewPos(f => ({ ...f, source: e.target.value }))} style={input}>
            <option value="KIET">KIET-internal</option>
            <option value="SHEC">SHEC-mandated</option>
          </select>
          <button onClick={addPosition} style={smallBtn}>Add</button>
        </div>

        {["SHEC", "KIET"].map(source => {
          const group = positions.filter(p => (p.kpi_source || "SHEC") === source);
          if (group.length === 0) return null;
          return (
            <div key={source} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: source === "SHEC" ? BLUE : "#7C3AED", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${source === "SHEC" ? BLUE : "#7C3AED"}` }}>
                {source === "SHEC" ? "SHEC-Mandated Positions" : "KIET-Internal Positions"} ({group.length})
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
                    {["Position", "Level", "Department", "Reports To", "Source"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#9CA3AF", fontSize: 10 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {group.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                      <td style={{ padding: "8px", fontWeight: 600, color: "#1F2937", whiteSpace: "nowrap" }}>
                        <input defaultValue={p.name} onBlur={e => e.target.value.trim() && e.target.value.trim() !== p.name && updatePositionField(p.id, "name", e.target.value.trim())}
                          style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 6px", fontSize: 12, width: 160 }} />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <select value={p.level_id || ""} onChange={e => updatePositionField(p.id, "level_id", e.target.value)} style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", fontSize: 11 }}>
                          <option value="">—</option>
                          {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <select value={p.department_id || ""} onChange={e => updatePositionField(p.id, "department_id", e.target.value)} style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", fontSize: 11 }}>
                          <option value="">—</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <select value={p.reports_to_position_id || ""} onChange={e => updatePositionField(p.id, "reports_to_position_id", e.target.value)} style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", fontSize: 11 }}>
                          <option value="">—</option>
                          {positions.filter(o => o.id !== p.id).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <select value={p.kpi_source || "SHEC"} onChange={e => updatePositionField(p.id, "kpi_source", e.target.value)} style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", fontSize: 11 }}>
                          <option value="SHEC">SHEC</option>
                          <option value="KIET">KIET</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {positions.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 12 }}>none yet</div>}
      </div>
    </div>
  );
}

/* ================= HISTORY / AUDIT TRAIL ================= */

function AdminHistory() {
  const [logs, setLogs] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: logRows }, { data: profiles }, { data: assignments }, { data: positions }, { data: kpis }] = await Promise.all([
        supabase.from("audit_log").select("*").order("changed_at", { ascending: false }).limit(300),
        supabase.from("profiles").select("id, full_name"),
        supabase.from("assignments").select("id, user_id, position_id, campus_code"),
        supabase.from("positions").select("id, name"),
        supabase.from("kpis").select("id, kpi_number, label"),
      ]);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      const assignmentMap = Object.fromEntries((assignments || []).map(a => [a.id, a]));
      const positionMap = Object.fromEntries((positions || []).map(p => [p.id, p.name]));
      const kpiMap = Object.fromEntries((kpis || []).map(k => [k.id, k]));

      const FIELDS = ["baseline", "yr1_target", "yr2_target", "yr3_target", "benchmark", "actual", "status", "notes"];

      const described = (logRows || []).map(log => {
        const actorName = profileMap[log.actor] || "Unknown";
        let context = "", summary = "";

        if (log.table_name === "kpi_entries") {
          const newRow = log.details?.new || {};
          const oldRow = log.details?.old || {};
          const assignment = assignmentMap[newRow.assignment_id];
          const kpi = kpiMap[newRow.kpi_id];
          const personName = assignment ? (profileMap[assignment.user_id] || "Unknown") : "Unknown";
          const posName = assignment ? (positionMap[assignment.position_id] || "") : "";
          context = `${posName} — ${personName}${kpi ? ` — KPI ${kpi.kpi_number}` : ""}`;
          if (log.action === "INSERT") {
            summary = "Created entry" + (kpi ? ` for ${kpi.kpi_number}` : "");
          } else {
            const changed = FIELDS.filter(f => (oldRow[f] || "") !== (newRow[f] || ""));
            summary = changed.length
              ? changed.map(f => `${f}: "${oldRow[f] || "—"}" → "${newRow[f] || "—"}"`).join("; ")
              : "No field changes";
          }
        } else if (log.table_name === "assignments" && log.action === "status_change") {
          const assignment = assignmentMap[parseInt(log.record_id, 10)];
          const personName = assignment ? (profileMap[assignment.user_id] || "Unknown") : "Unknown";
          const posName = assignment ? (positionMap[assignment.position_id] || "") : "";
          context = `${posName} — ${personName}`;
          summary = `Status: ${log.details?.old_status || "—"} → ${log.details?.new_status || "—"}`;
        } else {
          context = log.table_name;
          summary = log.action;
        }

        return { ...log, actorName, context, summary };
      });

      setLogs(described);
    })();
  }, []);

  if (logs === null) return <Loading />;

  const filtered = query
    ? logs.filter(l => (l.context + l.summary + l.actorName).toLowerCase().includes(query.toLowerCase()))
    : logs;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 24px 60px" }}>
      <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontWeight: 700, color: "#1F2937" }}>Audit Trail (last 300 changes)</div>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by person, position, or KPI..."
            style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 10px", fontSize: 12, width: 260, boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 600, overflowY: "auto" }}>
          {filtered.map(l => (
            <div key={l.id} style={{ padding: "8px 10px", borderBottom: "1px solid #F9FAFB", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#9CA3AF", fontSize: 10 }}>
                <span>{new Date(l.changed_at).toLocaleString()}</span>
                <span>{l.actorName}</span>
              </div>
              <div style={{ fontWeight: 600, color: "#1F2937" }}>{l.context}</div>
              <div style={{ color: "#6B7280" }}>{l.summary}</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 13, padding: 8 }}>No matching history.</div>}
        </div>
      </div>
    </div>
  );
}
