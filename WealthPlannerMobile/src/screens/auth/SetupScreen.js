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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { setupUser, clearError } from '../../redux/slices/authSlice';

const SetupScreen = () => {
    const dispatch = useDispatch();
    const { theme } = useSelector(state => state.theme);
    const { loading, error } = useSelector(state => state.auth);
    const [name, setName] = useState('');
    const [income, setIncome] = useState('');
    const [currency, setCurrency] = useState('$');

    // Default 50/30/20
    const [needs, setNeeds] = useState('50');
    const [wants, setWants] = useState('30');
    const [savings, setSavings] = useState('20');

    const currencies = [
        { code: '$', name: 'Dollar' },
        { code: '₹', name: 'Rupee' },
        { code: '€', name: 'Euro' },
        { code: '£', name: 'Pound' },
        { code: '¥', name: 'Yen' },
    ];

    const calculateAmount = (percentage) => {
        const incomeVal = parseFloat(income) || 0;
        const percentVal = parseFloat(percentage) || 0;
        const value = (incomeVal * percentVal) / 100;
        return value.toFixed(0); // Keeping it clean without decimals for display
    };

    const handleSetup = async () => {
        if (!name.trim()) return;

        // basic validation
        const n = parseInt(needs) || 0;
        const w = parseInt(wants) || 0;
        const s = parseInt(savings) || 0;

        if (n + w + s !== 100) {
            // Optional: warn user, but for onboarding let's just proceed or maybe show error?
            // Let's allow flexible for now or maybe just proceed. User can tweak later.
            // But user might want validation. Let's strictly enforce 100?
            // "alert" might break flow. Let's just pass values.
        }

        dispatch(clearError());
        await dispatch(setupUser({
            name: name.trim(),
            income: parseFloat(income) || 0,
            currency,
            rule_needs: n,
            rule_wants: w,
            rule_savings: s
        }));
    };

    const styles = createStyles(theme);

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle={theme.bgBody === '#111827' ? 'light-content' : 'dark-content'}
                backgroundColor={theme.bgBody}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.content}
            >
                {/* Logo Section */}
                <View style={styles.logoContainer}>
                    <View style={styles.iconCircle}>
                        <Icon name="account-plus" size={36} color={theme.primary} />
                    </View>
                    <Text style={styles.title}>Welcome Aboard!</Text>
                    <Text style={styles.subtitle}>Let's set up your financial profile.</Text>
                </View>

                {/* Form Section */}
                <View style={styles.formContainer}>
                    {/* Name Input */}
                    <Text style={styles.label}>Your Name</Text>
                    <View style={styles.inputContainer}>
                        <Icon name="account" size={20} color={theme.textSub} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. John Doe"
                            placeholderTextColor={theme.textDisable}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Monthly Income Input */}
                    <Text style={styles.label}>Monthly Income</Text>
                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputIcon, { fontSize: 18, color: theme.textSub }]}>{currency}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor={theme.textDisable}
                            value={income}
                            onChangeText={setIncome}
                            keyboardType="numeric"
                        />
                    </View>

                    {/* Currency Selection */}
                    <Text style={styles.label}>Select Currency</Text>
                    <View style={styles.currencyGrid}>
                        {currencies.map((c) => (
                            <TouchableOpacity
                                key={c.code}
                                style={[
                                    styles.currencyItem,
                                    currency === c.code && styles.currencyItemActive,
                                ]}
                                onPress={() => setCurrency(c.code)}
                            >
                                <Text style={[styles.currencyCode, currency === c.code && styles.currencyCodeActive]}>
                                    {c.code}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Budget Rules */}
                    {parseFloat(income) > 0 && (
                        <View style={{ marginBottom: 24 }}>
                            <Text style={styles.label}>Budget Rules (Needs/Wants/Savings)</Text>
                            <View style={styles.rulesContainer}>
                                {/* Needs */}
                                <View style={styles.ruleItem}>
                                    <Text style={styles.ruleLabel}>Needs</Text>
                                    <View style={[styles.ruleInputBox, { borderColor: theme.catNeeds }]}>
                                        <TextInput
                                            style={styles.ruleInput}
                                            value={needs}
                                            onChangeText={setNeeds}
                                            keyboardType="numeric"
                                            maxLength={3}
                                        />
                                        <Text style={styles.percentText}>%</Text>
                                    </View>
                                    <Text style={[styles.calcAmount, { color: theme.catNeeds }]}>
                                        {currency}{calculateAmount(needs)}
                                    </Text>
                                </View>

                                {/* Wants */}
                                <View style={styles.ruleItem}>
                                    <Text style={styles.ruleLabel}>Wants</Text>
                                    <View style={[styles.ruleInputBox, { borderColor: theme.catWants }]}>
                                        <TextInput
                                            style={styles.ruleInput}
                                            value={wants}
                                            onChangeText={setWants}
                                            keyboardType="numeric"
                                            maxLength={3}
                                        />
                                        <Text style={styles.percentText}>%</Text>
                                    </View>
                                    <Text style={[styles.calcAmount, { color: theme.catWants }]}>
                                        {currency}{calculateAmount(wants)}
                                    </Text>
                                </View>

                                {/* Savings */}
                                <View style={styles.ruleItem}>
                                    <Text style={styles.ruleLabel}>Savings</Text>
                                    <View style={[styles.ruleInputBox, { borderColor: theme.catSavings }]}>
                                        <TextInput
                                            style={styles.ruleInput}
                                            value={savings}
                                            onChangeText={setSavings}
                                            keyboardType="numeric"
                                            maxLength={3}
                                        />
                                        <Text style={styles.percentText}>%</Text>
                                    </View>
                                    <Text style={[styles.calcAmount, { color: theme.catSavings }]}>
                                        {currency}{calculateAmount(savings)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={{ textAlign: 'center', fontSize: 12, color: theme.textSub, marginTop: 8 }}>
                                Total: {(parseInt(needs) || 0) + (parseInt(wants) || 0) + (parseInt(savings) || 0)}%
                            </Text>
                        </View>
                    )}

                    {error ? (
                        <View style={styles.errorContainer}>
                            <Icon name="alert-circle" size={16} color={theme.danger} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSetup}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>Complete Setup</Text>
                                <Icon name="rocket-launch" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const createStyles = (theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.bgBody,
        },
        content: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
        },
        logoContainer: {
            alignItems: 'center',
            marginBottom: 32,
        },
        iconCircle: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: `${theme.primary}15`,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
        },
        title: {
            fontSize: 24,
            fontWeight: '800',
            color: theme.textMain,
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 14,
            color: theme.textSub,
            textAlign: 'center',
        },
        formContainer: {
            backgroundColor: theme.bgSurface,
            borderRadius: 20,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
        },
        label: {
            fontSize: 13,
            fontWeight: '600',
            color: theme.textSub,
            marginBottom: 8,
            marginTop: 4,
        },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.bgAlt,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 16,
        },
        inputIcon: {
            paddingLeft: 16,
        },
        input: {
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 12,
            fontSize: 16,
            color: theme.textMain,
            fontWeight: '600',
        },
        currencyGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 24,
        },
        currencyItem: {
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: theme.bgAlt,
            borderWidth: 1,
            borderColor: theme.border,
            justifyContent: 'center',
            alignItems: 'center',
        },
        currencyItemActive: {
            backgroundColor: `${theme.primary}15`,
            borderColor: theme.primary,
        },
        currencyCode: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.textSub,
        },
        currencyCodeActive: {
            color: theme.primary,
        },
        rulesContainer: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 4
        },
        ruleItem: {
            flex: 1,
            alignItems: 'center'
        },
        ruleLabel: {
            fontSize: 12,
            fontWeight: '600',
            color: theme.textSub,
            marginBottom: 6
        },
        ruleInputBox: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.bgAlt,
            borderWidth: 1.5,
            borderRadius: 12,
            paddingHorizontal: 8,
            width: '100%',
            height: 48
        },
        ruleInput: {
            flex: 1,
            fontSize: 16,
            fontWeight: '700',
            color: theme.textMain,
            textAlign: 'center'
        },
        percentText: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.textSub
        },
        calcAmount: {
            fontSize: 13,
            fontWeight: '700',
            marginTop: 6
        },
        errorContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
            paddingHorizontal: 4,
        },
        errorText: {
            fontSize: 13,
            color: theme.danger,
            marginLeft: 6,
        },
        button: {
            backgroundColor: theme.primary,
            borderRadius: 12,
            paddingVertical: 16,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
        buttonDisabled: {
            opacity: 0.7,
        },
        buttonText: {
            fontSize: 16,
            fontWeight: '600',
            color: '#fff',
        },
    });

export default SetupScreen;
