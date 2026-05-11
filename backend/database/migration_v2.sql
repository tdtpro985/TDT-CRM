-- Migration: Enhanced Relationships and Regional RSM Structure

-- 1. Update Team Table for Regions
ALTER TABLE team ADD COLUMN region ENUM('North Luzon', 'Central', 'Vis&Min') DEFAULT 'North Luzon';

-- 2. Create Join Table for Contacts and Deals (Many-to-Many)
CREATE TABLE IF NOT EXISTS deal_contacts (
    deal_id    VARCHAR(100) NOT NULL,
    contact_id VARCHAR(100) NOT NULL,
    role       VARCHAR(100) DEFAULT 'Primary',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (deal_id, contact_id),
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- 3. Transition Deals to reference Team ID instead of string
ALTER TABLE deals ADD COLUMN owner_id INT;
ALTER TABLE deals ADD FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL;

-- 4. Transition Contacts to reference Team ID
ALTER TABLE contacts ADD COLUMN owner_id INT;
ALTER TABLE contacts ADD FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL;

-- 5. Transition Leads to reference Team ID (The Sales Rep / RSM)
ALTER TABLE leads ADD COLUMN owner_id INT;
ALTER TABLE leads ADD FOREIGN KEY (owner_id) REFERENCES team(id) ON DELETE SET NULL;

-- 6. Seed Data Migration (Optional/Conceptual)
-- This assumes we would map existing string 'owner'/'sr' to team IDs if we were doing a live migration.
-- For now, we are just setting up the structure.
