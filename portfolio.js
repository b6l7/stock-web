// Portfolio Management and Stock Operations
class PortfolioManager {
    constructor(app) {
        this.app = app;
        this.currentFilter = 'all';
        this.sortBy = 'symbol';
        this.sortOrder = 'asc';
        
        this.init();
    }

    init() {
        this.setupPortfolioEventListeners();
    }

    setupPortfolioEventListeners() {
        // Add Position Modal
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-position-btn')) {
                e.preventDefault();
                this.showAddPositionModal();
            }
        });

        // Add Stock to Watchlist Modal
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-stock-btn')) {
                e.preventDefault();
                this.showAddStockModal();
            }
        });

        // Remove Position
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-position-btn')) {
                e.preventDefault();
                const symbol = e.target.dataset.symbol;
                this.confirmRemovePosition(symbol);
            }
        });

        // Edit Position
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-position-btn')) {
                e.preventDefault();
                const symbol = e.target.dataset.symbol;
                this.showEditPositionModal(symbol);
            }
        });

        // Portfolio sorting
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sort-btn')) {
                e.preventDefault();
                const sortBy = e.target.dataset.sort;
                this.sortPortfolio(sortBy);
            }
        });

        // Portfolio filtering
        document.addEventListener('change', (e) => {
            if (e.target.closest('.portfolio-filter')) {
                this.filterPortfolio(e.target.value);
            }
        });
    }

    // Add Position Modal
    showAddPositionModal() {
        this.createAddPositionModal();
        this.app.showModal('addPositionModal');
    }

    createAddPositionModal() {
        // Remove existing modal if it exists
        const existingModal = document.getElementById('addPositionModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'addPositionModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New Position</h2>
                    <button class="close-btn" onclick="stockApp.portfolioManager.hideAddPositionModal()">&times;</button>
                </div>
                <form id="addPositionForm" class="auth-form">
                    <div class="form-group">
                        <label for="stockSymbol">Stock Symbol</label>
                        <input type="text" id="stockSymbol" name="symbol" required placeholder="e.g., AAPL" style="text-transform: uppercase;">
                        <div id="symbolSuggestions" class="suggestions-list"></div>
                    </div>
                    <div class="form-group">
                        <label for="stockName">Company Name</label>
                        <input type="text" id="stockName" name="name" required placeholder="e.g., Apple Inc.">
                    </div>
                    <div class="form-group">
                        <label for="shares">Number of Shares</label>
                        <input type="number" id="shares" name="shares" required min="0.01" step="0.01" placeholder="e.g., 100">
                    </div>
                    <div class="form-group">
                        <label for="avgPrice">Average Purchase Price ($)</label>
                        <input type="number" id="avgPrice" name="avgPrice" required min="0.01" step="0.01" placeholder="e.g., 150.25">
                    </div>
                    <div class="form-group">
                        <label for="currentPrice">Current Price ($)</label>
                        <input type="number" id="currentPrice" name="currentPrice" required min="0.01" step="0.01" placeholder="e.g., 175.30">
                    </div>
                    <div class="form-group">
                        <label for="sector">Sector</label>
                        <select id="sector" name="sector" required>
                            <option value="">Select Sector</option>
                            <option value="Technology">Technology</option>
                            <option value="Healthcare">Healthcare</option>
                            <option value="Financial">Financial</option>
                            <option value="Consumer Goods">Consumer Goods</option>
                            <option value="Energy">Energy</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Real Estate">Real Estate</option>
                            <option value="Materials">Materials</option>
                            <option value="Industrials">Industrials</option>
                            <option value="Telecommunications">Telecommunications</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="purchaseDate">Purchase Date</label>
                        <input type="date" id="purchaseDate" name="purchaseDate" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Position</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup form handler
        const form = document.getElementById('addPositionForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddPosition(new FormData(form));
        });

        // Setup symbol search
        const symbolInput = document.getElementById('stockSymbol');
        symbolInput.addEventListener('input', (e) => {
            this.searchStockSymbol(e.target.value);
        });

        // Auto-fill current date
        document.getElementById('purchaseDate').valueAsDate = new Date();
    }

    hideAddPositionModal() {
        this.app.hideModal('addPositionModal');
        const modal = document.getElementById('addPositionModal');
        if (modal) modal.remove();
    }

    async handleAddPosition(formData) {
        try {
            const newPosition = {
                symbol: formData.get('symbol').toUpperCase(),
                name: formData.get('name'),
                shares: parseFloat(formData.get('shares')),
                avgPrice: parseFloat(formData.get('avgPrice')),
                currentPrice: parseFloat(formData.get('currentPrice')),
                sector: formData.get('sector'),
                purchaseDate: formData.get('purchaseDate')
            };

            // Validate
            if (!newPosition.symbol || !newPosition.name || !newPosition.shares || !newPosition.avgPrice || !newPosition.currentPrice || !newPosition.sector) {
                throw new Error('Please fill in all required fields');
            }

            // Check if position already exists
            const existingPosition = this.app.portfolioData.find(p => p.symbol === newPosition.symbol);
            if (existingPosition) {
                // Update existing position (average down/up)
                const totalShares = existingPosition.shares + newPosition.shares;
                const totalCost = (existingPosition.shares * existingPosition.avgPrice) + (newPosition.shares * newPosition.avgPrice);
                existingPosition.avgPrice = totalCost / totalShares;
                existingPosition.shares = totalShares;
                existingPosition.currentPrice = newPosition.currentPrice;
                
                this.app.showNotification(`Updated position for ${newPosition.symbol}`, 'success');
            } else {
                // Add new position
                this.app.portfolioData.push(newPosition);
                this.app.showNotification(`Added ${newPosition.symbol} to portfolio`, 'success');
            }

            this.app.saveData();
            this.hideAddPositionModal();
            
            // Refresh UI
            if (this.app.currentPage === 'portfolio') {
                this.app.showPortfolio();
            } else if (this.app.currentPage === 'dashboard') {
                this.app.updateDashboardStats();
            }

        } catch (error) {
            this.app.showNotification(error.message, 'error');
        }
    }

    // Add Stock to Watchlist Modal
    showAddStockModal() {
        this.createAddStockModal();
        this.app.showModal('addStockModal');
    }

    createAddStockModal() {
        const existingModal = document.getElementById('addStockModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'addStockModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Stock to Watchlist</h2>
                    <button class="close-btn" onclick="stockApp.portfolioManager.hideAddStockModal()">&times;</button>
                </div>
                <form id="addStockForm" class="auth-form">
                    <div class="form-group">
                        <label for="watchlistSymbol">Stock Symbol</label>
                        <input type="text" id="watchlistSymbol" name="symbol" required placeholder="e.g., NVDA" style="text-transform: uppercase;">
                    </div>
                    <div class="form-group">
                        <label for="watchlistName">Company Name</label>
                        <input type="text" id="watchlistName" name="name" required placeholder="e.g., NVIDIA Corporation">
                    </div>
                    <div class="form-group">
                        <label for="watchlistPrice">Current Price ($)</label>
                        <input type="number" id="watchlistPrice" name="price" required min="0.01" step="0.01" placeholder="e.g., 220.50">
                    </div>
                    <div class="form-group">
                        <label for="targetPrice">Target Price ($)</label>
                        <input type="number" id="targetPrice" name="targetPrice" min="0.01" step="0.01" placeholder="Optional">
                    </div>
                    <div class="form-group">
                        <label for="notes">Notes</label>
                        <textarea id="notes" name="notes" placeholder="Optional notes about this stock"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Add to Watchlist</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const form = document.getElementById('addStockForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddStock(new FormData(form));
        });
    }

    hideAddStockModal() {
        this.app.hideModal('addStockModal');
        const modal = document.getElementById('addStockModal');
        if (modal) modal.remove();
    }

    async handleAddStock(formData) {
        try {
            const newStock = {
                symbol: formData.get('symbol').toUpperCase(),
                name: formData.get('name'),
                price: parseFloat(formData.get('price')),
                targetPrice: formData.get('targetPrice') ? parseFloat(formData.get('targetPrice')) : null,
                notes: formData.get('notes') || '',
                change: 0,
                changePercent: 0,
                addedDate: new Date().toISOString()
            };

            // Validate
            if (!newStock.symbol || !newStock.name || !newStock.price) {
                throw new Error('Please fill in all required fields');
            }

            // Check if stock already exists in watchlist
            const existingStock = this.app.watchlistData.find(s => s.symbol === newStock.symbol);
            if (existingStock) {
                throw new Error('Stock already exists in watchlist');
            }

            this.app.watchlistData.push(newStock);
            this.app.saveData();
            this.hideAddStockModal();
            
            this.app.showNotification(`Added ${newStock.symbol} to watchlist`, 'success');
            
            // Refresh UI
            if (this.app.currentPage === 'watchlist') {
                this.app.showWatchlist();
            }

        } catch (error) {
            this.app.showNotification(error.message, 'error');
        }
    }

    // Edit Position
    showEditPositionModal(symbol) {
        const position = this.app.portfolioData.find(p => p.symbol === symbol);
        if (!position) return;

        this.createEditPositionModal(position);
        this.app.showModal('editPositionModal');
    }

    createEditPositionModal(position) {
        const existingModal = document.getElementById('editPositionModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'editPositionModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Position - ${position.symbol}</h2>
                    <button class="close-btn" onclick="stockApp.portfolioManager.hideEditPositionModal()">&times;</button>
                </div>
                <form id="editPositionForm" class="auth-form">
                    <input type="hidden" name="originalSymbol" value="${position.symbol}">
                    <div class="form-group">
                        <label for="editShares">Number of Shares</label>
                        <input type="number" id="editShares" name="shares" required min="0.01" step="0.01" value="${position.shares}">
                    </div>
                    <div class="form-group">
                        <label for="editAvgPrice">Average Purchase Price ($)</label>
                        <input type="number" id="editAvgPrice" name="avgPrice" required min="0.01" step="0.01" value="${position.avgPrice}">
                    </div>
                    <div class="form-group">
                        <label for="editCurrentPrice">Current Price ($)</label>
                        <input type="number" id="editCurrentPrice" name="currentPrice" required min="0.01" step="0.01" value="${position.currentPrice}">
                    </div>
                    <div class="form-group">
                        <label for="editSector">Sector</label>
                        <select id="editSector" name="sector" required>
                            <option value="Technology" ${position.sector === 'Technology' ? 'selected' : ''}>Technology</option>
                            <option value="Healthcare" ${position.sector === 'Healthcare' ? 'selected' : ''}>Healthcare</option>
                            <option value="Financial" ${position.sector === 'Financial' ? 'selected' : ''}>Financial</option>
                            <option value="Consumer Goods" ${position.sector === 'Consumer Goods' ? 'selected' : ''}>Consumer Goods</option>
                            <option value="Energy" ${position.sector === 'Energy' ? 'selected' : ''}>Energy</option>
                            <option value="Utilities" ${position.sector === 'Utilities' ? 'selected' : ''}>Utilities</option>
                            <option value="Real Estate" ${position.sector === 'Real Estate' ? 'selected' : ''}>Real Estate</option>
                            <option value="Materials" ${position.sector === 'Materials' ? 'selected' : ''}>Materials</option>
                            <option value="Industrials" ${position.sector === 'Industrials' ? 'selected' : ''}>Industrials</option>
                            <option value="Telecommunications" ${position.sector === 'Telecommunications' ? 'selected' : ''}>Telecommunications</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Update Position</button>
                        <button type="button" class="btn btn-danger" onclick="stockApp.portfolioManager.confirmRemovePosition('${position.symbol}')">Remove Position</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const form = document.getElementById('editPositionForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditPosition(new FormData(form));
        });
    }

    hideEditPositionModal() {
        this.app.hideModal('editPositionModal');
        const modal = document.getElementById('editPositionModal');
        if (modal) modal.remove();
    }

    async handleEditPosition(formData) {
        try {
            const originalSymbol = formData.get('originalSymbol');
            const updatedData = {
                shares: parseFloat(formData.get('shares')),
                avgPrice: parseFloat(formData.get('avgPrice')),
                currentPrice: parseFloat(formData.get('currentPrice')),
                sector: formData.get('sector')
            };

            const positionIndex = this.app.portfolioData.findIndex(p => p.symbol === originalSymbol);
            if (positionIndex === -1) {
                throw new Error('Position not found');
            }

            // Update position
            this.app.portfolioData[positionIndex] = {
                ...this.app.portfolioData[positionIndex],
                ...updatedData
            };

            this.app.saveData();
            this.hideEditPositionModal();
            
            this.app.showNotification(`Updated position for ${originalSymbol}`, 'success');
            
            // Refresh UI
            if (this.app.currentPage === 'portfolio') {
                this.app.showPortfolio();
            } else if (this.app.currentPage === 'dashboard') {
                this.app.updateDashboardStats();
            }

        } catch (error) {
            this.app.showNotification(error.message, 'error');
        }
    }

    // Remove Position
    confirmRemovePosition(symbol) {
        if (confirm(`Are you sure you want to remove ${symbol} from your portfolio?`)) {
            this.removePosition(symbol);
        }
    }

    removePosition(symbol) {
        const positionIndex = this.app.portfolioData.findIndex(p => p.symbol === symbol);
        if (positionIndex !== -1) {
            this.app.portfolioData.splice(positionIndex, 1);
            this.app.saveData();
            
            this.app.showNotification(`Removed ${symbol} from portfolio`, 'info');
            
            // Close any open modals
            this.hideEditPositionModal();
            
            // Refresh UI
            if (this.app.currentPage === 'portfolio') {
                this.app.showPortfolio();
            } else if (this.app.currentPage === 'dashboard') {
                this.app.updateDashboardStats();
            }
        }
    }

    // Portfolio Sorting and Filtering
    sortPortfolio(sortBy) {
        if (this.sortBy === sortBy) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = sortBy;
            this.sortOrder = 'asc';
        }

        this.app.portfolioData.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'symbol':
                    aValue = a.symbol;
                    bValue = b.symbol;
                    break;
                case 'name':
                    aValue = a.name;
                    bValue = b.name;
                    break;
                case 'value':
                    aValue = a.shares * a.currentPrice;
                    bValue = b.shares * b.currentPrice;
                    break;
                case 'gainloss':
                    aValue = ((a.currentPrice - a.avgPrice) / a.avgPrice) * 100;
                    bValue = ((b.currentPrice - b.avgPrice) / b.avgPrice) * 100;
                    break;
                case 'sector':
                    aValue = a.sector;
                    bValue = b.sector;
                    break;
                default:
                    return 0;
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (this.sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        // Update UI
        if (this.app.currentPage === 'portfolio') {
            this.app.showPortfolio();
        }
    }

    filterPortfolio(filterValue) {
        this.currentFilter = filterValue;
        
        // Update UI
        if (this.app.currentPage === 'portfolio') {
            this.app.showPortfolio();
        }
    }

    getFilteredPortfolio() {
        if (this.currentFilter === 'all') {
            return this.app.portfolioData;
        }

        return this.app.portfolioData.filter(stock => {
            switch (this.currentFilter) {
                case 'gainers':
                    return stock.currentPrice > stock.avgPrice;
                case 'losers':
                    return stock.currentPrice < stock.avgPrice;
                case 'technology':
                    return stock.sector.toLowerCase() === 'technology';
                case 'healthcare':
                    return stock.sector.toLowerCase() === 'healthcare';
                case 'financial':
                    return stock.sector.toLowerCase() === 'financial';
                default:
                    return true;
            }
        });
    }

    // Stock Symbol Search
    searchStockSymbol(query) {
        if (query.length < 1) {
            this.hideSymbolSuggestions();
            return;
        }

        // Simulate stock symbol search (in real app, this would be an API call)
        const suggestions = this.getStockSuggestions(query);
        this.displaySymbolSuggestions(suggestions);
    }

    getStockSuggestions(query) {
        const stockDatabase = [
            { symbol: 'AAPL', name: 'Apple Inc.' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.' },
            { symbol: 'MSFT', name: 'Microsoft Corporation' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.' },
            { symbol: 'TSLA', name: 'Tesla Inc.' },
            { symbol: 'NVDA', name: 'NVIDIA Corporation' },
            { symbol: 'META', name: 'Meta Platforms Inc.' },
            { symbol: 'NFLX', name: 'Netflix Inc.' },
            { symbol: 'AMD', name: 'Advanced Micro Devices' },
            { symbol: 'CRM', name: 'Salesforce Inc.' },
            { symbol: 'ORCL', name: 'Oracle Corporation' },
            { symbol: 'ADBE', name: 'Adobe Inc.' },
            { symbol: 'INTC', name: 'Intel Corporation' },
            { symbol: 'CSCO', name: 'Cisco Systems Inc.' },
            { symbol: 'IBM', name: 'International Business Machines' }
        ];

        const lowerQuery = query.toLowerCase();
        return stockDatabase.filter(stock => 
            stock.symbol.toLowerCase().includes(lowerQuery) || 
            stock.name.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);
    }

    displaySymbolSuggestions(suggestions) {
        const container = document.getElementById('symbolSuggestions');
        if (!container) return;

        if (suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = suggestions.map(stock => `
            <div class="suggestion-item" data-symbol="${stock.symbol}" data-name="${stock.name}">
                <strong>${stock.symbol}</strong> - ${stock.name}
            </div>
        `).join('');

        container.style.display = 'block';

        // Add click handlers
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                document.getElementById('stockSymbol').value = item.dataset.symbol;
                document.getElementById('stockName').value = item.dataset.name;
                this.hideSymbolSuggestions();
            });
        });
    }

    hideSymbolSuggestions() {
        const container = document.getElementById('symbolSuggestions');
        if (container) {
            container.style.display = 'none';
        }
    }

    // Portfolio Analytics
    calculatePortfolioMetrics() {
        const totalValue = this.app.calculatePortfolioValue();
        const totalCost = this.app.portfolioData.reduce((sum, stock) => sum + (stock.shares * stock.avgPrice), 0);
        const totalGainLoss = totalValue - totalCost;
        const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

        const dayGainLoss = this.app.portfolioData.reduce((sum, stock) => {
            const dayChange = stock.currentPrice * 0.02 * (Math.random() - 0.5); // Simulate daily change
            return sum + (stock.shares * dayChange);
        }, 0);

        return {
            totalValue,
            totalCost,
            totalGainLoss,
            totalGainLossPercent,
            dayGainLoss,
            dayGainLossPercent: totalValue > 0 ? (dayGainLoss / totalValue) * 100 : 0
        };
    }
}

// Initialize portfolio manager when main app is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.stockApp) {
            window.stockApp.portfolioManager = new PortfolioManager(window.stockApp);
        }
    }, 100);
});

