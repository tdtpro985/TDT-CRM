-- Add More Deals for Pagination Testing
-- This adds 50 more deals (10 per stage) so pagination shows
-- Run: mysql -u root -p tdt_crm < add_more_deals.sql

USE tdt_crm;

-- Add 10 more deals to "New Opportunity" (20% probability)
INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner) VALUES
('deal_011', 'Steel Supply Contract #11', 'comp_001', 'cont_001', NULL, 'New Opportunity', 1600000, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 20, 'Alex Rivera'),
('deal_012', 'Construction Materials #12', 'comp_002', 'cont_002', NULL, 'New Opportunity', 1700000, DATE_ADD(CURDATE(), INTERVAL 20 DAY), 20, 'Jordan Smith'),
('deal_013', 'Heavy Equipment Deal #13', 'comp_003', 'cont_003', NULL, 'New Opportunity', 1800000, DATE_ADD(CURDATE(), INTERVAL 25 DAY), 20, 'Alex Rivera'),
('deal_014', 'Industrial Parts Order #14', 'comp_004', 'cont_004', NULL, 'New Opportunity', 1900000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 20, 'Jordan Smith'),
('deal_015', 'Manufacturing Supply #15', 'comp_005', 'cont_005', NULL, 'New Opportunity', 2000000, DATE_ADD(CURDATE(), INTERVAL 35 DAY), 20, 'Alex Rivera'),
('deal_016', 'Building Materials Package #16', 'comp_001', 'cont_001', NULL, 'New Opportunity', 2100000, DATE_ADD(CURDATE(), INTERVAL 40 DAY), 20, 'Jordan Smith'),
('deal_017', 'Infrastructure Project #17', 'comp_002', 'cont_002', NULL, 'New Opportunity', 2200000, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 20, 'Alex Rivera'),
('deal_018', 'Structural Steel Deal #18', 'comp_003', 'cont_003', NULL, 'New Opportunity', 2300000, DATE_ADD(CURDATE(), INTERVAL 50 DAY), 20, 'Jordan Smith'),
('deal_019', 'Equipment Rental Contract #19', 'comp_004', 'cont_004', NULL, 'New Opportunity', 2400000, DATE_ADD(CURDATE(), INTERVAL 55 DAY), 20, 'Alex Rivera'),
('deal_020', 'Bulk Steel Order #20', 'comp_005', 'cont_005', NULL, 'New Opportunity', 2500000, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 20, 'Jordan Smith')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Add 10 more deals to "Qualified" (40% probability)
INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner) VALUES
('deal_021', 'Steel Supply Contract #21', 'comp_001', 'cont_001', NULL, 'Qualified', 2600000, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 40, 'Alex Rivera'),
('deal_022', 'Construction Materials #22', 'comp_002', 'cont_002', NULL, 'Qualified', 2700000, DATE_ADD(CURDATE(), INTERVAL 20 DAY), 40, 'Jordan Smith'),
('deal_023', 'Heavy Equipment Deal #23', 'comp_003', 'cont_003', NULL, 'Qualified', 2800000, DATE_ADD(CURDATE(), INTERVAL 25 DAY), 40, 'Alex Rivera'),
('deal_024', 'Industrial Parts Order #24', 'comp_004', 'cont_004', NULL, 'Qualified', 2900000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 40, 'Jordan Smith'),
('deal_025', 'Manufacturing Supply #25', 'comp_005', 'cont_005', NULL, 'Qualified', 3000000, DATE_ADD(CURDATE(), INTERVAL 35 DAY), 40, 'Alex Rivera'),
('deal_026', 'Building Materials Package #26', 'comp_001', 'cont_001', NULL, 'Qualified', 3100000, DATE_ADD(CURDATE(), INTERVAL 40 DAY), 40, 'Jordan Smith'),
('deal_027', 'Infrastructure Project #27', 'comp_002', 'cont_002', NULL, 'Qualified', 3200000, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 40, 'Alex Rivera'),
('deal_028', 'Structural Steel Deal #28', 'comp_003', 'cont_003', NULL, 'Qualified', 3300000, DATE_ADD(CURDATE(), INTERVAL 50 DAY), 40, 'Jordan Smith'),
('deal_029', 'Equipment Rental Contract #29', 'comp_004', 'cont_004', NULL, 'Qualified', 3400000, DATE_ADD(CURDATE(), INTERVAL 55 DAY), 40, 'Alex Rivera'),
('deal_030', 'Bulk Steel Order #30', 'comp_005', 'cont_005', NULL, 'Qualified', 3500000, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 40, 'Jordan Smith')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Add 10 more deals to "Proposal" (60% probability)
INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner) VALUES
('deal_031', 'Steel Supply Contract #31', 'comp_001', 'cont_001', NULL, 'Proposal', 3600000, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 60, 'Alex Rivera'),
('deal_032', 'Construction Materials #32', 'comp_002', 'cont_002', NULL, 'Proposal', 3700000, DATE_ADD(CURDATE(), INTERVAL 20 DAY), 60, 'Jordan Smith'),
('deal_033', 'Heavy Equipment Deal #33', 'comp_003', 'cont_003', NULL, 'Proposal', 3800000, DATE_ADD(CURDATE(), INTERVAL 25 DAY), 60, 'Alex Rivera'),
('deal_034', 'Industrial Parts Order #34', 'comp_004', 'cont_004', NULL, 'Proposal', 3900000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 60, 'Jordan Smith'),
('deal_035', 'Manufacturing Supply #35', 'comp_005', 'cont_005', NULL, 'Proposal', 4000000, DATE_ADD(CURDATE(), INTERVAL 35 DAY), 60, 'Alex Rivera'),
('deal_036', 'Building Materials Package #36', 'comp_001', 'cont_001', NULL, 'Proposal', 4100000, DATE_ADD(CURDATE(), INTERVAL 40 DAY), 60, 'Jordan Smith'),
('deal_037', 'Infrastructure Project #37', 'comp_002', 'cont_002', NULL, 'Proposal', 4200000, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 60, 'Alex Rivera'),
('deal_038', 'Structural Steel Deal #38', 'comp_003', 'cont_003', NULL, 'Proposal', 4300000, DATE_ADD(CURDATE(), INTERVAL 50 DAY), 60, 'Jordan Smith'),
('deal_039', 'Equipment Rental Contract #39', 'comp_004', 'cont_004', NULL, 'Proposal', 4400000, DATE_ADD(CURDATE(), INTERVAL 55 DAY), 60, 'Alex Rivera'),
('deal_040', 'Bulk Steel Order #40', 'comp_005', 'cont_005', NULL, 'Proposal', 4500000, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 60, 'Jordan Smith')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Add 10 more deals to "Negotiation" (80% probability)
INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner) VALUES
('deal_041', 'Steel Supply Contract #41', 'comp_001', 'cont_001', NULL, 'Negotiation', 4600000, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 80, 'Alex Rivera'),
('deal_042', 'Construction Materials #42', 'comp_002', 'cont_002', NULL, 'Negotiation', 4700000, DATE_ADD(CURDATE(), INTERVAL 20 DAY), 80, 'Jordan Smith'),
('deal_043', 'Heavy Equipment Deal #43', 'comp_003', 'cont_003', NULL, 'Negotiation', 4800000, DATE_ADD(CURDATE(), INTERVAL 25 DAY), 80, 'Alex Rivera'),
('deal_044', 'Industrial Parts Order #44', 'comp_004', 'cont_004', NULL, 'Negotiation', 4900000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 80, 'Jordan Smith'),
('deal_045', 'Manufacturing Supply #45', 'comp_005', 'cont_005', NULL, 'Negotiation', 5000000, DATE_ADD(CURDATE(), INTERVAL 35 DAY), 80, 'Alex Rivera'),
('deal_046', 'Building Materials Package #46', 'comp_001', 'cont_001', NULL, 'Negotiation', 5100000, DATE_ADD(CURDATE(), INTERVAL 40 DAY), 80, 'Jordan Smith'),
('deal_047', 'Infrastructure Project #47', 'comp_002', 'cont_002', NULL, 'Negotiation', 5200000, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 80, 'Alex Rivera'),
('deal_048', 'Structural Steel Deal #48', 'comp_003', 'cont_003', NULL, 'Negotiation', 5300000, DATE_ADD(CURDATE(), INTERVAL 50 DAY), 80, 'Jordan Smith'),
('deal_049', 'Equipment Rental Contract #49', 'comp_004', 'cont_004', NULL, 'Negotiation', 5400000, DATE_ADD(CURDATE(), INTERVAL 55 DAY), 80, 'Alex Rivera'),
('deal_050', 'Bulk Steel Order #50', 'comp_005', 'cont_005', NULL, 'Negotiation', 5500000, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 80, 'Jordan Smith')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Add 10 more deals to "Closed Won" (100% probability)
INSERT INTO deals (id, name, company_id, contact_id, lead_id, stage, value, close_date, probability, owner) VALUES
('deal_051', 'Steel Supply Contract #51', 'comp_001', 'cont_001', NULL, 'Closed Won', 5600000, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 100, 'Alex Rivera'),
('deal_052', 'Construction Materials #52', 'comp_002', 'cont_002', NULL, 'Closed Won', 5700000, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 100, 'Jordan Smith'),
('deal_053', 'Heavy Equipment Deal #53', 'comp_003', 'cont_003', NULL, 'Closed Won', 5800000, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 100, 'Alex Rivera'),
('deal_054', 'Industrial Parts Order #54', 'comp_004', 'cont_004', NULL, 'Closed Won', 5900000, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 100, 'Jordan Smith'),
('deal_055', 'Manufacturing Supply #55', 'comp_005', 'cont_005', NULL, 'Closed Won', 6000000, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 100, 'Alex Rivera'),
('deal_056', 'Building Materials Package #56', 'comp_001', 'cont_001', NULL, 'Closed Won', 6100000, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 100, 'Jordan Smith'),
('deal_057', 'Infrastructure Project #57', 'comp_002', 'cont_002', NULL, 'Closed Won', 6200000, DATE_SUB(CURDATE(), INTERVAL 7 DAY), 100, 'Alex Rivera'),
('deal_058', 'Structural Steel Deal #58', 'comp_003', 'cont_003', NULL, 'Closed Won', 6300000, DATE_SUB(CURDATE(), INTERVAL 8 DAY), 100, 'Jordan Smith'),
('deal_059', 'Equipment Rental Contract #59', 'comp_004', 'cont_004', NULL, 'Closed Won', 6400000, DATE_SUB(CURDATE(), INTERVAL 9 DAY), 100, 'Alex Rivera'),
('deal_060', 'Bulk Steel Order #60', 'comp_005', 'cont_005', NULL, 'Closed Won', 6500000, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 100, 'Jordan Smith')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Show summary
SELECT '✅ 50 more deals added!' AS Status;
SELECT 'Total Deals:' AS Info, COUNT(*) AS Count FROM deals;
SELECT 'Deals by Stage:' AS Summary;
SELECT stage AS Stage, COUNT(*) AS Count, CONCAT('PHP ', FORMAT(SUM(value), 0)) AS 'Total Value'
FROM deals 
GROUP BY stage 
ORDER BY FIELD(stage, 'New Opportunity', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won');
