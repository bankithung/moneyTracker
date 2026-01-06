// Theme colors matching the web app's CSS variables
export const lightTheme = {
    primary: '#4f46e5',
    primaryDark: '#4338ca',
    primaryLight: '#818cf8',

    bgBody: '#f3f4f6',
    bgSurface: '#ffffff',
    bgAlt: '#f9fafb',

    textMain: '#111827',
    textSub: '#6b7280',
    textDisable: '#9ca3af',

    border: '#e5e7eb',

    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',

    catNeeds: '#3b82f6',
    catWants: '#f59e0b',
    catSavings: '#10b981',
    catIncome: '#6366f1',
};

export const darkTheme = {
    primary: '#6366f1',
    primaryDark: '#818cf8',
    primaryLight: '#818cf8',

    bgBody: '#111827',
    bgSurface: '#1f2937',
    bgAlt: '#374151',

    textMain: '#f9fafb',
    textSub: '#9ca3af',
    textDisable: '#4b5563',

    border: '#374151',

    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',

    catNeeds: '#3b82f6',
    catWants: '#f59e0b',
    catSavings: '#10b981',
    catIncome: '#6366f1',
};

export const getCategoryColor = (category, theme) => {
    const colors = {
        needs: theme.catNeeds,
        wants: theme.catWants,
        savings: theme.catSavings,
        income: theme.catIncome,
    };
    return colors[category] || theme.textMain;
};

export const getCategoryIcon = (category) => {
    const icons = {
        needs: 'home',
        wants: 'shopping-bag',
        savings: 'piggy-bank',
        income: 'trending-up',
    };
    return icons[category] || 'circle';
};
