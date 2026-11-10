#!/bin/sh
# Drops all tables and reloads the schema and sample data.
mysql -uroot linkbuk -e "SET FOREIGN_KEY_CHECKS=0; DROP TABLE IF EXISTS event_registrations, applications, events, jobs, admins, companies, users; SET FOREIGN_KEY_CHECKS=1;"
cd /home/claude/linkbuk/server && node src/setup.js >/dev/null
