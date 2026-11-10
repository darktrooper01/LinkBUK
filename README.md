# LinkBUK: BUK Industry and Corporate Collaboration Portal

Full stack version: React frontend, Node.js and Express backend, MySQL database.

```
linkbuk/
  server/   Express API, schema.sql, setup script
  client/   React app (Vite)
  tests/    API tests, browser tests, reset script
```

## 1. Database

Install MySQL 8 (or MariaDB 10.5+), then create the database and a user:

```sql
CREATE DATABASE linkbuk CHARACTER SET utf8mb4;
CREATE USER 'linkbuk'@'localhost' IDENTIFIED BY 'linkbuk_dev';
GRANT ALL ON linkbuk.* TO 'linkbuk'@'localhost';
```

## 2. Server

```
cd server
npm install
cp .env.example .env       (edit the password and JWT_SECRET)
npm run db:setup           (creates the 7 tables and loads sample data)
npm start                  (API on http://localhost:4000)
```

Sample logins created by db:setup

| Role    | Email               | Password     |
|---------|---------------------|--------------|
| Admin   | admin@buk.edu.ng    | Admin@12345  |
| Company | hr@nymtech.com      | Company@123  | (approved)
| Company | hr@kds.ng           | Company@123  | (pending)

Students create their own accounts on the signup page.
Change the admin password before any real use.

## 3. Client

```
cd client
npm install
npm run dev                (http://localhost:5173, /api is proxied to the server)
```

For a production build run `npm run build`. Set `VITE_API_URL` to the server address if the API is hosted on another domain, and set `CLIENT_ORIGIN` in the server `.env` to the site address.

## Tables (Chapter Three, Tables 3.2 to 3.8)

users, companies, jobs, events, applications, event_registrations, admins.
Passwords are stored as bcrypt hashes. Login returns a JWT that expires in 7 days.

## Rules enforced by the server

* Registration number must match FACULTY/YEAR/DEPT/IDNO, for example CST/22/IFT/00752.
* A company starts as pending and cannot post until the administrator approves it.
* Every job and event stays hidden from students until the administrator approves it.
* Listings are only visible to logged in students.
* A student cannot apply twice for a job or register twice for an event.
* A company can only see and update applications for its own jobs.

## Tests

With the database, server (npm start) and client (`npm run build` then `npm run preview`) running:

```
tests/reset.sh             (reloads the sample data)
node tests/api.test.js     (34 API tests)
node tests/ui.test.js      (24 browser tests and 6 screen size checks, needs Playwright)
```
