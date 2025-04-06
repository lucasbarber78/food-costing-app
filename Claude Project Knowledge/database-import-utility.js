/**
 * CSV Data Import Utility
 * 
 * This utility handles importing CSV data into the database,
 * specifically designed to work with the format from the original Excel files.
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const db = require('../config/db');

/**
 * Import items from CSV file
 * 
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Object>} - Import results
 */
async function importItems(filePath) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Read and parse CSV file
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const records = await parseCSV(fileContent);
    
    console.log(`Parsed ${records.length} records from ${filePath}`);
    
    // Process categories (Types, Classes, Groups, Subgroups)
    const categoriesResult = await processCategories(client, records);
    
    // Process items
    const itemsResult = await processItems(client, records, categoriesResult.categoryMap);
    
    await client.query('COMMIT');
    
    return {
      totalRecords: records.length,
      categoriesCreated: categoriesResult.created,
      itemsCreated: itemsResult.created,
      itemsUpdated: itemsResult.updated,
      errors: itemsResult.errors
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing items:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Parse CSV data
 * 
 * @param {string} csvData - CSV data as string
 * @returns {Promise<Array>} - Parsed records
 */
function parseCSV(csvData) {
  return new Promise((resolve, reject) => {
    parse(csvData, {
      columns: true,
      trim: true,
      skip_empty_lines: true
    }, (err, records) => {
      if (err) return reject(err);
      resolve(records);
    });
  });
}

/**
 * Process categories from CSV records
 * 
 * @param {Object} client - Database client
 * @param {Array} records - CSV records
 * @returns {Promise<Object>} - Processing results
 */
async function processCategories(client, records) {
  const types = new Set();
  const classes = new Map();
  const groups = new Map();
  const subgroups = new Map();
  
  // Extract unique categories
  records.forEach(record => {
    const type = record.ITEM_TYPE_FORMULA || record.ITEM_TYPE;
    const className = record.ITEM_CLASS_FORMULA || record.ITEM_CLASS;
    const groupName = record.ITEM_GROUP_FORMULA || record.ITEM_GROUP;
    const subgroupName = record.ITEM_SUB_GROUP_FORMULA || record.ITEM_SUB_GROUP;
    
    if (type) {
      types.add(type);
      
      if (className) {
        const classKey = `${type}|${className}`;
        classes.set(classKey, { type, name: className });
        
        if (groupName) {
          const groupKey = `${classKey}|${groupName}`;
          groups.set(groupKey, { class: classKey, name: groupName });
          
          if (subgroupName) {
            const subgroupKey = `${groupKey}|${subgroupName}`;
            subgroups.set(subgroupKey, { group: groupKey, name: subgroupName });
          }
        }
      }
    }
  });
  
  console.log(`Found ${types.size} types, ${classes.size} classes, ${groups.size} groups, ${subgroups.size} subgroups`);
  
  // Insert categories into database
  const categoryMap = {};
  let created = 0;
  
  // Insert types
  for (const typeName of types) {
    const typeResult = await client.query(
      'INSERT INTO item_types (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [typeName]
    );
    
    const typeId = typeResult.rows[0].id;
    categoryMap[typeName] = { id: typeId };
    created++;
  }
  
  // Insert classes
  for (const [classKey, classData] of classes.entries()) {
    const typeId = categoryMap[classData.type].id;
    
    const classResult = await client.query(
      `INSERT INTO item_classes (type_id, name) 
       VALUES ($1, $2) 
       ON CONFLICT (type_id, name) DO UPDATE SET name = EXCLUDED.name 
       RETURNING id`,
      [typeId, classData.name]
    );
    
    const classId = classResult.rows[0].id;
    categoryMap[classKey] = { id: classId, typeId };
    created++;
  }
  
  // Insert groups
  for (const [groupKey, groupData] of groups.entries()) {
    const classId = categoryMap[groupData.class].id;
    
    const groupResult = await client.query(
      `INSERT INTO item_groups (class_id, name) 
       VALUES ($1, $2) 
       ON CONFLICT (class_id, name) DO UPDATE SET name = EXCLUDED.name 
       RETURNING id`,
      [classId, groupData.name]
    );
    
    const groupId = groupResult.rows[0].id;
    categoryMap[groupKey] = { id: groupId, classId };
    created++;
  }
  
  // Insert subgroups
  for (const [subgroupKey, subgroupData] of subgroups.entries()) {
    const groupId = categoryMap[subgroupData.group].id;
    
    const subgroupResult = await client.query(
      `INSERT INTO item_subgroups (group_id, name) 
       VALUES ($1, $2) 
       ON CONFLICT (group_id, name) DO UPDATE SET name = EXCLUDED.name 
       RETURNING id`,
      [groupId, subgroupData.name]
    );
    
    const subgroupId = subgroupResult.rows[0].id;
    categoryMap[subgroupKey] = { id: subgroupId, groupId };
    created++;
  }
  
  return { created, categoryMap };
}

/**
 * Process items from CSV records
 * 
 * @param {Object} client - Database client
 * @param {Array} records - CSV records
 * @param {Object} categoryMap - Map of category IDs
 * @returns {Promise<Object>} - Processing results
 */
async function processItems(client, records, categoryMap) {
  let created = 0;
  let updated = 0;
  const errors = [];
  
  // First get all units
  const unitsResult = await client.query('SELECT id, code FROM units_of_measure');
  const unitMap = {};
  
  unitsResult.rows.forEach(unit => {
    unitMap[unit.code] = unit.id;
  });
  
  // Process each record
  for (const record of records) {
    try {
      const itemName = record.ITEM_NAME_FORMULA || record.ITEM_NAME;
      
      if (!itemName) {
        console.warn('Skipping record with no item name');
        continue;
      }
      
      // Get category IDs
      const type = record.ITEM_TYPE_FORMULA || record.ITEM_TYPE;
      const className = record.ITEM_CLASS_FORMULA || record.ITEM_CLASS;
      const groupName = record.ITEM_GROUP_FORMULA || record.ITEM_GROUP;
      const subgroupName = record.ITEM_SUB_GROUP_FORMULA || record.ITEM_SUB_GROUP;
      
      let subgroupId = null;
      
      if (type && className && groupName && subgroupName) {
        const subgroupKey = `${type}|${className}|${groupName}|${subgroupName}`;
        subgroupId = categoryMap[subgroupKey]?.id;
      }
      
      // Get unit IDs
      const purchaseUnit = record.PURCH_UNIT || record.PU;
      const inventoryUnit = record.INV_UNIT || record.IU;
      const baseUnit = record.BASE_UNIT || record.BU;
      
      const purchaseUnitId = unitMap[purchaseUnit];
      const inventoryUnitId = unitMap[inventoryUnit];
      const baseUnitId = unitMap[baseUnit];
      
      // Unit conversion factors
      const invUnitPerPurchUnit = parseFloat(record.INV_UNIT_PER_PURCH_UNIT) || 1;
      const baseUnitPerInvUnit = parseFloat(record.BASE_UNIT_PER_INV_UNIT) || 1;
      
      // Check if item exists
      const existingItemQuery = await client.query(
        'SELECT id FROM items WHERE name = $1',
        [itemName]
      );
      
      const active = record.REMOVE_FROM_LISTING ? !(parseInt(record.REMOVE_FROM_LISTING) === 1) : true;
      
      if (existingItemQuery.rows.length > 0) {
        // Update existing item
        const itemId = existingItemQuery.rows[0].id;
        
        await client.query(
          `UPDATE items SET
            subgroup_id = $1,
            default_purchase_unit_id = $2,
            default_inventory_unit_id = $3,
            default_base_unit_id = $4,
            inv_unit_per_purchase_unit = $5,
            base_unit_per_inv_unit = $6,
            active = $7,
            updated_at = NOW()
          WHERE id = $8`,
          [
            subgroupId,
            purchaseUnitId,
            inventoryUnitId,
            baseUnitId,
            invUnitPerPurchUnit,
            baseUnitPerInvUnit,
            active,
            itemId
          ]
        );
        
        updated++;
        
        // Process price information
        await processItemPrice(client, itemId, record, purchaseUnitId);
      } else {
        // Create new item
        const newItemResult = await client.query(
          `INSERT INTO items (
            name,
            description,
            subgroup_id,
            default_purchase_unit_id,
            default_inventory_unit_id,
            default_base_unit_id,
            inv_unit_per_purchase_unit,
            base_unit_per_inv_unit,
            active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id`,
          [
            itemName,
            record.PRODUCT_NAME || '',
            subgroupId,
            purchaseUnitId,
            inventoryUnitId,
            baseUnitId,
            invUnitPerPurchUnit,
            baseUnitPerInvUnit,
            active
          ]
        );
        
        const newItemId = newItemResult.rows[0].id;
        created++;
        
        // Process price information
        await processItemPrice(client, newItemId, record, purchaseUnitId);
      }
    } catch (error) {
      console.error(`Error processing item ${record.ITEM_NAME}:`, error);
      errors.push({
        item: record.ITEM_NAME,
        error: error.message
      });
    }
  }
  
  return { created, updated, errors };
}

/**
 * Process price information for an item
 * 
 * @param {Object} client - Database client
 * @param {number} itemId - Item ID
 * @param {Object} record - CSV record
 * @param {number} purchaseUnitId - Purchase unit ID
 */
async function processItemPrice(client, itemId, record, purchaseUnitId) {
  // Only process if we have pricing information
  if (!record.EXTENDED_PRICE || !record.QUANTITY_PURCHASED) {
    return;
  }
  
  const extendedPrice = parseFloat(record.EXTENDED_PRICE);
  const quantity = parseFloat(record.QUANTITY_PURCHASED);
  
  if (isNaN(extendedPrice) || isNaN(quantity) || quantity === 0) {
    return;
  }
  
  // Calculate unit price
  const unitPrice = extendedPrice / quantity;
  
  // Get invoice date, default to today if not available
  const invoiceDate = record.LAST_INVOICE_DATE || new Date().toISOString().split('T')[0];
  
  // Insert price history
  await client.query(
    `INSERT INTO price_history (
      item_id,
      vendor_id,
      purchase_unit_id,
      price,
      pack_size,
      effective_date,
      invoice_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      itemId,
      null, // Vendor ID (not specified in import)
      purchaseUnitId,
      unitPrice,
      record.PACK_SIZE || null,
      invoiceDate,
      invoiceDate
    ]
  );
}

/**
 * Import unit conversions from CSV file
 * 
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Object>} - Import results
 */
async function importUnitConversions(filePath) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Read and parse CSV file
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const records = await parseCSV(fileContent);
    
    console.log(`Parsed ${records.length} conversion records from ${filePath}`);
    
    // Get all units
    const unitsResult = await client.query('SELECT id, code FROM units_of_measure');
    const unitMap = {};
    
    unitsResult.rows.forEach(unit => {
      unitMap[unit.code] = unit.id;
    });
    
    // Process conversions
    let created = 0;
    let updated = 0;
    const errors = [];
    
    for (const record of records) {
      try {
        const fromUnit = record.CONVERT_FROM || record['Convert From'];
        const toUnit = record.CONVERT_TO || record['Convert To'];
        const factor = parseFloat(record.FACTOR || record['Factor']);
        
        if (!fromUnit || !toUnit || isNaN(factor)) {
          console.warn('Skipping invalid conversion record');
          continue;
        }
        
        const fromUnitId = unitMap[fromUnit];
        const toUnitId = unitMap[toUnit];
        
        if (!fromUnitId || !toUnitId) {
          console.warn(`Skipping conversion with unknown units: ${fromUnit} to ${toUnit}`);
          continue;
        }
        
        // Check if conversion exists
        const existingQuery = await client.query(
          'SELECT id FROM unit_conversions WHERE from_unit_id = $1 AND to_unit_id = $2 AND item_specific = false',
          [fromUnitId, toUnitId]
        );
        
        if (existingQuery.rows.length > 0) {
          // Update existing conversion
          const conversionId = existingQuery.rows[0].id;
          
          await client.query(
            'UPDATE unit_conversions SET conversion_factor = $1, updated_at = NOW() WHERE id = $2',
            [factor, conversionId]
          );
          
          updated++;
        } else {
          // Create new conversion
          await client.query(
            `INSERT INTO unit_conversions (
              from_unit_id,
              to_unit_id,
              conversion_factor,
              item_specific,
              item_id
            ) VALUES ($1, $2, $3, $4, $5)`,
            [fromUnitId, toUnitId, factor, false, null]
          );
          
          created++;
          
          // Create reverse conversion automatically
          await client.query(
            `INSERT INTO unit_conversions (
              from_unit_id,
              to_unit_id,
              conversion_factor,
              item_specific,
              item_id
            ) VALUES ($1, $2, $3, $4, $5)`,
            [toUnitId, fromUnitId, 1/factor, false, null]
          );
          
          created++;
        }
      } catch (error) {
        console.error(`Error processing conversion:`, error);
        errors.push({
          conversion: `${record.CONVERT_FROM} to ${record.CONVERT_TO}`,
          error: error.message
        });
      }
    }
    
    await client.query('COMMIT');
    
    return {
      totalRecords: records.length,
      created,
      updated,
      errors
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing conversions:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Import yield factors from CSV file
 * 
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Object>} - Import results
 */
async function importYieldFactors(filePath) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Read and parse CSV file
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const records = await parseCSV(fileContent);
    
    console.log(`Parsed ${records.length} yield factor records from ${filePath}`);
    
    // Process yield factors
    let created = 0;
    let updated = 0;
    const errors = [];
    
    for (const record of records) {
      try {
        const itemName = record.DESCRIPTION || record['ITEM'];
        const yieldPercentage = parseFloat(record.YIELD_PERCENTAGE || record['Yield Percentage']);
        const processType = record.PROCESS_TYPE || record['Process Type'] || 'trim';
        
        if (!itemName || isNaN(yieldPercentage)) {
          console.warn('Skipping invalid yield factor record');
          continue;
        }
        
        // Find the item
        const itemQuery = await client.query(
          'SELECT id FROM items WHERE name = $1',
          [itemName]
        );
        
        if (itemQuery.rows.length === 0) {
          console.warn(`Item not found: ${itemName}`);
          continue;
        }
        
        const itemId = itemQuery.rows[0].id;
        
        // Check if yield factor exists
        const existingQuery = await client.query(
          'SELECT id FROM yield_factors WHERE item_id = $1 AND process_type = $2',
          [itemId, processType]
        );
        
        if (existingQuery.rows.length > 0) {
          // Update existing yield factor
          const yieldId = existingQuery.rows[0].id;
          
          await client.query(
            'UPDATE yield_factors SET yield_percentage = $1, updated_at = NOW() WHERE id = $2',
            [yieldPercentage, yieldId]
          );
          
          updated++;
        } else {
          // Create new yield factor
          await client.query(
            `INSERT INTO yield_factors (
              item_id,
              process_type,
              yield_percentage,
              description
            ) VALUES ($1, $2, $3, $4)`,
            [itemId, processType, yieldPercentage, record.DESCRIPTION || '']
          );
          
          created++;
        }
      } catch (error) {
        console.error(`Error processing yield factor:`, error);
        errors.push({
          item: record.DESCRIPTION || record['ITEM'],
          error: error.message
        });
      }
    }
    
    await client.query('COMMIT');
    
    return {
      totalRecords: records.length,
      created,
      updated,
      errors
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing yield factors:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  importItems,
  importUnitConversions,
  importYieldFactors
};