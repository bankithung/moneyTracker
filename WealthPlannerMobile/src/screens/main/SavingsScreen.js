import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSavings, setSavingsYear } from '../../redux/slices/settingsSlice';

const { width } = Dimensions.get('window');

const SavingsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { theme, isDark } = useSelector(state => state.theme);
    const { user } = useSelector(state => state.auth);
    const { savings, savingsYear } = useSelector(state => state.settings);

    useEffect(() => {
        dispatch(fetchSavings(savingsYear));
    }, [savingsYear]);

    const handlePrevYear = () => dispatch(setSavingsYear(savingsYear - 1));
    const handleNextYear = () => {
        if (savingsYear < new Date().getFullYear()) {
            dispatch(setSavingsYear(savingsYear + 1));
        }
    };

    const styles = createStyles(theme);

    const monthlyGoal = savings?.monthly_goal || 0;
    const yearlyGoal = savings?.yearly_goal || 0;
    const totalSavedYear = savings?.total_saved_year || 0;
    const totalSavedAllTime = savings?.total_saved_all_time || 0;
    const avgMonthly = savings?.avg_monthly || 0;
    const savingsRate = savings?.savings_rate || 0;
    const projectedYear = savings?.projected_year || 0;
    const bestMonthName = savings?.best_month_name || 'N/A';
    const bestMonthVal = savings?.best_month_val || 0;
    const chartLabels = savings?.chart_labels || [];
    const chartValues = savings?.chart_values || [];

    const maxChartVal = Math.max(...chartValues, 1);

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bgBody} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Savings Analysis</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Year Navigation */}
                <View style={styles.yearNav}>
                    <TouchableOpacity style={styles.yearBtn} onPress={handlePrevYear}>
                        <Icon name="chevron-left" size={24} color={theme.textSub} />
                    </TouchableOpacity>
                    <Text style={styles.yearTitle}>{savingsYear}</Text>
                    <TouchableOpacity
                        style={[styles.yearBtn, savingsYear >= new Date().getFullYear() && styles.yearBtnDisabled]}
                        onPress={handleNextYear}
                        disabled={savingsYear >= new Date().getFullYear()}
                    >
                        <Icon name="chevron-right" size={24} color={savingsYear >= new Date().getFullYear() ? theme.textDisable : theme.textSub} />
                    </TouchableOpacity>
                </View>

                {/* Total Savings Card */}
                <View style={styles.totalCard}>
                    <View style={styles.totalCardInner}>
                        <Icon name="piggy-bank" size={40} color={theme.catSavings} />
                        <View style={styles.totalInfo}>
                            <Text style={styles.totalLabel}>Total Saved ({savingsYear})</Text>
                            <Text style={styles.totalAmount}>{user?.currency}{totalSavedYear.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={styles.goalProgress}>
                        <View style={styles.goalProgressBar}>
                            <View
                                style={[
                                    styles.goalProgressFill,
                                    { width: `${Math.min(100, (totalSavedYear / Math.max(yearlyGoal, 1)) * 100)}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.goalText}>
                            {((totalSavedYear / Math.max(yearlyGoal, 1)) * 100).toFixed(0)}% of {user?.currency}{yearlyGoal.toLocaleString()} goal
                        </Text>
                    </View>
                </View>

                {/* Monthly Chart */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Icon name="chart-bar" size={20} color={theme.primary} />
                        <Text style={styles.cardTitle}>Monthly Trend</Text>
                    </View>
                    <View style={styles.chartContainer}>
                        {chartLabels.map((label, index) => (
                            <View key={index} style={styles.chartBar}>
                                <View style={styles.chartBarBg}>
                                    <View
                                        style={[
                                            styles.chartBarFill,
                                            { height: `${(chartValues[index] / maxChartVal) * 100}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.chartLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                        <Icon name="percent" size={24} color={theme.primary} />
                        <Text style={styles.metricValue}>{savingsRate.toFixed(1)}%</Text>
                        <Text style={styles.metricLabel}>Savings Rate</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Icon name="calendar-month" size={24} color={theme.catWants} />
                        <Text style={styles.metricValue}>{user?.currency}{avgMonthly.toFixed(0)}</Text>
                        <Text style={styles.metricLabel}>Avg/Month</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Icon name="trending-up" size={24} color={theme.success} />
                        <Text style={styles.metricValue}>{user?.currency}{projectedYear.toFixed(0)}</Text>
                        <Text style={styles.metricLabel}>Year Projection</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Icon name="trophy" size={24} color={theme.catNeeds} />
                        <Text style={styles.metricValue}>{bestMonthName}</Text>
                        <Text style={styles.metricLabel}>Best Month</Text>
                    </View>
                </View>

                {/* All Time */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Icon name="infinity" size={20} color={theme.primary} />
                        <Text style={styles.cardTitle}>All Time Savings</Text>
                    </View>
                    <Text style={styles.allTimeAmount}>{user?.currency}{totalSavedAllTime.toLocaleString()}</Text>
                </View>

                {/* Recent Savings */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Icon name="history" size={20} color={theme.primary} />
                        <Text style={styles.cardTitle}>Recent Savings</Text>
                    </View>
                    {savings?.recent_savings?.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Icon name="piggy-bank-outline" size={48} color={theme.textDisable} />
                            <Text style={styles.emptyText}>No savings yet. Start saving!</Text>
                        </View>
                    ) : (
                        savings?.recent_savings?.slice(0, 5).map((tx, index) => (
                            <View key={index} style={styles.txItem}>
                                <View style={styles.txIcon}>
                                    <Icon name="piggy-bank" size={20} color={theme.catSavings} />
                                </View>
                                <View style={styles.txInfo}>
                                    <Text style={styles.txDesc}>{tx.description}</Text>
                                    <Text style={styles.txDate}>{tx.date}</Text>
                                </View>
                                <Text style={styles.txAmount}>{user?.currency}{tx.amount}</Text>
                            </View>
                        ))
                    )}
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
        yearNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
        yearBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.bgSurface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
        yearBtnDisabled: { opacity: 0.5 },
        yearTitle: { fontSize: 24, fontWeight: '800', color: theme.textMain },
        totalCard: { backgroundColor: theme.bgSurface, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
        totalCardInner: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
        totalInfo: { marginLeft: 16 },
        totalLabel: { fontSize: 14, color: theme.textSub },
        totalAmount: { fontSize: 28, fontWeight: '800', color: theme.catSavings },
        goalProgress: { marginTop: 8 },
        goalProgressBar: { height: 10, backgroundColor: theme.bgAlt, borderRadius: 5, overflow: 'hidden' },
        goalProgressFill: { height: '100%', backgroundColor: theme.catSavings, borderRadius: 5 },
        goalText: { fontSize: 12, color: theme.textSub, marginTop: 8, textAlign: 'right' },
        card: { backgroundColor: theme.bgSurface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
        cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
        cardTitle: { fontSize: 16, fontWeight: '700', color: theme.textMain },
        chartContainer: { flexDirection: 'row', justifyContent: 'space-between', height: 120, alignItems: 'flex-end' },
        chartBar: { flex: 1, alignItems: 'center' },
        chartBarBg: { width: 16, height: 80, backgroundColor: theme.bgAlt, borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' },
        chartBarFill: { width: '100%', backgroundColor: theme.catSavings, borderRadius: 8 },
        chartLabel: { fontSize: 10, color: theme.textSub, marginTop: 8 },
        metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
        metricCard: { width: (width - 44) / 2, backgroundColor: theme.bgSurface, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
        metricValue: { fontSize: 18, fontWeight: '700', color: theme.textMain, marginTop: 8 },
        metricLabel: { fontSize: 12, color: theme.textSub, marginTop: 4 },
        allTimeAmount: { fontSize: 32, fontWeight: '800', color: theme.primary, textAlign: 'center', marginVertical: 16 },
        emptyState: { alignItems: 'center', paddingVertical: 32 },
        emptyText: { marginTop: 12, fontSize: 14, color: theme.textSub },
        txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
        txIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${theme.catSavings}15`, justifyContent: 'center', alignItems: 'center' },
        txInfo: { flex: 1, marginLeft: 12 },
        txDesc: { fontSize: 14, fontWeight: '600', color: theme.textMain },
        txDate: { fontSize: 12, color: theme.textSub, marginTop: 2 },
        txAmount: { fontSize: 16, fontWeight: '700', color: theme.catSavings },
    });

export default SavingsScreen;
