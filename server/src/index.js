require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { sendMail } = require("./mailer");
const { REQUIREMENTS } = require("./requirements");

const app = express();
const SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const PORT = Number(process.env.PORT || 4000);

app.use(cors({ origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(","), credentials: false }));
const CV_PATH = "/api/student/cv";
app.use((req, res, next) => (req.path === CV_PATH && req.method === "PUT" ? next() : express.json({ limit: "100kb" })(req, res, next)));

/* ---------- helpers ---------- */
const REG_PATTERN = /^[A-Z]{2,5}\/\d{2}\/[A-Z]{2,5}\/\d{4,6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FACULTIES = [
  "Faculty of Computing", "Faculty of Engineering", "Faculty of Science",
  "Faculty of Social and Management Sciences", "Faculty of Education",
  "Faculty of Arts and Islamic Studies", "Faculty of Law", "Faculty of Medicine", "Other",
];
const U_COLS = "user_id, full_name, email, password, faculty, department, reg_number, cv_name";
const clean = (v) => (typeof v === "string" ? v.trim() : "");
const fail = (res, code, message) => res.status(code).json({ error: message });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  fail(res, 500, "Something went wrong on the server.");
});
const sign = (role, id) => jwt.sign({ role, id }, SECRET, { expiresIn: "7d" });

function auth(...roles) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return fail(res, 401, "Please log in to continue.");
    try {
      const payload = jwt.verify(token, SECRET);
      if (roles.length && !roles.includes(payload.role)) return fail(res, 403, "You do not have access to this area.");
      req.user = payload;
      next();
    } catch {
      fail(res, 401, "Your session has expired. Please log in again.");
    }
  };
}

const studentOut = (u) => ({ role: "student", id: u.user_id, name: u.full_name, email: u.email, faculty: u.faculty, department: u.department, regNumber: u.reg_number, cvName: u.cv_name || null });
const companyOut = (c) => ({ role: "company", id: c.company_id, name: c.company_name, email: c.email, industry: c.industry, status: c.status });
const jobOut = (j) => ({ id: j.job_id, companyId: j.company_id, companyName: j.company_name, title: j.title, type: j.type, location: j.location, salary: j.salary, description: j.description, requirements: j.requirements, qualifications: j.qualifications, deadline: j.deadline, status: j.status });
const eventOut = (e) => ({ id: e.event_id, companyId: e.company_id, companyName: e.company_name, title: e.title, date: e.event_date, venue: e.venue, description: e.description, status: e.status });

/* ---------- health ---------- */
app.get("/api/health", wrap(async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
}));

/* ---------- authentication ---------- */
app.post("/api/auth/student/signup", wrap(async (req, res) => {
  const name = clean(req.body.name), email = clean(req.body.email).toLowerCase(), password = req.body.password || "";
  const faculty = clean(req.body.faculty), department = clean(req.body.department), reg = clean(req.body.regNumber).toUpperCase();
  if (!name || !email || !password || !faculty || !department || !reg) return fail(res, 400, "Please fill in all fields.");
  if (!EMAIL_PATTERN.test(email)) return fail(res, 400, "Enter a valid email address.");
  if (password.length < 6) return fail(res, 400, "Password must be at least 6 characters.");
  if (!FACULTIES.includes(faculty)) return fail(res, 400, "Choose a faculty from the list.");
  if (!REG_PATTERN.test(reg)) return fail(res, 400, "Registration number must follow the format FACULTY/YEAR/DEPT/IDNO, e.g. CST/22/IFT/00752");
  const [dupe] = await pool.query("SELECT user_id FROM users WHERE email = ? OR reg_number = ?", [email, reg]);
  if (dupe.length) return fail(res, 409, "An account with this email or registration number already exists.");
  const [r] = await pool.query(
    "INSERT INTO users (full_name, email, password, faculty, department, reg_number) VALUES (?,?,?,?,?,?)",
    [name, email, bcrypt.hashSync(password, 10), faculty, department, reg]);
  const [[u]] = await pool.query("SELECT " + U_COLS + " FROM users WHERE user_id = ?", [r.insertId]);
  res.status(201).json({ token: sign("student", u.user_id), user: studentOut(u) });
}));

