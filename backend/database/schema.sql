-- TDT Powersteel CRM Database Schema
-- Run this file in MySQL to set up the database.
-- Usage: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS tdt_crm;
USE tdt_crm;

-- ─── Team / Users ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name     VARCHAR(255) NOT NULL,
    email    VARCHAR(255),
    role     VARCHAR(100) DEFAULT 'Sales Rep',
    branch   VARCHAR(100) NOT NULL
);

-- ─── Companies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
    id         VARCHAR(100) PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    industry   VARCHAR(100),
    website    VARCHAR(255),
    city       VARCHAR(100),
    owner      VARCHAR(255),
    status     VARCHAR(50) DEFAULT 'Active',
    created_at DATE        DEFAULT (CURRENT_DATE)
);

-- ─── Contacts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id         VARCHAR(100) PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    company_id VARCHAR(100),
    role       VARCHAR(100),
    owner      VARCHAR(255),
    email      VARCHAR(255),
    phone      VARCHAR(50),
    last_touch DATE,
    status     VARCHAR(50) DEFAULT 'Active',
    created_at DATE        DEFAULT (CURRENT_DATE),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- ─── Leads ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id            VARCHAR(100) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    contact_num   VARCHAR(255),
    address       TEXT,
    region        VARCHAR(100),
    sr            VARCHAR(255),
    branch        VARCHAR(100),
    status        VARCHAR(50)  DEFAULT 'New',
    created_at    DATE         DEFAULT (CURRENT_DATE)
);

-- ─── Deals ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
    id          VARCHAR(100) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    company_id  VARCHAR(100),
    contact_id  VARCHAR(100),
    lead_id     VARCHAR(100),
    stage       VARCHAR(100)   DEFAULT 'New Opportunity',
    value       DECIMAL(15, 2) DEFAULT 0,
    close_date  DATE,
    probability INT            DEFAULT 20,
    owner       VARCHAR(255),
    created_at  DATE           DEFAULT (CURRENT_DATE),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    -- Removed foreign key to leads because leads table structure completely changed
);

-- ─── Activities (Tasks) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
    id         VARCHAR(100) PRIMARY KEY,
    subject    VARCHAR(255) NOT NULL,
    type       VARCHAR(50)  DEFAULT 'Follow-up',
    owner      VARCHAR(255),
    deal_id    VARCHAR(100),
    due_date   DATE,
    priority   VARCHAR(50)  DEFAULT 'Medium',
    status     VARCHAR(50)  DEFAULT 'Open',
    notes      TEXT,
    created_at DATE         DEFAULT (CURRENT_DATE),
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
);

-- ─── Audit Log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_id   VARCHAR(100),
    action      VARCHAR(100),
    old_value   TEXT,
    new_value   TEXT,
    changed_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Seed: Sample team members ────────────────────────────────────────────────
INSERT IGNORE INTO team (username, password, name, email, role, branch) VALUES
    ('manila.tdtpowersteel', 'password123', 'Juan dela Cruz (Manila)',  'juan@tdt.com',  'Sales Rep', 'Manila'),
    ('cebu.tdtpowersteel', 'password123', 'Maria Santos (Cebu)',    'maria@tdt.com', 'Sales Rep', 'Cebu'),
    ('hq.tdtpowersteel', 'admin123', 'Carlo Reyes (HQ)',     'carlo@tdt.com', 'Sales Manager', 'Headquarters');
