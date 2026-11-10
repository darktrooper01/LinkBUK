// The standard requirements a company must meet before the university approves it.
// This is the one place to change them. Each item is ticked by the administrator after checking it.
// "hint" shows the administrator what the company submitted, to help with the check.
const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|live|icloud|aol|proton|protonmail)\./i;

const REQUIREMENTS = [
  { code: "cac", label: "Registered with the Corporate Affairs Commission (RC number confirmed on the CAC register)", hint: (c) => `RC number: ${c.rc_number}` },
  { code: "address", label: "Physical business address confirmed", hint: (c) => c.address },
  { code: "contact", label: "Contact person and phone number confirmed", hint: (c) => `${c.contact_person}, ${c.phone}` },
  { code: "email", label: "Official company email address", hint: (c) => `${c.email}${FREE_MAIL.test(c.email) ? " (a free personal email, check carefully)" : ""}` },
  { code: "web", label: "Company website or online profile checked", hint: (c) => c.website },
  { code: "conduct", label: "Partner code of conduct accepted by the company", hint: (c) => (c.conduct_accepted ? "Accepted at signup" : "Not accepted") },
  { code: "genuine", label: "Opportunities offered are genuine and relevant to BUK students", hint: () => "Confirmed by the university" },
];
module.exports = { REQUIREMENTS };
