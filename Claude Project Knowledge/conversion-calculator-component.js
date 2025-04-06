import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

/**
 * ConversionCalculator Component
 * 
 * Interactive tool that allows users to convert between different units of measurement,
 * taking into account yield factors for trimming and cooking.
 */
const ConversionCalculator = () => {
  // State for form inputs and results
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
  
  // Fetch items and units on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get list of items
        const itemsResponse = await axios.get('/api/items?active=true');
        setItems(itemsResponse.data);
        
        // Get list of units
        const unitsResponse = await axios.get('/api/units');
        setUnits(unitsResponse.data);
      } catch (err) {
        toast.error('Failed to load data');
      }
    };
    
    fetchData();
  }, []);
  
  // Fetch yield types when an item is selected
  useEffect(() => {
    if (selectedItem) {
      const fetchYieldTypes = async () => {
        try {
          const response = await axios.get(`/api/items/${selectedItem}/yields`);
          const types = response.data.map(yield_ => yield_.process_type);
          setYieldTypes(types.length > 0 ? types : ['trim', 'cook']);
        } catch (err) {
          console.error('Error fetching yield types:', err);
        }
      };
      
      fetchYieldTypes();
    }
  }, [selectedItem]);
  
  // Handle form submission
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
      // Call conversion API
      const response = await axios.post('/api/conversions/convert/complex', {
        itemId: selectedItem,
        fromUnitId: fromUnit,
        toUnitId: toUnit,
        value: parseFloat(fromAmount),
        includeYield: includeYield,
        yieldType: includeYield ? yieldType : null
      });
      
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Conversion failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get the current price for the selected item
  const getCurrentItemPrice = () => {
    if (!selectedItem || !result) return null;
    
    const item = items.find(i => i.id.toString() === selectedItem);
    return item?.current_price || null;
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
                    {result.convertedValue.toFixed(2)} {units.find(u => u.id.toString() === toUnit)?.code}
                  </h4>
                  
                  <h6 className="text-muted mb-3">Calculation:</h6>
                  
                  <p>
                    <strong>Original Amount:</strong> {result.originalValue} {units.find(u => u.id.toString() === fromUnit)?.code}
                  </p>
                  
                  <p>
                    <strong>Conversion Factor:</strong> 1 {units.find(u => u.id.toString() === fromUnit)?.code} = {result.conversionFactor} {units.find(u => u.id.toString() === toUnit)?.code}
                  </p>
                  
                  {result.yieldFactorApplied && (
                    <p>
                      <strong>Yield Factor:</strong> {(result.yieldFactor * 100).toFixed(0)}%
                    </p>
                  )}
                  
                  <p>
                    <strong>Calculation:</strong> {result.originalValue} {units.find(u => u.id.toString() === fromUnit)?.code} × {result.conversionFactor}
                    {result.yieldFactorApplied ? ` × ${result.yieldFactor}` : ''} = {result.convertedValue.toFixed(2)} {units.find(u => u.id.toString() === toUnit)?.code}
                  </p>
                  
                  <hr />
                  
                  {getCurrentItemPrice() && (
                    <>
                      <h6 className="text-muted mb-3">Cost Information:</h6>
                      
                      <p>
                        <strong>Cost per {units.find(u => u.id.toString() === fromUnit)?.code}:</strong> ${getCurrentItemPrice().toFixed(2)}
                      </p>
                      
                      <p>
                        <strong>Total cost for {result.originalValue} {units.find(u => u.id.toString() === fromUnit)?.code}:</strong> ${(getCurrentItemPrice() * result.originalValue).toFixed(2)}
                      </p>
                      
                      <p>
                        <strong>Cost per {units.find(u => u.id.toString() === toUnit)?.code}:</strong> ${(getCurrentItemPrice() / result.conversionFactor / (result.yieldFactorApplied ? result.yieldFactor : 1)).toFixed(2)}
                      </p>
                    </>
                  )}
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