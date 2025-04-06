/**
 * Recipe Cost Calculator Service
 * 
 * This service handles calculations related to recipe costing,
 * implementing formulas from The Book of Yields.
 */
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { findConversionPath } = require('./conversionService');

/**
 * Calculate the cost of a recipe
 * 
 * @param {number} recipeId - The ID of the recipe to cost
 * @returns {Object} - The recipe with cost information
 */
const calculateRecipeCost = async (recipeId) => {
  const client = await db.getClient();
  
  try {
    // Get recipe details
    const recipeQuery = `
      SELECT r.*, 
             yu.code as yield_unit_code, yu.name as yield_unit_name,
             pu.code as portion_unit_code, pu.name as portion_unit_name
      FROM recipes r
      LEFT JOIN units_of_measure yu ON r.yield_unit_id = yu.id
      LEFT JOIN units_of_measure pu ON r.portion_unit_id = pu.id
      WHERE r.id = $1
    `;
    
    const recipeResult = await client.query(recipeQuery, [recipeId]);
    
    if (recipeResult.rows.length === 0) {
      throw new ApiError('Recipe not found', 404);
    }
    
    const recipe = recipeResult.rows[0];
    
    // Get recipe ingredients with latest prices
    const ingredientsQuery = `
      WITH latest_prices AS (
        SELECT DISTINCT ON (item_id) 
          item_id, 
          price, 
          purchase_unit_id
        FROM price_history
        ORDER BY item_id, effective_date DESC, created_at DESC
      )
      SELECT ri.*, 
             i.name as item_name, 
             i.default_purchase_unit_id,
             u.code as unit_code, u.name as unit_name,
             lp.price as latest_price,
             lp.purchase_unit_id as price_unit_id,
             pu.code as price_unit_code, pu.name as price_unit_name
      FROM recipe_ingredients ri
      JOIN items i ON ri.item_id = i.id
      JOIN units_of_measure u ON ri.unit_id = u.id
      LEFT JOIN latest_prices lp ON ri.item_id = lp.item_id
      LEFT JOIN units_of_measure pu ON lp.purchase_unit_id = pu.id
      WHERE ri.recipe_id = $1
      ORDER BY ri.sequence NULLS LAST, ri.id
    `;
    
    const ingredientsResult = await client.query(ingredientsQuery, [recipeId]);
    const ingredients = ingredientsResult.rows;
    
    // Calculate cost for each ingredient
    let totalCost = 0;
    const costCalculations = [];
    
    for (const ingredient of ingredients) {
      let ingredientCost = 0;
      let conversionFactor = 1;
      let conversionPath = null;
      
      // Skip cost calculation if price is missing
      if (!ingredient.latest_price) {
        costCalculations.push({
          ...ingredient,
          conversion_factor: null,
          calculated_cost: 0,
          calculation_notes: "Missing price information"
        });
        continue;
      }
      
      try {
        // Get conversion path from recipe unit to purchase unit
        conversionPath = await findConversionPath(
          ingredient.unit_id,
          ingredient.price_unit_id,
          ingredient.item_id
        );
        
        if (conversionPath) {
          // Calculate conversion factor from path
          for (const step of conversionPath) {
            conversionFactor *= step.conversion_factor;
          }
        } else {
          // No conversion path found, use a default approach
          console.warn(`No conversion path found for ingredient ${ingredient.item_id}`);
          // Try to use any available conversion info from the ingredient
          if (ingredient.default_purchase_unit_id === ingredient.price_unit_id) {
            // Units match, no conversion needed
            conversionFactor = 1;
          } else {
            // Units don't match, use a fallback
            throw new Error("No conversion path available");
          }
        }
        
        // Calculate ingredient cost: quantity × conversion_factor × price
        ingredientCost = ingredient.quantity * conversionFactor * ingredient.latest_price;
      } catch (error) {
        console.error(`Error calculating cost for ingredient ${ingredient.item_id}:`, error);
        
        // Add to calculations with error note
        costCalculations.push({
          ...ingredient,
          conversion_factor: null,
          calculated_cost: 0,
          calculation_notes: "Error in cost calculation"
        });
        
        continue; // Skip adding to total
      }
      
      totalCost += ingredientCost;
      
      costCalculations.push({
        ...ingredient,
        conversion_factor: conversionFactor,
        calculated_cost: ingredientCost,
        calculation_notes: "Cost calculated successfully"
      });
    }
    
    // Calculate cost per portion if portions are set
    let costPerPortion = null;
    if (recipe.portions && recipe.portions > 0) {
      costPerPortion = totalCost / recipe.portions;
    }
    
    return {
      recipe,
      ingredients: costCalculations,
      total_cost: totalCost,
      cost_per_portion: costPerPortion,
    };
  } finally {
    client.release();
  }
};

