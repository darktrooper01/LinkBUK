require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

// Aiven needs its certificate. Put the downloaded ca.pem file in the server folder and it is picked up automatically.
const caFile = path.join(__dirname, "..", "ca.pem");
const CA = fs.existsSync(caFile) ? fs.readFileSync(caFile, "utf8") : (process.env.DB_SSL_CA ? process.env.DB_SSL_CA.replace(/\\n/g, "\n") : null);

if (process.env.DB_SSL === "true") console.log(`[db] TLS on. CA file found: ${CA ? "yes" : "no"}. Certificate check: ${process.env.DB_SSL_VERIFY === "false" ? "off" : "on"}`);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "linkbuk",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "linkbuk",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // return DATE columns as plain YYYY-MM-DD text
  multipleStatements: true,
  ssl: process.env.DB_SSL === "true" ? (process.env.DB_SSL_VERIFY === "false" ? { rejectUnauthorized: false } : CA ? { ca: CA, rejectUnauthorized: true } : { rejectUnauthorized: true }) : undefined, // hosted databases need TLS. DB_SSL_VERIFY=false keeps the connection encrypted but skips the certificate check (testing only)
});

module.exports = pool;
