import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ConversionCalculator from './pages/ConversionCalculator';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import RecipeForm from './pages/RecipeForm';
import Items from './pages/Items';
import ItemDetail from './pages/ItemDetail';
import ItemForm from './pages/ItemForm';
import Inventory from './pages/Inventory';
import NotFound from './pages/NotFound';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="d-flex justify-content-center p-5">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="calculator" element={<ConversionCalculator />} />
        
        <Route path="recipes">
          <Route index element={<Recipes />} />
          <Route path=":id" element={<RecipeDetail />} />
          <Route path="new" element={<RecipeForm />} />
          <Route path=":id/edit" element={<RecipeForm />} />
        </Route>
        
        <Route path="items">
          <Route index element={<Items />} />
          <Route path=":id" element={<ItemDetail />} />
          <Route path="new" element={<ItemForm />} />
          <Route path=":id/edit" element={<ItemForm />} />
        </Route>
        
        <Route path="inventory" element={<Inventory />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;