app.post("/api/auth/company/signup", wrap(async (req, res) => {
  const name = clean(req.body.name), email = clean(req.body.email).toLowerCase(), password = req.body.password || "", industry = clean(req.body.industry);
  const rc = clean(req.body.rcNumber), address = clean(req.body.address), person = clean(req.body.contactPerson), phone = clean(req.body.phone), website = clean(req.body.website);
  if (!name || !email || !password || !industry || !rc || !address || !person || !phone || !website) return fail(res, 400, "Please fill in all fields.");
  if (req.body.acceptedConduct !== true) return fail(res, 400, "You must accept the partner code of conduct.");
  if (!EMAIL_PATTERN.test(email)) return fail(res, 400, "Enter a valid email address.");
  if (password.length < 6) return fail(res, 400, "Password must be at least 6 characters.");
  const [dupe] = await pool.query("SELECT company_id FROM companies WHERE email = ?", [email]);
  if (dupe.length) return fail(res, 409, "A company with this email already exists.");
  const [r] = await pool.query("INSERT INTO companies (company_name, email, password, industry, rc_number, address, contact_person, phone, website, conduct_accepted) VALUES (?,?,?,?,?,?,?,?,?,1)",
    [name, email, bcrypt.hashSync(password, 10), industry, rc, address, person, phone, website]);
  const [[c]] = await pool.query("SELECT * FROM companies WHERE company_id = ?", [r.insertId]);
  res.status(201).json({ token: sign("company", c.company_id), user: companyOut(c) });
}));

// The standard list of requirements, shown to companies before they register.
app.get("/api/requirements", (req, res) => res.json({ requirements: REQUIREMENTS.map((r) => ({ code: r.code, label: r.label })) }));


app.post("/api/auth/login", wrap(async (req, res) => {
  const role = clean(req.body.role), email = clean(req.body.email).toLowerCase(), password = req.body.password || "";
  if (!["student", "company", "admin"].includes(role)) return fail(res, 400, "Choose a role.");
  if (!email || !password) return fail(res, 400, "Enter your email and password.");
  const table = { student: ["users", "user_id"], company: ["companies", "company_id"], admin: ["admins", "admin_id"] }[role];
  const [rows] = await pool.query(`SELECT * FROM ${table[0]} WHERE email = ?`, [email]);
  const row = rows[0];
  if (!row || !bcrypt.compareSync(password, row.password)) return fail(res, 401, "Incorrect email or password.");
  const user = role === "student" ? studentOut(row) : role === "company" ? companyOut(row) : { role: "admin", id: row.admin_id, name: "Admin", email: row.email };
  res.json({ token: sign(role, row[table[1]]), user });
}));

app.get("/api/me", auth(), wrap(async (req, res) => {
  const { role, id } = req.user;
  if (role === "student") {
    const [[u]] = await pool.query("SELECT " + U_COLS + " FROM users WHERE user_id = ?", [id]);
    return u ? res.json({ user: studentOut(u) }) : fail(res, 401, "Account not found.");
  }
  if (role === "company") {
    const [[c]] = await pool.query("SELECT * FROM companies WHERE company_id = ?", [id]);
    return c ? res.json({ user: companyOut(c) }) : fail(res, 401, "Account not found.");
  }
  const [[a]] = await pool.query("SELECT * FROM admins WHERE admin_id = ?", [id]);
  return a ? res.json({ user: { role: "admin", id: a.admin_id, name: "Admin", email: a.email } }) : fail(res, 401, "Account not found.");
}));

