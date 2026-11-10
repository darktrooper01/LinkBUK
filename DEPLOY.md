# Deploying LinkBUK on Vercel

The site (React) and the API (Express) deploy together as one Vercel project. Vercel does not host MySQL, so the database lives on a separate hosted MySQL service.

## 1. Put the code on GitHub (Git and VS Code)

```
git init
git add .
git commit -m "LinkBUK full stack portal"
git branch -M main
git remote add origin https://github.com/<your-username>/linkbuk.git
git push -u origin main
```

Every later change: edit in VS Code, then `git add .`, `git commit -m "what changed"`, `git push`. Vercel redeploys on each push.

## 2. Create the hosted MySQL database

Use any MySQL compatible service that gives you a host, port, user, password and database name (Aiven for MySQL and TiDB Cloud both have free tiers, check current terms). Note the five values.

Load the tables and sample data once, from your computer:

```
cd server
cp .env.example .env
```

Edit `.env` with the hosted values and add `DB_SSL=true`, then run:

```
npm install
npm run db:setup
```

## 3. Create the Vercel project

1. Sign in to vercel.com with GitHub and choose Add New, Project, then import the `linkbuk` repository.
2. Leave the root directory as the repository root. The `vercel.json` file sets the build.
3. Under Environment Variables add: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` (true), `JWT_SECRET` (a long random text), and `CLIENT_ORIGIN` (your Vercel address, for example https://linkbuk.vercel.app).
4. For emails to students add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`. With Gmail use `smtp.gmail.com`, port `587`, your Gmail address, and an App Password (Google Account, Security, 2-Step Verification, App passwords). Do not use your normal password. If you leave these out the portal still works, but approval and rejection emails are only written to the log.
5. Press Deploy.

## 4. Check it

Open `https://<your-project>.vercel.app/api/health`. It should show `{"ok":true}`. Then open the site root and log in as admin.

Change the sample admin password straight after the first login by updating the `admins` row, or remove the sample accounts before the demonstration.
