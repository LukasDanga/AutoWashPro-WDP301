import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import AdminRoutes from './routes/AdminRoutes';
import ManagerRoutes from './routes/ManagerRoutes';
import ChatBot from './components/ChatBot';
import './index.css';
import './styles.css';
import './overrides.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="/manager/*" element={<ManagerRoutes />} />
        <Route path="/*" element={<App />} />
      </Routes>
      <ChatBot />
    </BrowserRouter>
  </React.StrictMode>,
);
