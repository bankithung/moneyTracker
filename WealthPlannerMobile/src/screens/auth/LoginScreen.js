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
    Image,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { clearError, checkUserStatus } from '../../redux/slices/authSlice';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { theme, isDark } = useSelector(state => state.theme);
    const [loadingLocal, setLoadingLocal] = useState(false);
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const loading = loadingLocal;

    const handleContinue = async () => {
        if (!phone || phone.length < 10) return;

        setLoadingLocal(true);
        dispatch(clearError());
        setError('');

        try {
            // Check if user exists
            const result = await dispatch(checkUserStatus(phone)).unwrap();

            // Navigate to PIN screen
            // If exists AND pinSet: Login Mode
            // If !exists OR !pinSet: Register/Set PIN Mode
            const isNewUser = !result.exists || !result.pinSet;

            navigation.navigate('Pin', {
                phone: result.phone,
                isNewUser
            });
        } catch (err) {
            console.error(err);
            setError(typeof err === 'string' ? err : 'Something went wrong');
        } finally {
            setLoadingLocal(false);
        }
    };

    const styles = createStyles(theme, isDark);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />

            {/* Background Gradient Header */}
            <View style={styles.headerBg}>
                <View style={styles.headerContent}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoCircle}>
                            <Icon name="wallet-outline" size={36} color="#fff" />
                        </View>
                    </View>
                    <Text style={styles.appName}>Wealth Planner</Text>
                    <Text style={styles.tagline}>Track • Plan • Prosper</Text>
                </View>
                <View style={styles.headerCurve} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.formContainer}
            >
                {/* Welcome Text */}
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>Welcome Back</Text>
                    <Text style={styles.welcomeSubtitle}>Enter your phone number to continue</Text>
                </View>

                {/* Phone Input */}
                <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.inputContainer}>
                        <View style={styles.countryCode}>
                            <Text style={styles.countryText}>+91</Text>
                            <Icon name="chevron-down" size={16} color={theme.textSub} />
                        </View>
                        <View style={styles.inputDivider} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter 10-digit number"
                            placeholderTextColor={theme.textDisable}
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                            maxLength={10}
                        />
                        {phone.length === 10 && (
                            <Icon name="check-circle" size={22} color={theme.success} />
                        )}
                    </View>
                </View>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Icon name="alert-circle-outline" size={18} color={theme.danger} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* Continue Button */}
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled, phone.length < 10 && styles.buttonDisabled]}
                    onPress={handleContinue}
                    disabled={loading || phone.length < 10}
                    activeOpacity={0.9}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Text style={styles.buttonText}>Continue</Text>
                            <Icon name="arrow-right" size={22} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerRow}>
                        <Icon name="shield-check" size={18} color={theme.textDisable} />
                        <Text style={styles.footerText}>Your data is encrypted & secure</Text>
                    </View>
                </View>

                {/* Features Section */}
                <View style={styles.featuresSection}>
                    <View style={styles.featureItem}>
                        <View style={[styles.featureIcon, { backgroundColor: `${theme.catNeeds}15` }]}>
                            <Icon name="chart-pie" size={20} color={theme.catNeeds} />
                        </View>
                        <Text style={styles.featureText}>Budget Tracking</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <View style={[styles.featureIcon, { backgroundColor: `${theme.catSavings}15` }]}>
                            <Icon name="piggy-bank" size={20} color={theme.catSavings} />
                        </View>
                        <Text style={styles.featureText}>Savings Goals</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <View style={[styles.featureIcon, { backgroundColor: `${theme.catWants}15` }]}>
                            <Icon name="lightbulb-on" size={20} color={theme.catWants} />
                        </View>
                        <Text style={styles.featureText}>Smart Insights</Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const createStyles = (theme, isDark) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bgBody },
        headerBg: { backgroundColor: '#4f46e5', height: height * 0.32, justifyContent: 'center', alignItems: 'center' },
        headerContent: { alignItems: 'center', paddingBottom: 40 },
        headerCurve: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 40, backgroundColor: theme.bgBody, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
        logoContainer: { marginBottom: 16 },
        logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
        appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
        tagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6, letterSpacing: 2 },
        formContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
        welcomeSection: { marginBottom: 28 },
        welcomeTitle: { fontSize: 26, fontWeight: '700', color: theme.textMain },
        welcomeSubtitle: { fontSize: 15, color: theme.textSub, marginTop: 6 },
        inputWrapper: { marginBottom: 32 },
        inputLabel: { fontSize: 13, fontWeight: '600', color: theme.textSub, marginBottom: 10, letterSpacing: 0.5 },
        inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSurface, borderRadius: 14, borderWidth: 1.5, borderColor: theme.border, overflow: 'hidden' },
        countryCode: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 16, gap: 4 },
        countryText: { fontSize: 16, fontWeight: '600', color: theme.textMain },
        inputDivider: { width: 1, height: 28, backgroundColor: theme.border },
        input: { flex: 1, paddingVertical: 18, paddingHorizontal: 16, fontSize: 18, color: theme.textMain, fontWeight: '500', letterSpacing: 1 },
        errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4, gap: 8 },
        errorText: { fontSize: 14, color: theme.danger },
        button: { backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 17, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
        buttonDisabled: { opacity: 0.6 },
        buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
        footer: { alignItems: 'center', marginTop: 24 },
        footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        footerText: { fontSize: 13, color: theme.textDisable },
        featuresSection: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: theme.border },
        featureItem: { alignItems: 'center' },
        featureIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
        featureText: { fontSize: 11, fontWeight: '600', color: theme.textSub },
    });

export default LoginScreen;
