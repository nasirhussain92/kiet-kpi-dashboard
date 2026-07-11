import React from "react";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

const BLUE = "#003087";
const GREEN = "#1A6B3C";

const POSITIONS = [
  { id:"vc",          title:"Vice Chancellor",           short:"VC",          person:"Prof. Dr. Muhammad Khalid Khan",                        campus:"Both",    cat:"Senior",   kpis:64, areas:["Academics","Governance","Research & Development","Community Services","Financial Status","Diversity & Inclusion","Graduate Employability","Co-Curricular Activities","Sustainability","Automation Initiatives"] },
  { id:"df",          title:"Director Finance",          short:"DF",          person:"Mr. Ahsan Manzoor",                        campus:"Both",    cat:"Senior",   kpis:54, areas:["Financial Governance & Sustainability","Financial Management","Technology Integration","Expenditure Financial Discipline"] },
  { id:"qec",         title:"Director QEC",              short:"QEC",         person:"Prof. Dr. Sajida Parveen",campus:"SF",      cat:"Director", kpis:27, areas:["Status of QEC Office","Functions of QEC","International Ranking","Technology Integration"] },
  { id:"oric",        title:"Director ORIC",             short:"ORIC",        person:"Mr. Mubashar Yousuf",                        campus:"NN",      cat:"Director", kpis:30, areas:["Research Support","IP Management","Industry Engagement","Recognition & Awards","Operations & HR","ORIC Steering Committee","Entrepreneurship & Innovation"] },
  { id:"coe",         title:"Controller of Examinations",short:"CoE",         person:"Mr. Shehzad Khan",                        campus:"Both",    cat:"Director", kpis:28, areas:["General Administration","Examination Management","Technology Integration"] },
  { id:"reg",         title:"Registrar (Acting)",        short:"Reg",         person:"Prof. Dr. Tariq Jalees",  campus:"Both",    cat:"Director", kpis:32, note:"Also shortlisted for Registrar position",areas:["Administration & Coordination","Admission & Enrollment","Faculty Support","Financial Coordination","Equity & Inclusivity","Discipline & Inquiries","Campus Management & Safety","Transparency & Accountability","Technology Integration"] },
  { id:"dean_cocis",  title:"Dean CoCIS",                short:"Dean CoCIS",  person:"Prof. Dr. Salman Ahmed Khan",                        campus:"NN",      cat:"Dean",     kpis:36, accr:"NCEAC/PEC", areas:["Academics","Governance","Research & Development","Community Services","Co-Curricular Activities","Accreditation & QA","Diversity & Inclusion","Graduate Employability","Technology Integration"] },
  { id:"dean_fms",    title:"Dean FMS",                  short:"Dean FMS",    person:"Prof. Dr. Tariq Jalees",                        campus:"NN+SF",   cat:"Dean",     kpis:36, accr:"NBEAC",    areas:["Academics","Governance","Research & Development","Community Services","Co-Curricular Activities","Accreditation & QA","Diversity & Inclusion","Graduate Employability","Technology Integration"] },
  { id:"hod_ms_nn",   title:"HoD Management Sciences",   short:"HoD MS (NN)", person:"",                        campus:"NN",      cat:"HoD",      kpis:33, accr:"NBEAC",    areas:["Academics & Administration","Research & Development","Community Services","Co-Curricular Activities","Diversity & Inclusion","Facilities & Infrastructure","Accreditation & QA","Technology Integration"] },
  { id:"hod_ms_sf",   title:"HoD Management Sciences",   short:"HoD MS (SF)", person:"",                        campus:"SF",      cat:"HoD",      kpis:33, accr:"NBEAC",    areas:["Academics & Administration","Research & Development","Community Services","Co-Curricular Activities","Diversity & Inclusion","Facilities & Infrastructure","Accreditation & QA","Technology Integration"] },
  { id:"hod_cybersec",title:"HoD Cyber Security",        short:"HoD CyberSec",person:"Prof. Dr. Maaz Bin Ahmed",campus:"NN",      cat:"HoD",      kpis:33, accr:"NCEAC",    dual:true, areas:["Academics & Administration","Research & Development","Community Services","Co-Curricular Activities","Diversity & Inclusion","Facilities & Infrastructure","Accreditation & QA","Technology Integration"] },
  { id:"hod_cs",      title:"HoD Computer Science",      short:"HoD CS",      person:"",                        campus:"NN",      cat:"HoD",      kpis:33, accr:"NCEAC",    areas:["Academics & Administration","Research & Development","Community Services","Co-Curricular Activities","Diversity & Inclusion","Facilities & Infrastructure","Accreditation & QA","Technology Integration"] },
  { id:"hod_se",      title:"HoD Software Engineering",  short:"HoD SE",      person:"",                        campus:"NN",      cat:"HoD",      kpis:33, accr:"NCEAC/PEC",areas:["Academics & Administration","Research & Development","Community Services","Co-Curricular Activities","Diversity & Inclusion","Facilities & Infrastructure","Accreditation & QA","Technology Integration"] },
  { id:"hod_ai",      title:"HoD Artificial Intelligence",short:"HoD AI",     person:"",                        campus:"NN",      cat:"HoD",      kpis:33, accr:"NCEAC",    areas:["Academics & Administration","Research & Development","Community Services","Co-Curricular Activities","Diversity & Inclusion","Facilities & Infrastructure","Accreditation & QA","Technology Integration"] },
  { id:"dir_dasr",    title:"Director DASR",             short:"Dir.DASR",    person:"Prof. Dr. Maaz Bin Ahmed",campus:"NN",      cat:"Director", kpis:33, dual:true, note:"Uses HoD proforma — fill separately from HoD CyberSec", areas:["Academics & Administration","Research & Development","Community Services","Co-Curricular Activities","Diversity & Inclusion","Facilities & Infrastructure","Accreditation & QA","Technology Integration"] },
];

