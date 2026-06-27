/**
 * AutoWashPro Root Redirect
 * Redirect to appropriate screen based on auth state
 */

import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { Loading } from '../src/components/common';

export default function Index() {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return <Loading fullScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
