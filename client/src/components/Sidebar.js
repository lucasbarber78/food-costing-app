import React from 'react';
import { Nav } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { FiHome, FiCalculator, FiBook, FiPackage, FiDatabase } from 'react-icons/fi';

const Sidebar = () => {
  return (
    <Nav className="flex-column p-3">
      <Nav.Item>
        <Nav.Link as={NavLink} to="/" end>
          <FiHome className="me-2" />
          Dashboard
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link as={NavLink} to="/calculator">
          <FiCalculator className="me-2" />
          Conversion Calculator
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link as={NavLink} to="/recipes">
          <FiBook className="me-2" />
          Recipes
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link as={NavLink} to="/items">
          <FiPackage className="me-2" />
          Ingredients
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link as={NavLink} to="/inventory">
          <FiDatabase className="me-2" />
          Inventory
        </Nav.Link>
      </Nav.Item>
    </Nav>
  );
};

export default Sidebar;