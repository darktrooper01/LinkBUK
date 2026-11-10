import React, { useState, useEffect, useRef, useCallback, useId, cloneElement } from "react";
import {
  MapPin, Mail, Phone, Briefcase, Calendar, User, Building2, LayoutDashboard, LogOut,
  CheckCircle2, AlertCircle, Clock, Plus, Users, FileText, Bell, X, Search,
} from "lucide-react";
import { api, tokenStore } from "./api.js";

const NAVY = "#16273F";
const BLUE = "#17A4DD";
const FONT = "'Montserrat', sans-serif";
const SERIF = "'Playfair Display', serif";

const FACULTIES = [
  "Faculty of Computing", "Faculty of Engineering", "Faculty of Science",
  "Faculty of Social and Management Sciences", "Faculty of Education",
  "Faculty of Arts and Islamic Studies", "Faculty of Law", "Faculty of Medicine", "Other",
];

/* ---------------------------------------------------------
   SHARED UI PIECES
--------------------------------------------------------- */
function Button({ children, variant = "solid", style, ...props }) {
  const base = {
    fontFamily: FONT, fontWeight: 600, fontSize: 15, cursor: props.disabled ? "not-allowed" : "pointer",
    borderRadius: 14, padding: "12px 24px", border: "none", opacity: props.disabled ? 0.55 : 1,
  };
  const variants = {
    solid: { background: BLUE, color: "#fff" },
    outline: { background: "transparent", color: NAVY, border: `2px solid ${BLUE}` },
    ghost: { background: "transparent", color: NAVY, border: "1px solid #ddd" },
    danger: { background: "#E24B4A", color: "#fff" },
  };
  return (
    <button {...props} className={`lb-btn-anim ${props.className || ""}`} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Badge({ text, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#F2F1F1", color: "#444" },
    approved: { bg: "#E7F7F1", color: "#0F6E56" },
    pending: { bg: "#FAEEDA", color: "#854F0B" },
    rejected: { bg: "#FCEBEB", color: "#A32D2D" },
  };
  const t = tones[tone];
  return (
    <span className={tone === "pending" ? "lb-pulse" : ""} style={{
      background: t.bg, color: t.color, fontSize: 12, fontWeight: 700,
      padding: "4px 12px", borderRadius: 20, textTransform: "capitalize", whiteSpace: "nowrap", display: "inline-block",
    }}>{text}</span>
  );
}
const statusTone = (s) => {
  const v = String(s).toLowerCase();
  return v === "approved" || v === "reviewed" ? "approved" : v === "rejected" ? "rejected" : "pending";
};

function Card({ children, style, className = "", ...rest }) {
  return (
    <div {...rest} className={`lb-card-anim ${className}`} style={{
      background: "#fff", border: "1px solid #E5E5E5", borderRadius: 18, padding: 24, ...style,
    }}>{children}</div>
  );
}

function Field({ label, children }) {
  const id = useId();   // ties the label to its input for screen readers and clicks
  return (
    <div style={{ marginBottom: 18, textAlign: "left" }}>
      {label && <label htmlFor={id} style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#333" }}>{label}</label>}
      {cloneElement(children, { id })}
    </div>
  );
}
const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #ddd",
  fontSize: 14, fontFamily: FONT, boxSizing: "border-box", outline: "none", background: "#fff",
};
function TextField({ label, ...props }) {
  return <Field label={label}><input {...props} className="lb-input-anim" style={inputStyle} /></Field>;
}
function TextArea({ label, ...props }) {
  return <Field label={label}><textarea {...props} className="lb-input-anim" style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} /></Field>;
}
function Select({ label, children, ...props }) {
  return <Field label={label}><select {...props} className="lb-input-anim" style={inputStyle}>{children}</select></Field>;
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const bad = toast.kind === "error";
  return (
    <div className="lb-toast" style={{ background: bad ? "#A32D2D" : NAVY }}>
      {bad ? <AlertCircle size={18} color="#fff" /> : <CheckCircle2 size={18} color={BLUE} />}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <X size={16} style={{ cursor: "pointer", flexShrink: 0 }} onClick={onClose} />
    </div>
  );
}

function Notice({ tone = "warn", icon, children }) {
  const c = tone === "warn" ? { bg: "#FAEEDA", fg: "#854F0B" } : { bg: "#FCEBEB", fg: "#A32D2D" };
  return (
    <div className="lb-fade-up" style={{ background: c.bg, color: c.fg, padding: "12px 18px", borderRadius: 10, fontSize: 13, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
      {icon}<span>{children}</span>
    </div>
  );
}

function Loading({ error, onRetry }) {
  if (error) {
    return (
      <div style={{ color: "#A32D2D", fontSize: 14 }}>
        {error} {onRetry && <span onClick={onRetry} style={{ color: BLUE, cursor: "pointer", fontWeight: 600 }}>Try again</span>}
      </div>
    );
  }
  return <p style={{ color: "#999", fontSize: 14 }}>Loading...</p>;
}

// Loads data from the API and exposes a reload function.
function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const run = useCallback(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    fn().then((data) => live && setState({ data, error: "", loading: false }))
      .catch((e) => live && setState({ data: null, error: e.message, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => run(), [run]);
  return { ...state, reload: run };
}

/* ---------------------------------------------------------
   NAVBAR AND FOOTER
--------------------------------------------------------- */
function Navbar({ session, onNav, onLogout }) {
  const link = { color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
  return (
    <nav className="lb-navbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", background: NAVY }}>
      <span onClick={() => onNav("home")} className="lb-nav-link lb-brand" style={{ fontWeight: 700, fontSize: 24, color: "#fff", cursor: "pointer" }}>LinkBuk</span>
      <div className="lb-nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <a onClick={() => onNav("home")} className="lb-nav-link" style={link}>Home</a>
        {!session && <a onClick={() => onNav("login")} className="lb-nav-link" style={link}>Login</a>}
        {!session && <Button style={{ padding: "10px 20px", fontSize: 14 }} onClick={() => onNav("signup")}>Sign up</Button>}
        {session && (
          <>
            <a onClick={() => onNav("dashboard")} className="lb-nav-link" style={link}><LayoutDashboard size={16} /> <span className="lb-nav-text">Dashboard</span></a>
            <a onClick={onLogout} className="lb-nav-link" style={link}><LogOut size={16} /> <span className="lb-nav-text">Logout</span></a>
          </>
        )}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <div className="lb-footer-pad" style={{ background: NAVY, padding: "48px 48px 28px", marginTop: 20 }}>
      <div className="lb-footer-grid">
        <div>
          <h4 style={{ color: "#fff", fontSize: 20, margin: "0 0 16px" }}>Contact</h4>
          <div className="lb-contact"><MapPin size={18} color="#fff" /><span>Buk new-site, Gwarzo road, Kano</span></div>
          <div className="lb-contact"><Phone size={16} color="#fff" /><span>08068812146</span></div>
          <div className="lb-contact"><Mail size={16} color="#fff" /><span>mahmoudmuhdmm@gmail.com</span></div>
        </div>
        <div>
          <h4 style={{ color: "#fff", fontSize: 20, margin: "0 0 16px" }}>Services</h4>
          <p style={{ color: "#fff", fontSize: 14, margin: "0 0 8px" }}>Companies</p>
          <p style={{ color: "#fff", fontSize: 14, margin: 0 }}>Account</p>
        </div>
      </div>
      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 40, marginBottom: 0 }}>
        Copyright 2026 by Mahmoud Muhammad. All Rights Reserved.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------
   HOME PAGE
--------------------------------------------------------- */
function HomePage({ onSelectRole }) {
  const roles = [
    { key: "student", label: "Student", desc: "Browse jobs, internships, and events from verified companies.", icon: <User size={26} color={BLUE} /> },
    { key: "company", label: "Company", desc: "Post job openings, internships, and events for BUK students.", icon: <Building2 size={26} color={BLUE} /> },
    { key: "admin", label: "Admin", desc: "Manage company approvals and moderate platform activity.", icon: <LayoutDashboard size={26} color={BLUE} /> },
  ];
  return (
    <div>
      <div className="lb-hero" style={{ background: NAVY, padding: "90px 48px 140px", textAlign: "center" }}>
        <h1 className="lb-fade-up lb-hero-title" style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 42, color: "#fff", margin: "0 0 18px" }}>
          Bridging Academia and Industry
        </h1>
        <p className="lb-fade-up lb-hero-sub" style={{ color: "#fff", fontWeight: 300, fontSize: 17, maxWidth: 600, margin: "0 auto", lineHeight: 1.7, opacity: 0.85, animationDelay: "0.12s" }}>
          LinkBUK connects Bayero University Kano students with companies offering internships, employment, and professional development opportunities.
        </p>
      </div>
      <div className="lb-page-pad" style={{ padding: "0 48px", marginTop: -84 }}>
        <div className="lb-fade-up lb-role-panel" style={{ maxWidth: 980, margin: "0 auto 100px", background: "#fff", borderRadius: 28, boxShadow: "0 20px 60px rgba(22,39,63,0.18)", padding: "44px 40px", animationDelay: "0.25s" }}>
          <div className="lb-role-grid">
            {roles.map((r) => (
              <div key={r.key} onClick={() => onSelectRole(r.key)} className="lb-role-item">
                <div className="lb-role-icon">{r.icon}</div>
                <h3 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 18, margin: "0 0 8px", color: NAVY }}>{r.label}</h3>
                <p style={{ fontSize: 13, color: "#888", margin: "0 0 22px", lineHeight: 1.6 }}>{r.desc}</p>
                <span style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: BLUE, borderBottom: `2px solid ${BLUE}`, paddingBottom: 2 }}>
                  Continue <span className="lb-role-arrow">&rarr;</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------
   AUTH SCREENS
--------------------------------------------------------- */
function AuthShell({ title, subtitle, children }) {
  return (
    <div className="lb-auth-wrap" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px" }}>
      <Card className="lb-pop lb-auth-card" style={{ width: 420, maxWidth: "100%", textAlign: "center" }}>
        <h2 style={{ fontFamily: SERIF, fontSize: 26, margin: "0 0 6px" }}>{title}</h2>
        <p style={{ color: "#777", fontSize: 14, marginBottom: 24 }}>{subtitle}</p>
        {children}
      </Card>
    </div>
  );
}

function RolePills({ roles, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 22, justifyContent: "center", flexWrap: "wrap" }}>
      {roles.map((r) => (
        <button key={r} type="button" onClick={() => onChange(r)} style={{
          padding: "8px 18px", borderRadius: 20, border: `2px solid ${BLUE}`, cursor: "pointer", fontFamily: FONT,
          background: value === r ? BLUE : "#fff", color: value === r ? "#fff" : NAVY,
          fontWeight: 600, fontSize: 13, textTransform: "capitalize",
        }}>{r}</button>
      ))}
    </div>
  );
}

const REG_PATTERN = /^[A-Z]{2,5}\/\d{2}\/[A-Z]{2,5}\/\d{4,6}$/;

function SignupPage({ onAuthed, onNav, initialRole = "student" }) {
  const [role, setRole] = useState(initialRole === "admin" ? "student" : initialRole);
  const [form, setForm] = useState({ name: "", email: "", password: "", faculty: "", department: "", regNumber: "", industry: "", rcNumber: "", address: "", contactPerson: "", phone: "", website: "", acceptedConduct: false });
  const [reqs, setReqs] = useState([]);
  useEffect(() => { api.get("/requirements").then((d) => setReqs(d.requirements)).catch(() => {}); }, []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (role === "student") {
      if (!form.name || !form.email || !form.password || !form.faculty || !form.department || !form.regNumber) return setError("Please fill in all fields.");
      if (!REG_PATTERN.test(form.regNumber.toUpperCase())) return setError("Registration number must follow the format FACULTY/YEAR/DEPT/IDNO, e.g. CST/22/IFT/00752");
    } else {
      if (!form.name || !form.email || !form.password || !form.industry || !form.rcNumber || !form.address || !form.contactPerson || !form.phone || !form.website) return setError("Please fill in all fields.");
      if (!form.acceptedConduct) return setError("You must accept the partner code of conduct.");
    }
    setBusy(true);
    try {
      const body = role === "student"
        ? { name: form.name, email: form.email, password: form.password, faculty: form.faculty, department: form.department, regNumber: form.regNumber }
        : { name: form.name, email: form.email, password: form.password, industry: form.industry, rcNumber: form.rcNumber, address: form.address, contactPerson: form.contactPerson, phone: form.phone, website: form.website, acceptedConduct: form.acceptedConduct };
      const data = await api.post(`/auth/${role}/signup`, body);
      onAuthed(data, role === "student" ? "Account created. Welcome to LinkBUK!" : "Company account created. Awaiting admin approval.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join LinkBUK as a student or a company">
      <form onSubmit={submit} noValidate>
        <RolePills roles={["student", "company"]} value={role} onChange={(r) => { setRole(r); setError(""); }} />
        <TextField label={role === "student" ? "Full name" : "Company name"} placeholder="Enter name" value={form.name} onChange={set("name")} />
        <TextField label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
        <TextField label="Password" type="password" placeholder="Create a password" value={form.password} onChange={set("password")} />
        {role === "student" && (
          <>
            <Select label="Faculty" value={form.faculty} onChange={set("faculty")}>
              <option value="">Select faculty</option>
              {FACULTIES.map((f) => <option key={f}>{f}</option>)}
            </Select>
            <TextField label="Department" placeholder="e.g. Information Technology" value={form.department} onChange={set("department")} />
            <TextField label="Registration number" placeholder="e.g. CST/22/IFT/00752" value={form.regNumber} onChange={set("regNumber")} />
            <p style={{ fontSize: 11, color: "#999", margin: "-12px 0 18px", textAlign: "left" }}>Format: FACULTY CODE / YEAR / DEPARTMENT CODE / ID NUMBER</p>
          </>
        )}
        {role === "company" && (
          <>
            <TextField label="Industry" placeholder="e.g. Fintech" value={form.industry} onChange={set("industry")} />
            <TextField label="CAC registration number" placeholder="e.g. RC 1234567" value={form.rcNumber} onChange={set("rcNumber")} />
            <TextField label="Business address" placeholder="Street, city, state" value={form.address} onChange={set("address")} />
            <TextField label="Contact person" placeholder="Full name" value={form.contactPerson} onChange={set("contactPerson")} />
            <TextField label="Phone number" placeholder="e.g. 08031234567" value={form.phone} onChange={set("phone")} />
            <TextField label="Website or online profile" placeholder="https://..." value={form.website} onChange={set("website")} />
            {reqs.length > 0 && (
              <div data-testid="requirements-list" style={{ textAlign: "left", background: "#F4F8FB", borderRadius: 10, padding: "12px 14px", margin: "0 0 14px", fontSize: 12, color: "#444" }}>
                <p style={{ fontWeight: 700, margin: "0 0 6px", color: NAVY }}>Before BUK approves a company it checks:</p>
                <ol style={{ margin: 0, paddingLeft: 18 }}>{reqs.map((r) => <li key={r.code} style={{ marginBottom: 3 }}>{r.label}</li>)}</ol>
              </div>
            )}
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", textAlign: "left", fontSize: 13, margin: "0 0 14px", cursor: "pointer" }}>
              <input type="checkbox" checked={form.acceptedConduct} onChange={(e) => setForm({ ...form, acceptedConduct: e.target.checked })} style={{ marginTop: 3 }} />
              <span>I accept the BUK partner code of conduct on behalf of this company.</span>
            </label>
          </>
        )}
        {error && <p role="alert" style={{ color: "#E24B4A", fontSize: 12, textAlign: "left", marginTop: -10, marginBottom: 14 }}>{error}</p>}
        <Button type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>{busy ? "Creating account..." : "Create account"}</Button>
      </form>
      <p style={{ fontSize: 13, marginTop: 16, color: "#777" }}>
        Already have an account? <span style={{ color: BLUE, cursor: "pointer", fontWeight: 600 }} onClick={() => onNav("login")}>Log in</span>
      </p>
    </AuthShell>
  );
}

function LoginPage({ onAuthed, onNav, initialRole = "student" }) {
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Enter your email and password.");
    setBusy(true);
    try {
      const data = await api.post("/auth/login", { role, email, password });
      onAuthed(data, "Logged in successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue to LinkBUK">
      <form onSubmit={submit} noValidate>
        <RolePills roles={["student", "company", "admin"]} value={role} onChange={(r) => { setRole(r); setError(""); }} />
        <TextField label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" style={{ color: "#E24B4A", fontSize: 12, textAlign: "left", marginTop: -10, marginBottom: 14 }}>{error}</p>}
        <Button type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>{busy ? "Logging in..." : "Log in"}</Button>
      </form>
      {role !== "admin" && (
        <p style={{ fontSize: 13, marginTop: 16, color: "#777" }}>
          New here? <span style={{ color: BLUE, cursor: "pointer", fontWeight: 600 }} onClick={() => onNav("signup")}>Create an account</span>
        </p>
      )}
    </AuthShell>
  );
}

/* ---------------------------------------------------------
   DASHBOARD SHELL (sidebar on desktop, tab bar on small screens)
--------------------------------------------------------- */
function DashboardShell({ title, tabs, active, onTabChange, children }) {
  return (
    <div className="lb-dashboard-shell">
      <div className="lb-sidebar">
        <p className="lb-sidebar-title" style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "#999", padding: "0 24px 16px", margin: 0 }}>{title}</p>
        {tabs.map((t) => (
          <div key={t.key} onClick={() => onTabChange(t.key)} className={`lb-sidebar-item${active === t.key ? " active" : ""}`}>
            {t.icon} {t.label}
          </div>
        ))}
      </div>
      <div key={active} className="lb-fade lb-content-area">{children}</div>
    </div>
  );
}

function EmptyText({ children }) { return <p style={{ color: "#999" }}>{children}</p>; }

/* ---------------------------------------------------------
   STUDENT DASHBOARD
--------------------------------------------------------- */
function StudentDashboard({ session, onSession, toast }) {
  const [tab, setTab] = useState("browse");
  return (
    <DashboardShell
      title="Student Menu"
      tabs={[
        { key: "browse", label: "Browse Opportunities", icon: <Briefcase size={16} /> },
        { key: "applications", label: "My Applications", icon: <FileText size={16} /> },
        { key: "events", label: "Events & Seminars", icon: <Calendar size={16} /> },
        { key: "profile", label: "Profile", icon: <User size={16} /> },
      ]}
      active={tab} onTabChange={setTab}
    >
      <h2 style={{ fontFamily: SERIF, margin: "0 0 24px" }}>Welcome, {session.name}</h2>
      {tab === "browse" && <BrowseJobs toast={toast} />}
      {tab === "applications" && <MyApplications />}
      {tab === "events" && <StudentEvents toast={toast} />}
      {tab === "profile" && <StudentProfile session={session} onSession={onSession} toast={toast} />}
    </DashboardShell>
  );
}

function JobCard({ job, index, onApply }) {
  const [open, setOpen] = useState(false);
  const Part = ({ label, text }) => (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#16273F", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 13, margin: 0, whiteSpace: "pre-line" }}>{text}</p>
    </div>
  );
  return (
    <Card className="lb-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
      <Badge text={job.type} tone="neutral" />
      <h3 style={{ fontFamily: SERIF, fontSize: 17, margin: "10px 0 2px" }}>{job.title}</h3>
      <p style={{ fontSize: 13, color: "#777", margin: "0 0 10px" }}>{job.companyName} &bull; {job.location}</p>
      <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{job.salary}</p>
      {open ? (
        <div data-testid="job-details" style={{ margin: "0 0 12px" }}>
          <Part label="Description" text={job.description} />
          <Part label="Requirements" text={job.requirements} />
          <Part label="Qualifications" text={job.qualifications} />
        </div>
      ) : (
        <p style={{ fontSize: 13, marginBottom: 12 }}>{job.description.length > 110 ? job.description.slice(0, 110) + "..." : job.description}</p>
      )}
      <Button variant="ghost" style={{ width: "100%", marginBottom: 10 }} onClick={() => setOpen(!open)}>{open ? "Hide details" : "View details"}</Button>
      {job.applicationStatus
        ? <Badge text={`Application: ${job.applicationStatus}`} tone={statusTone(job.applicationStatus)} />
        : <Button style={{ width: "100%" }} onClick={() => onApply(job)}>Apply Now</Button>}
    </Card>
  );
}

function BrowseJobs({ toast }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [applied, setApplied] = useState({ q: "", type: "", location: "" });
  const { data, error, loading, reload } = useLoad(
    () => api.get(`/jobs?q=${encodeURIComponent(applied.q)}&type=${encodeURIComponent(applied.type)}&location=${encodeURIComponent(applied.location)}`),
    [applied]);

  const apply = async (job) => {
    try { await api.post(`/jobs/${job.id}/apply`); toast(`Applied to ${job.title}!`); reload(); }
    catch (e) { toast(e.message, "error"); }
  };
  const search = (e) => { e.preventDefault(); setApplied({ q: q.trim(), type, location: location.trim() }); };
  const clear = () => { setQ(""); setType(""); setLocation(""); setApplied({ q: "", type: "", location: "" }); };

  return (
    <>
      <form onSubmit={search} className="lb-filter-bar">
        <div className="lb-filter-search">
          <Search size={16} color="#888" />
          <input aria-label="Search listings" type="search" placeholder="Search title, company or requirements" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="">All types</option>
          <option>Job</option>
          <option>Internship</option>
        </select>
        <input aria-label="Filter by location" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 0 }} />
        <Button type="submit" style={{ padding: "11px 20px" }}>Search</Button>
        {(applied.q || applied.type || applied.location) && <Button type="button" variant="ghost" style={{ padding: "11px 20px" }} onClick={clear}>Clear</Button>}
      </form>
      {error ? <Loading error={error} onRetry={reload} /> : loading && !data ? <Loading /> : (
        data.jobs.length === 0 ? <EmptyText>No listings match your search.</EmptyText> : (
          <div className="lb-grid-cards">
            {data.jobs.map((job, i) => <JobCard key={job.id} job={job} index={i} onApply={apply} />)}
          </div>
        )
      )}
    </>
  );
}

