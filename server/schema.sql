-- LinkBUK database schema (MySQL / MariaDB)
-- Matches the tables designed in Chapter Three, Tables 3.2 to 3.8.

CREATE TABLE IF NOT EXISTS users (
  user_id      INT AUTO_INCREMENT PRIMARY KEY,
  full_name    VARCHAR(100) NOT NULL,
  email        VARCHAR(100) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  faculty      VARCHAR(100) NOT NULL,
  department   VARCHAR(100) NOT NULL,
  reg_number   VARCHAR(30)  NOT NULL UNIQUE,
  cv_name      VARCHAR(255) NULL,
  cv_type      VARCHAR(100) NULL,
  cv_data      MEDIUMBLOB   NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS companies (
  company_id    INT AUTO_INCREMENT PRIMARY KEY,
  company_name  VARCHAR(150) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  industry      VARCHAR(100) NOT NULL,
  rc_number     VARCHAR(30)  NOT NULL,
  address       VARCHAR(255) NOT NULL,
  contact_person VARCHAR(120) NOT NULL,
  phone         VARCHAR(30)  NOT NULL,
  website       VARCHAR(255) NOT NULL,
  conduct_accepted TINYINT(1) NOT NULL DEFAULT 0,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admins (
  admin_id  INT AUTO_INCREMENT PRIMARY KEY,
  email     VARCHAR(100) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS company_checks (
  company_id  INT NOT NULL,
  req_code    VARCHAR(40) NOT NULL,
  admin_id    INT NULL,
  checked_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, req_code),
  FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id)   REFERENCES admins(admin_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS jobs (
  job_id       INT AUTO_INCREMENT PRIMARY KEY,
  company_id   INT NOT NULL,
  title        VARCHAR(150) NOT NULL,
  type         ENUM('Job','Internship') NOT NULL DEFAULT 'Job',
  location     VARCHAR(150) NOT NULL,
  salary       VARCHAR(100) NOT NULL,
  description  TEXT NOT NULL,
  requirements TEXT NOT NULL,
  qualifications TEXT NOT NULL,
  deadline     DATE NULL,
  status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  INDEX idx_jobs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
  event_id     INT AUTO_INCREMENT PRIMARY KEY,
  company_id   INT NOT NULL,
  title        VARCHAR(150) NOT NULL,
  event_date   DATE NOT NULL,
  venue        VARCHAR(150) NOT NULL,
  description  TEXT NOT NULL,
  status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  INDEX idx_events_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS applications (
  application_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  job_id          INT NOT NULL,
  status          ENUM('Pending','Reviewed','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  applied_date    DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (job_id)  REFERENCES jobs(job_id)  ON DELETE CASCADE,
  UNIQUE KEY uq_application (user_id, job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS event_registrations (
  registration_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  event_id         INT NOT NULL,
  registered_date  DATE NOT NULL,
  FOREIGN KEY (user_id)  REFERENCES users(user_id)   ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  UNIQUE KEY uq_registration (user_id, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