/* ---------- student ---------- */
app.get("/api/jobs", auth("student"), wrap(async (req, res) => {
  const q = clean(req.query.q), type = clean(req.query.type), location = clean(req.query.location);
  const where = ["j.status = 'approved'", "c.status = 'approved'"];
  const params = [req.user.id];
  if (q) { where.push("(j.title LIKE ? OR j.description LIKE ? OR j.requirements LIKE ? OR c.company_name LIKE ?)"); params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
  if (type === "Job" || type === "Internship") { where.push("j.type = ?"); params.push(type); }
  if (location) { where.push("j.location LIKE ?"); params.push(`%${location}%`); }
  const [rows] = await pool.query(
    `SELECT j.*, c.company_name, a.status AS application_status
     FROM jobs j JOIN companies c ON c.company_id = j.company_id
     LEFT JOIN applications a ON a.job_id = j.job_id AND a.user_id = ?
     WHERE ${where.join(" AND ")} ORDER BY j.created_at DESC, j.job_id DESC`, params);
  res.json({ jobs: rows.map((r) => ({ ...jobOut(r), applicationStatus: r.application_status || null })) });
}));

app.post("/api/jobs/:id/apply", auth("student"), wrap(async (req, res) => {
  const [[job]] = await pool.query(
    "SELECT j.job_id FROM jobs j JOIN companies c ON c.company_id = j.company_id WHERE j.job_id = ? AND j.status='approved' AND c.status='approved'", [req.params.id]);
  if (!job) return fail(res, 404, "This listing is not available.");
  const [dupe] = await pool.query("SELECT application_id FROM applications WHERE user_id = ? AND job_id = ?", [req.user.id, job.job_id]);
  if (dupe.length) return fail(res, 409, "You have already applied for this listing.");
  await pool.query("INSERT INTO applications (user_id, job_id, status, applied_date) VALUES (?,?, 'Pending', CURDATE())", [req.user.id, job.job_id]);
  res.status(201).json({ ok: true });
}));

app.get("/api/applications/mine", auth("student"), wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.application_id, a.status, a.applied_date, j.job_id, j.title, j.type, c.company_name
     FROM applications a JOIN jobs j ON j.job_id = a.job_id JOIN companies c ON c.company_id = j.company_id
     WHERE a.user_id = ? ORDER BY a.application_id DESC`, [req.user.id]);
  res.json({ applications: rows.map((r) => ({ id: r.application_id, status: r.status, appliedDate: r.applied_date, jobId: r.job_id, title: r.title, type: r.type, companyName: r.company_name })) });
}));

app.get("/api/events", auth("student"), wrap(async (req, res) => {
  const q = clean(req.query.q);
  const where = ["e.status = 'approved'", "c.status = 'approved'"];
  const params = [req.user.id];
  if (q) { where.push("(e.title LIKE ? OR e.description LIKE ? OR c.company_name LIKE ?)"); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const [rows] = await pool.query(
    `SELECT e.*, c.company_name, r.registration_id
     FROM events e JOIN companies c ON c.company_id = e.company_id
     LEFT JOIN event_registrations r ON r.event_id = e.event_id AND r.user_id = ?
     WHERE ${where.join(" AND ")} ORDER BY e.event_date ASC`, params);
  res.json({ events: rows.map((r) => ({ ...eventOut(r), registered: !!r.registration_id })) });
}));

app.post("/api/events/:id/register", auth("student"), wrap(async (req, res) => {
  const [[ev]] = await pool.query(
    "SELECT e.event_id FROM events e JOIN companies c ON c.company_id = e.company_id WHERE e.event_id = ? AND e.status='approved' AND c.status='approved'", [req.params.id]);
  if (!ev) return fail(res, 404, "This event is not available.");
  const [dupe] = await pool.query("SELECT registration_id FROM event_registrations WHERE user_id = ? AND event_id = ?", [req.user.id, ev.event_id]);
  if (dupe.length) return fail(res, 409, "You are already registered for this event.");
  await pool.query("INSERT INTO event_registrations (user_id, event_id, registered_date) VALUES (?,?, CURDATE())", [req.user.id, ev.event_id]);
  res.status(201).json({ ok: true });
}));

app.put("/api/student/profile", auth("student"), wrap(async (req, res) => {
  const name = clean(req.body.name), faculty = clean(req.body.faculty), department = clean(req.body.department), reg = clean(req.body.regNumber).toUpperCase();
  if (!name || !faculty || !department || !reg) return fail(res, 400, "Please fill in all fields.");
  if (!FACULTIES.includes(faculty)) return fail(res, 400, "Choose a faculty from the list.");
  if (!REG_PATTERN.test(reg)) return fail(res, 400, "Registration number must follow the format FACULTY/YEAR/DEPT/IDNO, e.g. CST/22/IFT/00752");
  const [dupe] = await pool.query("SELECT user_id FROM users WHERE reg_number = ? AND user_id <> ?", [reg, req.user.id]);
  if (dupe.length) return fail(res, 409, "That registration number is already in use.");
  await pool.query("UPDATE users SET full_name=?, faculty=?, department=?, reg_number=? WHERE user_id=?", [name, faculty, department, reg, req.user.id]);
  const [[u]] = await pool.query("SELECT " + U_COLS + " FROM users WHERE user_id = ?", [req.user.id]);
  res.json({ user: studentOut(u) });
}));


/* ---------- CV upload (stored in the database so it also works on serverless hosting) ---------- */
const CV_TYPES = {
  pdf: { mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  doc: { mime: "application/msword", magic: [0xd0, 0xcf, 0x11, 0xe0] },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: [0x50, 0x4b, 0x03, 0x04] },
};
const CV_MAX = 2 * 1024 * 1024;

app.put("/api/student/cv", auth("student"), express.json({ limit: "3mb" }), wrap(async (req, res) => {
  const name = clean(req.body.name), data = typeof req.body.data === "string" ? req.body.data : "";
  const ext = (name.split(".").pop() || "").toLowerCase();
  const kind = CV_TYPES[ext];
  if (!name || name.length > 255 || !kind) return fail(res, 400, "Upload your CV as a PDF, DOC, or DOCX file.");
  const buf = Buffer.from(data, "base64");
  if (!buf.length) return fail(res, 400, "The file is empty.");
  if (buf.length > CV_MAX) return fail(res, 413, "The file is too large. The limit is 2 MB.");
  if (!kind.magic.every((b, i) => buf[i] === b)) return fail(res, 400, "The file does not look like a real " + ext.toUpperCase() + " document.");
  await pool.query("UPDATE users SET cv_name = ?, cv_type = ?, cv_data = ? WHERE user_id = ?", [name, kind.mime, buf, req.user.id]);
  const [[u]] = await pool.query("SELECT " + U_COLS + " FROM users WHERE user_id = ?", [req.user.id]);
  res.json({ user: studentOut(u) });
}));

app.delete("/api/student/cv", auth("student"), wrap(async (req, res) => {
  await pool.query("UPDATE users SET cv_name = NULL, cv_type = NULL, cv_data = NULL WHERE user_id = ?", [req.user.id]);
  const [[u]] = await pool.query("SELECT " + U_COLS + " FROM users WHERE user_id = ?", [req.user.id]);
  res.json({ user: studentOut(u) });
}));

app.get("/api/student/cv", auth("student"), wrap(async (req, res) => {
  const [[u]] = await pool.query("SELECT cv_name, cv_type, cv_data FROM users WHERE user_id = ?", [req.user.id]);
  if (!u || !u.cv_data) return fail(res, 404, "You have not uploaded a CV yet.");
  res.json({ name: u.cv_name, type: u.cv_type, data: u.cv_data.toString("base64") });
}));

app.get("/api/company/applicants/:id/cv", auth("company"), wrap(async (req, res) => {
  const [[u]] = await pool.query(
    `SELECT u.cv_name, u.cv_type, u.cv_data FROM applications a JOIN jobs j ON j.job_id = a.job_id JOIN users u ON u.user_id = a.user_id
     WHERE a.application_id = ? AND j.company_id = ?`, [req.params.id, req.user.id]);
  if (!u) return fail(res, 404, "Application not found.");
  if (!u.cv_data) return fail(res, 404, "This student has not uploaded a CV.");
  res.json({ name: u.cv_name, type: u.cv_type, data: u.cv_data.toString("base64") });
}));

/* ---------- company ---------- */
async function loadCompany(id) {
  const [[c]] = await pool.query("SELECT * FROM companies WHERE company_id = ?", [id]);
  return c;
}

app.get("/api/company/listings", auth("company"), wrap(async (req, res) => {
  const [jobs] = await pool.query("SELECT j.*, c.company_name FROM jobs j JOIN companies c ON c.company_id=j.company_id WHERE j.company_id = ? ORDER BY j.job_id DESC", [req.user.id]);
  const [events] = await pool.query("SELECT e.*, c.company_name FROM events e JOIN companies c ON c.company_id=e.company_id WHERE e.company_id = ? ORDER BY e.event_id DESC", [req.user.id]);
  res.json({ jobs: jobs.map(jobOut), events: events.map(eventOut) });
}));

app.post("/api/company/jobs", auth("company"), wrap(async (req, res) => {
  const company = await loadCompany(req.user.id);
  if (!company || company.status !== "approved") return fail(res, 403, "Your company must be approved by the administrator before you can post.");
  const title = clean(req.body.title), type = clean(req.body.type) || "Job", location = clean(req.body.location), salary = clean(req.body.salary), description = clean(req.body.description);
  const requirements = clean(req.body.requirements), qualifications = clean(req.body.qualifications);
  if (!title || !location || !salary || !description || !requirements || !qualifications) return fail(res, 400, "Please fill in all fields.");
  if (!["Job", "Internship"].includes(type)) return fail(res, 400, "Type must be Job or Internship.");
  await pool.query("INSERT INTO jobs (company_id, title, type, location, salary, description, requirements, qualifications) VALUES (?,?,?,?,?,?,?,?)", [company.company_id, title, type, location, salary, description, requirements, qualifications]);
  res.status(201).json({ ok: true });
}));

app.post("/api/company/events", auth("company"), wrap(async (req, res) => {
  const company = await loadCompany(req.user.id);
  if (!company || company.status !== "approved") return fail(res, 403, "Your company must be approved by the administrator before you can post.");
  const title = clean(req.body.title), date = clean(req.body.date), venue = clean(req.body.venue), description = clean(req.body.description);
  if (!title || !date || !venue || !description) return fail(res, 400, "Please fill in all fields.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 400, "Enter a valid date.");
  await pool.query("INSERT INTO events (company_id, title, event_date, venue, description) VALUES (?,?,?,?,?)", [company.company_id, title, date, venue, description]);
  res.status(201).json({ ok: true });
}));

app.get("/api/company/applicants", auth("company"), wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.application_id, a.status, a.applied_date, j.title, u.full_name, u.email, u.faculty, u.department, u.reg_number, (u.cv_data IS NOT NULL) AS has_cv
     FROM applications a JOIN jobs j ON j.job_id = a.job_id JOIN users u ON u.user_id = a.user_id
     WHERE j.company_id = ? ORDER BY a.application_id DESC`, [req.user.id]);
  res.json({ applicants: rows.map((r) => ({ id: r.application_id, status: r.status, appliedDate: r.applied_date, jobTitle: r.title, studentName: r.full_name, email: r.email, faculty: r.faculty, department: r.department, regNumber: r.reg_number, hasCv: !!r.has_cv })) });
}));