function MyApplications() {
  const { data, error, loading, reload } = useLoad(() => api.get("/applications/mine"), []);
  if (error) return <Loading error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  return (
    <div className="lb-stack">
      {data.applications.length === 0 && <EmptyText>You have not applied to anything yet.</EmptyText>}
      {data.applications.map((app) => (
        <Card key={app.id} className="lb-row">
          <div>
            <h4 style={{ margin: "0 0 4px" }}>{app.title}</h4>
            <p style={{ fontSize: 13, color: "#777", margin: 0 }}>{app.companyName} &bull; Applied {app.appliedDate}</p>
            {app.status === "Approved" && <p style={{ fontSize: 12, color: "#0F6E56", margin: "4px 0 0" }}>Approved. Check your email for the message from the company.</p>}
          </div>
          <Badge text={app.status} tone={statusTone(app.status)} />
        </Card>
      ))}
    </div>
  );
}

function StudentEvents({ toast }) {
  const { data, error, loading, reload } = useLoad(() => api.get("/events"), []);
  const register = async (ev) => {
    try { await api.post(`/events/${ev.id}/register`); toast(`Registered for ${ev.title}!`); reload(); }
    catch (e) { toast(e.message, "error"); }
  };
  if (error) return <Loading error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  return (
    <>
      {data.events.length === 0 && <EmptyText>No events are open right now.</EmptyText>}
      <div className="lb-grid-cards">
        {data.events.map((ev, i) => (
          <Card key={ev.id} className="lb-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <h3 style={{ fontFamily: SERIF, fontSize: 17, margin: "0 0 2px" }}>{ev.title}</h3>
            <p style={{ fontSize: 13, color: "#777", margin: "0 0 10px" }}>{ev.companyName}</p>
            <p style={{ fontSize: 13, marginBottom: 6 }}><Calendar size={13} style={{ verticalAlign: -2, marginRight: 6 }} />{ev.date}</p>
            <p style={{ fontSize: 13, marginBottom: 14 }}><MapPin size={13} style={{ verticalAlign: -2, marginRight: 6 }} />{ev.venue}</p>
            {ev.registered ? <Badge text="Registered" tone="approved" /> : <Button style={{ width: "100%" }} onClick={() => register(ev)}>Register</Button>}
          </Card>
        ))}
      </div>
    </>
  );
}

