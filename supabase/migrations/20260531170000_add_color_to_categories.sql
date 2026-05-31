-- Add color column to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color varchar(7) DEFAULT '#6668a8';

-- Seed category colors
UPDATE categories SET color = '#36ADA3' WHERE name = 'Living';
UPDATE categories SET color = '#F4B342' WHERE name = 'Play & lifestyle';
UPDATE categories SET color = '#8F0177' WHERE name = 'Saving';
UPDATE categories SET color = '#2F578A' WHERE name = 'Occasionally';
UPDATE categories SET color = '#DE1A58' WHERE name = 'Financial Obligations';