/**
 * Scale a recipe by a factor
 * 
 * @param {number} recipeId - The ID of the recipe to scale
 * @param {Object} options - Scaling options
 * @param {number} [options.scaleFactor] - Direct scaling factor
 * @param {number} [options.newYield] - New yield quantity
 * @param {number} [options.newPortions] - New number of portions
 * @returns {Object} - The scaled recipe information
 */
const scaleRecipe = async (recipeId, options) => {
  const { scaleFactor, newYield, newPortions } = options;
  
  // Validate that at least one scaling option is provided
  if (!scaleFactor && !newYield && !newPortions) {
    throw new ApiError('Must provide scaleFactor, newYield, or newPortions', 400);
  }
  
  // Get recipe details
  const recipeQuery = `
    SELECT r.*, 
           yu.code as yield_unit_code, 
           pu.code as portion_unit_code
    FROM recipes r
    LEFT JOIN units_of_measure yu ON r.yield_unit_id = yu.id
    LEFT JOIN units_of_measure pu ON r.portion_unit_id = pu.id
    WHERE r.id = $1
  `;
  
  const recipeResult = await db.query(recipeQuery, [recipeId]);
  
  if (recipeResult.rows.length === 0) {
    throw new ApiError('Recipe not found', 404);
  }
  
  const recipe = recipeResult.rows[0];
  
  // Calculate the scaling factor
  let calculatedScaleFactor = scaleFactor;
  
  if (newYield !== undefined) {
    calculatedScaleFactor = newYield / recipe.yield_quantity;
  } else if (newPortions !== undefined) {
    calculatedScaleFactor = newPortions / recipe.portions;
  }
  
  // Get recipe ingredients
  const ingredientsQuery = `
    SELECT ri.*, 
           i.name as item_name, 
           u.code as unit_code
    FROM recipe_ingredients ri
    JOIN items i ON ri.item_id = i.id
    JOIN units_of_measure u ON ri.unit_id = u.id
    WHERE ri.recipe_id = $1
    ORDER BY ri.sequence NULLS LAST, ri.id
  `;
  
  const ingredientsResult = await db.query(ingredientsQuery, [recipeId]);
  const ingredients = ingredientsResult.rows;
  
  // Scale ingredients
  const scaledIngredients = ingredients.map(ingredient => ({
    ...ingredient,
    original_quantity: ingredient.quantity,
    scaled_quantity: ingredient.quantity * calculatedScaleFactor,
  }));
  
  // Create a scaled recipe object
  const scaledRecipe = {
    ...recipe,
    original_yield_quantity: recipe.yield_quantity,
    scaled_yield_quantity: recipe.yield_quantity * calculatedScaleFactor,
    original_portions: recipe.portions,
    scaled_portions: recipe.portions * calculatedScaleFactor,
    scale_factor: calculatedScaleFactor,
  };
  
  return {
    recipe: scaledRecipe,
    ingredients: scaledIngredients,
  };
};

/**
 * Generate a purchase list for a recipe
 * 
 * This implements the Book of Yields formula: AS ÷ Y% = AP
 * for each ingredient in the recipe.
 * 
 * @param {number} recipeId - The ID of the recipe
 * @param {number} portions - Number of portions needed
 * @returns {Object} - Purchase list with quantities and costs
 */