const CV_MAX_BYTES = 2 * 1024 * 1024;
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(new Error("The file could not be read."));
    r.readAsDataURL(file);
  });
}
function saveBase64File({ name, type, data }) {
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CvUpload({ session, onSession, toast }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputId = useId();
  const choose = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) return setError("Upload your CV as a PDF, DOC, or DOCX file.");
    if (file.size > CV_MAX_BYTES) return setError("The file is too large. The limit is 2 MB.");
    setBusy(true);
    try {
      const data = await readAsBase64(file);
      const d = await api.put("/student/cv", { name: file.name, data });
      onSession(d.user); toast("CV uploaded.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { const d = await api.del("/student/cv"); onSession(d.user); toast("CV removed."); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const view = async () => {
    try { saveBase64File(await api.get("/student/cv")); }
    catch (err) { setError(err.message); }
  };
  return (
    <div style={{ borderTop: "1px solid #eee", paddingTop: 16, marginTop: 4 }}>
      <label htmlFor={inputId} style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Your CV</label>
      <p style={{ fontSize: 13, color: "#777", margin: "0 0 10px" }}>
        {session.cvName ? <>Uploaded: <strong>{session.cvName}</strong></> : "No CV uploaded yet. Companies can download it when you apply."}
      </p>
      <input id={inputId} type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={choose} disabled={busy} style={{ fontSize: 13, maxWidth: "100%", display: "block" }} />
      {session.cvName && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <Button variant="outline" style={{ padding: "8px 16px", fontSize: 13 }} onClick={view}>Download</Button>
          <Button variant="danger" disabled={busy} style={{ padding: "8px 16px", fontSize: 13 }} onClick={remove}>Remove</Button>
        </div>
      )}
      <p style={{ fontSize: 12, color: "#999", margin: "8px 0 0" }}>PDF, DOC, or DOCX, up to 2 MB.</p>
      {error && <p role="alert" style={{ color: "#E24B4A", fontSize: 12, margin: "8px 0 0" }}>{error}</p>}
    </div>
  );
}