app.patch("/api/company/applications/:id", auth("company"), wrap(async (req, res) => {
  const status = clean(req.body.status);
  if (!["Pending", "Reviewed", "Approved", "Rejected"].includes(status)) return fail(res, 400, "Invalid status.");
  const [[app_]] = await pool.query(
    `SELECT a.status, j.title, c.company_name, u.full_name, u.email
     FROM applications a JOIN jobs j ON j.job_id = a.job_id JOIN companies c ON c.company_id = j.company_id JOIN users u ON u.user_id = a.user_id
     WHERE a.application_id = ? AND j.company_id = ?`, [req.params.id, req.user.id]);
  if (!app_) return fail(res, 404, "Application not found.");
  await pool.query("UPDATE applications SET status = ? WHERE application_id = ?", [status, req.params.id]);
  // The student is told by email when the decision is made (approved or rejected), once per change.
  let email = "none";
  if (status !== app_.status && (status === "Approved" || status === "Rejected")) {
    const approved = status === "Approved";
    email = await sendMail({
      to: app_.email,
      subject: approved ? `Your application for ${app_.title} at ${app_.company_name} has been approved` : `Update on your application for ${app_.title} at ${app_.company_name}`,
      text: approved
        ? `Dear ${app_.full_name},\n\nGood news. ${app_.company_name} has reviewed your CV and approved your application for ${app_.title}. The company may contact you directly with the next steps.\n\nYou can see the status of all your applications on the BUK Industry and Corporate Collaboration Portal.\n\nBest wishes,\nLinkBUK`
        : `Dear ${app_.full_name},\n\nThank you for applying for ${app_.title} at ${app_.company_name}. After reviewing your application, the company has decided not to go ahead with it this time. Please keep applying to other listings on the portal.\n\nBest wishes,\nLinkBUK`,
    });
  }
  res.json({ ok: true, email });
}));