const generatePurchaseList = async (recipeId, portions) => {
  // Validate parameters
  if (!recipeId || !portions) {
    throw new ApiError('Recipe ID and portions are required', 400);
  }
  
  // Get recipe details
  const recipeResult = await db.query(
    'SELECT * FROM recipes WHERE id = $1',
    [recipeId]
  );
  
  if (recipeResult.rows.length === 0) {
    throw new ApiError('Recipe not found', 404);
  }
  
  const recipe = recipeResult.rows[0];
  
  // Calculate scaling factor
  const scaleFactor = portions / recipe.portions;
  
  // Scale recipe
  const { ingredients: scaledIngredients } = await scaleRecipe(recipeId, { scaleFactor });
  
  // Generate purchase list
  const purchaseList = [];
  let totalPurchaseCost = 0;
  
  for (const ingredient of scaledIngredients) {
    // Get item details
    const itemResult = await db.query(
      'SELECT * FROM items WHERE id = $1',
      [ingredient.item_id]
    );
    
    if (itemResult.rows.length === 0) {
      continue; // Skip if item not found
    }
    
    const item = itemResult.rows[0];
    
    // Get latest price
    const priceResult = await db.query(`
      SELECT * FROM price_history
      WHERE item_id = $1
      ORDER BY effective_date DESC, created_at DESC
      LIMIT 1
    `, [ingredient.item_id]);
    
    const pricing = priceResult.rows.length > 0 ? priceResult.rows[0] : null;
    
    // Get applicable yield factors
    const yieldResult = await db.query(
      'SELECT * FROM yield_factors WHERE item_id = $1',
      [ingredient.item_id]
    );
    
    const yieldFactors = yieldResult.rows;
    
    // Find conversion path from recipe unit to purchase unit
    let conversionFactor = 1;
    let conversionPath = null;
    
    try {
      conversionPath = await findConversionPath(
        ingredient.unit_id,
        item.default_purchase_unit_id,
        ingredient.item_id
      );
      
      if (conversionPath) {
        for (const step of conversionPath) {
          conversionFactor *= step.conversion_factor;
        }
      }
    } catch (error) {
      console.error(`Error finding conversion path for ingredient ${ingredient.item_id}:`, error);
    }
    
    // Apply yield factors if applicable
    // Use the most relevant yield factor (e.g., "trim" for vegetables)
    let yieldFactor = 1;
    let yieldType = null;
    
    if (yieldFactors.length > 0) {
      // Prioritize trim yield for ingredients that need preparation
      const trimYield = yieldFactors.find(yf => yf.process_type === 'trim');
      
      if (trimYield) {
        // Apply the Book of Yields formula: AS ÷ Y% = AP
        yieldFactor = 100 / trimYield.yield_percentage;
        yieldType = 'trim';
      }
    }
    
    // Calculate purchase quantity: scaled_quantity × conversionFactor × yieldFactor
    const purchaseQuantity = ingredient.scaled_quantity * conversionFactor * yieldFactor;
    
    // Calculate purchase cost if pricing is available
    const purchaseCost = pricing ? purchaseQuantity * pricing.price : null;
    
    if (purchaseCost) {
      totalPurchaseCost += purchaseCost;
    }
    
    // Get unit information
    const unitResult = await db.query(
      'SELECT * FROM units_of_measure WHERE id = $1',
      [item.default_purchase_unit_id]
    );
    
    const purchaseUnit = unitResult.rows.length > 0 ? unitResult.rows[0] : null;
    
    purchaseList.push({
      item_id: ingredient.item_id,
      item_name: ingredient.item_name,
      recipe_quantity: ingredient.scaled_quantity,
      recipe_unit: ingredient.unit_code,
      purchase_quantity: purchaseQuantity,
      purchase_unit: purchaseUnit ? purchaseUnit.code : null,
      purchase_cost: purchaseCost,
      unit_price: pricing ? pricing.price : null,
      conversion_factor: conversionFactor,
      yield_factor: yieldFactor !== 1 ? yieldFactor : null,
      yield_type: yieldType
    });
  }
  
  return {
    recipe_id: recipeId,
    recipe_name: recipe.name,
    portions,
    scale_factor: scaleFactor,
    purchase_list: purchaseList,
    total_purchase_cost: totalPurchaseCost
  };
};

module.exports = {
  calculateRecipeCost,
  scaleRecipe,
  generatePurchaseList
};