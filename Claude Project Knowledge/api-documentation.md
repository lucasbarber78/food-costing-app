# Food Costing Application API Documentation

## Overview

This document provides detailed information about the RESTful API endpoints for the Food Costing Application. The API is organized around resources such as items, recipes, conversions, and inventory. It uses standard HTTP methods and returns JSON responses.

## Base URL

```
https://api.foodcostingapp.com/api/v1
```

## Authentication

All API requests require authentication using JSON Web Tokens (JWT).

### Obtaining a Token

```
POST /auth/login
```

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "your_username",
    "role": "admin"
  }
}
```

### Using the Token

Include the token in the Authorization header of all requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Error Handling

The API uses conventional HTTP response codes to indicate success or failure:

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a JSON object with details:

```json
{
  "error": {
    "message": "Error description",
    "status": 400,
    "timestamp": "2025-04-01T12:00:00Z"
  }
}
```

## API Endpoints

### Conversion Operations

#### Calculate Complex Conversion

```
POST /conversions/convert/complex
```

Performs unit conversions with optional yield factors.

**Request Body:**
```json
{
  "itemId": 123,
  "fromUnitId": 1,
  "toUnitId": 2,
  "value": 5.0,
  "includeYield": true,
  "yieldType": "trim"
}
```

**Response:**
```json
{
  "originalValue": 5.0,
  "convertedValue": 64.0,
  "conversionFactor": 16.0,
  "yieldFactor": 0.8,
  "yieldFactorApplied": true,
  "conversionPath": [
    {
      "id": 1,
      "from_unit_id": 1,
      "to_unit_id": 2,
      "conversion_factor": 16.0,
      "item_specific": false
    }
  ]
}
```

#### Calculate Purchase Quantity

```
POST /conversions/calculate-purchase
```

Calculates purchase quantities based on recipe requirements.

**Request Body:**
```json
{
  "itemId": 123,
  "recipeQuantity": 5.0,
  "recipeUnitId": 8,
  "yieldType": "trim"
}
```

**Response:**
```json
{
  "recipeQuantity": 5.0,
  "purchaseQuantity": 1.5625,
  "conversionFactor": 0.25,
  "yieldFactor": 1.25,
  "estimatedCost": 0.9375,
  "unitPricing": {
    "price": 0.6,
    "unit": 1,
    "effectiveDate": "2025-01-01"
  }
}
```

#### Get Available Units

```
GET /conversions/units
```

Returns all available units of measure, optionally filtered by type.

**Query Parameters:**
- `type` (optional): Filter by unit type (e.g., "weight", "volume")

**Response:**
```json
[
  {
    "id": 1,
    "code": "lb",
    "name": "Pound",
    "type": "weight",
    "system": "imperial",
    "base_unit": true
  },
  {
    "id": 2,
    "code": "oz",
    "name": "Ounce",
    "type": "weight",
    "system": "imperial",
    "base_unit": false
  }
]
```

#### Get Item Conversions

```
GET /conversions/item/:id
```

Returns all conversion factors for a specific item.

**Response:**
```json
[
  {
    "id": 1,
    "from_unit_id": 1,
    "to_unit_id": 2,
    "conversion_factor": 16.0,
    "item_specific": false,
    "from_unit_code": "lb",
    "from_unit_name": "Pound",
    "to_unit_code": "oz",
    "to_unit_name": "Ounce"
  },
  {
    "id": 5,
    "from_unit_id": 1,
    "to_unit_id": 8,
    "conversion_factor": 4.0,
    "item_specific": true,
    "item_id": 123,
    "from_unit_code": "lb",
    "from_unit_name": "Pound",
    "to_unit_code": "cup",
    "to_unit_name": "Cup"
  }
]
```

### Item Management

#### Get All Items

```
GET /items
```

Returns a list of items, with optional filtering.

**Query Parameters:**
- `active` (optional): Filter by active status (true/false)
- `subgroup` (optional): Filter by subgroup ID
- `search` (optional): Search in item names

**Response:**
```json
[
  {
    "id": 123,
    "name": "Carrots, whole",
    "description": "Fresh whole carrots",
    "item_type": "Raw Food",
    "item_class": "Produce",
    "item_group": "Vegetables",
    "item_subgroup": "Root Vegetables",
    "default_purchase_unit_code": "lb",
    "default_inventory_unit_code": "lb",
    "default_base_unit_code": "oz",
    "active": true
  }
]
```

#### Get Item by ID

```
GET /items/:id
```

Returns detailed information about a specific item.

**Response:**
```json
{
  "id": 123,
  "name": "Carrots, whole",
  "description": "Fresh whole carrots",
  "subgroup_id": 5,
  "subgroup_name": "Root Vegetables",
  "group_name": "Vegetables",
  "class_name": "Produce",
  "type_name": "Raw Food",
  "default_purchase_unit_id": 1,
  "default_inventory_unit_id": 1,
  "default_base_unit_id": 2,
  "inv_unit_per_purchase_unit": 1.0,
  "base_unit_per_inv_unit": 16.0,
  "active": true
}
```

#### Create Item

```
POST /items
```

Creates a new item.

**Request Body:**
```json
{
  "name": "Carrots, whole",
  "description": "Fresh whole carrots",
  "subgroup_id": 5,
  "default_purchase_unit_id": 1,
  "default_inventory_unit_id": 1,
  "default_base_unit_id": 2,
  "inv_unit_per_purchase_unit": 1.0,
  "base_unit_per_inv_unit": 16.0,
  "active": true
}
```

**Response:**
```json
{
  "id": 123,
  "name": "Carrots, whole",
  "description": "Fresh whole carrots",
  "subgroup_id": 5,
  "default_purchase_unit_id": 1,
  "default_inventory_unit_id": 1,
  "default_base_unit_id": 2,
  "inv_unit_per_purchase_unit": 1.0,
  "base_unit_per_inv_unit": 16.0,
  "active": true,
  "created_at": "2025-04-01T12:00:00Z",
  "updated_at": "2025-04-01T12:00:00Z"
}
```

#### Update Item

```
PUT /items/:id
```

Updates an existing item.

**Request Body:**
```json
{
  "name": "Carrots, whole",
  "description": "Fresh whole carrots with tops removed",
  "subgroup_id": 5,
  "default_purchase_unit_id": 1,
  "default_inventory_unit_id": 1,
  "default_base_unit_id": 2,
  "inv_unit_per_purchase_unit": 1.0,
  "base_unit_per_inv_unit": 16.0,
  "active": true
}
```

**Response:**
```json
{
  "id": 123,
  "name": "Carrots, whole",
  "description": "Fresh whole carrots with tops removed",
  "subgroup_id": 5,
  "default_purchase_unit_id": 1,
  "default_inventory_unit_id": 1,
  "default_base_unit_id": 2,
  "inv_unit_per_purchase_unit": 1.0,
  "base_unit_per_inv_unit": 16.0,
  "active": true,
  "created_at": "2025-04-01T12:00:00Z",
  "updated_at": "2025-04-02T14:30:00Z"
}
```

#### Delete Item

```
DELETE /items/:id
```

Deletes (or deactivates) an item.

**Response:**
```json
{
  "message": "Item deactivated successfully"
}
```

#### Get Item Yields

```
GET /items/:id/yields
```

Returns yield factors for a specific item.

**Response:**
```json
[
  {
    "id": 45,
    "item_id": 123,
    "process_type": "trim",
    "yield_percentage": 80.0,
    "description": "Peeled and trimmed",
    "process_type_name": "Trimming"
  },
  {
    "id": 46,
    "item_id": 123,
    "process_type": "cook",
    "yield_percentage": 70.0,
    "description": "Boiled until tender",
    "process_type_name": "Cooking"
  }
]
```

#### Get Item Prices

```
GET /items/:id/prices
```

Returns price history for a specific item.

**Response:**
```json
[
  {
    "id": 78,
    "item_id": 123,
    "vendor_id": 5,
    "vendor_name": "Good Foods Distributors",
    "purchase_unit_id": 1,
    "unit_code": "lb",
    "price": 0.60,
    "pack_size": "25 lb",
    "effective_date": "2025-03-01",
    "invoice_date": "2025-03-01"
  },
  {
    "id": 65,
    "item_id": 123,
    "vendor_id": 5,
    "vendor_name": "Good Foods Distributors",
    "purchase_unit_id": 1,
    "unit_code": "lb",
    "price": 0.55,
    "pack_size": "25 lb",
    "effective_date": "2025-01-15",
    "invoice_date": "2025-01-15"
  }
]
```

### Recipe Management

#### Get All Recipes

```
GET /recipes
```

Returns a list of recipes, with optional filtering.

**Query Parameters:**
- `active` (optional): Filter by active status (true/false)
- `category` (optional): Filter by category
- `search` (optional): Search in recipe names and descriptions

**Response:**
```json
[
  {
    "id": 45,
    "name": "Carrot Soup",
    "category": "Soup",
    "yield_quantity": 2.0,
    "yield_unit_code": "gal",
    "portions": 16,
    "portion_size": 1.0,
    "portion_unit_code": "cup",
    "active": true
  }
]
```

#### Get Recipe by ID

```
GET /recipes/:id
```

Returns detailed information about a specific recipe.

**Response:**
```json
{
  "id": 45,
  "name": "Carrot Soup",
  "description": "A creamy and delicious carrot soup",
  "category": "Soup",
  "yield_quantity": 2.0,
  "yield_unit_id": 5,
  "yield_unit_code": "gal",
  "portions": 16,
  "portion_size": 1.0,
  "portion_unit_id": 8,
  "portion_unit_code": "cup",
  "instructions": "1. Peel and chop carrots...",
  "active": true,
  "ingredients": [
    {
      "id": 123,
      "item_id": 123,
      "item_name": "Carrots, whole",
      "quantity": 5.0,
      "unit_id": 1,
      "unit_code": "lb",
      "preparation_notes": "Peeled and roughly chopped",
      "sequence": 1
    },
    {
      "id": 124,
      "item_id": 124,
      "item_name": "Onions",
      "quantity": 2.0,
      "unit_id": 1,
      "unit_code": "lb",
      "preparation_notes": "Diced",
      "sequence": 2
    }
  ]
}
```

#### Create Recipe

```
POST /recipes
```

Creates a new recipe.

**Request Body:**
```json
{
  "name": "Carrot Soup",
  "description": "A creamy and delicious carrot soup",
  "category": "Soup",
  "yield_quantity": 2.0,
  "yield_unit_id": 5,
  "portions": 16,
  "portion_size": 1.0,
  "portion_unit_id": 8,
  "instructions": "1. Peel and chop carrots...",
  "active": true,
  "ingredients": [
    {
      "item_id": 123,
      "quantity": 5.0,
      "unit_id": 1,
      "preparation_notes": "Peeled and roughly chopped",
      "sequence": 1
    },
    {
      "item_id": 124,
      "quantity": 2.0,
      "unit_id": 1,
      "preparation_notes": "Diced",
      "sequence": 2
    }
  ]
}
```

**Response:**
```json
{
  "id": 45,
  "name": "Carrot Soup",
  "description": "A creamy and delicious carrot soup",
  "category": "Soup",
  "yield_quantity": 2.0,
  "yield_unit_id": 5,
  "portions": 16,
  "portion_size": 1.0,
  "portion_unit_id": 8,
  "instructions": "1. Peel and chop carrots...",
  "active": true,
  "created_at": "2025-04-01T12:00:00Z",
  "updated_at": "2025-04-01T12:00:00Z",
  "ingredients": [
    {
      "id": 123,
      "recipe_id": 45,
      "item_id": 123,
      "quantity": 5.0,
      "unit_id": 1,
      "preparation_notes": "Peeled and roughly chopped",
      "sequence": 1
    },
    {
      "id": 124,
      "recipe_id": 45,
      "item_id": 124,
      "quantity": 2.0,
      "unit_id": 1,
      "preparation_notes": "Diced",
      "sequence": 2
    }
  ]
}
```

#### Update Recipe

```
PUT /recipes/:id
```

Updates an existing recipe.

**Request Body:**
```json
{
  "name": "Carrot Soup",
  "description": "A creamy and delicious carrot soup with a hint of ginger",
  "category": "Soup",
  "yield_quantity": 2.0,
  "yield_unit_id": 5,
  "portions": 16,
  "portion_size": 1.0,
  "portion_unit_id": 8,
  "instructions": "1. Peel and chop carrots...",
  "active": true,
  "ingredients": [
    {
      "item_id": 123,
      "quantity": 5.0,
      "unit_id": 1,
      "preparation_notes": "Peeled and roughly chopped",
      "sequence": 1
    },
    {
      "item_id": 124,
      "quantity": 2.0,
      "unit_id": 1,
      "preparation_notes": "Diced",
      "sequence": 2
    },
    {
      "item_id": 125,
      "quantity": 1.0,
      "unit_id": 10,
      "preparation_notes": "Grated",
      "sequence": 3
    }
  ]
}
```

**Response:**
```json
{
  "id": 45,
  "name": "Carrot Soup",
  "description": "A creamy and delicious carrot soup with a hint of ginger",
  "category": "Soup",
  "yield_quantity": 2.0,
  "yield_unit_id": 5,
  "portions": 16,
  "portion_size": 1.0,
  "portion_unit_id": 8,
  "instructions": "1. Peel and chop carrots...",
  "active": true,
  "updated_at": "2025-04-02T14:30:00Z",
  "ingredients": [
    {
      "id": 123,
      "recipe_id": 45,
      "item_id": 123,
      "quantity": 5.0,
      "unit_id": 1,
      "preparation_notes": "Peeled and roughly chopped",
      "sequence": 1
    },
    {
      "id": 124,
      "recipe_id": 45,
      "item_id": 124,
      "quantity": 2.0,
      "unit_id": 1,
      "preparation_notes": "Diced",
      "sequence": 2
    },
    {
      "id": 125,
      "recipe_id": 45,
      "item_id": 125,
      "quantity": 1.0,
      "unit_id": 10,
      "preparation_notes": "Grated",
      "sequence": 3
    }
  ]
}
```

#### Delete Recipe

```
DELETE /recipes/:id
```

Deletes a recipe.

**Response:**
```json
{
  "message": "Recipe deleted successfully"
}
```

#### Calculate Recipe Cost

```
GET /recipes/:id/cost
```

Calculates the cost of a recipe based on current ingredient prices.

**Response:**
```json
{
  "recipe": {
    "id": 45,
    "name": "Carrot Soup",
    "category": "Soup",
    "yield_quantity": 2.0,
    "yield_unit_code": "gal",
    "portions": 16,
    "portion_size": 1.0,
    "portion_unit_code": "cup"
  },
  "ingredients": [
    {
      "id": 123,
      "item_id": 123,
      "item_name": "Carrots, whole",
      "quantity": 5.0,
      "unit_code": "lb",
      "preparation_notes": "Peeled and roughly chopped",
      "conversion_factor": 1.0,
      "calculated_cost": 3.0,
      "calculation_notes": "Cost calculated successfully"
    },
    {
      "id": 124,
      "item_id": 124,
      "item_name": "Onions",
      "quantity": 2.0,
      "unit_code": "lb",
      "preparation_notes": "Diced",
      "conversion_factor": 1.0,
      "calculated_cost": 0.9,
      "calculation_notes": "Cost calculated successfully"
    }
  ],
  "total_cost": 16.27,
  "cost_per_portion": 1.02
}
```

#### Scale Recipe

```
POST /recipes/:id/scale
```

Scales a recipe by a factor or to a specific yield/portions.

**Request Body:**
```json
{
  "scaleFactor": 2.0
}
```

OR

```json
{
  "newYield": 4.0
}
```

OR

```json
{
  "newPortions": 32
}
```

**Response:**
```json
{
  "recipe": {
    "id": 45,
    "name": "Carrot Soup",
    "category": "Soup",
    "yield_quantity": 2.0,
    "yield_unit_code": "gal",
    "portions": 16,
    "portion_size": 1.0,
    "portion_unit_code": "cup",
    "original_yield_quantity": 2.0,
    "scaled_yield_quantity": 4.0,
    "original_portions": 16,
    "scaled_portions": 32,
    "scale_factor": 2.0
  },
  "ingredients": [
    {
      "id": 123,
      "item_id": 123,
      "item_name": "Carrots, whole",
      "unit_code": "lb",
      "preparation_notes": "Peeled and roughly chopped",
      "original_quantity": 5.0,
      "scaled_quantity": 10.0
    },
    {
      "id": 124,
      "item_id": 124,
      "item_name": "Onions",
      "unit_code": "lb",
      "preparation_notes": "Diced",
      "original_quantity": 2.0,
      "scaled_quantity": 4.0
    }
  ]
}
```

#### Generate Purchase List

```
POST /recipes/:id/purchase-list
```

Generates a purchase list for a recipe.

**Request Body:**
```json
{
  "portions": 50
}
```

**Response:**
```json
{
  "recipe_id": 45,
  "recipe_name": "Carrot Soup",
  "portions": 50,
  "scale_factor": 3.125,
  "purchase_list": [
    {
      "item_id": 123,
      "item_name": "Carrots, whole",
      "recipe_quantity": 15.625,
      "recipe_unit": "lb",
      "purchase_quantity": 19.53,
      "purchase_unit": "lb",
      "purchase_cost": 11.72,
      "unit_price": 0.6,
      "conversion_factor": 1.0,
      "yield_factor": 1.25,
      "yield_type": "trim"
    },
    {
      "item_id": 124,
      "item_name": "Onions",
      "recipe_quantity": 6.25,
      "recipe_unit": "lb",
      "purchase_quantity": 7.53,
      "purchase_unit": "lb",
      "purchase_cost": 3.39,
      "unit_price": 0.45,
      "conversion_factor": 1.0,
      "yield_factor": 1.2,
      "yield_type": "trim"
    }
  ],
  "total_purchase_cost": 50.87
}
```

### Inventory Management

#### Get Inventory Items

```
GET /inventory
```

Returns current inventory items, with optional filtering.

**Query Parameters:**
- `location` (optional): Filter by location ID
- `category` (optional): Filter by category
- `belowPar` (optional): Filter for items below par level (true/false)
- `search` (optional): Search in item names

**Response:**
```json
[
  {
    "id": 123,
    "item_id": 123,
    "item_name": "Carrots, whole",
    "item_group": "Vegetables",
    "location": "Produce Walk-in",
    "unit": "lb",
    "par_level": 25,
    "current_qoh": 32.5,
    "last_count_date": "2025-03-15",
    "unit_cost": 0.60,
    "total_value": 19.50
  }
]
```

#### Get Inventory Item by ID

```
GET /inventory/:id
```

Returns detailed information about a specific inventory item.

**Response:**
```json
{
  "id": 123,
  "item_id": 123,
  "item_name": "Carrots, whole",
  "item_group": "Vegetables",
  "item_subgroup": "Root Vegetables",
  "location_id": 2,
  "location": "Produce Walk-in",
  "unit_id": 1,
  "unit": "lb",
  "par_level": 25,
  "current_qoh": 32.5,
  "last_qoh": 30.0,
  "last_count_date": "2025-03-15",
  "unit_cost": 0.60,
  "total_value": 19.50,
  "avg_daily_usage": 4.5,
  "days_of_supply": 7.2
}
```

#### Update Inventory Count

```
POST /inventory/count
```

Updates inventory counts.

**Request Body:**
```json
{
  "countDate": "2025-04-01",
  "items": [
    {
      "item_id": 123,
      "location_id": 2,
      "quantity": 35.0
    },
    {
      "item_id": 124,
      "location_id": 2,
      "quantity": 22.5
    }
  ]
}
```

**Response:**
```json
{
  "message": "Inventory count updated successfully",
  "countDate": "2025-04-01",
  "itemsUpdated": 2,
  "totalValue": 34.65
}
```

#### Get Inventory History

```
GET /inventory/history
```

Returns inventory history for analysis.

**Query Parameters:**
- `item_id` (optional): Filter by item ID
- `location_id` (optional): Filter by location ID
- `startDate` (optional): Start date for history range
- `endDate` (optional): End date for history range

**Response:**
```json
[
  {
    "item_id": 123,
    "item_name": "Carrots, whole",
    "location": "Produce Walk-in",
    "count_date": "2025-03-15",
    "quantity": 30.0,
    "unit": "lb",
    "unit_cost": 0.60,
    "total_value": 18.00
  },
  {
    "item_id": 123,
    "item_name": "Carrots, whole",
    "location": "Produce Walk-in",
    "count_date": "2025-03-08",
    "quantity": 35.0,
    "unit": "lb",
    "unit_cost": 0.55,
    "total_value": 19.25
  }
]
```

#### Generate Purchase Order

```
POST /inventory/purchase-order
```

Generates a purchase order for items below par level.

**Request Body:**
```json
{
  "locationId": 2,
  "categories": ["Vegetables", "Dairy"],
  "vendor_id": 5
}
```

**Response:**
```json
{
  "vendor_id": 5,
  "vendor_name": "Good Foods Distributors",
  "order_date": "2025-04-01",
  "items": [
    {
      "item_id": 124,
      "item_name": "Onions",
      "current_quantity": 10.0,
      "par_level": 20.0,
      "order_quantity": 10.0,
      "unit": "lb",
      "unit_price": 0.45,
      "extended_price": 4.50
    },
    {
      "item_id": 126,
      "item_name": "Milk, whole",
      "current_quantity": 2.0,
      "par_level": 5.0,
      "order_quantity": 3.0,
      "unit": "gal",
      "unit_price": 3.25,
      "extended_price": 9.75
    }
  ],
  "total_quantity": 13.0,
  "total_cost": 14.25
}
```

### Categories and Units

#### Get Item Categories

```
GET /categories
```

Returns a hierarchical list of item categories.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Raw Food",
    "type": "type",
    "children": [
      {
        "id": 2,
        "name": "Produce",
        "type": "class",
        "parent_id": 1,
        "children": [
          {
            "id": 3,
            "name": "Vegetables",
            "type": "group",
            "parent_id": 2,
            "children": [
              {
                "id": 5,
                "name": "Root Vegetables",
                "type": "subgroup",
                "parent_id": 3
              }
            ]
          }
        ]
      }
    ]
  }
]
```

#### Get Units of Measure

```
GET /units
```

Returns available units of measure, optionally filtered by type.

**Query Parameters:**
- `type` (optional): Filter by type (e.g., "weight", "volume")
- `system` (optional): Filter by system (e.g., "imperial", "metric")

**Response:**
```json
[
  {
    "id": 1,
    "code": "lb",
    "name": "Pound",
    "type": "weight",
    "system": "imperial",
    "base_unit": true
  },
  {
    "id": 2,
    "code": "oz",
    "name": "Ounce",
    "type": "weight",
    "system": "imperial",
    "base_unit": false
  }
]
```

### User Management

#### Get User Profile

```
GET /auth/me
```

Returns the current user's profile.

**Response:**
```json
{
  "id": 123,
  "username": "jdoe",
  "email": "jdoe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "admin"
}
```

#### Change Password

```
POST /auth/change-password
```

Changes the current user's password.

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

**Response:**
```json
{
  "message": "Password updated successfully"
}
```