// Stock Portfolio Monitor - Fixed Chart and Navigation
// Working chart display and page navigation

// Global variables
let currentPage = 'dashboard';
let portfolioChart = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupCharts();
    setupModals();
    setupEventListeners();
    console.log('App initialized successfully');
}

// Fix chart initialization
function setupCharts() {
    const chartCanvas = document.getElementById('portfolioChart');
    if (chartCanvas && typeof Chart !== 'undefined') {
        const ctx = chartCanvas.getContext('2d');
        
        portfolioChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025'],
                datasets: [{
                    label: 'Portfolio',
                    data: [65000, 68000, 70000, 72500],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#10b981',
                    pointRadius: 4
                }, {
                    label: 'S&P 500',
                    data: [62000, 64000, 65500, 67000],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#3b82f6',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e5e7eb',
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { 
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: { 
                            color: '#9ca3af',
                            font: { size: 12 }
                        }
                    },
                    y: {
                        grid: { 
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: { 
                            color: '#9ca3af',
                            font: { size: 12 },
                            callback: function(value) {
                                return '$' + (value/1000).toFixed(0) + 'k';
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
        
        console.log('Chart initialized successfully');
    } else {
        console.error('Chart.js not loaded or canvas not found');
    }
}

// Fix navigation - function name should match HTML onclick
function showPage(pageName) {
    console.log('Switching to page:', pageName);
    
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    // Show target page
    const targetPage = document.getElementById(pageName);
    if (targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
        currentPage = pageName;
        
        // Update active nav
        updateActiveNav(pageName);
        
        // Show notification
        showNotification(`Switched to ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page`);
    } else {
        console.error('Page not found:', pageName);
    }
}

// Update active navigation
function updateActiveNav(pageName) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current nav item
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('onclick').includes(pageName)) {
            link.parentElement.classList.add('active');
        }
    });
}

// Chart update function
function updateChart(period) {
    if (!portfolioChart) {
        console.error('Chart not initialized');
        return;
    }
    
    console.log('Updating chart for period:', period);
    
    const data = {
        '1M': {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            portfolio: [70000, 71000, 71500, 72500],
            sp500: [65000, 65500, 66000, 67000]
        },
        '3M': {
            labels: ['Month 1', 'Month 2', 'Month 3'],
            portfolio: [68000, 70000, 72500],
            sp500: [64000, 65500, 67000]
        },
        '6M': {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            portfolio: [65000, 66000, 68000, 69000, 70000, 72500],
            sp500: [62000, 63000, 64000, 64500, 65500, 67000]
        },
        '1Y': {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            portfolio: [60000, 65000, 70000, 72500],
            sp500: [58000, 62000, 65000, 67000]
        }
    };
    
    const periodData = data[period] || data['1M'];
    
    portfolioChart.data.labels = periodData.labels;
    portfolioChart.data.datasets[0].data = periodData.portfolio;
    portfolioChart.data.datasets[1].data = periodData.sp500;
    portfolioChart.update();
    
    // Update active button
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    showNotification(`Chart updated to ${period} view`);
}

// Modal functions
function setupModals() {
    // Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Click outside to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

function openAddPosition() {
    openModal('add-position-modal');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Notification functions
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function markAllRead() {
    document.querySelectorAll('.notification-item').forEach(item => {
        item.classList.remove('unread');
    });
    showNotification('All notifications marked as read');
}

// Profile functions
function toggleProfile() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function openProfileSettings() {
    openModal('profile-modal');
}

// Event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            console.log('Searching for:', e.target.value);
            showNotification(`Searching for: ${e.target.value}`);
        });
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.notifications')) {
            const notificationDropdown = document.getElementById('notificationDropdown');
            if (notificationDropdown) {
                notificationDropdown.style.display = 'none';
            }
        }
        
        if (!e.target.closest('.profile')) {
            const profileDropdown = document.getElementById('profileDropdown');
            if (profileDropdown) {
                profileDropdown.style.display = 'none';
            }
        }
    });
}

// Notification system
let notificationTimeout;
function showNotification(message) {
    clearTimeout(notificationTimeout);
    
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.transform = 'translateX(0)';
    
    notificationTimeout = setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
    }, 2000);
}

// News filtering
function filterNews(category) {
    const articles = document.querySelectorAll('.news-article');
    
    articles.forEach(article => {
        if (category === 'All' || article.dataset.category === category) {
            article.style.display = 'block';
        } else {
            article.style.display = 'none';
        }
    });
    
    // Update active filter button
    document.querySelectorAll('.news-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    showNotification(`Showing ${category} news`);
}

// Watchlist filtering
function filterWatchlist(filter) {
    const rows = document.querySelectorAll('.stock-row');
    
    rows.forEach(row => {
        if (filter === 'All Stocks' || row.dataset.filter === filter) {
            row.style.display = 'table-row';
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update active filter button
    document.querySelectorAll('.watchlist-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    showNotification(`Filtered by ${filter}`);
}

// Add stock to watchlist
function addStockToWatchlist() {
    openModal('add-stock-modal');
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (portfolioChart) {
        portfolioChart.destroy();
    }
});

console.log('JavaScript loaded successfully');

