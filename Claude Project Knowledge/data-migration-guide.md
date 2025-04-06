# Food Costing Application - Data Migration Guide

## Overview

This guide provides detailed instructions for migrating data from the existing Excel/CSV format to the new Food Costing Application database. The migration process includes data validation, transformation, and loading into the PostgreSQL database.

## Pre-Migration Planning

### 1. Data Assessment

Before beginning the migration process, assess the existing data:

- Identify all CSV files containing relevant data
- Review data structures and relationships
- Identify data quality issues
- Determine data mapping strategy
- Plan for handling missing or inconsistent data

### 2. Environment Setup

Prepare the migration environment:

- Set up development environment with required dependencies
- Install and configure PostgreSQL database
- Create necessary database schemas
- Configure data validation tools
- Set up logging for the migration process

### 3. Backup Strategy

Implement a backup strategy:

- Create backups of all source files
- Set up database backup procedures
- Document rollback procedures

## Migration Process

### Step 1: Extract and Validate Source Data

Extract data from CSV files and validate for consistency:

```bash
# Run the CSV validation script
node scripts/validate-csv-data.js path/to/csv/directory
```

The validation script will:
- Check for required columns
- Validate data types
- Identify missing values
- Generate a validation report

Review the validation report and address any critical issues before proceeding.

### Step 2: Initialize Database

Initialize the database schema:

```bash
# Navigate to server directory
cd server

# Run database initialization script
npm run db:init
```

### Step 3: Import Units of Measure

Import units of measure first, as they are referenced by other entities:

```bash
# Run units import script
node scripts/import-units.js path/to/UNITS_OF_MEASURE_UOM.csv
```

### Step 4: Import Categories

Import the category hierarchy:

```bash
# Import item types, classes, groups, and subgroups
node scripts/import-categories.js \
  --types path/to/ITEM_GROUP_ITEM_GROUP.csv \
  --subgroups path/to/ITEM_SUB_GROUP_ISG.csv
```

### Step 5: Import Items

Import items and their properties:

```bash
# Import items with basic properties
node scripts/import-items.js path/to/ITEMS_LIST_ITEM_LIST_TABLE.csv

# Import additional item details
node scripts/import-item-details.js path/to/MASTER_ITEM_LIST_ITEM_MASTER_LIST.csv
```

### Step 6: Import Conversion Factors

Import conversion factors between units:

```bash
# Import general conversion factors
node scripts/import-conversions.js path/to/UNIT_CNVSN_UNIT_CNVSN.csv

# Import item-specific conversion factors
node scripts/import-item-conversions.js path/to/INGREDIENT_CONVERSION_INGREDIENT_CONVERSION.csv
```

### Step 7: Import Yield Factors

Import yield factors for trimming and cooking:

```bash
# Import yield factors
node scripts/import-yields.js path/to/INGREDIENT_CONVERSION_INGREDIENT_CONVERSION.csv
```

### Step 8: Import Price History

Import price history for items:

```bash
# Import price history
node scripts/import-prices.js path/to/ITEMS_LIST_ITEM_LIST_TABLE.csv
```

### Step 9: Import Inventory Data

Import current inventory levels:

```bash
# Import inventory data
node scripts/import-inventory.js path/to/INVENTORY_ITEMS_INVENTORY_ITEMS_TABLE.csv
```

### Step 10: Verify Data Migration

Verify the data migration:

```bash
# Run data verification script
node scripts/verify-migration.js
```

The verification script will:
- Check record counts against source files
- Verify referential integrity
- Perform sample validations of conversions and calculations
- Generate a verification report

## Data Mapping

### Units of Measure

Maps from `UNITS_OF_MEASURE_UOM.csv`:

| CSV Column | Database Field       | Notes                         |
|------------|----------------------|-------------------------------|
| U          | code                 | Unit code (e.g., lb, oz)      |
| UT         | type                 | Unit type (weight, volume)    |
| VU         | name                 | Full unit name                |

### Item Categories

Maps from `ITEM_GROUP_ITEM_GROUP.csv` and `ITEM_SUB_GROUP_ISG.csv`:

| CSV Column | Database Table       | Database Field               |
|------------|----------------------|------------------------------|
| TYPE       | item_types           | name                         |
| CLASS      | item_classes         | name                         |
| GROUP      | item_groups          | name                         |
| ISG        | item_subgroups       | name                         |

### Items

Maps from `ITEMS_LIST_ITEM_LIST_TABLE.csv` and `MASTER_ITEM_LIST_ITEM_MASTER_LIST.csv`:

