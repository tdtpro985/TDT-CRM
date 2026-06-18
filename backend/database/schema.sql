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
    role     VARCHAR(100) DEFAULT 'Branch Account',
    branch   VARCHAR(100) NOT NULL,
    region   ENUM('North Luzon', 'Central', 'Vis&Min') DEFAULT 'Central',
    profile_pic VARCHAR(500) NULL,
    theme       VARCHAR(50)  DEFAULT 'dark',
    neon_color  VARCHAR(50)  DEFAULT 'pink'
);

-- ─── Companies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
    id         VARCHAR(100) PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    industry   VARCHAR(100),
    website    VARCHAR(255),
    city       VARCHAR(100),
    owner_id   INT,
    status     VARCHAR(50) DEFAULT 'Active',
    created_at DATE        DEFAULT (CURRENT_DATE),
    FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL
);

-- ─── Contacts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id         VARCHAR(100) PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    company_id VARCHAR(100),
    role       VARCHAR(100),
    owner_id   INT,
    email      VARCHAR(255),
    phone      VARCHAR(50),
    last_touch DATE,
    status     VARCHAR(50) DEFAULT 'Active',
    created_at DATE        DEFAULT (CURRENT_DATE),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL
);

-- ─── Leads ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id            VARCHAR(100) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    contact_num   VARCHAR(255),
    address       TEXT,
    region        VARCHAR(100),
    owner_id      INT,
    owner_name    VARCHAR(255),
    branch        VARCHAR(100),
    status          VARCHAR(50)  DEFAULT 'New',
    reassigned_at   DATE         NULL,
    approval_status VARCHAR(20)  NOT NULL DEFAULT 'approved',
    created_at      DATE         DEFAULT (CURRENT_DATE),
    FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL
);

-- ─── Customer Approvals (RSM/HOS endorsements) ───────────────────────────────
CREATE TABLE IF NOT EXISTS customer_approvals (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    lead_id     VARCHAR(100) NOT NULL,
    reviewer_id INT NOT NULL,
    action      VARCHAR(50)  NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES team(id) ON DELETE CASCADE
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
    probability_manual BOOLEAN DEFAULT FALSE,
    lost_reason VARCHAR(255)   NULL,
    owner_id    INT,
    branch      VARCHAR(100),
    created_at  DATETIME       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL
);

-- ─── Contacts-Deals Join Table (Many-to-Many) ────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_contacts (
    deal_id    VARCHAR(100) NOT NULL,
    contact_id VARCHAR(100) NOT NULL,
    role       VARCHAR(100) DEFAULT 'Primary',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (deal_id, contact_id),
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- ─── Activities (Tasks) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
    id         VARCHAR(100) PRIMARY KEY,
    subject    VARCHAR(255) NOT NULL,
    type       VARCHAR(50)  DEFAULT 'Follow-up',
    owner_id   INT,
    deal_id    VARCHAR(100),
    due_date   DATE,
    priority   VARCHAR(50)  DEFAULT 'Low',
    status     VARCHAR(50)  DEFAULT 'Open',
    notes      TEXT,
    stage      VARCHAR(100),
    contact_name VARCHAR(255),
    metadata     TEXT,
    created_at DATE         DEFAULT (CURRENT_DATE),
    FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
);

-- ─── Deal Attachments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_attachments (
    id           VARCHAR(100) PRIMARY KEY,
    deal_id      VARCHAR(100) NOT NULL,
    filename     VARCHAR(500) NOT NULL,
    label        VARCHAR(255),
    uploaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- ─── Audit Log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_id   VARCHAR(100),
    action      VARCHAR(100),
    old_value   TEXT,
    new_value   TEXT,
    user_id     INT,
    changed_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES team(id) ON DELETE SET NULL
);

-- ─── Celebration Music ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS celebration_music (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    outcome           ENUM('won','lost') NOT NULL,
    source_type       ENUM('url','internal') NOT NULL DEFAULT 'url',
    url               VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255),
    stored_filename   VARCHAR(255),
    is_active         TINYINT(1) DEFAULT 1,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Application Settings (key-value) ────────────────────────────────────────
-- Stores generic app-wide toggles, e.g. celebration_animation_won / _lost.
-- Valid values for celebration_animation_*: 'confetti' | 'jojo' | 'none' | 'victory'
CREATE TABLE IF NOT EXISTS app_settings (
    setting_key   VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Custom Task Types ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_type_configs (
    id         VARCHAR(100) PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES team(id) ON DELETE SET NULL,
    UNIQUE KEY uq_task_type_name (name)
);

-- ─── Integration API Keys ────────────────────────────────────────────────────
-- Keys are issued by admins; plaintext is shown once and never stored.
CREATE TABLE IF NOT EXISTS api_keys (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    key_hash      VARCHAR(64)  NOT NULL UNIQUE,
    key_prefix    VARCHAR(16)  NOT NULL,
    permissions   JSON         NOT NULL,
    branch        VARCHAR(50)  DEFAULT NULL,
    region        VARCHAR(50)  DEFAULT NULL,
    owner_id      INT          DEFAULT NULL,
    created_by    INT          DEFAULT NULL,
    last_used_at  DATETIME     DEFAULT NULL,
    is_active     TINYINT(1)   DEFAULT 1,
    created_at    DATETIME     DEFAULT NOW()
);

-- User seeds are managed by backend bootstrap script for cross-device consistency:
-- python -m database.bootstrap_users
