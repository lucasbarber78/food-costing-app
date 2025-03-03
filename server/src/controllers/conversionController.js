const db = require('../config/db');
const ApiError = require('../utils/ApiError');

// Get all conversion types
const getAllConversionTypes = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM unit_categories ORDER BY name');
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// Get all unit conversions
const getAllConversions = async (req, res, next) => {
  try {
    const { itemSpecific } = req.query;
    
    let query = `
      SELECT 
        uc.*,
        from_unit.code as from_unit_code,
        from_unit.name as from_unit_name,
        to_unit.code as to_unit_code,
        to_unit.name as to_unit_name,
        i.name as item_name
      FROM unit_conversions uc
      JOIN units_of_measure from_unit ON uc.from_unit_id = from_unit.id
      JOIN units_of_measure to_unit ON uc.to_unit_id = to_unit.id
      LEFT JOIN items i ON uc.item_id = i.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (itemSpecific !== undefined) {
      queryParams.push(itemSpecific === 'true');
      query += ` AND uc.item_specific = $${queryParams.length}`;
    }
    
    query += ' ORDER BY from_unit.code, to_unit.code';
    
    const { rows } = await db.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// Get conversion by ID
const getConversionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        uc.*,
        from_unit.code as from_unit_code,
        from_unit.name as from_unit_name,
        to_unit.code as to_unit_code,
        to_unit.name as to_unit_name,
        i.name as item_name
      FROM unit_conversions uc
      JOIN units_of_measure from_unit ON uc.from_unit_id = from_unit.id
      JOIN units_of_measure to_unit ON uc.to_unit_id = to_unit.id
      LEFT JOIN items i ON uc.item_id = i.id
      WHERE uc.id = $1
    `;
    
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      throw new ApiError('Conversion not found', 404);
    }
    
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

// Create a new conversion
const createConversion = async (req, res, next) => {
  try {
    const {
      from_unit_id,
      to_unit_id,
      conversion_factor,
      item_specific,
      item_id,
    } = req.body;
    
    // Check for duplicate conversions
    const duplicateCheck = await db.query(
      `SELECT * FROM unit_conversions 
       WHERE from_unit_id = $1 AND to_unit_id = $2 
       AND item_specific = $3 AND (item_id = $4 OR (item_id IS NULL AND $4 IS NULL))`,
      [from_unit_id, to_unit_id, item_specific, item_id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      throw new ApiError('Conversion already exists', 400);
    }
    
    // Create the conversion
    const query = `
      INSERT INTO unit_conversions (
        from_unit_id,
        to_unit_id,
        conversion_factor,
        item_specific,
        item_id
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      from_unit_id,
      to_unit_id,
      conversion_factor,
      item_specific,
      item_specific ? item_id : null,
    ];
    
    const result = await db.query(query, values);
    const conversion = result.rows[0];
    
    // Create the reverse conversion automatically
    const reverseQuery = `
      INSERT INTO unit_conversions (
        from_unit_id,
        to_unit_id,
        conversion_factor,
        item_specific,
        item_id
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const reverseValues = [
      to_unit_id,
      from_unit_id,
      1 / conversion_factor,
      item_specific,
      item_specific ? item_id : null,
    ];
    
    await db.query(reverseQuery, reverseValues);
    
    res.status(201).json(conversion);
  } catch (error) {
    next(error);
  }
};

// Convert from one unit to another
const convertUnits = async (req, res, next) => {
  try {
    const { fromUnitId, toUnitId, value, itemId } = req.body;
    
    if (!fromUnitId || !toUnitId || value === undefined) {
      throw new ApiError('Missing required parameters', 400);
    }
    
    let conversionPath = [];
    let conversionFactor = 1;
    
    // Try to find a direct conversion first, preferring item-specific conversions
    const directConversionQuery = `
      SELECT * FROM unit_conversions
      WHERE from_unit_id = $1 AND to_unit_id = $2
      AND (item_specific = false OR (item_specific = true AND item_id = $3))
      ORDER BY item_specific DESC
      LIMIT 1
    `;
    
    const directResult = await db.query(directConversionQuery, [fromUnitId, toUnitId, itemId]);
    
    if (directResult.rows.length > 0) {
      conversionFactor = directResult.rows[0].conversion_factor;
      conversionPath.push(directResult.rows[0]);
    } else {
      // If no direct conversion, try to find a path through a common base unit
      const fromBaseQuery = `
        SELECT * FROM unit_conversions
        WHERE from_unit_id = $1 AND to_unit_id IN (SELECT id FROM units_of_measure WHERE base_unit = true)
        AND (item_specific = false OR (item_specific = true AND item_id = $2))
        ORDER BY item_specific DESC
        LIMIT 1
      `;
      
      const toBaseQuery = `
        SELECT * FROM unit_conversions
        WHERE to_unit_id = $1 AND from_unit_id IN (SELECT id FROM units_of_measure WHERE base_unit = true)
        AND (item_specific = false OR (item_specific = true AND item_id = $2))
        ORDER BY item_specific DESC
        LIMIT 1
      `;
      
      const fromBaseResult = await db.query(fromBaseQuery, [fromUnitId, itemId]);
      const toBaseResult = await db.query(toBaseQuery, [toUnitId, itemId]);
      
      if (fromBaseResult.rows.length > 0 && toBaseResult.rows.length > 0) {
        const fromBaseConversion = fromBaseResult.rows[0];
        const toBaseConversion = toBaseResult.rows[0];
        
        conversionFactor = fromBaseConversion.conversion_factor / toBaseConversion.conversion_factor;
        conversionPath = [fromBaseConversion, toBaseConversion];
      } else {
        throw new ApiError('No conversion path found between these units', 400);
      }
    }
    
    const convertedValue = value * conversionFactor;
    
    res.json({
      originalValue: value,
      convertedValue,
      conversionFactor,
      conversionPath,
    });
  } catch (error) {
    next(error);
  }
};

// Perform a complex conversion with trimming/cooking
const complexConversion = async (req, res, next) => {
  try {
    const {
      itemId,
      fromUnitId,
      toUnitId,
      value,
      includeYield,
      yieldType,
    } = req.body;
    
    if (!itemId || !fromUnitId || !toUnitId || value === undefined) {
      throw new ApiError('Missing required parameters', 400);
    }
    
    // Step 1: Get the basic unit conversion
    const unitConversionQuery = `
      SELECT * FROM unit_conversions
      WHERE from_unit_id = $1 AND to_unit_id = $2
      AND (item_specific = false OR (item_specific = true AND item_id = $3))
      ORDER BY item_specific DESC
      LIMIT 1
    `;
    
    const unitConversionResult = await db.query(unitConversionQuery, [fromUnitId, toUnitId, itemId]);
    
    let conversionFactor = 1;
    if (unitConversionResult.rows.length > 0) {
      conversionFactor = unitConversionResult.rows[0].conversion_factor;
    } else {
      throw new ApiError('No conversion path found between these units', 400);
    }
    
    // Step 2: Apply yield factor if requested
    let yieldFactor = 1;
    let yieldFactorApplied = false;
    
    if (includeYield && yieldType) {
      const yieldQuery = `
        SELECT * FROM yield_factors
        WHERE item_id = $1 AND process_type = $2
        LIMIT 1
      `;
      
      const yieldResult = await db.query(yieldQuery, [itemId, yieldType]);
      
      if (yieldResult.rows.length > 0) {
        yieldFactor = yieldResult.rows[0].yield_percentage / 100;
        yieldFactorApplied = true;
      }
    }
    
    // Calculate the final converted value
    const convertedValue = value * conversionFactor * yieldFactor;
    
    res.json({
      originalValue: value,
      convertedValue,
      conversionFactor,
      yieldFactor,
      yieldFactorApplied,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllConversionTypes,
  getAllConversions,
  getConversionById,
  createConversion,
  convertUnits,
  complexConversion,
};