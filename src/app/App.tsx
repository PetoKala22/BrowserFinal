import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from '@/features/home/Home';
const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