function StudentProfile({ session, onSession, toast }) {
  const [form, setForm] = useState({ name: session.name, faculty: session.faculty, department: session.department, regNumber: session.regNumber });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async () => {
    setError(""); setBusy(true);
    try { const d = await api.put("/student/profile", form); onSession(d.user); toast("Profile updated."); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Card className="lb-form-card">
      <TextField label="Full name" value={form.name} onChange={set("name")} />
      <TextField label="Email" value={session.email} disabled />
      <Select label="Faculty" value={form.faculty} onChange={set("faculty")}>{FACULTIES.map((f) => <option key={f}>{f}</option>)}</Select>
      <TextField label="Department" value={form.department} onChange={set("department")} />
      <TextField label="Registration number" value={form.regNumber} onChange={set("regNumber")} />
      {error && <p role="alert" style={{ color: "#E24B4A", fontSize: 12, marginTop: -8 }}>{error}</p>}
      <Button disabled={busy} onClick={save}>{busy ? "Saving..." : "Save Changes"}</Button>
      <CvUpload session={session} onSession={onSession} toast={toast} />
    </Card>
  );
}

/* ---------------------------------------------------------
   COMPANY DASHBOARD
--------------------------------------------------------- */
function CompanyDashboard({ session, onSession, toast }) {
  const [tab, setTab] = useState("listings");
  const [version, setVersion] = useState(0);

  // Pick up approval changes made by the administrator.
  useEffect(() => {
    api.get("/me").then((d) => onSession(d.user)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const pending = session.status !== "approved";
  const bump = () => setVersion((v) => v + 1);

  return (
    <DashboardShell
      title="Company Menu"
      tabs={[
        { key: "listings", label: "My Listings", icon: <Briefcase size={16} /> },
        { key: "post-job", label: "Post Job / Internship", icon: <Plus size={16} /> },
        { key: "post-event", label: "Post Event", icon: <Calendar size={16} /> },
        { key: "applicants", label: "Applicants", icon: <Users size={16} /> },
        { key: "profile", label: "Company Profile", icon: <Building2 size={16} /> },
      ]}
      active={tab} onTabChange={setTab}
    >
      <h2 style={{ fontFamily: SERIF, margin: "0 0 8px" }}>{session.name}</h2>
      {session.status === "pending" && <Notice icon={<Clock size={16} />}>Your company account is pending admin approval. You can post once it is approved, and listings stay hidden from students until the administrator approves each one.</Notice>}
      {session.status === "rejected" && <Notice tone="bad" icon={<AlertCircle size={16} />}>Your company registration was not approved. Contact the university administrator for details.</Notice>}
      {tab === "listings" && <CompanyListings version={version} />}
      {tab === "post-job" && <PostJob disabled={pending} toast={toast} onDone={() => { bump(); setTab("listings"); }} />}
      {tab === "post-event" && <PostEvent disabled={pending} toast={toast} onDone={() => { bump(); setTab("listings"); }} />}
      {tab === "applicants" && <Applicants toast={toast} />}
      {tab === "profile" && <CompanyProfile session={session} onSession={onSession} toast={toast} />}
    </DashboardShell>
  );
}

function CompanyListings({ version }) {
  const { data, error, loading, reload } = useLoad(() => api.get("/company/listings"), [version]);
  if (error) return <Loading error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  if (data.jobs.length + data.events.length === 0) return <EmptyText>You haven't posted anything yet.</EmptyText>;
  return (
    <div className="lb-stack">
      {data.jobs.map((job) => (
        <Card key={"j" + job.id} className="lb-row">
          <div>
            <h4 style={{ margin: "0 0 4px" }}>{job.title} <span style={{ fontSize: 12, color: "#999" }}>({job.type})</span></h4>
            <p style={{ fontSize: 13, color: "#777", margin: 0 }}>{job.location} &bull; {job.salary}</p>
          </div>
          <Badge text={job.status} tone={statusTone(job.status)} />
        </Card>
      ))}
      {data.events.map((ev) => (
        <Card key={"e" + ev.id} className="lb-row">
          <div>
            <h4 style={{ margin: "0 0 4px" }}>{ev.title} <span style={{ fontSize: 12, color: "#999" }}>(Event)</span></h4>
            <p style={{ fontSize: 13, color: "#777", margin: 0 }}>{ev.date} &bull; {ev.venue}</p>
          </div>
          <Badge text={ev.status} tone={statusTone(ev.status)} />
        </Card>
      ))}
    </div>
  );
}

function PostJob({ disabled, toast, onDone }) {
  const empty = { title: "", type: "Job", location: "", salary: "", description: "", requirements: "", qualifications: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    setBusy(true);
    try { await api.post("/company/jobs", f); toast("Job submitted for admin approval."); setF(empty); onDone(); }
    catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };
  return (
    <Card className="lb-form-card">
      {disabled && <Notice icon={<Clock size={16} />}>Posting is switched off until your company is approved.</Notice>}
      <TextField label="Job title" placeholder="e.g. Frontend Developer" value={f.title} onChange={set("title")} disabled={disabled} />
      <Select label="Type" value={f.type} onChange={set("type")} disabled={disabled}><option>Job</option><option>Internship</option></Select>
      <TextField label="Location" placeholder="e.g. Kano" value={f.location} onChange={set("location")} disabled={disabled} />
      <TextField label="Salary / Stipend" placeholder="e.g. ₦200,000/month" value={f.salary} onChange={set("salary")} disabled={disabled} />
      <TextArea label="Description" placeholder="Describe the role..." value={f.description} onChange={set("description")} disabled={disabled} />
      <TextArea label="Requirements" placeholder="Skills and experience needed, one per line..." value={f.requirements} onChange={set("requirements")} disabled={disabled} />
      <TextArea label="Qualifications" placeholder="Degree or certificates needed, one per line..." value={f.qualifications} onChange={set("qualifications")} disabled={disabled} />
      <Button disabled={disabled || busy} onClick={submit}>{busy ? "Submitting..." : "Submit for Approval"}</Button>
    </Card>
  );
}

function PostEvent({ disabled, toast, onDone }) {
  const empty = { title: "", date: "", venue: "", description: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    setBusy(true);
    try { await api.post("/company/events", f); toast("Event submitted for admin approval."); setF(empty); onDone(); }
    catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };
  return (
    <Card className="lb-form-card">
      {disabled && <Notice icon={<Clock size={16} />}>Posting is switched off until your company is approved.</Notice>}
      <TextField label="Event title" placeholder="e.g. Career Fair" value={f.title} onChange={set("title")} disabled={disabled} />
      <TextField label="Date" type="date" value={f.date} onChange={set("date")} disabled={disabled} />
      <TextField label="Venue" placeholder="e.g. Faculty Auditorium" value={f.venue} onChange={set("venue")} disabled={disabled} />
      <TextArea label="Description" placeholder="Describe the event..." value={f.description} onChange={set("description")} disabled={disabled} />
      <Button disabled={disabled || busy} onClick={submit}>{busy ? "Submitting..." : "Submit for Approval"}</Button>
    </Card>
  );
}

function Applicants({ toast }) {
  const { data, error, loading, reload } = useLoad(() => api.get("/company/applicants"), []);
  const setStatus = async (id, status) => {
    try {
      const r = await api.patch(`/company/applications/${id}`, { status });
      const note = r.email === "sent" ? " The student has been notified by email." : r.email === "failed" ? " The email to the student could not be sent." : r.email === "skipped" ? " Email is not set up on this server, so no message was sent." : "";
      toast(`Application marked ${status.toLowerCase()}.${note}`); reload();
    }
    catch (e) { toast(e.message, "error"); }
  };
  const downloadCv = async (id) => {
    try { saveBase64File(await api.get(`/company/applicants/${id}/cv`)); }
    catch (e) { toast(e.message, "error"); }
  };
  if (error) return <Loading error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  return (
    <div className="lb-stack">
      {data.applicants.length === 0 && <EmptyText>No applicants yet.</EmptyText>}
      {data.applicants.map((a) => (
        <Card key={a.id} className="lb-row">
          <div>
            <h4 style={{ margin: "0 0 4px" }}>{a.studentName}</h4>
            <p style={{ fontSize: 13, color: "#777", margin: "0 0 2px" }}>Applied for {a.jobTitle} &bull; {a.appliedDate}</p>
            <p style={{ fontSize: 12, color: "#999", margin: 0 }}>{a.department}, {a.regNumber} &bull; {a.email}</p>
          </div>
          <div className="lb-actions">
            <Badge text={a.status} tone={statusTone(a.status)} />
            {a.hasCv
              ? <Button variant="outline" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => downloadCv(a.id)}>Download CV</Button>
              : <span style={{ fontSize: 12, color: "#999" }}>No CV</span>}
            {(a.status === "Pending" || a.status === "Reviewed") && (
              <>
                {a.status === "Pending" && <Button variant="outline" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setStatus(a.id, "Reviewed")}>Mark reviewed</Button>}
                <Button style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setStatus(a.id, "Approved")}>Approve</Button>
                <Button variant="danger" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setStatus(a.id, "Rejected")}>Reject</Button>
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function CompanyProfile({ session, onSession, toast }) {
  const [f, setF] = useState({ name: session.name, industry: session.industry });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { const d = await api.put("/company/profile", f); onSession(d.user); toast("Profile updated."); }
    catch (e) { toast(e.message, "error"); }
    finally { setBusy(false); }
  };
  return (
    <Card className="lb-form-card">
      <TextField label="Company name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <TextField label="Email" value={session.email} disabled />
      <TextField label="Industry" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} />
      <Button disabled={busy} onClick={save}>{busy ? "Saving..." : "Save Changes"}</Button>
    </Card>
  );
}

/* ---------------------------------------------------------
   ADMIN DASHBOARD
--------------------------------------------------------- */
function AdminDashboard({ toast }) {
  const [tab, setTab] = useState("overview");
  return (
    <DashboardShell
      title="Admin Menu"
      tabs={[
        { key: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
        { key: "companies", label: "Company Approvals", icon: <Building2 size={16} /> },
        { key: "listings", label: "Moderate Listings", icon: <Bell size={16} /> },
      ]}
      active={tab} onTabChange={setTab}
    >
      <h2 style={{ fontFamily: SERIF, margin: "0 0 24px" }}>Admin Dashboard</h2>
      {tab === "overview" && <AdminOverview />}
      {tab === "companies" && <AdminCompanies toast={toast} />}
      {tab === "listings" && <AdminListings toast={toast} />}
    </DashboardShell>
  );
}

function AdminOverview() {
  const { data, error, loading, reload } = useLoad(() => api.get("/admin/overview"), []);
  if (error) return <Loading error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const stats = [
    { label: "Companies", value: data.companies },
    { label: "Pending Approvals", value: data.pendingCompanies },
    { label: "Active Listings", value: data.activeListings },
    { label: "Awaiting Moderation", value: data.pendingListings },
    { label: "Students", value: data.students },
    { label: "Applications", value: data.applications },
  ];
  return (
    <div className="lb-stat-grid">
      {stats.map((s, i) => (
        <Card key={s.label} className="lb-fade-up" style={{ textAlign: "center", animationDelay: `${i * 0.06}s` }}>
          <p style={{ fontSize: 32, fontWeight: 700, color: BLUE, margin: "0 0 6px" }}>{s.value}</p>
          <p style={{ fontSize: 13, color: "#777", margin: 0 }}>{s.label}</p>
        </Card>
      ))}
    </div>
  );
}

function AdminCompanies({ toast }) {
  const { data, error, loading, reload } = useLoad(() => api.get("/admin/companies"), []);
  const [open, setOpen] = useState(null);
  const decide = async (c, status) => {
    try { await api.patch(`/admin/companies/${c.id}`, { status }); toast(`Company ${status}.`); reload(); }
    catch (e) { toast(e.message, "error"); }
  };
  const tick = async (c, q) => {
    try { await api.put(`/admin/companies/${c.id}/checks/${q.code}`, { checked: !q.checked }); reload(); }
    catch (e) { toast(e.message, "error"); }
  };
  if (error) return <Loading error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  return (
    <div className="lb-stack">
      {data.companies.map((c) => {
        const complete = c.checkedCount === c.total;
        return (
          <Card key={c.id} data-testid="company-card">
            <div className="lb-row">
              <div>
                <h4 style={{ margin: "0 0 4px" }}>{c.name}</h4>
                <p style={{ fontSize: 13, color: "#777", margin: 0 }}>{c.email} &bull; {c.industry}</p>
                <p style={{ fontSize: 12, color: complete ? "#0F6E56" : "#B26A00", margin: "4px 0 0", fontWeight: 600 }}>{c.checkedCount} of {c.total} requirements confirmed</p>
              </div>
              <div className="lb-actions">
                <Badge text={c.status} tone={statusTone(c.status)} />
                <Button variant="outline" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Hide requirements" : "Review requirements"}</Button>
                {c.status === "pending" && (
                  <>
                    <Button disabled={!complete} title={complete ? "" : "Tick every requirement first"} style={{ padding: "8px 16px", fontSize: 13, opacity: complete ? 1 : 0.5 }} onClick={() => decide(c, "approved")}>Approve</Button>
                    <Button variant="danger" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => decide(c, "rejected")}>Reject</Button>
                  </>
                )}
              </div>
            </div>
            {open === c.id && (
              <div data-testid="requirements-panel" style={{ marginTop: 14, borderTop: "1px solid #E3E8EE", paddingTop: 12 }}>
                {c.checks.map((q) => (
                  <label key={q.code} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", cursor: c.status === "pending" ? "pointer" : "default" }}>
                    <input type="checkbox" checked={q.checked} disabled={c.status !== "pending"} onChange={() => tick(c, q)} style={{ marginTop: 3 }} />
                    <span style={{ fontSize: 13 }}>
                      <b style={{ fontWeight: 600 }}>{q.label}</b>
                      <br /><span style={{ color: "#777", fontSize: 12 }}>{q.hint}</span>
                    </span>
                  </label>
                ))}
                {c.status === "pending" && !complete && <p style={{ fontSize: 12, color: "#B26A00", margin: "8px 0 0" }}>Approve becomes available when every requirement is ticked.</p>}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function AdminListings({ toast }) {
  const { data, error, loading, reload } = useLoad(() => api.get("/admin/listings"), []);
  const decide = async (item, status) => {
    try { await api.patch(`/admin/${item.kind === "Event" ? "events" : "jobs"}/${item.id}`, { status }); toast(`Listing ${status}.`); reload(); }
    catch (e) { toast(e.message, "error"); }
  };
  if (error) return <Loading error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  return (
    <div className="lb-stack">
      {data.listings.length === 0 && <EmptyText>No listings awaiting moderation.</EmptyText>}
      {data.listings.map((item) => (
        <Card key={item.kind + item.id} className="lb-row">
          <div>
            <h4 style={{ margin: "0 0 4px" }}>{item.title} <span style={{ fontSize: 12, color: "#999" }}>({item.kind})</span></h4>
            <p style={{ fontSize: 13, color: "#777", margin: 0 }}>{item.companyName}</p>
            {item.requirements && <p style={{ fontSize: 12, color: "#777", margin: "6px 0 0", whiteSpace: "pre-line" }}><b>Requirements:</b> {item.requirements}{"\n"}<b>Qualifications:</b> {item.qualifications}</p>}
          </div>
          <div className="lb-actions">
            <Button style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => decide(item, "approved")}>Approve</Button>
            <Button variant="danger" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => decide(item, "rejected")}>Reject</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------
   STYLES (animations and responsive layout)
--------------------------------------------------------- */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:wght@400;700;800&display=swap');
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { overflow-x: hidden; }
a { text-decoration: none; }
h1, h2, h3, h4, p { overflow-wrap: anywhere; }

@keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes toastIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes popIn { 0% { opacity: 0; transform: scale(0.94); } 100% { opacity: 1; transform: scale(1); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }

.lb-fade-up { animation: fadeInUp 0.5s ease both; }
.lb-fade { animation: fadeIn 0.35s ease both; }
.lb-pop { animation: popIn 0.3s ease both; }
.lb-pulse { animation: pulse 1.8s ease-in-out infinite; }
.lb-btn-anim { transition: transform 0.12s ease, opacity 0.15s ease; }
.lb-btn-anim:hover:not(:disabled) { opacity: 0.88; }
.lb-btn-anim:active:not(:disabled) { transform: scale(0.96); }
.lb-card-anim { transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease; min-width: 0; }
.lb-card-anim:hover { transform: translateY(-3px); box-shadow: 0 14px 32px rgba(22,39,63,0.12); border-color: #d8d8d8; }
.lb-nav-link { transition: opacity 0.15s ease; }
.lb-nav-link:hover { opacity: 0.75; }
.lb-input-anim { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.lb-input-anim:focus, .lb-filter-search:focus-within { border-color: ${BLUE} !important; box-shadow: 0 0 0 3px rgba(23,164,221,0.15); }

.lb-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 999; color: #fff;
  padding: 14px 18px; border-radius: 12px; display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 600;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25); width: max-content; max-width: calc(100vw - 32px); animation: fadeIn 0.25s ease both; }

.lb-role-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
.lb-role-item { text-align: center; cursor: pointer; padding: 8px 28px; transition: transform 0.2s ease; }
.lb-role-item + .lb-role-item { border-left: 1px solid #EDEDED; }
.lb-role-item:hover { transform: translateY(-3px); }
.lb-role-icon { width: 56px; height: 56px; border-radius: 50%; background: #EAF6FC; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; transition: background 0.2s ease; }
.lb-role-item:hover .lb-role-icon { background: ${BLUE}; }
.lb-role-item:hover .lb-role-icon svg { stroke: #fff; }
.lb-role-arrow { display: inline-block; transition: transform 0.2s ease; }
.lb-role-item:hover .lb-role-arrow { transform: translateX(4px); }

.lb-footer-grid { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 32px; }
.lb-contact { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; color: #fff; font-size: 14px; }
.lb-contact svg { flex-shrink: 0; }
.lb-contact span { overflow-wrap: anywhere; }

.lb-dashboard-shell { display: flex; min-height: 70vh; }
.lb-sidebar { width: 220px; flex-shrink: 0; background: #FAFAFA; border-right: 1px solid #eee; padding: 32px 0; }
.lb-sidebar-item { display: flex; align-items: center; gap: 10px; padding: 12px 24px; cursor: pointer; color: #333; font-weight: 600; font-size: 14px;
  border-left: 3px solid transparent; transition: background 0.18s ease, color 0.18s ease; }
.lb-sidebar-item:hover { background: #F1F6F9; }
.lb-sidebar-item.active { background: #EAF6FC; color: ${BLUE}; border-left-color: ${BLUE}; }
.lb-content-area { flex: 1; min-width: 0; padding: 36px 44px; }

.lb-grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
.lb-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 18px; }
.lb-stack { display: flex; flex-direction: column; gap: 14px; }
.lb-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
.lb-row > div:first-child { min-width: 0; flex: 1 1 220px; }
.lb-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lb-form-card { max-width: 480px; width: 100%; }
.lb-filter-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: stretch; margin-bottom: 24px; }
.lb-filter-search { flex: 1 1 240px; display: flex; align-items: center; gap: 8px; padding: 0 14px; border: 1px solid #ddd; border-radius: 10px; background: #fff; }
.lb-filter-search input { flex: 1; min-width: 0; border: none; outline: none; padding: 12px 0; font-family: ${FONT}; font-size: 14px; background: transparent; }

@media (max-width: 900px) {
  .lb-navbar { padding: 16px 24px !important; }
  .lb-hero { padding: 64px 24px 120px !important; }
  .lb-page-pad { padding-left: 24px !important; padding-right: 24px !important; }
  .lb-role-panel { padding: 32px 24px !important; }
  .lb-dashboard-shell { flex-direction: column; }
  .lb-sidebar { width: 100%; border-right: none; border-bottom: 1px solid #eee; padding: 0; display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .lb-sidebar-title { display: none; }
  .lb-sidebar-item { flex-shrink: 0; white-space: nowrap; border-left: none; border-bottom: 3px solid transparent; padding: 14px 18px; }
  .lb-sidebar-item.active { border-bottom-color: ${BLUE}; }
  .lb-content-area { padding: 28px 24px; }
  .lb-footer-pad { padding: 40px 24px 24px !important; }
}

@media (max-width: 700px) {
  .lb-role-grid { grid-template-columns: 1fr; }
  .lb-role-item { padding: 22px 8px; }
  .lb-role-item + .lb-role-item { border-left: none; border-top: 1px solid #EDEDED; }
}

@media (max-width: 640px) {
  .lb-navbar { padding: 14px 16px !important; }
  .lb-nav-links { gap: 16px !important; }
  .lb-nav-text { display: none; }
  .lb-brand { font-size: 20px !important; }
  .lb-hero { padding: 48px 20px 110px !important; }
  .lb-hero-title { font-size: 30px !important; }
  .lb-hero-sub { font-size: 15px !important; }
  .lb-page-pad { padding-left: 16px !important; padding-right: 16px !important; }
  .lb-role-panel { padding: 24px 16px !important; border-radius: 20px !important; margin-bottom: 56px !important; }
  .lb-auth-wrap { padding: 28px 14px !important; }
  .lb-auth-card { padding: 24px 18px !important; }
  .lb-content-area { padding: 22px 16px; }
  .lb-grid-cards { grid-template-columns: 1fr; }
  .lb-stat-grid { grid-template-columns: repeat(2, 1fr); }
  .lb-footer-pad { padding: 36px 16px 20px !important; }
  .lb-footer-grid { flex-direction: column; gap: 24px; }
  .lb-filter-bar > * { flex: 1 1 100%; }
  .lb-filter-bar select, .lb-filter-bar input:not([type=search]) { width: 100% !important; }
  .lb-actions { width: 100%; }
  .lb-toast { bottom: 14px; }
}
`;

/* ---------------------------------------------------------
   ROOT APP
--------------------------------------------------------- */
export default function App() {
  const [view, setView] = useState("home");
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(!!tokenStore.get());
  const [selectedRole, setSelectedRole] = useState("student");
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((message, kind = "ok") => {
    clearTimeout(timer.current);            // an older message must not clear a newer one
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Restore the session after a page reload.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get("/me")
      .then((d) => { setSession(d.user); setView("dashboard"); })
      .catch(() => tokenStore.clear())
      .finally(() => setBooting(false));
  }, []);

  const onAuthed = (data, message) => {
    tokenStore.set(data.token);
    setSession(data.user);
    setView("dashboard");
    showToast(message);
  };
  const logout = () => { tokenStore.clear(); setSession(null); setView("home"); };

  // A request that comes back 401 means the session has ended.
  useEffect(() => {
    const h = () => { tokenStore.clear(); setSession(null); setView("login"); showToast("Your session has ended. Please log in again.", "error"); };
    window.addEventListener("linkbuk:unauthorized", h);
    return () => window.removeEventListener("linkbuk:unauthorized", h);
  }, [showToast]);

  const go = (v) => {
    if (v === "dashboard" && !session) return setView("login");
    setView(v);
  };

  return (
    <div style={{ fontFamily: FONT, background: "#fff", color: "#111", minHeight: "100vh" }}>
      <style>{STYLES}</style>
      <Navbar session={session} onNav={go} onLogout={logout} />
      {booting ? (
        <div style={{ padding: 60, textAlign: "center", color: "#999" }}>Loading...</div>
      ) : (
        <div key={view} className="lb-fade">
          {view === "home" && <HomePage onSelectRole={(r) => { setSelectedRole(r); setView("login"); }} />}
          {view === "signup" && <SignupPage onAuthed={onAuthed} onNav={go} initialRole={selectedRole} />}
          {view === "login" && <LoginPage onAuthed={onAuthed} onNav={go} initialRole={selectedRole} />}
          {view === "dashboard" && session?.role === "student" && <StudentDashboard session={session} onSession={setSession} toast={showToast} />}
          {view === "dashboard" && session?.role === "company" && <CompanyDashboard session={session} onSession={setSession} toast={showToast} />}
          {view === "dashboard" && session?.role === "admin" && <AdminDashboard toast={showToast} />}
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