app.put("/api/company/profile", auth("company"), wrap(async (req, res) => {
  const name = clean(req.body.name), industry = clean(req.body.industry);
  if (!name || !industry) return fail(res, 400, "Please fill in all fields.");
  await pool.query("UPDATE companies SET company_name = ?, industry = ? WHERE company_id = ?", [name, industry, req.user.id]);
  res.json({ user: companyOut(await loadCompany(req.user.id)) });
}));

/* ---------- admin ---------- */
app.get("/api/admin/overview", auth("admin"), wrap(async (req, res) => {
  const one = async (sql) => (await pool.query(sql))[0][0].n;
  res.json({
    companies: await one("SELECT COUNT(*) n FROM companies"),
    pendingCompanies: await one("SELECT COUNT(*) n FROM companies WHERE status='pending'"),
    students: await one("SELECT COUNT(*) n FROM users"),
    activeListings: (await one("SELECT COUNT(*) n FROM jobs WHERE status='approved'")) + (await one("SELECT COUNT(*) n FROM events WHERE status='approved'")),
    pendingListings: (await one("SELECT COUNT(*) n FROM jobs WHERE status='pending'")) + (await one("SELECT COUNT(*) n FROM events WHERE status='pending'")),
    applications: await one("SELECT COUNT(*) n FROM applications"),
  });
}));

