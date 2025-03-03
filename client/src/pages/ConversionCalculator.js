import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const ConversionCalculator = () => {
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [includeYield, setIncludeYield] = useState(false);
  const [yieldType, setYieldType] = useState('');
  const [yieldTypes, setYieldTypes] = useState(['trim', 'cook']);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // In a real app, fetch this data from your API
    const loadInitialData = async () => {
      try {
        // Mock data for development
        setItems([
          { id: 1, name: 'Carrots, whole' },
          { id: 2, name: 'Onions' },
          { id: 3, name: 'Chicken Stock' },
          { id: 4, name: 'Cream, heavy' },
          { id: 5, name: 'Salt' },
        ]);
        
        setUnits([
          { id: 1, code: 'lb', name: 'Pound', type: 'weight' },
          { id: 2, code: 'oz', name: 'Ounce', type: 'weight' },
          { id: 3, code: 'g', name: 'Gram', type: 'weight' },
          { id: 4, code: 'kg', name: 'Kilogram', type: 'weight' },
          { id: 5, code: 'cup', name: 'Cup', type: 'volume' },
          { id: 6, code: 'tbsp', name: 'Tablespoon', type: 'volume' },
          { id: 7, code: 'tsp', name: 'Teaspoon', type: 'volume' },
          { id: 8, code: 'qt', name: 'Quart', type: 'volume' },
          { id: 9, code: 'pt', name: 'Pint', type: 'volume' },
          { id: 10, code: 'gal', name: 'Gallon', type: 'volume' },
        ]);
      } catch (err) {
        toast.error('Failed to load data');
      }
    };
    
    loadInitialData();
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    
    if (!selectedItem || !fromAmount || !fromUnit || !toUnit) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      // In a real app, this would be an API call
      // For this example, we'll simulate a conversion
      
      // Mock conversion logic
      let conversionFactor = 1;
      let yieldFactor = 1;
      
      // Basic unit conversion factors (simplified)
      if (fromUnit === '1' && toUnit === '2') { // lb to oz
        conversionFactor = 16;
      } else if (fromUnit === '2' && toUnit === '1') { // oz to lb
        conversionFactor = 0.0625;
      } else if (fromUnit === '1' && toUnit === '5') { // lb to cup
        conversionFactor = 2; // approximate for demo
      } else if (fromUnit === '5' && toUnit === '1') { // cup to lb
        conversionFactor = 0.5; // approximate for demo
      }
      
      // Apply yield factor if needed
      if (includeYield && yieldType) {
        // Mock yield data
        const yieldFactors = {
          1: { // Carrots
            trim: 0.8, // 80% yield when trimming
            cook: 0.7  // 70% yield when cooking
          },
          2: { // Onions
            trim: 0.83, // 83% yield when trimming
            cook: 0.75  // 75% yield when cooking
          }
        };
        
        if (yieldFactors[selectedItem] && yieldFactors[selectedItem][yieldType]) {
          yieldFactor = yieldFactors[selectedItem][yieldType];
        }
      }
      
      // Calculate result
      const convertedValue = parseFloat(fromAmount) * conversionFactor * yieldFactor;
      
      // Set result
      setResult({
        originalValue: parseFloat(fromAmount),
        convertedValue,
        conversionFactor,
        yieldFactor,
        fromUnitCode: units.find(u => u.id === parseInt(fromUnit))?.code,
        toUnitCode: units.find(u => u.id === parseInt(toUnit))?.code,
        yieldFactorApplied: includeYield && yieldType
      });
    } catch (err) {
      setError('Conversion failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1 className="mb-4">Conversion Calculator</h1>
      
      <Row>
        <Col md={6}>
          <Card className="calculator-card mb-4">
            <Card.Header className="calculator-header">
              <h5 className="mb-0">Conversion Inputs</h5>
            </Card.Header>
            <Card.Body className="calculator-body">
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="item">
                  <Form.Label>Select Item</Form.Label>
                  <Form.Select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    required
                  >
                    <option value="">-- Select an item --</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Row className="mb-3">
                  <Col>
                    <Form.Group controlId="fromAmount">
                      <Form.Label>From</Form.Label>
                      <Form.Control
                        type="number"
                        step="any"
                        min="0"
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group controlId="fromUnit">
                      <Form.Label>&nbsp;</Form.Label>
                      <Form.Select
                        value={fromUnit}
                        onChange={(e) => setFromUnit(e.target.value)}
                        required
                      >
                        <option value="">-- Unit --</option>
                        {units.map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.code})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row className="mb-3">
                  <Col>
                    <Form.Group controlId="toAmount">
                      <Form.Label>To</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Result"
                        value={result ? result.convertedValue.toFixed(2) : ''}
                        readOnly
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group controlId="toUnit">
                      <Form.Label>&nbsp;</Form.Label>
                      <Form.Select
                        value={toUnit}
                        onChange={(e) => setToUnit(e.target.value)}
                        required
                      >
                        <option value="">-- Unit --</option>
                        {units.map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.code})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3" controlId="includeYield">
                  <Form.Check
                    type="checkbox"
                    label="Include yield factor"
                    checked={includeYield}
                    onChange={(e) => setIncludeYield(e.target.checked)}
                  />
                </Form.Group>
                
                {includeYield && (
                  <Form.Group className="mb-3" controlId="yieldType">
                    <Form.Label>Yield Type</Form.Label>
                    <Form.Select
                      value={yieldType}
                      onChange={(e) => setYieldType(e.target.value)}
                      required={includeYield}
                    >
                      <option value="">-- Select yield type --</option>
                      {yieldTypes.map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                )}
                
                <div className="d-grid">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Converting...' : 'Convert'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="calculator-card mb-4">
            <Card.Header className="calculator-header">
              <h5 className="mb-0">Results</h5>
            </Card.Header>
            <Card.Body className="calculator-body">
              {result ? (
                <div>
                  <h4 className="mb-4">
                    {result.convertedValue.toFixed(2)} {result.toUnitCode}
                  </h4>
                  
                  <h6 className="text-muted mb-3">Calculation:</h6>
                  
                  <p>
                    <strong>Original Amount:</strong> {result.originalValue} {result.fromUnitCode}
                  </p>
                  
                  <p>
                    <strong>Conversion Factor:</strong> 1 {result.fromUnitCode} = {result.conversionFactor} {result.toUnitCode}
                  </p>
                  
                  {result.yieldFactorApplied && (
                    <p>
                      <strong>Yield Factor:</strong> {(result.yieldFactor * 100).toFixed(0)}%
                    </p>
                  )}
                  
                  <p>
                    <strong>Calculation:</strong> {result.originalValue} {result.fromUnitCode} × {result.conversionFactor}
                    {result.yieldFactorApplied ? ` × ${result.yieldFactor}` : ''} = {result.convertedValue.toFixed(2)} {result.toUnitCode}
                  </p>
                  
                  <hr />
                  
                  <h6 className="text-muted mb-3">Cost Information:</h6>
                  
                  <p>
                    <strong>Cost per {result.fromUnitCode}:</strong> $0.60
                  </p>
                  
                  <p>
                    <strong>Cost per {result.toUnitCode}:</strong> ${(0.60 / result.conversionFactor).toFixed(2)}
                  </p>
                </div>
              ) : (
                <div className="text-center text-muted p-5">
                  <p>Enter values and click Convert to see results</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ConversionCalculator;