-- Seed data for units of measure

INSERT INTO units_of_measure (code, name, category_id, system, type, base_unit) VALUES
-- Weight units
('lb', 'Pound', 1, 'imperial', 'weight', true),
('oz', 'Ounce', 1, 'imperial', 'weight', false),
('kg', 'Kilogram', 1, 'metric', 'weight', false),
('g', 'Gram', 1, 'metric', 'weight', false),

-- Volume units
('gal', 'Gallon', 2, 'imperial', 'volume', false),
('qt', 'Quart', 2, 'imperial', 'volume', false),
('pt', 'Pint', 2, 'imperial', 'volume', false),
('cup', 'Cup', 2, 'imperial', 'volume', false),
('floz', 'Fluid Ounce', 2, 'imperial', 'volume', false),
('tbsp', 'Tablespoon', 2, 'imperial', 'volume', false),
('tsp', 'Teaspoon', 2, 'imperial', 'volume', false),
('l', 'Liter', 2, 'metric', 'volume', false),
('ml', 'Milliliter', 2, 'metric', 'volume', false),

-- Count units
('ea', 'Each', 3, 'universal', 'count', true),
('doz', 'Dozen', 3, 'universal', 'count', false),
('cs', 'Case', 3, 'universal', 'count', false);