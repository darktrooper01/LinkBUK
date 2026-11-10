// API tests against the running server and database.  Run: node tests/api.test.js
const BASE = process.env.API || "http://localhost:4000/api";
const results = [];
const fs = require("fs");
const mailLog = () => (fs.existsSync(__dirname + "/mail.log") ? fs.readFileSync(__dirname + "/mail.log", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, path, body, token) {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, data };
}
function check(id, name, ok, detail) { results.push({ id, name, ok, detail }); console.log(ok ? "PASS" : "FAIL", id, name, ok ? "" : "| " + detail); }

(async () => {
  const stu = { name: "Test Student", email: "test.student@buk.edu.ng", password: "secret123", faculty: "Faculty of Computing", department: "Information Technology", regNumber: "CST/22/IFT/00752" };
  let r = await call("POST", "/auth/student/signup", { ...stu, regNumber: "12345" });
  check("A01", "Signup rejects a malformed registration number", r.status === 400, r.status);
  r = await call("POST", "/auth/student/signup", { ...stu, password: "123" });
  check("A02", "Signup rejects a short password", r.status === 400, r.status);
  r = await call("POST", "/auth/student/signup", stu);
  check("A03", "Student signup succeeds and returns a token", r.status === 201 && !!r.data.token, r.status);
  const st = r.data.token;
  r = await call("POST", "/auth/student/signup", stu);
  check("A04", "Duplicate email or registration number is refused", r.status === 409, r.status);
  r = await call("POST", "/auth/login", { role: "student", email: stu.email, password: "wrong" });
  check("A05", "Login rejects a wrong password", r.status === 401, r.status);
  r = await call("POST", "/auth/login", { role: "student", email: stu.email, password: stu.password });
  check("A06", "Login accepts the right password", r.status === 200 && !!r.data.token, r.status);
  r = await call("POST", "/auth/login", { role: "admin", email: stu.email, password: stu.password });
  check("A07", "A student cannot log in through the admin role", r.status === 401, r.status);

  r = await call("GET", "/jobs");
  check("A08", "Listings need a login", r.status === 401, r.status);
  r = await call("GET", "/jobs", null, st);
  check("A09", "Student sees only the three approved seed jobs", r.status === 200 && r.data.jobs.length === 3, JSON.stringify(r.data).slice(0, 80));
  const jobId = r.data.jobs.find((j) => j.title === "Javascript Developer").id;
  r = await call("GET", "/jobs?q=analyst", null, st);
  check("A10", "Search by keyword filters the listings", r.data.jobs.length === 1 && r.data.jobs[0].title === "Data Analyst", JSON.stringify(r.data).slice(0, 80));
  r = await call("GET", "/jobs?type=Internship", null, st);
  check("A11", "Filter by type works", r.data.jobs.length === 1 && r.data.jobs[0].type === "Internship", JSON.stringify(r.data).slice(0, 80));
  r = await call("POST", `/jobs/${jobId}/apply`, null, st);
  check("A12", "Student can apply", r.status === 201, r.status);
  r = await call("POST", `/jobs/${jobId}/apply`, null, st);
  check("A13", "Applying twice is refused", r.status === 409, r.status);
  r = await call("GET", "/applications/mine", null, st);
  check("A14", "My applications lists the application as Pending", r.data.applications.length === 1 && r.data.applications[0].status === "Pending", JSON.stringify(r.data).slice(0, 80));
  r = await call("GET", "/events", null, st);
  const evId = r.data.events[0].id;
  r = await call("POST", `/events/${evId}/register`, null, st);
  check("A15", "Student can register for an event", r.status === 201, r.status);
  r = await call("POST", `/events/${evId}/register`, null, st);
  check("A16", "Registering twice is refused", r.status === 409, r.status);
  r = await call("GET", "/events", null, st);
  check("A17", "Registration is stored and shown as registered", r.data.events.find((e) => e.id === evId).registered === true, "");

  // company flow
  r = await call("POST", "/auth/company/signup", { name: "Bright Labs", email: "hr@brightlabs.ng", password: "secret123", industry: "Software" });
  const ct = r.data.token;
  check("A18", "Company signup starts as pending", r.status === 201 && r.data.user.status === "pending", JSON.stringify(r.data).slice(0, 80));
  r = await call("POST", "/company/jobs", { title: "Frontend Intern", type: "Internship", location: "Kano", salary: "N100,000", description: "Work on React.", requirements: "React basics.", qualifications: "Final year student." }, ct);
  check("A19", "A pending company cannot post a job", r.status === 403, r.status);
  r = await call("GET", "/company/applicants", null, st);
  check("A20", "A student cannot open company routes", r.status === 403, r.status);
  r = await call("GET", "/admin/overview", null, ct);
  check("A21", "A company cannot open admin routes", r.status === 403, r.status);

  r = await call("POST", "/auth/login", { role: "admin", email: "admin@buk.edu.ng", password: "Admin@12345" });
  const at = r.data.token;
  r = await call("GET", "/admin/companies", null, at);
  const bright = r.data.companies.find((c) => c.name === "Bright Labs");
  r = await call("PATCH", `/admin/companies/${bright.id}`, { status: "approved" }, at);
  check("A22", "Admin approves the company", r.status === 200, r.status);
  r = await call("POST", "/company/jobs", { title: "Frontend Intern", type: "Internship", location: "Kano", salary: "N100,000", description: "Work on React.", requirements: "React basics.", qualifications: "Final year student." }, ct);
  check("A23", "An approved company can post a job", r.status === 201, r.status);
  r = await call("POST", "/company/events", { title: "Open Source Day", date: "2026-12-05", venue: "Auditorium", description: "Talks." }, ct);
  check("A24", "An approved company can post an event", r.status === 201, r.status);
  r = await call("GET", "/jobs?q=Frontend", null, st);
  check("A25", "A new job stays hidden from students until moderated", r.data.jobs.length === 0, JSON.stringify(r.data).slice(0, 80));
  r = await call("GET", "/admin/listings", null, at);
  check("A26", "Moderation queue holds the new job and event", r.data.listings.length === 2, JSON.stringify(r.data).slice(0, 80));
  for (const l of r.data.listings) await call("PATCH", `/admin/${l.kind === "Event" ? "events" : "jobs"}/${l.id}`, { status: "approved" }, at);
  r = await call("GET", "/jobs?q=Frontend", null, st);
  check("A27", "Approved job becomes visible to students", r.data.jobs.length === 1, JSON.stringify(r.data).slice(0, 80));

  // company sees applicants for NYM Tech job
  r = await call("POST", "/auth/login", { role: "company", email: "hr@nymtech.com", password: "Company@123" });
  const nt = r.data.token;
  r = await call("GET", "/company/applicants", null, nt);
  check("A28", "Company sees the student who applied", r.data.applicants.length === 1 && r.data.applicants[0].studentName === "Test Student", JSON.stringify(r.data).slice(0, 100));
  const appId = r.data.applicants[0].id;
  r = await call("GET", "/company/applicants", null, ct);
  check("A29", "Another company does not see that applicant", r.data.applicants.length === 0, JSON.stringify(r.data).slice(0, 80));
  r = await call("PATCH", `/company/applications/${appId}`, { status: "Reviewed" }, ct);
  check("A30", "Another company cannot change that application", r.status === 404, r.status);
  r = await call("PATCH", `/company/applications/${appId}`, { status: "Reviewed" }, nt);
  check("A31", "The owning company can mark it reviewed", r.status === 200, r.status);
  r = await call("GET", "/applications/mine", null, st);
  check("A32", "Student sees the new status", r.data.applications[0].status === "Reviewed", JSON.stringify(r.data).slice(0, 80));
  r = await call("GET", "/jobs", null, "not.a.token");
  check("A33", "A bad token is refused", r.status === 401, r.status);
  r = await call("GET", "/admin/overview", null, at);
  check("A34", "Admin overview returns counts", r.status === 200 && r.data.students === 1, JSON.stringify(r.data));

  // ---- CV upload ----
  const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  const b64 = (b) => b.toString("base64");
  r = await call("PUT", "/student/cv", { name: "cv.txt", data: b64(Buffer.from("hello")) }, st);
  check("A35", "CV upload rejects a file type that is not PDF, DOC, or DOCX", r.status === 400, r.status);
  r = await call("PUT", "/student/cv", { name: "fake.pdf", data: b64(Buffer.from("this is not a pdf")) }, st);
  check("A36", "CV upload rejects a fake PDF", r.status === 400, r.status);
  r = await call("PUT", "/student/cv", { name: "big.pdf", data: b64(Buffer.concat([Buffer.from("%PDF"), Buffer.alloc(2 * 1024 * 1024 + 10)])) }, st);
  check("A37", "CV upload rejects a file over 2 MB", r.status === 413, r.status);
  r = await call("PUT", "/student/cv", { name: "Mahmoud_CV.pdf", data: b64(pdfBytes) }, st);
  check("A38", "A valid PDF is accepted and the file name is shown on the profile", r.status === 200 && r.data.user.cvName === "Mahmoud_CV.pdf", JSON.stringify(r.data).slice(0, 100));
  r = await call("GET", "/student/cv", null, st);
  check("A39", "The student can download their own CV unchanged", r.status === 200 && Buffer.from(r.data.data, "base64").equals(pdfBytes), r.status);
  r = await call("GET", "/company/applicants", null, nt);
  check("A40", "The applicant list shows that a CV is available", r.data.applicants[0].hasCv === true, JSON.stringify(r.data).slice(0, 100));
  r = await call("GET", `/company/applicants/${appId}/cv`, null, nt);
  check("A41", "The owning company can download the applicant's CV", r.status === 200 && Buffer.from(r.data.data, "base64").equals(pdfBytes), r.status);
  r = await call("GET", `/company/applicants/${appId}/cv`, null, ct);
  check("A42", "Another company cannot download that CV", r.status === 404, r.status);
  r = await call("PUT", "/student/cv", { name: "cv.pdf", data: b64(pdfBytes) }, nt);
  check("A43", "A company cannot use the student CV route", r.status === 403, r.status);
  r = await call("DELETE", "/student/cv", null, st);
  check("A44", "The student can remove their CV", r.status === 200 && r.data.user.cvName === null, JSON.stringify(r.data).slice(0, 100));

  // ---- job details and approval email ----
  r = await call("POST", "/company/jobs", { title: "No Details", type: "Job", location: "Kano", salary: "N1", description: "x" }, ct);
  check("A45", "A job without requirements and qualifications is refused", r.status === 400, r.status);
  r = await call("GET", "/jobs?q=Frontend", null, st);
  check("A46", "Students see the requirements and qualifications of a listing", r.data.jobs[0].requirements === "React basics." && r.data.jobs[0].qualifications === "Final year student.", JSON.stringify(r.data).slice(0, 120));
  const before = mailLog().length;
  r = await call("PATCH", `/company/applications/${appId}`, { status: "Approved" }, nt);
  check("A47", "The company approves the application and the server reports the email as sent", r.status === 200 && r.data.email === "sent", JSON.stringify(r.data));
  await sleep(500);
  let mails = mailLog().slice(before);
  check("A48", "The student receives an approval email naming the job", mails.length === 1 && mails[0].to.includes(stu.email) && /approved/i.test(mails[0].subject) && /Javascript Developer/.test(mails[0].subject), JSON.stringify(mails).slice(0, 160));
  r = await call("GET", "/applications/mine", null, st);
  check("A49", "The student sees the status Approved", r.data.applications[0].status === "Approved", JSON.stringify(r.data).slice(0, 80));
  r = await call("PATCH", `/company/applications/${appId}`, { status: "Approved" }, nt);
  await sleep(300);
  check("A50", "Approving again does not send a second email", r.status === 200 && r.data.email === "none" && mailLog().slice(before).length === 1, JSON.stringify(r.data));
  r = await call("GET", "/jobs?q=Frontend", null, st);
  const brightJob = r.data.jobs[0].id;
  await call("POST", `/jobs/${brightJob}/apply`, null, st);
  r = await call("GET", "/company/applicants", null, ct);
  const brightApp = r.data.applicants[0].id;
  r = await call("PATCH", `/company/applications/${brightApp}`, { status: "Rejected" }, ct);
  check("A51", "A company can reject an application and the student is emailed", r.status === 200 && r.data.email === "sent", JSON.stringify(r.data));
  await sleep(500);
  mails = mailLog().slice(before);
  check("A52", "The rejection email is polite and names the company", mails.length === 2 && /Bright Labs/.test(mails[1].subject) && /not to go ahead/.test(mails[1].body), JSON.stringify(mails[1] || {}).slice(0, 160));

  const pass = results.filter((x) => x.ok).length;
  console.log(`\n${pass} of ${results.length} passed`);
  require("fs").writeFileSync(__dirname + "/api-results.json", JSON.stringify(results, null, 2));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
