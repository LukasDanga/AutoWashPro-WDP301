import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import api from '../api/client';
import { SOCKET_EVENTS } from '../utils/socketEvents';
import { sseService } from '../services/sse';

type ConfigContextType = {
  configs: Record<string, any>;
};

const ConfigContext = createContext<ConfigContextType | null>(null);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configs, setConfigs] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/configs/public');
      const data = response.data?.data || response.data;
      
      if (!data) {
        throw new Error('Dữ liệu cấu hình không hợp lệ');
      }
      
      const configMap: Record<string, any> = Array.isArray(data) 
        ? data.reduce((acc, cur) => ({...acc, [cur.key]: cur.value}), {}) 
        : data;
      
      setConfigs(configMap);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải cấu hình hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Subscribe to real-time config updates
  useEffect(() => {
    const unsubscribe = sseService.subscribe(SOCKET_EVENTS.CONFIG_UPDATED, () => {
      fetchConfigs();
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Đang tải dữ liệu hệ thống...</Text>
      </View>
    );
  }

  if (error || !configs) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không thể kết nối đến máy chủ</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchConfigs}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ConfigContext.Provider value={{ configs }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useSystemConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useSystemConfig must be used within a ConfigProvider');
  }
  return context.configs;
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  }
});
