import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getApiBaseUrl, getStoredToken } from '../lib/authStorage';
import useSSE from './useSSE';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [configs, setConfigs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  const fetchConfigs = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/configs/public`);
      
      if (!response.ok) {
        throw new Error('Không thể kết nối đến máy chủ cấu hình');
      }
      
      const json = await response.json();
      
      if (!json.success || !json.data) {
        throw new Error('Dữ liệu cấu hình không hợp lệ');
      }
      
      setConfigs(Array.isArray(json.data) ? json.data.reduce((acc, cur) => ({...acc, [cur.key]: cur.value}), {}) : json.data);
    } catch (err) {
      setError(err.message || 'Lỗi tải cấu hình hệ thống');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Listen to real-time config updates
  useSSE(token, 'config_updated', () => {
    fetchConfigs(true); // silent fetch
  });

  if (loading && !configs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
          <p className="text-slate-500 font-medium">Đang tải cấu hình hệ thống...</p>
        </div>
      </div>
    );
  }

  if (error && !configs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Lỗi Kết Nối Hệ Thống</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <ConfigContext.Provider value={configs}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useSystemConfig = () => {
  const context = useContext(ConfigContext);
  if (context === null) {
    throw new Error('useSystemConfig must be used within a ConfigProvider');
  }
  return context;
};
