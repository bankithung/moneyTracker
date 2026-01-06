import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StatusBar,
    Dimensions,
    Alert
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { loginWithPIN, registerWithPIN, clearError } from '../../redux/slices/authSlice';

const { width, height } = Dimensions.get('window');

const PinScreen = ({ route, navigation }) => {
    const { phone, isNewUser } = route.params;
    const dispatch = useDispatch();
    const { theme, isDark } = useSelector(state => state.theme);
    const { loading: authLoading, error: authError } = useSelector(state => state.auth);

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [name, setName] = useState(''); // Only for new users if we want to capture name here or later. Let's capture later in SetupScreen? 
    // Wait, SetupScreen logic in AppNavigator is: isNewUser ? SetupScreen : MainStack.
    // If we registerWithPIN, backend returns is_new_user=True (created=True).
    // So after register, we might go to SetupScreen.

    // For now, let's keep it simple. AuthSlice registerWithPIN returns user.

    const [localError, setLocalError] = useState('');

    const handleAction = async () => {
        setLocalError('');
        dispatch(clearError());

        if (pin.length !== 6) {
            setLocalError('PIN must be 6 digits');
            return;
        }

        if (isNewUser) {
            if (pin !== confirmPin) {
                setLocalError('PINs do not match');
                return;
            }
            // Register
            try {
                // We pass a default name or empty name, SetupScreen will handle name capture if needed
                await dispatch(registerWithPIN({ phone, pin, name: 'User' })).unwrap();
                // Navigation handled by AppNavigator state change
            } catch (err) {
                console.error(err);
            }
        } else {
            // Login
            try {
                await dispatch(loginWithPIN({ phone, pin })).unwrap();
                // Navigation handled by AppNavigator state change
            } catch (err) {
                console.error(err);
            }
        }
    };

    const styles = createStyles(theme, isDark);
    const loading = authLoading;
    const error = localError || authError;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />

            {/* Header */}
            <View style={styles.headerBg}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Icon name={isNewUser ? "shield-plus" : "shield-lock"} size={48} color="#fff" style={{ marginBottom: 16 }} />
                    <Text style={styles.headerTitle}>{isNewUser ? 'Create Security PIN' : 'Enter Security PIN'}</Text>
                    <Text style={styles.headerSubtitle}>for {phone}</Text>
                </View>
                <View style={styles.headerCurve} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.formContainer}
            >
                {/* Inputs */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>{isNewUser ? 'Create 6-Digit PIN' : 'Enter 6-Digit PIN'}</Text>
                    <View style={styles.inputContainer}>
                        <Icon name="lock-outline" size={20} color={theme.textSub} style={{ marginLeft: 16 }} />
                        <TextInput
                            style={styles.input}
                            placeholder="******"
                            placeholderTextColor={theme.textDisable}
                            keyboardType="numeric"
                            secureTextEntry
                            maxLength={6}
                            value={pin}
                            onChangeText={setPin}
                        />
                    </View>
                </View>

                {isNewUser && (
                    <View style={[styles.inputWrapper, { marginTop: 16 }]}>
                        <Text style={styles.inputLabel}>Confirm PIN</Text>
                        <View style={styles.inputContainer}>
                            <Icon name="lock-check-outline" size={20} color={theme.textSub} style={{ marginLeft: 16 }} />
                            <TextInput
                                style={styles.input}
                                placeholder="******"
                                placeholderTextColor={theme.textDisable}
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={6}
                                value={confirmPin}
                                onChangeText={setConfirmPin}
                            />
                        </View>
                    </View>
                )}

                {error ? (
                    <View style={styles.errorContainer}>
                        <Icon name="alert-circle-outline" size={18} color={theme.danger} />
                        <Text style={styles.errorText}>{typeof error === 'string' ? error : 'An error occurred'}</Text>
                    </View>
                ) : null}

                {!isNewUser && (
                    <View style={styles.warningContainer}>
                        <Icon name="alert-outline" size={16} color={theme.danger} />
                        <Text style={styles.warningText}>Forgot PIN? Account cannot be retrieved.</Text>
                    </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleAction}
                    disabled={loading}
                    activeOpacity={0.9}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Text style={styles.buttonText}>{isNewUser ? 'Create Account' : 'Login'}</Text>
                            <Icon name="arrow-right" size={22} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>

            </KeyboardAvoidingView>
        </View>
    );
};

const createStyles = (theme, isDark) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bgBody },
        headerBg: { backgroundColor: '#4f46e5', height: height * 0.35, justifyContent: 'center', paddingTop: 20 },
        headerContent: { alignItems: 'center', paddingBottom: 40 },
        headerCurve: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 40, backgroundColor: theme.bgBody, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
        backButton: { position: 'absolute', top: 50, left: 24, zIndex: 10, padding: 8 },
        headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
        headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
        formContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
        inputWrapper: {},
        inputLabel: { fontSize: 13, fontWeight: '600', color: theme.textSub, marginBottom: 10, letterSpacing: 0.5 },
        inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSurface, borderRadius: 14, borderWidth: 1.5, borderColor: theme.border, height: 56 },
        input: { flex: 1, paddingHorizontal: 16, fontSize: 18, color: theme.textMain, fontWeight: '600', letterSpacing: 2 },
        errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 4, gap: 8 },
        errorText: { fontSize: 14, color: theme.danger, flex: 1 },
        warningContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, gap: 8, borderWidth: 1, borderColor: '#fee2e2' },
        warningText: { fontSize: 12, color: '#dc2626' },
        button: { backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 17, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 32, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
        buttonDisabled: { opacity: 0.6 },
        buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
    });

export default PinScreen;
