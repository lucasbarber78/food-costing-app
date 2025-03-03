-- Food Costing Application Database Schema

-- Units of Measure
CREATE TABLE unit_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT
);

CREATE TABLE units_of_measure (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  category_id INTEGER REFERENCES unit_categories(id),
  system VARCHAR(20) NOT NULL, -- (metric, imperial, etc.)
  type VARCHAR(20) NOT NULL, -- (weight, volume, count, etc.)
  base_unit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unit Conversions
CREATE TABLE unit_conversions (
  id SERIAL PRIMARY KEY,
  from_unit_id INTEGER NOT NULL REFERENCES units_of_measure(id),
  to_unit_id INTEGER NOT NULL REFERENCES units_of_measure(id),
  conversion_factor DECIMAL(16, 8) NOT NULL,
  item_specific BOOLEAN NOT NULL DEFAULT false,
  item_id INTEGER, -- NULL if general conversion
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT different_units CHECK (from_unit_id != to_unit_id)
);

-- Item Categories
CREATE TABLE item_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE item_classes (
  id SERIAL PRIMARY KEY,
  type_id INTEGER REFERENCES item_types(id),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  UNIQUE(type_id, name)
);

CREATE TABLE item_groups (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES item_classes(id),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  UNIQUE(class_id, name)
);

CREATE TABLE item_subgroups (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES item_groups(id),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  UNIQUE(group_id, name)
);

-- Items
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  subgroup_id INTEGER REFERENCES item_subgroups(id),
  default_purchase_unit_id INTEGER REFERENCES units_of_measure(id),
  default_inventory_unit_id INTEGER REFERENCES units_of_measure(id),
  default_base_unit_id INTEGER REFERENCES units_of_measure(id),
  inv_unit_per_purchase_unit DECIMAL(16, 8),
  base_unit_per_inv_unit DECIMAL(16, 8),
  include_in_inventory BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Yield Factors
CREATE TABLE yield_factors (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  process_type VARCHAR(50) NOT NULL, -- trim, cook, etc.
  yield_percentage DECIMAL(8, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_percentage CHECK (yield_percentage >= 0 AND yield_percentage <= 1000)
);

-- Weight to Volume Conversions
CREATE TABLE weight_volume_conversions (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  weight_value DECIMAL(16, 8) NOT NULL,
  weight_unit_id INTEGER NOT NULL REFERENCES units_of_measure(id),
  volume_value DECIMAL(16, 8) NOT NULL,
  volume_unit_id INTEGER NOT NULL REFERENCES units_of_measure(id),
  process_state VARCHAR(50), -- raw, cooked, trimmed, etc.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Vendors
CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_info TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Pricing
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  vendor_id INTEGER REFERENCES vendors(id),
  purchase_unit_id INTEGER NOT NULL REFERENCES units_of_measure(id),
  price DECIMAL(10, 2) NOT NULL,
  pack_size VARCHAR(50),
  effective_date DATE NOT NULL,
  invoice_date DATE,
  invoice_number VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Locations
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  quantity DECIMAL(16, 8) NOT NULL,
  unit_id INTEGER NOT NULL REFERENCES units_of_measure(id),
  average_unit_cost DECIMAL(10, 4),
  last_count_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, location_id)
);

-- Recipes
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  yield_quantity DECIMAL(10, 2) NOT NULL,
  yield_unit_id INTEGER NOT NULL REFERENCES units_of_measure(id),
  portion_size DECIMAL(10, 2),
  portion_unit_id INTEGER REFERENCES units_of_measure(id),
  portions INTEGER,
  instructions TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Recipe Ingredients
CREATE TABLE recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  quantity DECIMAL(16, 8) NOT NULL,
  unit_id INTEGER NOT NULL REFERENCES units_of_measure(id),
  preparation_notes TEXT,
  sequence INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX items_name_idx ON items(name);
CREATE INDEX items_subgroup_id_idx ON items(subgroup_id);
CREATE INDEX recipe_ingredients_recipe_id_idx ON recipe_ingredients(recipe_id);
CREATE INDEX recipe_ingredients_item_id_idx ON recipe_ingredients(item_id);
CREATE INDEX price_history_item_id_idx ON price_history(item_id);
CREATE INDEX inventory_item_location_idx ON inventory(item_id, location_id);