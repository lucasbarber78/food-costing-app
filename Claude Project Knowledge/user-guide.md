# Food Costing Application User Guide

## Introduction

Welcome to the Food Costing Application! This comprehensive system helps culinary professionals accurately convert measurements, calculate costs, manage recipes, and track inventory. Based on the principles from "The Book of Yields," this application streamlines the process of food costing and purchase planning.

## Getting Started

### Logging In

1. Navigate to the application URL in your web browser
2. Enter your username and password
3. Click the "Login" button
4. If you've forgotten your password, contact your system administrator

### Dashboard Overview

The dashboard provides an overview of your key metrics:
- Total number of recipes
- Total number of ingredients
- Current inventory value
- Monthly purchase totals
- Recent recipes
- Top cost items

## Conversion Calculator

The Conversion Calculator is a powerful tool for translating between different units of measurement while accounting for yields.

### Basic Conversions

1. Navigate to "Conversion Calculator" in the sidebar
2. Select an ingredient from the dropdown
3. Enter the quantity and select the source unit
4. Select the target unit
5. Click "Convert" to see the result

### Including Yield Factors

To account for trimming or cooking yields:

1. Check the "Include yield factor" box
2. Select the appropriate yield type (trim, cook, etc.)
3. Click "Convert" to see the result with the yield factor applied

### Understanding Results

The results panel provides:
- The converted value
- The conversion formula used
- The yield percentage applied (if any)
- Cost information based on current pricing

## Recipe Management

### Viewing Recipes

1. Navigate to "Recipes" in the sidebar
2. Use the search and filter options to find specific recipes
3. Click on a recipe name to view its details

### Recipe Details

The recipe details page shows:
- Recipe information (yield, portions, etc.)
- Ingredient list with quantities and costs
- Instructions
- Cost analysis breakdown
- Scaling options

### Creating a New Recipe

1. Click the "New Recipe" button
2. Fill in the basic recipe information:
   - Name
   - Category
   - Yield quantity and unit
   - Portion size and unit
   - Number of portions
3. Add ingredients:
   - Select an ingredient from the dropdown
   - Enter the quantity and unit
   - Add preparation notes if needed
   - Click "Add Ingredient"
4. Enter instructions
5. Click "Save Recipe"

### Scaling a Recipe

1. Open the recipe you want to scale
2. Click the "Scale Recipe" button
3. Choose a scaling method:
   - Scale by factor (e.g., 2× for doubling)
   - New yield amount
   - New number of portions
4. Click "Apply Scaling"

### Recipe Costing

Recipe costs are automatically calculated based on:
- Current ingredient prices
- Quantities used
- Conversion factors
- Yield factors

The system shows:
- Total recipe cost
- Cost per portion
- Cost breakdown by ingredient

### Generating Purchase Lists

1. Open the recipe
2. In the Purchasing Helper, enter the number of portions needed
3. Click "Calculate"
4. View the recommended purchase quantities for each ingredient

## Inventory Management

### Viewing Inventory

1. Navigate to "Inventory" in the sidebar
2. Use the filters to narrow down by category or location
3. View current quantities, par levels, and values

### Counting Inventory

1. Click the "New Count" button
2. Enter the current quantities for each item
3. Click "Save Count" to update inventory levels

### Inventory Reports

Access inventory reports for:
- Current inventory value
- Items below par level
- Usage trends
- Variance analysis

## Settings and Administration

### Managing Ingredients

1. Navigate to "Ingredients" in the sidebar
2. View, add, edit, or deactivate ingredients
3. Manage conversions and yield factors

### Managing Units and Conversions

1. Navigate to "Settings" > "Units of Measure"
2. Add or edit units
3. Define conversion factors between units

### Managing Users

Administrators can:
1. Navigate to "Settings" > "Users"
2. Add new users
3. Assign roles (admin, manager, user)
4. Reset passwords

## Data Import/Export

### Importing Data

1. Navigate to "Settings" > "Import/Export"
2. Choose the data type to import (items, conversions, recipes)
3. Upload a CSV file in the required format
4. Review and confirm the import

### Exporting Data

1. Navigate to "Settings" > "Import/Export"
2. Choose the data type to export
3. Select any filtering options
4. Click "Export" to download as CSV

## Troubleshooting

### Common Issues

**Conversion errors**: Ensure that conversion paths exist between the units you're trying to convert.

**Missing costs**: Check that price information exists for the ingredients in your recipes.

**Unexpected yield results**: Verify that yield factors are correctly entered for the ingredients.

### Getting Help

If you encounter any issues:
1. Check this user guide
2. Contact your system administrator
3. Email support@foodcostingapp.com

## Appendix: Key Formulas

The application uses these key formulas from The Book of Yields:

1. **AS ÷ Y% = AP** (Amount served divided by Yield percentage equals Amount purchased)
   - Used when calculating how much raw product to buy based on recipe needs

2. **AS × Weight per measure = AP** (For static foods)
   - Used for items that don't change during cooking/preparation

3. **Portion count ÷ Pieces per purchase unit = AP** (For piece-yield calculations)
   - Used for calculating purchase units based on needed portions

4. **AP cost ÷ Portion count = Cost per portion**
   - Used to determine the cost of individual servings

5. **AP cost per lb. ÷ Yield % = Cost per servable pound**
   - Used to calculate the true cost of usable product
