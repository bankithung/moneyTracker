import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { updateUserProfile, logout } from '../../redux/slices/authSlice';
import { resetAllData } from '../../redux/slices/settingsSlice';
import { toggleTheme } from '../../redux/slices/themeSlice';

const SettingsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { theme, isDark } = useSelector(state => state.theme);
    const { user, loading: authLoading } = useSelector(state => state.auth);
    const { loading: settingsLoading } = useSelector(state => state.settings);

    const [income, setIncome] = useState(user?.income?.toString() || '0');
    const [currency, setCurrency] = useState(user?.currency || '$');
    const [ruleNeeds, setRuleNeeds] = useState(user?.rule_needs?.toString() || '50');
    const [ruleWants, setRuleWants] = useState(user?.rule_wants?.toString() || '30');
    const [ruleSavings, setRuleSavings] = useState(user?.rule_savings?.toString() || '20');
    const [saving, setSaving] = useState(false);

    const currencies = [
        { code: '$', name: 'Dollar' },
        { code: '₹', name: 'Rupee' },
        { code: '€', name: 'Euro' },
        { code: '£', name: 'Pound' },
        { code: '¥', name: 'Yen' },
    ];

    const handleSave = async () => {
        const needs = parseInt(ruleNeeds) || 0;
        const wants = parseInt(ruleWants) || 0;
        const savings = parseInt(ruleSavings) || 0;

        if (Math.abs(needs + wants + savings - 100) > 0.1) {
            Alert.alert('Error', 'Budget rules must add up to 100%');
            return;
        }

        setSaving(true);
        try {
            await dispatch(updateUserProfile({
                income: parseFloat(income) || 0,
                currency,
                rule_needs: needs,
                rule_wants: wants,
                rule_savings: savings,
                theme: isDark ? 'dark' : 'light',
            })).unwrap();
            Alert.alert('Success', 'Settings saved!');
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        Alert.alert(
            'Reset All Data',
            'This will delete all transactions and reset settings. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(resetAllData()).unwrap();
                            Alert.alert('Success', 'All data has been reset');
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to reset data');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleTheme = () => {
        dispatch(toggleTheme());
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    const calculateAmount = (percentage) => {
        const incomeVal = parseFloat(income) || 0;
        const percentVal = parseFloat(percentage) || 0;
        const value = (incomeVal * percentVal) / 100;
        return value.toFixed(0);
    };

    const styles = createStyles(theme);

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.bgBody}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Income Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Monthly Income</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputPrefix}>{currency}</Text>
                        <TextInput
                            style={styles.input}
                            value={income}
                            onChangeText={setIncome}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={theme.textDisable}
                        />
                    </View>
                </View>

                {/* Currency Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Currency</Text>
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
                                <Text style={[styles.currencyName, currency === c.code && styles.currencyNameActive]}>
                                    {c.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Budget Rules Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Budget Rules (Must sum to 100%)</Text>
                    <View style={styles.rulesRow}>
                        <View style={styles.ruleItem}>
                            <Text style={styles.ruleLabel}>Needs</Text>
                            <View style={[styles.ruleInput, { borderColor: theme.catNeeds }]}>
                                <TextInput
                                    style={styles.ruleValue}
                                    value={ruleNeeds}
                                    onChangeText={setRuleNeeds}
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.rulePercent}>%</Text>
                            </View>
                            <Text style={[styles.calcAmount, { color: theme.catNeeds }]}>
                                {currency}{calculateAmount(ruleNeeds)}
                            </Text>
                        </View>
                        <View style={styles.ruleItem}>
                            <Text style={styles.ruleLabel}>Wants</Text>
                            <View style={[styles.ruleInput, { borderColor: theme.catWants }]}>
                                <TextInput
                                    style={styles.ruleValue}
                                    value={ruleWants}
                                    onChangeText={setRuleWants}
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.rulePercent}>%</Text>
                            </View>
                            <Text style={[styles.calcAmount, { color: theme.catWants }]}>
                                {currency}{calculateAmount(ruleWants)}
                            </Text>
                        </View>
                        <View style={styles.ruleItem}>
                            <Text style={styles.ruleLabel}>Savings</Text>
                            <View style={[styles.ruleInput, { borderColor: theme.catSavings }]}>
                                <TextInput
                                    style={styles.ruleValue}
                                    value={ruleSavings}
                                    onChangeText={setRuleSavings}
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.rulePercent}>%</Text>
                            </View>
                            <Text style={[styles.calcAmount, { color: theme.catSavings }]}>
                                {currency}{calculateAmount(ruleSavings)}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.rulesSum}>
                        Total: {(parseInt(ruleNeeds) || 0) + (parseInt(ruleWants) || 0) + (parseInt(ruleSavings) || 0)}%
                    </Text>
                </View>

                {/* Theme Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Appearance</Text>
                    <TouchableOpacity style={styles.themeToggle} onPress={handleToggleTheme}>
                        <View style={styles.themeLeft}>
                            <Icon
                                name={isDark ? 'weather-night' : 'weather-sunny'}
                                size={24}
                                color={theme.primary}
                            />
                            <Text style={styles.themeLabel}>
                                {isDark ? 'Dark Mode' : 'Light Mode'}
                            </Text>
                        </View>
                        <View style={[styles.toggleTrack, isDark && styles.toggleTrackActive]}>
                            <View style={[styles.toggleThumb, isDark && styles.toggleThumbActive]} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Account Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Info</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Phone</Text>
                        <Text style={styles.infoValue}>{user?.phone}</Text>
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Icon name="content-save" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Danger Zone */}
                <View style={styles.dangerSection}>
                    <Text style={styles.dangerTitle}>Danger Zone</Text>
                    <TouchableOpacity style={styles.dangerBtn} onPress={handleReset}>
                        <Icon name="delete-forever" size={20} color="#fff" />
                        <Text style={styles.dangerBtnText}>Reset Everything</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Icon name="logout" size={20} color={theme.danger} />
                        <Text style={styles.logoutBtnText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const createStyles = (theme) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bgBody },
        header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.bgSurface, borderBottomWidth: 1, borderBottomColor: theme.border },
        backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
        headerTitle: { fontSize: 18, fontWeight: '700', color: theme.textMain },
        content: { flex: 1, paddingHorizontal: 16 },
        section: { backgroundColor: theme.bgSurface, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: theme.border },
        sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.textSub, marginBottom: 12 },
        inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgAlt, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
        inputPrefix: { fontSize: 20, fontWeight: '600', color: theme.textMain, paddingLeft: 16 },
        input: { flex: 1, fontSize: 18, fontWeight: '600', color: theme.textMain, paddingVertical: 14, paddingHorizontal: 8 },
        currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        currencyItem: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: theme.bgAlt, borderWidth: 1, borderColor: theme.border },
        currencyItemActive: { backgroundColor: `${theme.primary}15`, borderColor: theme.primary },
        currencyCode: { fontSize: 18, fontWeight: '700', color: theme.textMain, textAlign: 'center' },
        currencyCodeActive: { color: theme.primary },
        currencyName: { fontSize: 11, color: theme.textSub, textAlign: 'center' },
        currencyNameActive: { color: theme.primary },
        rulesRow: { flexDirection: 'row', gap: 10 },
        ruleItem: { flex: 1 },
        ruleLabel: { fontSize: 12, fontWeight: '500', color: theme.textSub, marginBottom: 6 },
        ruleInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgAlt, borderRadius: 10, borderWidth: 2, paddingHorizontal: 12 },
        ruleValue: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.textMain, textAlign: 'center', paddingVertical: 10 },
        rulePercent: { fontSize: 14, color: theme.textSub },
        calcAmount: { fontSize: 13, fontWeight: '700', marginTop: 6, textAlign: 'center' },
        rulesSum: { marginTop: 12, fontSize: 13, color: theme.textSub, textAlign: 'center' },
        themeToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
        themeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        themeLabel: { fontSize: 16, fontWeight: '500', color: theme.textMain },
        toggleTrack: { width: 50, height: 28, borderRadius: 14, backgroundColor: theme.bgAlt, justifyContent: 'center', padding: 3 },
        toggleTrackActive: { backgroundColor: theme.primary },
        toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
        toggleThumbActive: { alignSelf: 'flex-end' },
        infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
        infoLabel: { fontSize: 14, color: theme.textSub },
        infoValue: { fontSize: 14, fontWeight: '600', color: theme.textMain },
        saveBtn: { backgroundColor: theme.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 12, marginTop: 24, gap: 8 },
        saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
        dangerSection: { backgroundColor: `${theme.danger}10`, borderRadius: 16, padding: 16, marginTop: 24, borderWidth: 1, borderColor: `${theme.danger}30` },
        dangerTitle: { fontSize: 14, fontWeight: '700', color: theme.danger, marginBottom: 16 },
        dangerBtn: { backgroundColor: theme.danger, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
        dangerBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
        logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, marginTop: 12, gap: 8 },
        logoutBtnText: { fontSize: 14, fontWeight: '600', color: theme.danger },
    });

export default SettingsScreen;
