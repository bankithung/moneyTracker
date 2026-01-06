import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { ActivityIndicator, View } from 'react-native';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import PinScreen from '../screens/auth/PinScreen';
import SetupScreen from '../screens/auth/SetupScreen';

// Main Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import SavingsScreen from '../screens/main/SavingsScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';

const Stack = createNativeStackNavigator();

const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Pin" component={PinScreen} />
    </Stack.Navigator>
);

const MainStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Savings" component={SavingsScreen} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} />
    </Stack.Navigator>
);

const AppNavigator = () => {
    const { isAuthenticated, isNewUser } = useSelector(state => state.auth);
    const { theme } = useSelector(state => state.theme);

    return (
        <NavigationContainer>
            {!isAuthenticated ? (
                <AuthStack />
            ) : isNewUser ? (
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Setup" component={SetupScreen} />
                </Stack.Navigator>
            ) : (
                <MainStack />
            )}
        </NavigationContainer>
    );
};

export default AppNavigator;
