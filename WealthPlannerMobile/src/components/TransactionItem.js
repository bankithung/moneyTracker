import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getCategoryColor } from '../theme/colors';

const getCategoryIcon = (category) => {
    const icons = {
        needs: 'home',
        wants: 'shopping',
        savings: 'piggy-bank',
        income: 'trending-up',
    };
    return icons[category] || 'circle';
};

const TransactionItem = ({ transaction, currency, theme, onEdit, onDelete }) => {
    const isIncome = transaction.category === 'income';
    const categoryColor = getCategoryColor(transaction.category, theme);

    const styles = createStyles(theme, categoryColor);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <View style={styles.container}>
            <View style={styles.left}>
                <View style={styles.iconBox}>
                    <Icon name={getCategoryIcon(transaction.category)} size={20} color={categoryColor} />
                </View>
                <View style={styles.details}>
                    <Text style={styles.title} numberOfLines={1}>
                        {transaction.description}
                    </Text>
                    <Text style={styles.date}>{formatDate(transaction.date)}</Text>
                </View>
            </View>

            <View style={styles.right}>
                <Text style={[styles.amount, { color: isIncome ? theme.success : categoryColor }]}>
                    {isIncome ? '+' : '-'}{currency}{parseFloat(transaction.amount).toFixed(2)}
                </Text>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
                        <Icon name="pencil" size={16} color={theme.textSub} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
                        <Icon name="delete" size={16} color={theme.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const createStyles = (theme, categoryColor) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        left: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        iconBox: {
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: `${categoryColor}15`,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        details: {
            flex: 1,
        },
        title: {
            fontSize: 15,
            fontWeight: '600',
            color: theme.textMain,
            marginBottom: 2,
        },
        date: {
            fontSize: 12,
            color: theme.textSub,
        },
        right: {
            alignItems: 'flex-end',
        },
        amount: {
            fontSize: 15,
            fontWeight: '700',
            marginBottom: 4,
        },
        actions: {
            flexDirection: 'row',
            gap: 8,
        },
        actionBtn: {
            padding: 6,
        },
    });

export default TransactionItem;
