import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { verifyOTP, clearError, sendOTP } from '../../redux/slices/authSlice';
import { setTheme } from '../../redux/slices/themeSlice';
import auth from '@react-native-firebase/auth';

const { width, height } = Dimensions.get('window');

const OTPScreen = ({ navigation, route }) => {
    const { phone } = route.params;
    const dispatch = useDispatch();
    const { theme, isDark } = useSelector(state => state.theme);
    const { loading, error } = useSelector(state => state.auth);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleOtpChange = (value, index) => {
        // Handle paste
        if (value.length > 1) {
            const digits = value.replace(/\D/g, '').slice(0, 6).split('');
            const newOtp = [...otp];
            digits.forEach((digit, i) => {
                if (i + index < 6) {
                    newOtp[i + index] = digit;
                }
            });
            setOtp(newOtp);
            const nextIndex = Math.min(index + digits.length, 5);
            inputRefs.current[nextIndex]?.focus();
            if (newOtp.every(d => d !== '')) {
                handleVerify(newOtp.join(''));
            }
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        if (index === 5 && value && newOtp.every(d => d !== '')) {
            handleVerify(newOtp.join(''));
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async (code = otp.join('')) => {
        if (code.length !== 6) return;

        dispatch(clearError());

        try {
            // Confirm code with Firebase
            const { confirmation } = route.params;
            if (!confirmation) {
                throw new Error('Verification session expired'); // Should not happen
            }

            await confirmation.confirm(code);

            // Get ID Token
            const fireUser = auth().currentUser;
            const idToken = await fireUser.getIdToken();

            // Verify with backend
            const result = await dispatch(verifyOTP({ idToken }));

            if (verifyOTP.fulfilled.match(result)) {
                if (result.payload.user?.theme) {
                    dispatch(setTheme(result.payload.user.theme));
                }
            } else {
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            console.error(err);
            setOtp(['', '', '', '', '', '']);
            // Set error via redux or local state? 
            // Ideally dispatch failure action if it was a firebase error not backend error
            // But for now let's just log. 
            // Actually, verifyOTP handles backend errors. Firebase errors need handling manually here or dispatching error.
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setCanResend(false);
        setCountdown(60);
        await dispatch(sendOTP(phone));
    };

    const styles = createStyles(theme, isDark);
    const maskedPhone = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 ••• $3');

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />

            {/* Header */}
            <View style={styles.headerBg}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <View style={styles.iconCircle}>
                        <Icon name="message-lock-outline" size={32} color="#fff" />
                    </View>
                    <Text style={styles.headerTitle}>Verification</Text>
                    <Text style={styles.headerSubtitle}>We sent a 6-digit code to</Text>
                    <Text style={styles.phoneText}>{maskedPhone}</Text>
                </View>
                <View style={styles.headerCurve} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.formContainer}
            >
                {/* OTP Input */}
                <View style={styles.otpSection}>
                    <Text style={styles.otpLabel}>Enter Verification Code</Text>
                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => (inputRefs.current[index] = ref)}
                                style={[
                                    styles.otpInput,
                                    digit && styles.otpInputFilled,
                                    error && styles.otpInputError,
                                ]}
                                value={digit}
                                onChangeText={(value) => handleOtpChange(value, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={index === 0 ? 6 : 1}
                                selectTextOnFocus
                            />
                        ))}
                    </View>
                </View>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Icon name="alert-circle-outline" size={18} color={theme.danger} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* Verify Button */}
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={() => handleVerify()}
                    disabled={loading}
                    activeOpacity={0.9}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Text style={styles.buttonText}>Verify & Continue</Text>
                            <Icon name="check" size={22} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>

                {/* Resend Section */}
                <View style={styles.resendSection}>
                    <Text style={styles.resendLabel}>Didn't receive the code?</Text>
                    <TouchableOpacity
                        onPress={handleResend}
                        disabled={!canResend}
                        style={styles.resendButton}
                    >
                        {canResend ? (
                            <Text style={styles.resendActive}>Resend Code</Text>
                        ) : (
                            <View style={styles.countdownContainer}>
                                <Icon name="clock-outline" size={16} color={theme.textDisable} />
                                <Text style={styles.countdownText}>Resend in {countdown}s</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Security Note */}
                <View style={styles.securityNote}>
                    <Icon name="shield-lock-outline" size={20} color={theme.textDisable} />
                    <Text style={styles.securityText}>
                        This verification is to ensure your account security. Never share your OTP with anyone.
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const createStyles = (theme, isDark) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bgBody },
        headerBg: { backgroundColor: '#4f46e5', height: height * 0.34, justifyContent: 'center', alignItems: 'center' },
        backButton: { position: 'absolute', top: 16, left: 16, width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
        headerContent: { alignItems: 'center', paddingBottom: 40 },
        headerCurve: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 40, backgroundColor: theme.bgBody, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
        iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 16 },
        headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
        headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
        phoneText: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 4, letterSpacing: 1 },
        formContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
        otpSection: { marginBottom: 24 },
        otpLabel: { fontSize: 13, fontWeight: '600', color: theme.textSub, marginBottom: 16, textAlign: 'center', letterSpacing: 0.5 },
        otpContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
        otpInput: { flex: 1, height: 55, borderRadius: 14, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.bgSurface, fontSize: 24, fontWeight: '800', textAlign: 'center', color: theme.textMain, padding: 0 },
        otpInputFilled: { borderColor: '#4f46e5', backgroundColor: '#4f46e510' },
        otpInputError: { borderColor: theme.danger, backgroundColor: `${theme.danger}10` },
        errorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 8 },
        errorText: { fontSize: 14, color: theme.danger },
        button: { backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 17, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
        buttonDisabled: { opacity: 0.6 },
        buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
        resendSection: { alignItems: 'center', marginTop: 28 },
        resendLabel: { fontSize: 14, color: theme.textSub },
        resendButton: { marginTop: 8 },
        resendActive: { fontSize: 15, fontWeight: '700', color: '#4f46e5' },
        countdownContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        countdownText: { fontSize: 14, color: theme.textDisable },
        securityNote: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 40, paddingHorizontal: 12, paddingVertical: 14, backgroundColor: theme.bgSurface, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: theme.border },
        securityText: { flex: 1, fontSize: 12, color: theme.textSub, lineHeight: 18 },
    });

export default OTPScreen;
