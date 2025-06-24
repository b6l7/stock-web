// Charts and Data Visualization
class ChartManager {
    constructor(app) {
        this.app = app;
        this.charts = {};
        this.chartColors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#10b981',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        this.init();
    }

    init() {
        this.setupChartDefaults();
    }

    setupChartDefaults() {
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = '#b8b8d1';
            Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';
            Chart.defaults.backgroundColor = 'rgba(102, 126, 234, 0.1)';
            Chart.defaults.plugins.legend.labels.usePointStyle = true;
            Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 15, 35, 0.9)';
            Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
            Chart.defaults.plugins.tooltip.bodyColor = '#b8b8d1';
            Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.2)';
            Chart.defaults.plugins.tooltip.borderWidth = 1;
        }
    }

    // Portfolio Performance Chart
    createPortfolioChart(canvasId, period = '1M') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const data = this.generatePortfolioData(period);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Portfolio Value',
                    data: data.portfolioValues,
                    borderColor: this.chartColors.primary,
                    backgroundColor: `${this.chartColors.primary}20`,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: this.chartColors.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'S&P 500',
                    data: data.sp500Values,
                    borderColor: this.chartColors.secondary,
                    backgroundColor: `${this.chartColors.secondary}20`,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: this.chartColors.secondary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        return this.charts[canvasId];
    }

    // Sector Allocation Pie Chart
    createSectorChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const sectorData = this.calculateSectorAllocation();
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sectorData.labels,
                datasets: [{
                    data: sectorData.values,
                    backgroundColor: [
                        this.chartColors.primary,
                        this.chartColors.secondary,
                        this.chartColors.success,
                        this.chartColors.warning,
                        this.chartColors.info,
                        this.chartColors.danger
                    ],
                    borderColor: '#0f0f23',
                    borderWidth: 3,
                    hoverBorderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const percentage = ((context.parsed / sectorData.total) * 100).toFixed(1);
                                return `${context.label}: $${context.parsed.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });

        return this.charts[canvasId];
    }

    // Stock Performance Bar Chart
    createStockPerformanceChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const performanceData = this.calculateStockPerformance();
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: performanceData.labels,
                datasets: [{
                    label: 'Gain/Loss (%)',
                    data: performanceData.values,
                    backgroundColor: performanceData.values.map(value => 
                        value >= 0 ? this.chartColors.success : this.chartColors.danger
                    ),
                    borderColor: performanceData.values.map(value => 
                        value >= 0 ? this.chartColors.success : this.chartColors.danger
                    ),
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                const sign = value >= 0 ? '+' : '';
                                return `${context.label}: ${sign}${value.toFixed(2)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        return this.charts[canvasId];
    }

    // Monthly Returns Chart
    createMonthlyReturnsChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const monthlyData = this.generateMonthlyReturns();
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Monthly Returns (%)',
                    data: monthlyData.values,
                    backgroundColor: monthlyData.values.map(value => 
                        value >= 0 ? `${this.chartColors.success}80` : `${this.chartColors.danger}80`
                    ),
                    borderColor: monthlyData.values.map(value => 
                        value >= 0 ? this.chartColors.success : this.chartColors.danger
                    ),
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                const sign = value >= 0 ? '+' : '';
                                return `${context.label}: ${sign}${value.toFixed(2)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    delay: (context) => context.dataIndex * 100
                }
            }
        });

        return this.charts[canvasId];
    }

    // Risk Metrics Chart
    createRiskMetricsChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const riskData = this.calculateRiskMetrics();
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: riskData.labels,
                datasets: [{
                    label: 'Your Portfolio',
                    data: riskData.portfolioValues,
                    borderColor: this.chartColors.primary,
                    backgroundColor: `${this.chartColors.primary}30`,
                    borderWidth: 2,
                    pointBackgroundColor: this.chartColors.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }, {
                    label: 'Market Average',
                    data: riskData.marketValues,
                    borderColor: this.chartColors.secondary,
                    backgroundColor: `${this.chartColors.secondary}20`,
                    borderWidth: 2,
                    pointBackgroundColor: this.chartColors.secondary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.2)'
                        },
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.2)'
                        },
                        pointLabels: {
                            color: '#b8b8d1',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1000
                }
            }
        });

        return this.charts[canvasId];
    }

    // Data Generation Methods
    generatePortfolioData(period) {
        const periods = {
            '1M': { days: 30, interval: 1 },
            '3M': { days: 90, interval: 3 },
            '6M': { days: 180, interval: 6 },
            '1Y': { days: 365, interval: 12 },
            '2Y': { days: 730, interval: 24 }
        };

        const config = periods[period] || periods['1M'];
        const labels = [];
        const portfolioValues = [];
        const sp500Values = [];

        const currentValue = this.app.calculatePortfolioValue();
        const startValue = currentValue * 0.85; // Assume 15% growth over period
        const sp500StartValue = currentValue * 0.9; // S&P 500 comparison

        for (let i = 0; i <= config.days; i += Math.ceil(config.days / 20)) {
            const date = new Date();
            date.setDate(date.getDate() - (config.days - i));
            
            if (period === '1M' || period === '3M') {
                labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            } else {
                labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            }

            // Generate realistic portfolio growth
            const progress = i / config.days;
            const volatility = (Math.random() - 0.5) * 0.1;
            const portfolioValue = startValue + (currentValue - startValue) * progress + (startValue * volatility);
            portfolioValues.push(Math.round(portfolioValue));

            // Generate S&P 500 comparison
            const sp500Value = sp500StartValue + (currentValue * 0.95 - sp500StartValue) * progress + (sp500StartValue * volatility * 0.8);
            sp500Values.push(Math.round(sp500Value));
        }

        return { labels, portfolioValues, sp500Values };
    }

    calculateSectorAllocation() {
        const sectors = {};
        let total = 0;

        this.app.portfolioData.forEach(stock => {
            const value = stock.shares * stock.currentPrice;
            sectors[stock.sector] = (sectors[stock.sector] || 0) + value;
            total += value;
        });

        return {
            labels: Object.keys(sectors),
            values: Object.values(sectors),
            total: total
        };
    }

    calculateStockPerformance() {
        const labels = [];
        const values = [];

        this.app.portfolioData.forEach(stock => {
            const gainLoss = ((stock.currentPrice - stock.avgPrice) / stock.avgPrice) * 100;
            labels.push(stock.symbol);
            values.push(gainLoss);
        });

        return { labels, values };
    }

    generateMonthlyReturns() {
        const labels = [];
        const values = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            labels.push(months[date.getMonth()]);
            
            // Generate realistic monthly returns (-10% to +15%)
            const return_ = (Math.random() - 0.4) * 25;
            values.push(parseFloat(return_.toFixed(2)));
        }

        return { labels, values };
    }

    calculateRiskMetrics() {
        // Simulate risk metrics (in real app, these would be calculated from actual data)
        return {
            labels: ['Volatility', 'Beta', 'Sharpe Ratio', 'Max Drawdown', 'Correlation', 'VaR'],
            portfolioValues: [65, 85, 75, 45, 70, 60],
            marketValues: [70, 100, 65, 55, 80, 70]
        };
    }

    // Chart Update Methods
    updateChart(chartId, newData) {
        const chart = this.charts[chartId];
        if (!chart) return;

        chart.data = newData;
        chart.update('active');
    }

    updatePortfolioChart(period = '1M') {
        const chartId = 'portfolioChart';
        if (this.charts[chartId]) {
            const newData = this.generatePortfolioData(period);
            this.charts[chartId].data.labels = newData.labels;
            this.charts[chartId].data.datasets[0].data = newData.portfolioValues;
            this.charts[chartId].data.datasets[1].data = newData.sp500Values;
            this.charts[chartId].update('active');
        }
    }

    updateAllCharts() {
        Object.keys(this.charts).forEach(chartId => {
            if (chartId === 'portfolioChart') {
                this.updatePortfolioChart();
            } else if (chartId === 'sectorChart') {
                this.createSectorChart(chartId);
            } else if (chartId === 'stockPerformanceChart') {
                this.createStockPerformanceChart(chartId);
            }
        });
    }

    // Utility Methods
    destroyChart(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    }

    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartId => {
            this.destroyChart(chartId);
        });
    }

    // Export Chart as Image
    exportChart(chartId, filename) {
        const chart = this.charts[chartId];
        if (!chart) return;

        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = filename || `${chartId}.png`;
        link.href = url;
        link.click();
    }

    // Responsive Chart Handling
    handleResize() {
        Object.values(this.charts).forEach(chart => {
            chart.resize();
        });
    }
}

// Initialize chart manager when main app is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.stockApp) {
            window.stockApp.chartManager = new ChartManager(window.stockApp);
        }
    }, 100);
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.stockApp && window.stockApp.chartManager) {
        window.stockApp.chartManager.handleResize();
    }
});

