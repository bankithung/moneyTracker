import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BalanceCard = ({ balance, income, spent, currency, theme, onViewBalance, onViewTransactions }) => {
    const styles = createStyles(theme);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>REMAINING BALANCE</Text>
            <Text style={[styles.balance, { color: balance >= 0 ? theme.primary : theme.danger }]}>
                {currency}{balance.toLocaleString()}
            </Text>

            {/* Restored Income/Expense Stats */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>INCOME</Text>
                    <Text style={[styles.statValue, { color: theme.success }]}>
                        {currency}{income.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>SPENT</Text>
                    <Text style={[styles.statValue, { color: theme.danger }]}>
                        {currency}{spent.toLocaleString()}
                    </Text>
                </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={onViewBalance}>
                    <Icon name="wallet-outline" size={20} color={theme.primary} />
                    <Text style={styles.buttonText}>View Balance</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.button} onPress={onViewTransactions}>
                    <Icon name="format-list-bulleted" size={20} color={theme.primary} />
                    <Text style={styles.buttonText}>View All</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (theme) =>
    StyleSheet.create({
        container: {
            backgroundColor: theme.bgSurface,
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
        },
        label: {
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            color: theme.textSub,
            marginBottom: 8,
        },
        balance: {
            fontSize: 42,
            fontWeight: '800',
            marginBottom: 24,
        },
        statsRow: {
            flexDirection: 'row',
            width: '100%',
            marginBottom: 16,
        },
        stat: {
            flex: 1,
            alignItems: 'center',
        },
        statLabel: {
            fontSize: 11,
            fontWeight: '600',
            color: theme.textSub,
            marginBottom: 4,
        },
        statValue: {
            fontSize: 16,
            fontWeight: '700',
        },
        statDivider: {
            width: 1,
            height: '100%',
            backgroundColor: theme.border,
        },
        separator: {
            width: '100%',
            height: 1,
            backgroundColor: theme.border,
            marginBottom: 4,
        },
        buttonRow: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            paddingTop: 4,
        },
        button: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            gap: 8,
        },
        buttonText: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.textMain,
        },
        divider: {
            width: 1,
            height: 24,
            backgroundColor: theme.border,
        },
    });

export default BalanceCard;