async function companyWithChecks(c) {
  const [rows] = await pool.query("SELECT req_code FROM company_checks WHERE company_id = ?", [c.company_id]);
  const done = new Set(rows.map((r) => r.req_code));
  const checks = REQUIREMENTS.map((r) => ({ code: r.code, label: r.label, hint: r.hint(c), checked: done.has(r.code) }));
  return { ...companyOut(c), checks, checkedCount: checks.filter((q) => q.checked).length, total: checks.length };
}

app.get("/api/admin/companies", auth("admin"), wrap(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM companies ORDER BY FIELD(status,'pending','approved','rejected'), company_id DESC");
  res.json({ companies: await Promise.all(rows.map(companyWithChecks)) });
}));

// The administrator ticks or unticks one requirement for a company.
app.put("/api/admin/companies/:id/checks/:code", auth("admin"), wrap(async (req, res) => {
  if (!REQUIREMENTS.some((r) => r.code === req.params.code)) return fail(res, 404, "Unknown requirement.");
  const [[c]] = await pool.query("SELECT company_id FROM companies WHERE company_id = ?", [req.params.id]);
  if (!c) return fail(res, 404, "Company not found.");
  if (req.body.checked === true) await pool.query("INSERT IGNORE INTO company_checks (company_id, req_code, admin_id) VALUES (?,?,?)", [c.company_id, req.params.code, req.user.id]);
  else await pool.query("DELETE FROM company_checks WHERE company_id = ? AND req_code = ?", [c.company_id, req.params.code]);
  res.json({ ok: true });
}));

app.patch("/api/admin/companies/:id", auth("admin"), wrap(async (req, res) => {
  const status = clean(req.body.status);
  if (!["approved", "rejected", "pending"].includes(status)) return fail(res, 400, "Invalid status.");
  if (status === "approved") {
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM company_checks WHERE company_id = ?", [req.params.id]);
    if (n < REQUIREMENTS.length) return fail(res, 400, "Tick every approval requirement before approving this company.");
  }
  const [r] = await pool.query("UPDATE companies SET status = ? WHERE company_id = ?", [status, req.params.id]);
  if (!r.affectedRows) return fail(res, 404, "Company not found.");
  res.json({ ok: true });
}));


app.get("/api/admin/listings", auth("admin"), wrap(async (req, res) => {
  const [jobs] = await pool.query("SELECT j.*, c.company_name FROM jobs j JOIN companies c ON c.company_id=j.company_id WHERE j.status='pending' ORDER BY j.job_id");
  const [events] = await pool.query("SELECT e.*, c.company_name FROM events e JOIN companies c ON c.company_id=e.company_id WHERE e.status='pending' ORDER BY e.event_id");
  res.json({
    listings: [
      ...jobs.map((j) => ({ ...jobOut(j), kind: "Job/Internship" })),
      ...events.map((e) => ({ ...eventOut(e), kind: "Event" })),
    ],
  });
}));

app.patch("/api/admin/:kind(jobs|events)/:id", auth("admin"), wrap(async (req, res) => {
  const status = clean(req.body.status);
  if (!["approved", "rejected"].includes(status)) return fail(res, 400, "Invalid status.");
  const [table, key] = req.params.kind === "jobs" ? ["jobs", "job_id"] : ["events", "event_id"];
  const [r] = await pool.query(`UPDATE ${table} SET status = ? WHERE ${key} = ?`, [status, req.params.id]);
  if (!r.affectedRows) return fail(res, 404, "Listing not found.");
  res.json({ ok: true });
}));

app.use("/api", (req, res) => fail(res, 404, "Not found."));
app.use((err, req, res, next) => { // body too large or malformed JSON
  if (err && err.type === "entity.too.large") return fail(res, 413, "The file is too large. The limit is 2 MB.");
  if (err && err.type === "entity.parse.failed") return fail(res, 400, "The request could not be read.");
  console.error(err); fail(res, 500, "Something went wrong on the server.");
});

if (require.main === module) app.listen(PORT, () => console.log(`LinkBUK API running on http://localhost:${PORT}`));
module.exports = app; // Vercel loads the app as a serverless function
