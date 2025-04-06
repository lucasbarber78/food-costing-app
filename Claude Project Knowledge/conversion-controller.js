/**
 * Backend Conversion Controller
 * 
 * Handles all unit conversion operations including:
 * - Simple unit to unit conversions
 * - Complex conversions with yield factors
 * - Finding conversion paths between units
 */
const db = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * Convert between units with an optional yield factor
 * 
 * This is the core function that implements the Book of Yields formulas:
 * - AS ÷ Y% = AP (when Y% < 100%)
 * - AS × Y% = AP (when Y% > 100%)
 * 
 * @route POST /api/conversions/convert/complex
 */
const complexConversion = async (req, res, next) => {
  try {
    const {
      itemId,        // The item being converted
      fromUnitId,    // Source unit ID
      toUnitId,      // Target unit ID
      value,         // Amount to convert
      includeYield,  // Whether to apply yield factor
      yieldType      // Type of yield (trim, cook, etc.)
    } = req.body;
    
    if (!itemId || !fromUnitId || !toUnitId || value === undefined) {
      throw new ApiError('Missing required parameters', 400);
    }
    
    // Step 1: Find conversion path between units
    const conversionPath = await findConversionPath(fromUnitId, toUnitId, itemId);
    
    if (!conversionPath) {
      throw new ApiError('No conversion path found between these units', 400);
    }
    
    // Step 2: Calculate conversion factor from path
    let conversionFactor = 1;
    for (const step of conversionPath) {
      conversionFactor *= step.conversion_factor;
    }
    
    // Step 3: Apply yield factor if requested
    let yieldFactor = 1;
    let yieldFactorApplied = false;
    
    if (includeYield && yieldType) {
      const yieldResult = await db.query(
        'SELECT * FROM yield_factors WHERE item_id = $1 AND process_type = $2 LIMIT 1',
        [itemId, yieldType]
      );
      
      if (yieldResult.rows.length > 0) {
        // Convert percentage to decimal (e.g., 80% -> 0.8)
        yieldFactor = yieldResult.rows[0].yield_percentage / 100;
        yieldFactorApplied = true;
      }
    }
    
    // Step 4: Calculate the final converted value
    // If we're converting from raw to processed (trim/cook), we apply the yield factor
    // Formula: AS ÷ Y% = AP (if Y% < 1) or AS × Y% = AP (if Y% > 1)
    const convertedValue = value * conversionFactor * yieldFactor;
    
    // Return the result
    res.json({
      originalValue: value,
      convertedValue,
      conversionFactor,
      yieldFactor,
      yieldFactorApplied,
      conversionPath
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find a conversion path between two units
 * 
 * Uses a recursive approach to find a path between units,
 * considering both general and item-specific conversions.
 * 
 * @param {number} fromUnitId - Source unit ID
 * @param {number} toUnitId - Target unit ID
 * @param {number} itemId - Item ID for item-specific conversions
 * @returns {Array} - Array of conversion steps, or null if no path found
 */
async function findConversionPath(fromUnitId, toUnitId, itemId) {
  // Try to find a direct conversion first, preferring item-specific conversions
  const directQuery = `
    SELECT * FROM unit_conversions
    WHERE from_unit_id = $1 AND to_unit_id = $2
    AND (item_specific = false OR (item_specific = true AND item_id = $3))
    ORDER BY item_specific DESC
    LIMIT 1
  `;
  
  const directResult = await db.query(directQuery, [fromUnitId, toUnitId, itemId]);
  
  if (directResult.rows.length > 0) {
    return [directResult.rows[0]];
  }
  
  // If no direct conversion, use a recursive query to find a path
  // This uses PostgreSQL's WITH RECURSIVE feature
  const pathQuery = `
    WITH RECURSIVE conversion_path(from_id, to_id, factor, path, cycle) AS (
      SELECT 
        from_unit_id, 
        to_unit_id, 
        conversion_factor,
        ARRAY[from_unit_id, to_unit_id],
        false
      FROM unit_conversions
      WHERE from_unit_id = $1 
      AND (item_specific = false OR (item_specific = true AND item_id = $3))
      
      UNION ALL
      
      SELECT
        cp.from_id,
        uc.to_unit_id,
        cp.factor * uc.conversion_factor,
        cp.path || uc.to_unit_id,
        uc.to_unit_id = ANY(cp.path)
      FROM conversion_path cp
      JOIN unit_conversions uc ON cp.to_id = uc.from_unit_id
      WHERE NOT cp.cycle 
      AND (uc.item_specific = false OR (uc.item_specific = true AND uc.item_id = $3))
    )
    SELECT * FROM conversion_path 
    WHERE to_id = $2
    ORDER BY cardinality(path)
    LIMIT 1
  `;
  
  const pathResult = await db.query(pathQuery, [fromUnitId, toUnitId, itemId]);
  
  if (pathResult.rows.length > 0) {
    // For complete conversions, we need to fetch the full details of each step
    const path = pathResult.rows[0].path;
    const conversionSteps = [];
    
    // Fetch details for each step in the path
    for (let i = 0; i < path.length - 1; i++) {
      const stepQuery = `
        SELECT * FROM unit_conversions
        WHERE from_unit_id = $1 AND to_unit_id = $2
        AND (item_specific = false OR (item_specific = true AND item_id = $3))
        ORDER BY item_specific DESC
        LIMIT 1
      `;
      
      const stepResult = await db.query(stepQuery, [path[i], path[i+1], itemId]);
      
      if (stepResult.rows.length > 0) {
        conversionSteps.push(stepResult.rows[0]);
      }
    }
    
    return conversionSteps;
  }
  
  // If we reach here, there's no path between the units
  return null;
}

/**
 * Calculate purchase quantity based on recipe requirements
 * 
 * Implements the Book of Yields formula: AS ÷ Y% = AP
 * 
 * @route POST /api/conversions/calculate-purchase
 */
const calculatePurchaseQuantity = async (req, res, next) => {
  try {
    const {
      itemId,           // The item to purchase
      recipeQuantity,   // Amount needed for recipe (AS - amount served)
      recipeUnitId,     // Unit for recipe quantity
      yieldType         // Type of yield to apply (trim, cook, etc.)
    } = req.body;
    
    if (!itemId || !recipeQuantity || !recipeUnitId) {
      throw new ApiError('Missing required parameters', 400);
    }
    
    // Get item details
    const itemResult = await db.query(
      'SELECT * FROM items WHERE id = $1',
      [itemId]
    );
    
    if (itemResult.rows.length === 0) {
      throw new ApiError('Item not found', 404);
    }
    
    const item = itemResult.rows[0];
    const purchaseUnitId = item.default_purchase_unit_id;
    
    // Convert from recipe unit to purchase unit
    const conversionPath = await findConversionPath(recipeUnitId, purchaseUnitId, itemId);
    
    if (!conversionPath) {
      throw new ApiError('No conversion path found between these units', 400);
    }
    
    let conversionFactor = 1;
    for (const step of conversionPath) {
      conversionFactor *= step.conversion_factor;
    }
    
    // Get yield factor if applicable
    let yieldFactor = 1;
    
    if (yieldType) {
      const yieldResult = await db.query(
        'SELECT * FROM yield_factors WHERE item_id = $1 AND process_type = $2 LIMIT 1',
        [itemId, yieldType]
      );
      
      if (yieldResult.rows.length > 0) {
        // Apply the Book of Yields formula: AS ÷ Y% = AP
        yieldFactor = 100 / yieldResult.rows[0].yield_percentage;
      }
    }
    
    // Calculate purchase quantity
    // AS (recipe quantity) × conversionFactor × yieldFactor = AP (purchase quantity)
    const purchaseQuantity = recipeQuantity * conversionFactor * yieldFactor;
    
    // Get pricing information
    const priceResult = await db.query(`
      SELECT * FROM price_history
      WHERE item_id = $1
      ORDER BY effective_date DESC, created_at DESC
      LIMIT 1
    `, [itemId]);
    
    const pricing = priceResult.rows.length > 0 ? priceResult.rows[0] : null;
    
    // Return the result
    res.json({
      recipeQuantity,
      purchaseQuantity,
      conversionFactor,
      yieldFactor: yieldFactor !== 1 ? yieldFactor : null,
      estimatedCost: pricing ? pricing.price * purchaseQuantity : null,
      unitPricing: pricing ? {
        price: pricing.price,
        unit: purchaseUnitId,
        effectiveDate: pricing.effective_date
      } : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all available units of measure
 * 
 * @route GET /api/conversions/units
 */
const getAllUnits = async (req, res, next) => {
  try {
    const { type } = req.query;
    
    let query = 'SELECT * FROM units_of_measure';
    const params = [];
    
    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }
    
    query += ' ORDER BY type, name';
    
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all conversions for a specific item
 * 
 * @route GET /api/conversions/item/:id
 */
const getItemConversions = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT uc.*, 
             fu.code as from_unit_code, fu.name as from_unit_name,
             tu.code as to_unit_code, tu.name as to_unit_name
      FROM unit_conversions uc
      JOIN units_of_measure fu ON uc.from_unit_id = fu.id
      JOIN units_of_measure tu ON uc.to_unit_id = tu.id
      WHERE (uc.item_specific = false OR uc.item_id = $1)
      ORDER BY uc.item_specific DESC, fu.code, tu.code
    `;
    
    const { rows } = await db.query(query, [id]);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  complexConversion,
  calculatePurchaseQuantity,
  getAllUnits,
  getItemConversions
};