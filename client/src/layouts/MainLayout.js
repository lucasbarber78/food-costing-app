import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Container, Row, Col } from 'react-bootstrap';

const MainLayout = () => {
  return (
    <div className="main-layout">
      <Navbar />
      <Container fluid>
        <Row>
          <Col md={3} lg={2} className="px-0 sidebar">
            <Sidebar />
          </Col>
          <Col md={9} lg={10} className="content-container">
            <Outlet />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default MainLayout;