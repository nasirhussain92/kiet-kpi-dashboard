import React from "react";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

const BLUE = "#003087";
const GREEN = "#1A6B3C";

const POSITIONS = [
  { id:"vc",          title:"Vice Chancellor",           short:"VC",          person:"",                        campus:"Both",    cat:"Senior",   kpis:64, areas:["Academics","Governance","Research & Development","Community Services","Financial Status","Diversity & Inclusion","Graduate Employability","Co-Curricular Activities","Sustainability","Automation Initiatives"] },
  { id:"df",          title:"Director Finance",          short:"DF",          person:"",                        campus:"Both",    cat:"Senior",   kpis:54, areas:["Financial Governance & Sustainability","Financial Management","Technology Integration","Expenditure Financial Discipline"] },
  { id:"qec",         title:"Director QEC",              short:"QEC",         person:"Prof. Dr. Sajida Parveen",campus:"SF",      cat:"Director", kpis:27, areas:["Status of QEC Office","Functions of QEC","International Ranking","Technology Integration"] },
  { id:"oric",        title:"Director ORIC",             short:"ORIC",        person:"",                        campus:"NN",      cat:"Director", kpis:30, areas:["Research Support","IP Management","Industry Engagement","Recognition & Awards","Operations & HR","ORIC Steering Committee","Entrepreneurship & Innovation"] },
  { id:"coe",         title:"Controller of Examinations",short:"CoE",         person:"",                        campus:"Both",    cat:"Director", kpis:28, areas:["General Administration","Examination Management","Technology Integration"] },
  { id:"reg",         title:"Registrar (Acting)",        short:"Reg",         person:"Prof. Dr. Tariq Jalees",  campus:"Both",    cat:"Director", kpis:32, note:"Also shortlisted for Registrar position",areas:["Administration & Coordination","Admission & Enrollment","Faculty Support","Financial Coordination","Equity & Inclusivity","Discipline & Inquiries","Campus Management & Safety","Transparency & Accountability","Technology Integration"] },
  { id:"dean_cocis",  title:"Dean CoCIS",                short:"Dean CoCIS",  person:"",                        campus:"NN",      cat:"Dean",     kpis:36, accr:"NCEAC/PEC", areas:["Academics","Governance","Research & Development","Community Services","Co-Curricular Activities","Accreditation & QA","Diversity & Inclusion","Graduate Employability","Technology Integration"] },
  { id:"dean_fms",    title:"Dean FMS",                  short:"Dean FMS",    person:"",                        campus:"NN+SF",   cat:"Dean",     kpis:36, accr:"NBEAC",    areas:["Academics","Governance","Research & Development","Community Services","Co-Curricular Activities","Accreditation & QA","Diversity & Inclusion","Graduate Employability","Technology Integration"] },
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
                <tbody>
                  {POSITIONS.map(p=>{
                    const d=data[p.id]; const st=S[d.status]||S.not_sent; const pct=avg(d.areas); const tc=tlC(pct);
                    return (
                      <tr key={p.id} onClick={()=>{setSel(p.id);setTab("tracker");}} style={{borderBottom:"1px solid #F9FAFB",cursor:"pointer"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                        <td style={{padding:"8px 10px",fontWeight:600,color:"#1F2937",whiteSpace:"nowrap"}}>{p.title}</td>
                        <td style={{padding:"8px 10px",color:"#6B7280"}}>{d.personName||<span style={{color:"#D1D5DB",fontStyle:"italic"}}>—</span>}</td>
                        <td style={{padding:"8px 10px",color:"#9CA3AF",fontSize:11}}>{p.campus}</td>
                        <td style={{padding:"8px 10px",color:"#6B7280"}}>{p.kpis}</td>
                        <td style={{padding:"8px 10px"}}><span style={{background:st.bg,color:st.color,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{st.label}</span></td>
                        <td style={{padding:"8px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{height:4,width:60,background:"#F3F4F6",borderRadius:99}}><div style={{height:"100%",width:`${pct}%`,background:tc,borderRadius:99}}/></div>
                            <span style={{color:tc,fontWeight:700,fontSize:11}}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{padding:"8px 10px",color:"#9CA3AF",fontSize:11}}>{d.deadline||"—"}</td>
                        <td style={{padding:"8px 10px",color:"#059669",fontSize:11,fontWeight:d.receivedDate?600:400}}>{d.receivedDate||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {sel && <EditModal pos={POSITIONS.find(p=>p.id===sel)} d={data[sel]} onSave={upd} onClose={()=>setSel(null)}/>}
    </div>
  );
}

function EditModal({ pos, d, onSave, onClose }) {
  const [t, setT] = useState("sub");
  const [loc, setLoc] = useState(() => JSON.parse(JSON.stringify(d)));
  const [flash, setFlash] = useState(false);

  const save = () => { onSave(pos.id, () => loc); setFlash(true); setTimeout(()=>setFlash(false),2000); };
  const updS = (k,v) => setLoc(p=>({...p,[k]:v}));
  const updA = (a,k,v) => setLoc(p=>({...p,areas:{...p.areas,[a]:{...p.areas[a],[k]:v}}}));
  const pct = avg(loc.areas);
  const tc = tlC(pct);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"40px 16px",overflowY:"auto"}}>
      <div style={{background:"white",borderRadius:20,width:"100%",maxWidth:640,boxShadow:"0 25px 50px rgba(0,0,0,0.25)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:BLUE,padding:"18px 22px",color:"white"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontWeight:700,fontSize:17}}>{pos.title}</div>
              <div style={{color:"#93C5FD",fontSize:11,marginTop:3,display:"flex",gap:14,flexWrap:"wrap"}}>
                <span>{pos.campus}</span><span>{pos.kpis} KPIs · {pos.areas.length} Areas</span>
                {pos.accr && <span>{pos.accr}</span>}
              </div>
              {pos.dual && <div style={{marginTop:6,background:"rgba(124,58,237,0.4)",display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:10}}>⚠ Dual Role — fill 2 proformas separately</div>}
              {pos.note && <div style={{marginTop:6,background:"rgba(245,158,11,0.3)",display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:10}}>📌 {pos.note}</div>}
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#93C5FD",fontSize:24,cursor:"pointer",lineHeight:1,padding:0}}>×</button>
          </div>
          {/* Progress */}
          <div style={{marginTop:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:11,color:"#BFDBFE"}}>KPI Area Completion</span>
              <span style={{fontSize:12,fontWeight:700,color:pct>=80?"#6EE7B7":pct>=40?"#FCD34D":"#FCA5A5"}}>{pct}%</span>
            </div>
            <div style={{height:6,background:"rgba(255,255,255,0.2)",borderRadius:99}}>
              <div style={{height:"100%",width:`${pct}%`,background:pct>=80?"#6EE7B7":pct>=40?"#FCD34D":"#FCA5A5",borderRadius:99,transition:"width 0.4s"}}/>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,borderBottom:"2px solid #F3F4F6",background:"#FAFAFA"}}>
          {[["sub","📬 Submission"],["areas","📊 KPI Areas"],["notes","📝 Notes"]].map(([id,label])=>(
            <button key={id} onClick={()=>setT(id)} style={{padding:"10px 18px",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:"none",color:t===id?BLUE:"#9CA3AF",borderBottom:`2px solid ${t===id?BLUE:"transparent"}`,transition:"all 0.15s",marginBottom:-2}}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{padding:"20px 22px",maxHeight:380,overflowY:"auto"}}>
          {t === "sub" && (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:"#6B7280",display:"block",marginBottom:4}}>Person / Position Holder</label>
                <input value={loc.personName} onChange={e=>updS("personName",e.target.value)} placeholder="Full name..."
                  style={{width:"100%",border:"1px solid #E5E7EB",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[["sentDate","Date Sent","date"],["deadline","Deadline","date"],["receivedDate","Date Received","date"]].map(([k,lbl,type])=>(
                  <div key={k}>
                    <label style={{fontSize:11,fontWeight:600,color:"#6B7280",display:"block",marginBottom:4}}>{lbl}</label>
                    <input type={type} value={loc[k]} onChange={e=>updS(k,e.target.value)}
                      style={{width:"100%",border:"1px solid #E5E7EB",borderRadius:8,padding:"7px 10px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                ))}
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:"#6B7280",display:"block",marginBottom:8}}>Submission Status</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {Object.entries(S).map(([val,cfg])=>(
                    <button key={val} onClick={()=>updS("status",val)}
                      style={{padding:"8px 6px",borderRadius:10,border:"2px solid",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all 0.15s",borderColor:loc.status===val?cfg.color:"#E5E7EB",background:loc.status===val?cfg.color:"white",color:loc.status===val?"white":cfg.color}}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {t === "areas" && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <p style={{fontSize:11,color:"#9CA3AF",margin:"0 0 4px"}}>Drag the slider or enter a % for each area (0 = not started · 100 = all KPIs filled & complete).</p>
              {pos.areas.map(area=>{
                const a = loc.areas[area] || {pct:0,notes:""};
                const atc = tlC(a.pct);
                return (
                  <div key={area} style={{border:"1px solid #F3F4F6",borderRadius:12,padding:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>{area}</span>
                      <span style={{fontSize:13,fontWeight:700,color:atc}}>{a.pct}%</span>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                      <input type="range" min={0} max={100} step={5} value={a.pct} onChange={e=>updA(area,"pct",+e.target.value)}
                        style={{flex:1,accentColor:atc}}/>
                      <input type="number" min={0} max={100} value={a.pct} onChange={e=>updA(area,"pct",Math.min(100,Math.max(0,+e.target.value)))}
                        style={{width:52,border:"1px solid #E5E7EB",borderRadius:6,padding:"3px 6px",fontSize:12,textAlign:"center",outline:"none"}}/>
                    </div>
                    <input value={a.notes} onChange={e=>updA(area,"notes",e.target.value)} placeholder="Area notes..."
                      style={{width:"100%",border:"1px solid #F3F4F6",borderRadius:6,padding:"4px 8px",fontSize:11,color:"#6B7280",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                );
              })}
            </div>
          )}

          {t === "notes" && (
            <div>
              <label style={{fontSize:11,fontWeight:600,color:"#6B7280",display:"block",marginBottom:6}}>Follow-up Notes / Observations</label>
              <textarea value={loc.notes} onChange={e=>updS("notes",e.target.value)} rows={9}
                placeholder="Any follow-up needed, issues raised, special instructions..."
                style={{width:"100%",border:"1px solid #E5E7EB",borderRadius:10,padding:"10px 12px",fontSize:13,outline:"none",resize:"none",boxSizing:"border-box",color:"#374151"}}/>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 22px",borderTop:"1px solid #F3F4F6",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#FAFAFA"}}>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#9CA3AF",fontSize:13,cursor:"pointer",fontWeight:500}}>Cancel</button>
          <button onClick={save} style={{background:flash?"#059669":BLUE,color:"white",border:"none",borderRadius:10,padding:"9px 24px",fontSize:13,fontWeight:700,cursor:"pointer",transition:"background 0.3s"}}>
            {flash?"✓ Saved!":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
