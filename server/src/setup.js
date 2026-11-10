// Creates the tables and loads sample data.  Run with:  npm run db:setup
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("./db");
const { REQUIREMENTS } = require("./requirements");

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("Tables ready.");

  // Upgrade an older database: add the company detail columns if they are missing, and
  // treat companies that were already approved as having met every requirement.
  const addColumn = async (table, column, ddl) => {
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?", [table, column]);
    if (!n) { await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`); console.log(`Added ${table}.${column}`); }
  };
  await addColumn("companies", "rc_number", "VARCHAR(30) NOT NULL");
  await addColumn("companies", "address", "VARCHAR(255) NOT NULL");
  await addColumn("companies", "contact_person", "VARCHAR(120) NOT NULL");
  await addColumn("companies", "phone", "VARCHAR(30) NOT NULL");
  await addColumn("companies", "website", "VARCHAR(255) NOT NULL");
  await addColumn("companies", "conduct_accepted", "TINYINT(1) NOT NULL DEFAULT 0");
  const [old] = await pool.query("SELECT company_id FROM companies WHERE status = 'approved' AND company_id NOT IN (SELECT DISTINCT company_id FROM company_checks)");
  for (const { company_id } of old) for (const r of REQUIREMENTS) await pool.query("INSERT IGNORE INTO company_checks (company_id, req_code) VALUES (?,?)", [company_id, r.code]);

  const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM admins");
  if (n > 0) { console.log("Sample data already present, skipping."); return pool.end(); }

  const hash = (p) => bcrypt.hashSync(p, 10);
  await pool.query("INSERT INTO admins (email, password) VALUES (?, ?)", ["admin@buk.edu.ng", hash("Admin@12345")]);

  const companies = [
    ["NYM Tech", "hr@nymtech.com", "Software", "approved", "RC 1234567", "12 Sokoto Road, Kano", "Aisha Bello", "08031234567", "https://nymtech.example.com", 1],
    ["Opay.co", "hr@opay.co", "Fintech", "approved", "RC 2345678", "5 Gadon Kaya Road, Kano", "Musa Ibrahim", "08029876543", "https://opay.example.com", 1],
    ["Kano Data Systems", "hr@kds.ng", "Data Services", "pending", "RC 3456789", "8 Zoo Road, Kano", "Hauwa Sani", "07011223344", "https://kds.example.com", 1],
  ];
  for (const [name, email, industry, status, rc, address, person, phone, web, conduct] of companies) {
    const [r] = await pool.query("INSERT INTO companies (company_name, email, password, industry, rc_number, address, contact_person, phone, website, conduct_accepted, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [name, email, hash("Company@123"), industry, rc, address, person, phone, web, conduct, status]);
    // Approved companies have met every requirement. The pending one has two items still to be checked.
    const done = status === "approved" ? REQUIREMENTS : REQUIREMENTS.slice(0, 2);
    for (const q of done) await pool.query("INSERT INTO company_checks (company_id, req_code) VALUES (?,?)", [r.insertId, q.code]);
  }

  const jobs = [
    [1, "Javascript Developer", "Job", "Sokoto road, Kano", "₦250,000 - ₦450,000/month", "Build and maintain web applications using React and Node.js.", "Experience with React and Node.js. Able to work with Git. Good written English.", "BSc in Computer Science, Information Technology, or a related field."],
    [2, "Data Analyst", "Job", "Gadon Kaya, Kano", "₦250,000 - ₦450,000/month", "Analyse transaction data and build reporting dashboards.", "Strong Excel and SQL skills. Attention to detail.", "BSc in Statistics, Mathematics, Computer Science, or a related field."],
    [2, "Backend Intern", "Internship", "Gadon Kaya, Kano", "₦80,000/month stipend", "Support the backend engineering team on API development.", "Basic knowledge of JavaScript or Python. Willingness to learn.", "Final year student or recent graduate in a computing related course."],
  ];
  for (const j of jobs) {
    await pool.query("INSERT INTO jobs (company_id, title, type, location, salary, description, requirements, qualifications, status) VALUES (?,?,?,?,?,?,?,?, 'approved')", j);
  }

  const events = [
    [1, "Intro to Cloud Careers", "2026-11-20", "Faculty of Computing Auditorium", "A seminar on cloud engineering career paths."],
    [2, "Fintech Hiring Day", "2026-12-02", "Virtual (Zoom)", "Meet the Opay recruitment team and learn about open roles."],
  ];
  for (const e of events) {
    await pool.query("INSERT INTO events (company_id, title, event_date, venue, description, status) VALUES (?,?,?,?,?, 'approved')", e);
  }
  console.log("Sample data loaded.");
  console.log("  Admin   : admin@buk.edu.ng / Admin@12345");
  console.log("  Company : hr@nymtech.com / Company@123 (approved), hr@kds.ng / Company@123 (pending)");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
