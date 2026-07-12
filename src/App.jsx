import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

const BLUE = "#003087";

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setProfile(null); setProfileLoading(false); return; }
    (async () => {
      setProfileLoading(true);
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(data);
      setProfileLoading(false);
    })();
  }, [session]);

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

function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | signup
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
      if (mode === "signup") {
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
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required minLength={6}
          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 14, boxSizing: "border-box" }} />

        {err && <div style={{ fontSize: 12, color: err.startsWith("Account created") ? "#059669" : "#DC2626", marginBottom: 12 }}>{err}</div>}

        <button type="submit" disabled={busy} style={{ width: "100%", background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
          {busy ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
        </button>
        <div style={{ textAlign: "center", fontSize: 12, color: "#6B7280" }}>
          {mode === "login" ? (
            <>New here? <a onClick={() => setMode("signup")} style={{ color: BLUE, cursor: "pointer", fontWeight: 600 }}>Create an account</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode("login")} style={{ color: BLUE, cursor: "pointer", fontWeight: 600 }}>Log in</a></>
          )}
        </div>
      </form>
    </div>
  );
}

/* ================= SHARED CHROME ================= */

function TopBar({ title, subtitle, onLogout, tabs, tab, setTab }) {
  return (
    <div style={{ background: BLUE, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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
  const logout = () => supabase.auth.signOut();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("assignments")
        .select("id, campus_code, position:positions(id,name), campuses(name)")
        .eq("user_id", profile.id);
      setAssignments(data || []);
      if (data && data.length === 1) setSelected(data[0]);
    })();
  }, [profile.id]);

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

  if (!selected) {
    return (
      <div style={{ minHeight: "100vh", background: "#F3F4F6" }}>
        <TopBar title={`Welcome, ${profile.full_name}`} subtitle="Select which position to work on" onLogout={logout} />
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
      />
      {assignments.length > 1 && (
        <div style={{ padding: "10px 24px 0" }}>
          <button onClick={() => setSelected(null)} style={{ fontSize: 12, color: BLUE, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            ← Switch position
          </button>
        </div>
      )}
      <KpiEntry assignment={selected} />
    </div>
  );
}

/* ================= KPI ENTRY (shared by user view + admin edit modal) ================= */

function KpiEntry({ assignment }) {
  const [areas, setAreas] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [entries, setEntries] = useState({});
  const [openArea, setOpenArea] = useState(null);
  const [saving, setSaving] = useState({});

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

  if (areas === null) return <Loading />;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px 60px" }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8, marginBottom: 8 }}>
                    {[["baseline", "Baseline"], ["yr1_target", "Year 1"], ["yr2_target", "Year 2"], ["yr3_target", "Year 3"], ["benchmark", "Benchmark"], ["actual", "Actual"]].map(([f, lbl]) => (
                      <div key={f}>
                        <label style={{ fontSize: 10, color: "#9CA3AF", display: "block", marginBottom: 2 }}>{lbl}</label>
                        <input defaultValue={e[f] || ""} onBlur={ev => save(k.id, { [f]: ev.target.value })}
                          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 8px", fontSize: 12, boxSizing: "border-box" }} />
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
  const [tab, setTab] = useState("tracker");
  const logout = () => supabase.auth.signOut();

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <TopBar
        title="KIET — KPI Compliance Dashboard"
        subtitle={`Admin: ${profile.full_name} · Registrar Office`}
        onLogout={logout}
        tabs={[{ id: "tracker", label: "📋 Tracker" }, { id: "users", label: "👥 Users & Assignments" }]}
        tab={tab} setTab={setTab}
      />
      {tab === "tracker" ? <AdminTracker /> : <AdminUsers />}
    </div>
  );
}

function AdminTracker() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await supabase
      .from("assignments")
      .select("id, campus_code, campuses(name), position:positions(id,name,category), user:profiles(full_name)")
      .order("id");
    setRows(data || []);
  };

  useEffect(() => { load(); }, []);

  if (rows === null) return <Loading />;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 60px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
        {rows.map(a => (
          <div key={a.id} onClick={() => setEditing(a)} style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: "pointer" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1F2937" }}>{a.position.name}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{a.campuses?.name || a.campus_code}</div>
            <div style={{ fontSize: 11, color: BLUE, fontWeight: 600, marginTop: 6 }}>{a.user?.full_name || "Unassigned"}</div>
          </div>
        ))}
        {rows.length === 0 && <div style={{ color: "#9CA3AF", fontSize: 13 }}>No assignments created yet — go to "Users &amp; Assignments" to add one.</div>}
      </div>
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
          <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 900, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
            <div style={{ background: BLUE, padding: "16px 22px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{editing.position.name}</div>
                <div style={{ color: "#93C5FD", fontSize: 11 }}>{editing.user?.full_name} · {editing.campuses?.name || editing.campus_code}</div>
              </div>
              <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", color: "#93C5FD", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            <KpiEntry assignment={editing} />
          </div>
        </div>
      )}
    </div>
  );
}

function AdminUsers() {
  const [profiles, setProfiles] = useState(null);
  const [positions, setPositions] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ userId: "", positionId: "", campusCode: "" });
  const [msg, setMsg] = useState("");

  const [posForm, setPosForm] = useState({ name: "", category: "Senior" });
  const [posMsg, setPosMsg] = useState("");
  const [campForm, setCampForm] = useState({ code: "", name: "" });
  const [campMsg, setCampMsg] = useState("");

  const loadAll = async () => {
    const [{ data: p }, { data: pos }, { data: camp }, { data: asn }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("positions").select("*").order("name"),
      supabase.from("campuses").select("*").order("name"),
      supabase.from("assignments").select("id,user_id,campus_code,position:positions(name),campuses(name)"),
    ]);
    setProfiles(p || []); setPositions(pos || []); setCampuses(camp || []); setAssignments(asn || []);
  };

  useEffect(() => { loadAll(); }, []);

  const addAssignment = async () => {
    if (!form.userId || !form.positionId || !form.campusCode) { setMsg("Pick a user, position, and campus."); return; }
    const { error } = await supabase.from("assignments").insert({
      user_id: form.userId, position_id: form.positionId, campus_code: form.campusCode,
    });
    setMsg(error ? error.message : "Assignment added.");
    if (!error) { loadAll(); setForm({ userId: "", positionId: "", campusCode: "" }); }
  };

  const toggleAdmin = async (id, current) => {
    await supabase.from("profiles").update({ role: current === "admin" ? "user" : "admin" }).eq("id", id);
    loadAll();
  };

  const addPosition = async () => {
    if (!posForm.name.trim()) { setPosMsg("Enter a position name."); return; }
    const { error } = await supabase.from("positions").insert({ name: posForm.name.trim(), category: posForm.category });
    setPosMsg(error ? error.message : "Position added.");
    if (!error) { loadAll(); setPosForm({ name: "", category: "Senior" }); }
  };

  const addCampus = async () => {
    if (!campForm.code.trim() || !campForm.name.trim()) { setCampMsg("Enter both a code and a name."); return; }
    const { error } = await supabase.from("campuses").insert({ code: campForm.code.trim().toUpperCase(), name: campForm.name.trim() });
    setCampMsg(error ? error.message : "Campus added.");
    if (!error) { loadAll(); setCampForm({ code: "", name: "" }); }
  };

  if (profiles === null) return <Loading />;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>Add a Position</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={posForm.name} onChange={e => setPosForm(f => ({ ...f, name: e.target.value }))} placeholder="Position name (e.g. HoD Data Science)"
              style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 10px", fontSize: 12, boxSizing: "border-box" }} />
            <select value={posForm.category} onChange={e => setPosForm(f => ({ ...f, category: e.target.value }))}
              style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 10px", fontSize: 12 }}>
              {["Senior", "Dean", "Director", "HoD"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={addPosition} style={{ background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add Position</button>
            {posMsg && <div style={{ fontSize: 11, color: "#6B7280" }}>{posMsg}</div>}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#9CA3AF" }}>
            Current: {positions.map(p => p.name).join(", ") || "none"}
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>Add a Campus</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={campForm.code} onChange={e => setCampForm(f => ({ ...f, code: e.target.value }))} placeholder="Code (e.g. EC)"
              style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 10px", fontSize: 12, boxSizing: "border-box" }} />
            <input value={campForm.name} onChange={e => setCampForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name (e.g. Education City)"
              style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 10px", fontSize: 12, boxSizing: "border-box" }} />
            <button onClick={addCampus} style={{ background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add Campus</button>
            {campMsg && <div style={{ fontSize: 11, color: "#6B7280" }}>{campMsg}</div>}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#9CA3AF" }}>
            Current: {campuses.map(c => `${c.name} (${c.code})`).join(", ") || "none"}
          </div>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 4 }}>Add a Position Assignment</div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12 }}>The person must have signed up at least once before they appear in this list.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
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
          <button onClick={addAssignment} style={{ background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>
        </div>
        {msg && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 8 }}>{msg}</div>}
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflowX: "auto" }}>
        <div style={{ fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>All Users</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
              {["Name", "Role", "Assignments", "Action"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#9CA3AF", fontSize: 10 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => {
              const their = assignments.filter(a => a.user_id === p.id);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                  <td style={{ padding: "8px", fontWeight: 600, color: "#1F2937", whiteSpace: "nowrap" }}>{p.full_name}</td>
                  <td style={{ padding: "8px" }}>{p.role}</td>
                  <td style={{ padding: "8px", color: "#6B7280" }}>
                    {their.length === 0 ? "—" : their.map(a => `${a.position.name} (${a.campuses?.name || a.campus_code})`).join(", ")}
                  </td>
                  <td style={{ padding: "8px" }}>
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
