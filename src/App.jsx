import React, { useState, useEffect } from "react";
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
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
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

function TopBar({ title, subtitle, onLogout, tabs, tab, setTab }) {
  return (
    <div className="no-print" style={{ background: BLUE, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src={`${import.meta.env.BASE_URL}kiet-logo.jpg`} alt="KIET" style={{ height: 40, borderRadius: 4, background: "white", padding: 2 }} />
        <div>
          <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>{title}</div>
          <div style={{ color: "#93C5FD", fontSize: 11, marginTop: 3 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {tabs && tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: tab === t.id ? "white" : "rgba(255,255,255,0.15)", color: tab === t.id ? BLUE : "white" }}>
            {t.label}
          </button>
        ))}
        <button onClick={onLogout} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "none", color: "white" }}>
          Log Out
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
  const [view, setView] = useState("kpis"); // kpis | approvals
  const logout = () => supabase.auth.signOut();

  const ASSIGNMENT_SELECT = "id, campus_code, status, submitted_at, approved_at, deadline, sent_date, received_date, correspondence_notes, position:positions(id,name,reports_to_position_id), campuses(name)";

  const loadAssignments = async () => {
    const { data } = await supabase.from("assignments").select(ASSIGNMENT_SELECT).eq("user_id", profile.id);
    setAssignments(data || []);
    return data || [];
  };

  const loadPendingApprovals = async (myAssignments) => {
    // Positions I hold — anyone whose position reports_to one of these, at a matching campus, and is 'submitted'.
    const myPositionIds = [...new Set(myAssignments.map(a => a.position.id))];
    if (myPositionIds.length === 0) { setPendingApprovals([]); return; }
    const { data: candidates } = await supabase
      .from("assignments")
      .select("id, campus_code, status, position:positions(id,name,reports_to_position_id), campuses(name), user:profiles!user_id(full_name)")
      .eq("status", "submitted");
    const mine = myAssignments.reduce((acc, a) => { acc[a.position.id] = a.campus_code; return acc; }, {});
    const relevant = (candidates || []).filter(c => {
      const parentId = c.position.reports_to_position_id;
      if (!parentId || !(parentId in mine)) return false;
      const myCampus = mine[parentId];
      return myCampus === c.campus_code || myCampus === "ALL";
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

  if (assignments.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#F3F4F6" }}>
        <TopBar title={`Welcome, ${profile.full_name}`} subtitle="KIET KPI Compliance" onLogout={logout} />
        <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center", color: "#6B7280", fontSize: 14, padding: "0 16px" }}>
          No position has been assigned to your account yet. Please contact the Registrar Office to be assigned to your KPI position(s).
        </div>
      </div>
    );
  }

  const tabs = pendingApprovals.length > 0
    ? [{ id: "kpis", label: "📋 My KPIs" }, { id: "approvals", label: `✅ Approvals (${pendingApprovals.length})` }]
    : null;

  if (view === "approvals") {
    return (
      <div style={{ minHeight: "100vh", background: "#F3F4F6" }}>
        <TopBar title={`Welcome, ${profile.full_name}`} subtitle="Items awaiting your approval" onLogout={logout} tabs={tabs} tab={view} setTab={setView} />
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
      </div>
    );
  }

  if (!selected) {
    return (
      <div style={{ minHeight: "100vh", background: "#F3F4F6" }}>
        <TopBar title={`Welcome, ${profile.full_name}`} subtitle="Select which position to work on" onLogout={logout} tabs={tabs} tab={view} setTab={setView} />
        <div style={{ maxWidth: 600, margin: "40px auto", display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>
          {assignments.map(a => (
            <button key={a.id} onClick={() => setSelected(a)} style={{ textAlign: "left", background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: 16, cursor: "pointer" }}>
              <div style={{ fontWeight: 700, color: "#1F2937", fontSize: 14 }}>{a.position.name}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{a.campuses?.name || a.campus_code}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6" }}>
      <TopBar
        title={profile.full_name}
        subtitle={`${selected.position.name} · ${selected.campuses?.name || selected.campus_code}`}
        onLogout={logout}
        tabs={tabs} tab={view} setTab={setView}
      />
      {assignments.length > 1 && (
        <div className="no-print" style={{ padding: "10px 24px 0" }}>
          <button onClick={() => setSelected(null)} style={{ fontSize: 12, color: BLUE, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            ← Switch position
          </button>
        </div>
      )}
      <KpiEntry assignment={selected} onStatusChange={refreshAfterStatusChange} />
    </div>
  );
}

/* ================= KPI ENTRY (shared by user view + admin edit modal) ================= */

function KpiEntry({ assignment, isAdmin, onStatusChange }) {
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

  const isFinalAuthority = !assignment.position.reports_to_position_id; // VC — no supervisor, self-approves

  useEffect(() => {
    (async () => {
      const { data: areaRows } = await supabase
        .from("kpi_areas").select("*").eq("position_id", assignment.position.id).order("area_number");
      setAreas(areaRows || []);

      const areaIds = (areaRows || []).map(a => a.id);
      if (areaIds.length === 0) { setKpis([]); return; }

      const { data: kpiRows } = await supabase
        .from("kpis").select("*").in("area_id", areaIds).order("kpi_number");
      setKpis(kpiRows || []);

      const { data: entryRows } = await supabase
        .from("kpi_entries").select("*").eq("assignment_id", assignment.id);
      const map = {};
      (entryRows || []).forEach(e => { map[e.kpi_id] = e; });
      setEntries(map);

      // Can the logged-in user approve this? (holds the position it reports to, matching campus)
      if (!isAdmin && assignment.position.reports_to_position_id) {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess?.session?.user?.id;
        if (uid) {
          const { data: mine } = await supabase
            .from("assignments").select("campus_code")
            .eq("user_id", uid).eq("position_id", assignment.position.reports_to_position_id);
          const match = (mine || []).some(m => m.campus_code === assignment.campus_code || m.campus_code === "ALL");
          setCanApprove(match);
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
          <button onClick={() => window.print()} style={{ fontSize: 11, color: "#6B7280", background: "none", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}>🖨️ Print</button>
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
  );
}

/* ================= ADMIN APP ================= */

function AdminApp({ profile }) {
  const [tab, setTab] = useState(() => sessionStorage.getItem("kiet-admin-tab") || "tracker");
  const logout = () => supabase.auth.signOut();

  const changeTab = (t) => {
    setTab(t);
    sessionStorage.setItem("kiet-admin-tab", t);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <TopBar
        title="KIET — KPI Compliance Dashboard"
        subtitle={`Admin: ${profile.full_name} · Registrar Office`}
        onLogout={logout}
        tabs={[{ id: "tracker", label: "📋 Tracker" }, { id: "users", label: "👥 Users & Assignments" }, { id: "master", label: "🗂️ Master Data" }]}
        tab={tab} setTab={changeTab}
      />
      {tab === "tracker" ? <AdminTracker /> : tab === "users" ? <AdminUsers /> : <AdminMasterData />}
    </div>
  );
}

function AdminTracker() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("cards"); // cards | analytics

  const load = async () => {
    const { data } = await supabase
      .from("assignments")
      .select("id, campus_code, status, deadline, sent_date, received_date, correspondence_notes, campuses(name), position:positions(id,name,category,reports_to_position_id), user:profiles!user_id(full_name)")
      .order("id");
    setRows(data || []);
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    await load();
  };

  if (rows === null) return <Loading />;

  const statusColor = { draft: "#6B7280", submitted: "#D97706", approved: "#059669" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 60px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["cards", "📋 Cards"], ["analytics", "📊 Analytics"]].map(([id, lbl]) => (
          <button key={id} onClick={() => setView(id)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid " + (view === id ? BLUE : "#E5E7EB"), cursor: "pointer", fontSize: 12, fontWeight: 600, background: view === id ? BLUE : "white", color: view === id ? "white" : "#6B7280" }}>
            {lbl}
          </button>
        ))}
      </div>
      {view === "analytics" ? <AdminAnalytics rows={rows} onSelectAssignment={setEditing} /> : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
        {rows.map(a => (
          <div key={a.id} onClick={() => setEditing(a)} style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: "pointer", borderTop: `4px solid ${statusColor[a.status || "draft"]}` }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1F2937" }}>{a.position.name}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{a.campuses?.name || a.campus_code}</div>
            <div style={{ fontSize: 11, color: BLUE, fontWeight: 600, marginTop: 6 }}>{a.user?.full_name || "Unassigned"}</div>
            <div style={{ fontSize: 10, color: statusColor[a.status || "draft"], fontWeight: 700, marginTop: 6, textTransform: "uppercase" }}>{a.status || "draft"}</div>
            {a.deadline && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Deadline: {a.deadline}</div>}
          </div>
        ))}
        {rows.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 13 }}>No assignments created yet — go to "Users &amp; Assignments" to add one.</div>}
      </div>
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

  const loadAll = async () => {
    const [{ data: p }, { data: pos }, { data: camp }, { data: sh }, { data: asn }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("positions").select("*").order("name"),
      supabase.from("campuses").select("*").order("name"),
      supabase.from("shifts").select("*").order("name"),
      supabase.from("assignments").select("id,user_id,campus_code,shift_id,position:positions(id,name),campuses(name),shifts(name)"),
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
            <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px", fontSize: 12 }}>
              <option value="">Select...</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Position</label>
            <select value={form.positionId} onChange={e => setForm(f => ({ ...f, positionId: e.target.value }))} style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px", fontSize: 12 }}>
              <option value="">Select...</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
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
        <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>All Assignments</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
              {["Position", "Campus", "Shift", "Person", "Action"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#9CA3AF", fontSize: 10 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                <td style={{ padding: "8px", fontWeight: 600, color: "#1F2937", whiteSpace: "nowrap" }}>{a.position.name}</td>
                <td style={{ padding: "8px", color: "#9CA3AF" }}>{a.campuses?.name || a.campus_code}</td>
                <td style={{ padding: "8px", color: "#9CA3AF" }}>{a.shifts?.name || "—"}</td>
                <td style={{ padding: "8px", color: "#6B7280" }}>
                  {reassigning === a.id ? (
                    <select value={reassignTo} onChange={e => setReassignTo(e.target.value)} style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", fontSize: 11 }}>
                      <option value="">Select new person...</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  ) : (
                    profiles.find(p => p.id === a.user_id)?.full_name || "Unassigned"
                  )}
                </td>
                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                  {reassigning === a.id ? (
                    <>
                      <button onClick={() => saveReassign(a.id)} style={{ fontSize: 11, color: "#059669", background: "none", border: "1px solid #059669", borderRadius: 6, padding: "3px 8px", cursor: "pointer", marginRight: 4 }}>Save</button>
                      <button onClick={() => { setReassigning(null); setReassignTo(""); }} style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setReassigning(a.id); setReassignTo(a.user_id || ""); }} style={{ fontSize: 11, color: BLUE, background: "none", border: `1px solid ${BLUE}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", marginRight: 4 }}>Reassign</button>
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
        <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>All Users</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
              {["Name", "Phone", "Joined", "Role", "Assignments", "Action"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#9CA3AF", fontSize: 10 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => {
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
  const [newPos, setNewPos] = useState({ name: "", levelId: "", departmentId: "", reportsToId: "" });

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
    });
    if (!error) { loadAll(); setNewPos({ name: "", levelId: "", departmentId: "", reportsToId: "" }); }
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
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 16 }}>
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
          <button onClick={addPosition} style={smallBtn}>Add</button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
              {["Position", "Level", "Department", "Reports To"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#9CA3AF", fontSize: 10 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {positions.map(p => (
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
              </tr>
            ))}
            {positions.length === 0 && <tr><td colSpan={4} style={{ padding: 8, color: "#9CA3AF" }}>none yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
