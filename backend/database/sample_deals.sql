-- Sample Deals Data for Pipeline Testing
-- Run this in MySQL: mysql -u root -p tdt_crm < sample_deals.sql
-- Or copy-paste into MySQL Workbench

USE tdt_crm;

-- Clear existing sample data (optional)
-- DELETE FROM deals WHERE id LIKE 'deal_%';
-- DELETE FROM contacts WHERE id LIKE 'cont_%';
-- DELETE FROM companies WHERE id LIKE 'comp_%';

-- Insert sample companies
INSERT INTO companies (id, name, industry, city, owner, status) VALUES
('comp_001', 'ABC Construction Corp', 'Construction', 'Manila', 'Alex Rivera', 'Active'),
('comp_002', 'XYZ Manufacturing Inc', 'Manufacturing', 'Quezon City', 'Jordan Smith', 'Active'),
('comp_003', 'BuildPro Developers', 'Real Estate', 'Makati', 'Alex Rivera', 'Active'),
('comp_004', 'SteelWorks Philippines', 'Manufacturing', 'Pasig', 'Jordan Smith', 'Active'),
('comp_005', 'MegaBuilders Inc', 'Construction', 'Taguig', 'Alex Rivera', 'Active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert sample contacts
INSERT INTO contacts (id, name, company_id, role, owner, email, phone, status) VALUES
('cont_001', 'Juan Dela Cruz', 'comp_001', 'Project Manager', 'Alex Rivera', 'juan@abc.com', '0917-123-4567', 'Active'),
('cont_002', 'Maria Santos', 'comp_002', 'Procurement Head', 'Jordan Smith', 'maria@xyz.com', '0918-234-5678', 'Active'),
('cont_003', 'Pedro Reyes', 'comp_003', 'CEO', 'Alex Rivera', 'pedro@buildpro.com', '0919-345-6789', 'Active'),
('cont_004', 'Ana Garcia', 'comp_004', 'Operations Manager', 'Jordan Smith', 'ana@steelworks.ph', '0920-456-7890', 'Active'),
('cont_005', 'Carlos Mendoza', 'comp_005', 'VP Engineering', 'Alex Rivera', 'carlos@megabuilders.com', '0921-567-8901', 'Active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert sample deals (10 deals across all stages)
INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner) VALUES
-- New Opportunity (20% probability) - 2 deals
('deal_001', 'Q2 Steel Supply - ABC', 'comp_001', 'cont_001', NULL, 'New Opportunity', 1500000, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 20, 'Alex Rivera'),
('deal_002', 'Rebar Package Deal', 'comp_003', 'cont_003', NULL, 'New Opportunity', 2200000, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 20, 'Alex Rivera'),

-- Qualified (40% probability) - 2 deals
('deal_003', 'Manufacturing Equipment', 'comp_002', 'cont_002', NULL, 'Qualified', 3500000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 40, 'Jordan Smith'),
('deal_004', 'Steel Beams Bulk Order', 'comp_004', 'cont_004', NULL, 'Qualified', 1800000, DATE_ADD(CURDATE(), INTERVAL 35 DAY), 40, 'Jordan Smith'),

-- Proposal (60% probability) - 2 deals
('deal_005', 'Construction Materials Package', 'comp_005', 'cont_005', NULL, 'Proposal', 4200000, DATE_ADD(CURDATE(), INTERVAL 25 DAY), 60, 'Alex Rivera'),
('deal_006', 'Industrial Steel Supply', 'comp_001', 'cont_001', NULL, 'Proposal', 2800000, DATE_ADD(CURDATE(), INTERVAL 20 DAY), 60, 'Alex Rivera'),

-- Negotiation (80% probability) - 2 deals
('deal_007', 'Heavy Machinery Parts', 'comp_002', 'cont_002', NULL, 'Negotiation', 5100000, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 80, 'Jordan Smith'),
('deal_008', 'Structural Steel Contract', 'comp_003', 'cont_003', NULL, 'Negotiation', 3900000, DATE_ADD(CURDATE(), INTERVAL 18 DAY), 80, 'Alex Rivera'),

-- Closed Won (100% probability) - 2 deals
('deal_009', 'Q1 Steel Delivery', 'comp_004', 'cont_004', NULL, 'Closed Won', 2500000, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 100, 'Jordan Smith'),
('deal_010', 'Emergency Steel Supply', 'comp_005', 'cont_005', NULL, 'Closed Won', 1200000, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 100, 'Alex Rivera')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Show summary
SELECT '✅ Sample data added successfully!' AS Status;
SELECT 'Companies' AS Entity, COUNT(*) AS Count FROM companies
UNION ALL
SELECT 'Contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'Deals', COUNT(*) FROM deals;

SELECT 'Deals by Stage:' AS Summary;
SELECT stage AS Stage, COUNT(*) AS Count, CONCAT('PHP ', FORMAT(SUM(value), 0)) AS 'Total Value'
FROM deals 
GROUP BY stage 
ORDER BY FIELD(stage, 'New Opportunity', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won');
