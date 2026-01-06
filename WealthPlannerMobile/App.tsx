import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ActivityIndicator, View } from 'react-native';
import { store, persistor } from './src/redux/store';
import { initializeAuth } from './src/api/client';
import AppNavigator from './src/navigation/AppNavigator';

const AppContent = () => {
  const { tokens } = useSelector(state => state.auth);

  useEffect(() => {
    // Initialize auth header from AsyncStorage on app start
    initializeAuth();
  }, []);

  // Re-initialize when tokens change (restored from persist)
  useEffect(() => {
    if (tokens?.access) {
      initializeAuth();
    }
  }, [tokens]);

  return <AppNavigator />;
};

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate
          loading={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#4f46e5" />
            </View>
          }
          persistor={persistor}
        >
          <AppContent />
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
};

export default App;
