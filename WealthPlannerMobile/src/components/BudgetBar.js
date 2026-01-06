import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BudgetBar = ({ label, percentage, spent, limit, color, currency, theme, onPress }) => {
    const progress = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const isOver = spent > limit;

    const styles = createStyles(theme);

    const Content = (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.labelContainer}>
                    <Text style={[styles.label, { color }]}>{label} ({percentage}%)</Text>
                    {onPress && (
                        <Icon name="arrow-top-right" size={14} color={theme.textSub} style={{ marginLeft: 4 }} />
                    )}
                </View>
                <Text style={styles.values}>
                    {currency}{spent.toFixed(0)} / {currency}{limit.toFixed(0)}
                </Text>
            </View>
            <View style={styles.track}>
                <View
                    style={[
                        styles.fill,
                        { width: `${progress}%`, backgroundColor: color },
                    ]}
                />
            </View>
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {Content}
            </TouchableOpacity>
        );
    }

    return Content;
};

const createStyles = (theme) =>
    StyleSheet.create({
        container: {
            marginBottom: 16,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        labelContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
        },
        values: {
            fontSize: 13,
            color: theme.textSub,
            fontWeight: '500',
        },
        track: {
            height: 10,
            backgroundColor: theme.bgAlt,
            borderRadius: 5,
            overflow: 'hidden',
        },
        fill: {
            height: '100%',
            borderRadius: 5,
        },
    });

export default BudgetBar;
