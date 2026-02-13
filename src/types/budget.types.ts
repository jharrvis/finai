export interface Budget {
    id: string;
    category: string;
    amount: number;
    period: 'daily' | 'weekly' | 'monthly';
    userId: string;
}

export interface BudgetAlert {
    category: string;
    spent: number;
    budget: number;
    percentage: number;
    status: 'safe' | 'warning' | 'critical' | 'over';
    message: string;
    suggestions: string[];
}

export interface BudgetAnalysis {
    alerts: BudgetAlert[];
    overall_status: 'safe' | 'warning' | 'critical';
    total_budget: number;
    total_spent: number;
    days_remaining: number;
    projection: {
        estimated_end_of_month: number;
        will_exceed: boolean;
        excess_amount?: number;
    };
}
