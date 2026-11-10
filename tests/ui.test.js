// Browser tests against the running app (vite preview on 5173) and API.  Run: node tests/ui.test.js <screenshot dir>
const { chromium } = require("/home/claude/render/node_modules/playwright-core");
const fs = require("fs");
const SHOT = process.argv[2] || "/tmp/ui-shots";
fs.mkdirSync(SHOT, { recursive: true });
const URL = "http://127.0.0.1:5173/";
const results = [];
const rec = (id, name, ok, detail = "") => { results.push({ id, name, ok, detail }); console.log(ok ? "PASS" : "FAIL", id, name, ok ? "" : "| " + detail); };

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const has = async (t) => (await page.getByText(t, { exact: false }).count()) > 0;
  const wait = (ms = 500) => page.waitForTimeout(ms);
  const pick = (r) => page.getByRole("heading", { name: r, exact: true }).click();

  await page.goto(URL); await wait(900);
  rec("U01", "Home shows the three roles and no listings", (await has("Student")) && (await has("Company")) && !(await has("Javascript Developer")));

  // student signup, validation
  await pick("Student"); await wait(); await page.getByText("Create an account").click(); await wait();
  await page.getByPlaceholder("Enter name").fill("Mahmoud Muhammad");
  await page.getByPlaceholder("you@example.com").fill("mahmoud@buk.edu.ng");
  await page.getByPlaceholder("Create a password").fill("secret123");
  await page.locator("select").selectOption("Faculty of Computing");
  await page.getByPlaceholder("e.g. Information Technology").fill("Information Technology");
  await page.getByPlaceholder("e.g. CST/22/IFT/00752").fill("12345");
  await page.getByRole("button", { name: "Create account" }).click(); await wait(300);
  rec("U02", "Signup shows the registration number format error", await has("Registration number must follow the format"));
  await page.getByPlaceholder("e.g. CST/22/IFT/00752").fill("CST/22/IFT/00752");
  await page.getByRole("button", { name: "Create account" }).click(); await wait(900);
  rec("U03", "Valid signup opens the student dashboard", await has("Browse Opportunities"));
  rec("U04", "Student sees the three approved listings", (await has("Javascript Developer")) && (await has("Data Analyst")) && (await has("Backend Intern")));

  // search and filter
  await page.getByLabel("Search listings").fill("analyst");
  await page.getByRole("button", { name: "Search", exact: true }).click(); await wait(600);
  rec("U05", "Search narrows the list to one job", (await has("Data Analyst")) && !(await has("Backend Intern")));
  await page.getByRole("button", { name: "Clear" }).click(); await wait(600);
  await page.getByLabel("Filter by type").selectOption("Internship");
  await page.getByRole("button", { name: "Search", exact: true }).click(); await wait(600);
  rec("U06", "Type filter shows internships only", (await has("Backend Intern")) && !(await has("Data Analyst")));
  await page.getByRole("button", { name: "Clear" }).click(); await wait(600);

  // apply
  await page.getByRole("button", { name: "Apply Now" }).first().click(); await wait(800);
  rec("U07", "Apply shows a Pending badge", await has("Application: Pending"));
  await page.getByText("My Applications").click(); await wait(600);
  rec("U08", "My Applications lists it", (await has("Backend Intern")) && (await has("Applied ")));
  await page.getByText("Events & Seminars").click(); await wait(600);
  await page.getByRole("button", { name: "Register" }).first().click(); await wait(800);
  rec("U09", "Event registration is saved and shown", await has("Registered"));
  await page.reload(); await wait(1200);
  rec("U10", "Session survives a page reload", await has("Welcome, Mahmoud Muhammad"));
  await page.getByText("Events & Seminars").click(); await wait(600);
  rec("U11", "Event registration survives a reload", (await page.getByText("Registered", { exact: true }).count()) > 0);
  await page.getByText("Profile", { exact: true }).click(); await wait(400);
  await page.getByLabel("Department").fill("Software Engineering");
  await page.getByRole("button", { name: "Save Changes" }).click(); await wait(700);
  rec("U12", "Profile changes are saved", await has("Profile updated"));
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  await page.setInputFiles('input[type=file]', { name: "Mahmoud_CV.pdf", mimeType: "application/pdf", buffer: pdf }); await wait(900);
  rec("U25", "Student uploads a CV and the file name is shown", (await has("Mahmoud_CV.pdf")) && (await has("CV uploaded")));
  await page.getByText("Logout").click(); await wait(500);

  // wrong login
  await pick("Student"); await wait();
  await page.getByPlaceholder("you@example.com").fill("mahmoud@buk.edu.ng");
  await page.getByPlaceholder("Enter your password").fill("wrongpass");
  await page.getByRole("button", { name: "Log in" }).click(); await wait(600);
  rec("U13", "Wrong password is refused with a message", (await has("Incorrect email or password")) && !(await has("Browse Opportunities")));

  // company pending
  await page.getByText("Home", { exact: true }).click(); await wait(400);
  await pick("Company"); await wait(); await page.getByText("Create an account").click(); await wait();
  await page.getByRole("button", { name: "company" }).click();
  await page.getByPlaceholder("Enter name").fill("Bright Labs");
  await page.getByPlaceholder("you@example.com").fill("hr@brightlabs.ng");
  await page.getByPlaceholder("Create a password").fill("secret123");
  await page.getByPlaceholder("e.g. Fintech").fill("Software");
  await page.getByRole("button", { name: "Create account" }).click(); await wait(900);
  rec("U14", "New company sees the pending notice", await has("pending admin approval"));
  await page.getByText("Post Job / Internship").click(); await wait(400);
  rec("U15", "Pending company cannot post: form is switched off", await page.getByRole("button", { name: "Submit for Approval" }).isDisabled());
  await page.getByText("Logout").click(); await wait(500);

  // admin approves company
  await pick("Admin"); await wait();
  await page.getByPlaceholder("you@example.com").fill("admin@buk.edu.ng");
  await page.getByPlaceholder("Enter your password").fill("Admin@12345");
  await page.getByRole("button", { name: "Log in" }).click(); await wait(900);
  rec("U16", "Admin overview shows counts from the database", (await has("Pending Approvals")) && (await has("Students")));
  await page.getByText("Company Approvals").click(); await wait(600);
  const rowBright = page.locator(".lb-row", { hasText: "Bright Labs" });
  await rowBright.getByRole("button", { name: "Approve" }).click(); await wait(800);
  rec("U17", "Admin approves the company", (await rowBright.getByText("approved", { exact: true }).count()) > 0);
  await page.getByText("Logout").click(); await wait(500);

  // company posts now
  await pick("Company"); await wait();
  await page.getByPlaceholder("you@example.com").fill("hr@brightlabs.ng");
  await page.getByPlaceholder("Enter your password").fill("secret123");
  await page.getByRole("button", { name: "Log in" }).click(); await wait(900);
  rec("U18", "Approved company no longer sees the pending notice", !(await has("pending admin approval")));
  await page.getByText("Post Job / Internship").click(); await wait(400);
  await page.getByPlaceholder("e.g. Frontend Developer").fill("Frontend Intern");
  await page.getByPlaceholder("e.g. Kano").fill("Kano");
  await page.getByPlaceholder("e.g. ₦200,000/month").fill("₦100,000/month");
  await page.getByPlaceholder("Describe the role...").fill("Work with the design team on React interfaces.");
  await page.getByPlaceholder("Skills and experience needed, one per line...").fill("React basics\nGood communication");
  await page.getByPlaceholder("Degree or certificates needed, one per line...").fill("Final year student in a computing course");
  await page.getByRole("button", { name: "Submit for Approval" }).click(); await wait(900);
  rec("U19", "Approved company can post and sees it as pending", (await has("Frontend Intern")) && (await page.getByText("pending", { exact: true }).count()) > 0);
  await page.getByText("Logout").click(); await wait(500);

  // admin moderates
  await pick("Admin"); await wait();
  await page.getByPlaceholder("you@example.com").fill("admin@buk.edu.ng");
  await page.getByPlaceholder("Enter your password").fill("Admin@12345");
  await page.getByRole("button", { name: "Log in" }).click(); await wait(900);
  await page.getByText("Moderate Listings").click(); await wait(600);
  await page.getByRole("button", { name: "Approve" }).first().click(); await wait(800);
  rec("U20", "Admin approves the listing and the queue empties", await has("No listings awaiting moderation"));
  await page.getByText("Logout").click(); await wait(500);

  // student sees it, company reviews applicant
  await pick("Student"); await wait();
  await page.getByPlaceholder("you@example.com").fill("mahmoud@buk.edu.ng");
  await page.getByPlaceholder("Enter your password").fill("secret123");
  await page.getByRole("button", { name: "Log in" }).click(); await wait(900);
  rec("U21", "Approved listing is visible to the student", await has("Frontend Intern"));
  await page.locator(".lb-grid-cards > div", { hasText: "Frontend Intern" }).getByRole("button", { name: "View details" }).click(); await wait(400);
  rec("U27", "Student opens the details and sees the description, requirements and qualifications", (await has("Good communication")) && (await has("Final year student in a computing course")) && (await has("Work with the design team")));
  await page.getByText("Logout").click(); await wait(500);
  await pick("Company"); await wait();
  await page.getByPlaceholder("you@example.com").fill("hr@opay.co");
  await page.getByPlaceholder("Enter your password").fill("Company@123");
  await page.getByRole("button", { name: "Log in" }).click(); await wait(900);
  await page.getByText("Applicants", { exact: true }).click(); await wait(600);
  rec("U22", "Company sees the student applicant", await has("Mahmoud Muhammad"));
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }).catch(() => null), page.getByRole("button", { name: "Download CV" }).click()]);
  let dlOk = false;
  if (dl) { const p = await dl.path(); dlOk = dl.suggestedFilename() === "Mahmoud_CV.pdf" && fs.readFileSync(p).equals(pdf); }
  rec("U26", "Company downloads the applicant's CV and the file is identical", dlOk);
  await page.getByRole("button", { name: "Mark reviewed" }).click(); await wait(800);
  rec("U23", "Company marks the application reviewed", (await page.getByText(/^reviewed$/i).count()) > 0);
  await page.getByRole("button", { name: "Approve" }).click(); await wait(1200);
  rec("U28", "Company approves the application and is told the student was emailed", (await page.getByText(/^approved$/i).count()) > 0 && (await has("notified by email")));
  const mailLines = fs.existsSync(__dirname + "/mail.log") ? fs.readFileSync(__dirname + "/mail.log", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  rec("U29", "The approval email reached the student's address", mailLines.some((m) => m.to.includes("mahmoud@buk.edu.ng") && /approved/i.test(m.subject)), JSON.stringify(mailLines.slice(-1)));
  rec("U24", "No script errors during all flows", errors.length === 0, errors.join(" | "));
  await ctx.close();

  // ---------- responsive checks ----------
  const widths = [320, 360, 390, 768, 1024, 1440];
  async function login(p, role, email, pw) {
    await p.goto(URL); await p.waitForTimeout(500);
    await p.getByRole("heading", { name: role, exact: true }).click(); await p.waitForTimeout(300);
    await p.getByPlaceholder("you@example.com").fill(email);
    await p.getByPlaceholder("Enter your password").fill(pw);
    await p.getByRole("button", { name: "Log in" }).click(); await p.waitForTimeout(900);
  }
  const overflow = (p) => p.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const bad = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > w + 1 || r.left < -1) && getComputedStyle(el).position !== "fixed") {
        // ignore elements inside an intentionally scrollable sidebar
        if (el.closest(".lb-sidebar")) return;
        bad.push(el.tagName.toLowerCase() + "." + (el.className || "").toString().slice(0, 30));
      }
    });
    return { scrollW: document.documentElement.scrollWidth, w, bad: bad.slice(0, 4) };
  });
  const flows = [
    ["home", async (p) => { await p.goto(URL); await p.waitForTimeout(600); }],
    ["login", async (p) => { await p.goto(URL); await p.waitForTimeout(400); await p.getByRole("heading", { name: "Student", exact: true }).click(); await p.waitForTimeout(400); }],
    ["signup", async (p) => { await p.goto(URL); await p.waitForTimeout(400); await p.getByRole("heading", { name: "Student", exact: true }).click(); await p.waitForTimeout(300); await p.getByText("Create an account").click(); await p.waitForTimeout(400); }],
    ["student-browse", async (p) => { await login(p, "Student", "mahmoud@buk.edu.ng", "secret123"); }],
    ["student-apps", async (p) => { await login(p, "Student", "mahmoud@buk.edu.ng", "secret123"); await p.getByText("My Applications").click(); await p.waitForTimeout(600); }],
    ["student-events", async (p) => { await login(p, "Student", "mahmoud@buk.edu.ng", "secret123"); await p.getByText("Events & Seminars").click(); await p.waitForTimeout(600); }],
    ["student-profile", async (p) => { await login(p, "Student", "mahmoud@buk.edu.ng", "secret123"); await p.getByText("Profile", { exact: true }).click(); await p.waitForTimeout(500); }],
    ["company-listings", async (p) => { await login(p, "Company", "hr@nymtech.com", "Company@123"); }],
    ["company-post", async (p) => { await login(p, "Company", "hr@nymtech.com", "Company@123"); await p.getByText("Post Job / Internship").click(); await p.waitForTimeout(500); }],
    ["company-applicants", async (p) => { await login(p, "Company", "hr@opay.co", "Company@123"); await p.getByText("Applicants", { exact: true }).click(); await p.waitForTimeout(600); }],
    ["admin-overview", async (p) => { await login(p, "Admin", "admin@buk.edu.ng", "Admin@12345"); }],
    ["admin-companies", async (p) => { await login(p, "Admin", "admin@buk.edu.ng", "Admin@12345"); await p.getByText("Company Approvals").click(); await p.waitForTimeout(600); }],
  ];
  let rn = 1;
  for (const w of widths) {
    const bad = [];
    for (const [name, fn] of flows) {
      const c = await browser.newContext({ viewport: { width: w, height: 800 } });
      const p = await c.newPage();
      await fn(p);
      const o = await overflow(p);
      if (o.scrollW > o.w + 1 || o.bad.length) bad.push(`${name} (scroll ${o.scrollW} vs ${o.w}; ${o.bad.join(", ")})`);
      if ((w === 390 || w === 768) ) await p.screenshot({ path: `${SHOT}/${w}_${name}.png`, fullPage: false });
      await c.close();
    }
    rec("R" + String(rn++).padStart(2, "0"), `No horizontal overflow on ${flows.length} screens at ${w}px wide`, bad.length === 0, bad.join("; "));
  }
  fs.writeFileSync(__dirname + "/ui-results.json", JSON.stringify(results, null, 2));
  const pass = results.filter((x) => x.ok).length;
  console.log(`\n${pass} of ${results.length} passed`);
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error("SCRIPT ERROR", e); process.exit(1); });