const S = {
  not_sent: { label:"Not Sent",         color:"#6B7280", bg:"#F9FAFB" },
  sent:     { label:"Sent — Awaiting",  color:"#2563EB", bg:"#EFF6FF" },
  partial:  { label:"Partially Filled", color:"#D97706", bg:"#FFFBEB" },
  complete: { label:"Submitted ✓",      color:"#059669", bg:"#ECFDF5" },
  overdue:  { label:"Overdue ⚠",        color:"#DC2626", bg:"#FEF2F2" },
};

const CATS = ["All","Senior","Dean","Director","HoD"];
const SKEY = "kiet-kpi-v2";

const defState = () => Object.fromEntries(
  POSITIONS.map(p => [p.id, {
    personName: p.person || "",
    sentDate: "", deadline: "2025-07-09", status: "not_sent", receivedDate: "", notes: "",
    areas: Object.fromEntries(p.areas.map(a => [a, { pct: 0, notes: "" }]))
  }])
);

const avg = (areas) => {
  const v = Object.values(areas).map(a => a.pct);
  return v.length ? Math.round(v.reduce((s,x)=>s+x,0)/v.length) : 0;
};
const tlC = (p) => p >= 80 ? "#059669" : p >= 40 ? "#D97706" : "#DC2626";

export default function App() {
  const [data, setData] = useState(defState);
  const [ready, setReady] = useState(false);
  const [sel, setSel] = useState(null);
  const [cat, setCat] = useState("All");
  const [stFilter, setStFilter] = useState("All");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("tracker");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SKEY));
      if (saved) {
        setData(prev => {
          const m = { ...prev };
          Object.keys(saved).forEach(id => { if (m[id]) m[id] = { ...m[id], ...saved[id] }; });
          return m;
        });
      }
    } catch {}
    setReady(true);
  }, []);

  const persist = (d) => {
    try { localStorage.setItem(SKEY, JSON.stringify(d)); } catch {}
  };

  const upd = (id, fn) => setData(prev => {
    const next = { ...prev, [id]: fn(prev[id]) };
    persist(next);
    return next;
  });

  const stats = {
    total: POSITIONS.length,
    complete: POSITIONS.filter(p => data[p.id]?.status === "complete").length,
    partial:  POSITIONS.filter(p => data[p.id]?.status === "partial").length,
    sent:     POSITIONS.filter(p => data[p.id]?.status === "sent").length,
    overdue:  POSITIONS.filter(p => data[p.id]?.status === "overdue").length,
    notSent:  POSITIONS.filter(p => data[p.id]?.status === "not_sent").length,
  };

  const filtered = POSITIONS.filter(p => {
    if (cat !== "All" && p.cat !== cat) return false;
    if (stFilter !== "All" && data[p.id]?.status !== stFilter) return false;
    if (q && !p.title.toLowerCase().includes(q.toLowerCase()) && !(data[p.id]?.personName||"").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const pieData = [
    { name:"Submitted", value:stats.complete, color:"#059669" },
    { name:"Partial",   value:stats.partial,  color:"#D97706" },
    { name:"Awaiting",  value:stats.sent,     color:"#2563EB" },
    { name:"Overdue",   value:stats.overdue,  color:"#DC2626" },
    { name:"Not Sent",  value:stats.notSent,  color:"#9CA3AF" },
  ].filter(d=>d.value>0);

  if (!ready) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F9FAFB"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:"4px solid #003087",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{color:"#6B7280",fontSize:14}}>Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F3F4F6",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* HEADER */}
      <div style={{background:BLUE,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{color:"white",fontWeight:700,fontSize:18,letterSpacing:0.3}}>KIET — KPI Compliance Dashboard</div>
          <div style={{color:"#93C5FD",fontSize:11,marginTop:3}}>SHEC Letter No. AD(QA)/SHEC/01/KPIs-I/2023 · Quality Enhancement Cell</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {["tracker","analytics"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:tab===t?"white":"rgba(255,255,255,0.15)",color:tab===t?BLUE:"white",transition:"all 0.15s"}}>
              {t==="tracker"?"📋 Tracker":"📊 Analytics"}
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div style={{padding:"16px 24px 0",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,maxWidth:1200,margin:"0 auto"}}>
        {[
          {label:"Total",     val:stats.total,    color:BLUE,      bg:"#EFF6FF"},
          {label:"Submitted", val:stats.complete, color:"#059669", bg:"#ECFDF5"},
          {label:"Partial",   val:stats.partial,  color:"#D97706", bg:"#FFFBEB"},
          {label:"Awaiting",  val:stats.sent,     color:"#2563EB", bg:"#EFF6FF"},
          {label:"Overdue",   val:stats.overdue,  color:"#DC2626", bg:"#FEF2F2"},
          {label:"Not Sent",  val:stats.notSent,  color:"#6B7280", bg:"white"},
        ].map(s=>(
          <div key={s.label} style={{background:s.bg,borderLeft:`4px solid ${s.color}`,borderRadius:10,padding:"12px 14px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{color:s.color,fontSize:26,fontWeight:700,lineHeight:1}}>{s.val}</div>
            <div style={{color:"#6B7280",fontSize:11,marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"16px 24px 40px"}}>
        {tab === "tracker" ? (
          <>
            {/* FILTERS */}
            <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:20,alignItems:"center"}}>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 Search..." style={{border:"1px solid #E5E7EB",borderRadius:8,padding:"7px 12px",fontSize:13,width:200,outline:"none"}}/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {CATS.map(c=>(
                  <button key={c} onClick={()=>setCat(c)} style={{padding:"5px 12px",borderRadius:20,border:"1px solid",fontSize:12,cursor:"pointer",fontWeight:500,background:cat===c?BLUE:"white",color:cat===c?"white":"#6B7280",borderColor:cat===c?BLUE:"#E5E7EB"}}>
                    {c}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["All",...Object.keys(S)].map(s=>(
                  <button key={s} onClick={()=>setStFilter(s)} style={{padding:"5px 12px",borderRadius:20,border:"1px solid",fontSize:11,cursor:"pointer",fontWeight:500,background:stFilter===s?(s==="All"?BLUE:S[s]?.color):"white",color:stFilter===s?"white":(s==="All"?"#6B7280":S[s]?.color),borderColor:stFilter===s?"transparent":(s==="All"?"#E5E7EB":S[s]?.color+"60")}}>
                    {s==="All"?"All Status":S[s]?.label}
                  </button>
                ))}
              </div>
              <span style={{color:"#9CA3AF",fontSize:12,marginLeft:"auto"}}>{filtered.length}/{POSITIONS.length}</span>
            </div>

            {/* GRID */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
              {filtered.map(p=>{
                const d = data[p.id];
                const st = S[d.status] || S.not_sent;
                const pct = avg(d.areas);
                const tc = tlC(pct);
                return (
                  <div key={p.id} onClick={()=>setSel(p.id)} style={{background:"white",borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",cursor:"pointer",overflow:"hidden",transition:"box-shadow 0.15s",borderTop:`4px solid ${st.color}`}}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.12)"}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.08)"}>
                    <div style={{padding:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,color:"#1F2937",lineHeight:1.3}}>{p.title}</div>
                          <div style={{fontSize:11,color:"#9CA3AF",marginTop:2}}>{p.campus}</div>
                          {d.personName && <div style={{fontSize:11,color:BLUE,fontWeight:600,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.personName}</div>}
                        </div>
                        <div style={{background:st.bg,color:st.color,fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:20,whiteSpace:"nowrap"}}>{st.label}</div>
                      </div>

                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
                        <span style={{fontSize:10,background:"#F3F4F6",color:"#6B7280",padding:"2px 8px",borderRadius:20}}>{p.kpis} KPIs</span>
                        <span style={{fontSize:10,background:"#F3F4F6",color:"#6B7280",padding:"2px 8px",borderRadius:20}}>{p.areas.length} Areas</span>
                        {p.accr && <span style={{fontSize:10,background:"#EFF6FF",color:"#2563EB",padding:"2px 8px",borderRadius:20}}>{p.accr}</span>}
                        {p.dual && <span style={{fontSize:10,background:"#F5F3FF",color:"#7C3AED",padding:"2px 8px",borderRadius:20}}>Dual Role</span>}
                      </div>

                      <div style={{marginBottom:4,display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:11,color:"#9CA3AF"}}>KPI Completion</span>
                        <span style={{fontSize:11,fontWeight:700,color:tc}}>{pct}%</span>
                      </div>
                      <div style={{height:6,background:"#F3F4F6",borderRadius:99,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:tc,borderRadius:99,transition:"width 0.4s ease"}}/>
                      </div>

                      {(d.sentDate||d.receivedDate) && (
                        <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid #F3F4F6",display:"flex",justifyContent:"space-between"}}>
                          {d.sentDate && <span style={{fontSize:10,color:"#9CA3AF"}}>Sent: {d.sentDate}</span>}
                          {d.receivedDate && <span style={{fontSize:10,color:"#059669",fontWeight:600}}>Rcvd: {d.receivedDate}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{padding:"8px 16px 12px"}}>
                      <div style={{width:"100%",padding:"6px",background:"#F8FAFF",border:`1px solid ${BLUE}30`,borderRadius:8,textAlign:"center",fontSize:11,color:BLUE,fontWeight:600}}>✏️ Update Record</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* ANALYTICS */
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:20}}>
            <div style={{background:"white",borderRadius:14,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
              <div style={{fontWeight:700,color:"#1F2937",marginBottom:16}}>Submission Status</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value">
                    {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n)=>[v+" positions",n]}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginTop:8}}>
                {pieData.map(d=>(
                  <div key={d.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#6B7280"}}>
                    <div style={{width:8,height:8,borderRadius:2,background:d.color}}/>
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:"white",borderRadius:14,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
              <div style={{fontWeight:700,color:"#1F2937",marginBottom:16}}>KPI Area Completion %</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={POSITIONS.map(p=>({name:p.short,pct:avg(data[p.id]?.areas||{})}))} margin={{bottom:60}}>
                  <XAxis dataKey="name" tick={{fontSize:9}} angle={-45} textAnchor="end" interval={0}/>
                  <YAxis domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>`${v}%`}/>
                  <Tooltip formatter={v=>[`${v}%`,"Completion"]}/>
                  <Bar dataKey="pct" radius={[4,4,0,0]}>
                    {POSITIONS.map((p,i)=>{const pct=avg(data[p.id]?.areas||{});return <Cell key={i} fill={tlC(pct)}/>;})}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary table */}
            <div style={{background:"white",borderRadius:14,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",gridColumn:"1/-1",overflowX:"auto"}}>
              <div style={{fontWeight:700,color:"#1F2937",marginBottom:16}}>Full Compliance Summary</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:"2px solid #F3F4F6"}}>
                    {["Position","Person","Campus","KPIs","Status","Completion","Deadline","Received"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"6px 10px",color:"#9CA3AF",fontWeight:600,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
            
