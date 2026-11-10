// A tiny SMTP server for testing. It accepts every message and appends it to tests/mail.log as one JSON line.
// Run:  node tests/mail-sink.js   (listens on port 2525)
const { SMTPServer } = require("smtp-server");
const fs = require("fs");
const LOG = __dirname + "/mail.log";
fs.writeFileSync(LOG, "");
new SMTPServer({
  authOptional: true, disabledCommands: ["STARTTLS"],
  onAuth(auth, session, cb) { cb(null, { user: auth.username }); },
  onData(stream, session, cb) {
    let raw = ""; stream.on("data", (c) => (raw += c));
    stream.on("end", () => {
      const unfolded = raw.replace(/\r?\n[ \t]+/g, " ");
      const header = (n) => (unfolded.match(new RegExp("^" + n + ": (.*)$", "mi")) || [])[1] || "";
      const qp = (t) => t.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
      fs.appendFileSync(LOG, JSON.stringify({ to: header("To"), subject: header("Subject"), body: (/quoted-printable/i.test(header("Content-Transfer-Encoding")) ? qp : (t) => t)(raw.split(/\r?\n\r?\n/).slice(1).join("\n\n")) }) + "\n");
      cb();
    });
  },
}).listen(2525, "127.0.0.1", () => console.log("mail sink on 2525"));