| CSV Column               | Database Field                | Notes                       |
|--------------------------|-------------------------------|------------------------------|
| ITEM_NAME                | name                          |                             |
| PRODUCT_NAME             | description                   |                             |
| ITEM_SUB_GROUP           | (lookup to get subgroup_id)   |                             |
| PURCH_UNIT               | default_purchase_unit_id      | Lookup in units table       |
| INV_UNIT                 | default_inventory_unit_id     | Lookup in units table       |
| BASE_UNIT                | default_base_unit_id          | Lookup in units table       |
| INV_UNIT_PER_PURCH_UNIT  | inv_unit_per_purchase_unit    |                             |
| BASE_UNIT_PER_INV_UNIT   | base_unit_per_inv_unit        |                             |
| REMOVE_FROM_LISTING      | active                        | Invert value                |

### Unit Conversions

Maps from `UNIT_CNVSN_UNIT_CNVSN.csv`:

| CSV Column            | Database Field       | Notes                         |
|-----------------------|----------------------|-------------------------------|
| Convert From          | from_unit_id         | Lookup in units table         |
| Convert To            | to_unit_id           | Lookup in units table         |
| Factor                | conversion_factor    |                               |
| Conversion Key        | (special handling)   | For item-specific conversions |

### Yield Factors

Maps from `INGREDIENT_CONVERSION_INGREDIENT_CONVERSION.csv`:

| CSV Column            | Database Field       | Notes                         |
|-----------------------|----------------------|-------------------------------|
| DESCRIPTION           | (lookup item_id)     | Match to item name            |
| Yield Percentage      | yield_percentage     |                               |
| Conversion Type       | process_type         | 'trim', 'cook', etc.          |

### Price History

Maps from `ITEMS_LIST_ITEM_LIST_TABLE.csv`:

| CSV Column            | Database Field       | Notes                         |
|-----------------------|----------------------|-------------------------------|
| ITEM_NAME             | (lookup item_id)     | Match to item name            |
| EXTENDED_PRICE        | (calculate price)    | Divide by QUANTITY_PURCHASED  |
| QUANTITY_PURCHASED    | (for calculation)    |                               |
| LAST_INVOICE_DATE     | effective_date       |                               |
| LAST_INVOICE_DATE     | invoice_date         |                               |
| PURCH_UNIT            | (lookup unit_id)     | For purchase_unit_id          |

## Post-Migration Tasks

### 1. Validation and Testing

After migration, perform these validation tasks:

- Verify record counts match source data
- Test conversion calculations against original system
- Verify recipe costing against original calculations
- Test yield factor applications

### 2. Data Cleanup

Clean up any issues identified during validation:

- Fix inconsistent naming conventions
- Standardize units and measurements
- Add missing yield factors
- Correct erroneous conversion factors

### 3. Performance Optimization

Optimize database performance:

- Create necessary indexes
- Analyze query performance
- Optimize database configuration

### 4. Documentation

Document the migrated data:

- Create data dictionary
- Document data relationships
- Document known data issues or limitations
- Create user guidelines for data maintenance

## Troubleshooting

### Common Issues and Solutions

#### Missing Unit Conversions

**Issue**: Some unit conversions may be missing, causing calculation errors.

**Solution**: 
1. Identify missing conversions by querying the `unit_conversions` table
2. Cross-reference with the source data
3. Add missing conversions manually or through a supplementary script

#### Inconsistent Yield Factors

**Issue**: Yield factors may be inconsistent or missing for some items.

**Solution**:
1. Generate a report of items missing yield factors
2. Consult with culinary staff to determine appropriate yield factors
3. Add missing yield factors to the database

#### Data Type Mismatches

**Issue**: Data type conflicts between source and target systems.

**Solution**:
1. Identify fields with type conversion issues
2. Modify the import scripts to properly handle type conversions
3. Re-run the specific import steps

## Appendix: CSV File Structures

### UNITS_OF_MEASURE_UOM.csv

```
U,UT,VU
lb,weight,Pound
oz,weight,Ounce
cup,volume,Cup
qt,volume,Quart
...
```

### ITEM_GROUP_ITEM_GROUP.csv

```
TYPE,CLASS,GROUP,VLKUP CLASS,VLKUP TYPE
Raw Food,Produce,Vegetables,,
Raw Food,Produce,Fruits,,
Raw Food,Meat,Beef,,
...
```

### ITEM_SUB_GROUP_ISG.csv

```
IG,ISG
Vegetables,Root Vegetables
Vegetables,Leafy Greens
Beef,Steaks
...
```

### ITEMS_LIST_ITEM_LIST_TABLE.csv

```
ITEM_NAME_FORMULA,PRODUCT_NAME_FORMULA,PRODUCT_TYPE_FORMULA,ITEM_SUB_GROUP_FORMULA,ITEM_GROUP_FORMULA,ITEM_CLASS_FORMULA,ITEM_TYPE_FORMULA,...
Carrots whole,Carrots,Food,Root Vegetables,Vegetables,Produce,Raw Food,...
...
```

### Further Support

For additional support with data migration:
- Contact the development team at dev@foodcostingapp.com
- Check for updated migration scripts on the project repository
- Refer to the system documentation for detailed API references
