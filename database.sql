-- Stock Portfolio Monitor Database Schema
-- MySQL Database Structure

-- Create database
CREATE DATABASE IF NOT EXISTS stock_portfolio_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stock_portfolio_db;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    country VARCHAR(50),
    preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    INDEX idx_email (email),
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at)
);

-- User sessions table
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- Portfolio table
CREATE TABLE portfolio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    shares DECIMAL(15,6) NOT NULL,
    avg_price DECIMAL(10,4) NOT NULL,
    sector VARCHAR(50),
    purchase_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_symbol (user_id, symbol, is_active),
    INDEX idx_user_id (user_id),
    INDEX idx_symbol (symbol),
    INDEX idx_sector (sector),
    INDEX idx_active (is_active)
);

-- Watchlist table
CREATE TABLE watchlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_price DECIMAL(10,4),
    alert_type ENUM('above', 'below') DEFAULT 'above',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    alert_triggered BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_watchlist (user_id, symbol, is_active),
    INDEX idx_user_id (user_id),
    INDEX idx_symbol (symbol),
    INDEX idx_active (is_active)
);

-- Stock prices table
CREATE TABLE stock_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    current_price DECIMAL(10,4) NOT NULL,
    day_change DECIMAL(10,4) DEFAULT 0,
    day_change_percent DECIMAL(8,4) DEFAULT 0,
    volume BIGINT DEFAULT 0,
    market_cap BIGINT DEFAULT 0,
    pe_ratio DECIMAL(8,2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_symbol (symbol),
    INDEX idx_symbol (symbol),
    INDEX idx_updated_at (updated_at)
);

-- Stock symbols reference table
CREATE TABLE stock_symbols (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    exchange VARCHAR(20),
    sector VARCHAR(50),
    industry VARCHAR(100),
    market_cap_category ENUM('large', 'mid', 'small', 'micro') DEFAULT 'large',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_name (name),
    INDEX idx_sector (sector),
    INDEX idx_active (is_active)
);

-- News table
CREATE TABLE news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT,
    category VARCHAR(50),
    source VARCHAR(100),
    url VARCHAR(500),
    image_url VARCHAR(500),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_category (category),
    INDEX idx_published_at (published_at),
    INDEX idx_active (is_active)
);

-- Contact messages table
CREATE TABLE contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replied_at TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Activity logs table
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Failed login attempts table
CREATE TABLE failed_logins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_ip_address (ip_address),
    INDEX idx_attempted_at (attempted_at)
);

-- API requests tracking table
CREATE TABLE api_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(100) NOT NULL,
    endpoint VARCHAR(200),
    method VARCHAR(10),
    response_code INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifier (identifier),
    INDEX idx_created_at (created_at)
);

-- Notifications table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- Portfolio history table (for tracking changes over time)
CREATE TABLE portfolio_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    shares DECIMAL(15,6) NOT NULL,
    price DECIMAL(10,4) NOT NULL,
    action ENUM('buy', 'sell', 'dividend') NOT NULL,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_symbol (symbol),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_action (action)
);

-- Insert sample stock symbols
INSERT INTO stock_symbols (symbol, name, exchange, sector, industry, market_cap_category) VALUES
('AAPL', 'Apple Inc.', 'NASDAQ', 'Technology', 'Consumer Electronics', 'large'),
('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'Technology', 'Internet Services', 'large'),
('MSFT', 'Microsoft Corporation', 'NASDAQ', 'Technology', 'Software', 'large'),
('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'Consumer Discretionary', 'E-commerce', 'large'),
('TSLA', 'Tesla Inc.', 'NASDAQ', 'Consumer Discretionary', 'Electric Vehicles', 'large'),
('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'Technology', 'Semiconductors', 'large'),
('META', 'Meta Platforms Inc.', 'NASDAQ', 'Technology', 'Social Media', 'large'),
('NFLX', 'Netflix Inc.', 'NASDAQ', 'Communication Services', 'Streaming', 'large'),
('AMD', 'Advanced Micro Devices', 'NASDAQ', 'Technology', 'Semiconductors', 'large'),
('CRM', 'Salesforce Inc.', 'NYSE', 'Technology', 'Cloud Software', 'large'),
('ORCL', 'Oracle Corporation', 'NYSE', 'Technology', 'Database Software', 'large'),
('ADBE', 'Adobe Inc.', 'NASDAQ', 'Technology', 'Software', 'large'),
('INTC', 'Intel Corporation', 'NASDAQ', 'Technology', 'Semiconductors', 'large'),
('CSCO', 'Cisco Systems Inc.', 'NASDAQ', 'Technology', 'Networking', 'large'),
('IBM', 'International Business Machines', 'NYSE', 'Technology', 'IT Services', 'large'),
('JPM', 'JPMorgan Chase & Co.', 'NYSE', 'Financial Services', 'Banking', 'large'),
('BAC', 'Bank of America Corp.', 'NYSE', 'Financial Services', 'Banking', 'large'),
('WFC', 'Wells Fargo & Company', 'NYSE', 'Financial Services', 'Banking', 'large'),
('GS', 'Goldman Sachs Group Inc.', 'NYSE', 'Financial Services', 'Investment Banking', 'large'),
('MS', 'Morgan Stanley', 'NYSE', 'Financial Services', 'Investment Banking', 'large'),
('JNJ', 'Johnson & Johnson', 'NYSE', 'Healthcare', 'Pharmaceuticals', 'large'),
('PFE', 'Pfizer Inc.', 'NYSE', 'Healthcare', 'Pharmaceuticals', 'large'),
('UNH', 'UnitedHealth Group Inc.', 'NYSE', 'Healthcare', 'Health Insurance', 'large'),
('ABBV', 'AbbVie Inc.', 'NYSE', 'Healthcare', 'Pharmaceuticals', 'large'),
('TMO', 'Thermo Fisher Scientific', 'NYSE', 'Healthcare', 'Life Sciences', 'large');

-- Insert sample stock prices
INSERT INTO stock_prices (symbol, current_price, day_change, day_change_percent, volume) VALUES
('AAPL', 175.30, 2.50, 1.45, 45000000),
('GOOGL', 2950.75, -15.25, -0.51, 1200000),
('MSFT', 335.20, 5.80, 1.76, 25000000),
('AMZN', 3350.80, 25.30, 0.76, 3500000),
('TSLA', 750.25, -12.75, -1.67, 18000000),
('NVDA', 220.50, 8.25, 3.89, 35000000),
('META', 325.75, -5.30, -1.60, 15000000),
('NFLX', 450.20, 12.80, 2.93, 4500000),
('AMD', 95.40, -2.15, -2.20, 28000000),
('CRM', 180.90, 3.45, 1.94, 6500000);

-- Insert sample news
INSERT INTO news (title, summary, category, source, published_at) VALUES
('Tech Stocks Rally on Strong Earnings Reports', 'Major technology companies reported better-than-expected quarterly earnings, driving market optimism and investor confidence in the sector.', 'Technology', 'Financial Times', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Federal Reserve Signals Potential Rate Changes', 'The Federal Reserve indicated possible adjustments to interest rates in response to current economic indicators and inflation trends.', 'Economy', 'Reuters', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
('Cryptocurrency Market Shows Mixed Signals', 'Bitcoin and other major cryptocurrencies display varied performance amid ongoing regulatory discussions and institutional adoption.', 'Crypto', 'CoinDesk', DATE_SUB(NOW(), INTERVAL 6 HOUR)),
('Energy Sector Gains on Oil Price Surge', 'Energy stocks rise as crude oil prices increase due to supply concerns and geopolitical tensions affecting global markets.', 'Energy', 'Bloomberg', DATE_SUB(NOW(), INTERVAL 8 HOUR)),
('Healthcare Innovation Drives Sector Growth', 'Breakthrough medical technologies and pharmaceutical developments boost healthcare sector performance and investor interest.', 'Healthcare', 'Medical News Today', DATE_SUB(NOW(), INTERVAL 12 HOUR)),
('Electric Vehicle Market Expansion Continues', 'EV manufacturers report strong sales growth as consumer adoption accelerates and charging infrastructure expands globally.', 'Automotive', 'Auto Industry News', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('Banking Sector Prepares for Interest Rate Impact', 'Financial institutions adjust strategies in anticipation of potential Federal Reserve policy changes affecting lending rates.', 'Financial', 'Banking Weekly', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('Artificial Intelligence Stocks Surge on New Developments', 'AI-focused companies see significant gains following announcements of breakthrough technologies and strategic partnerships.', 'Technology', 'Tech Insider', DATE_SUB(NOW(), INTERVAL 2 DAY));

-- Create indexes for better performance
CREATE INDEX idx_portfolio_user_symbol ON portfolio(user_id, symbol);
CREATE INDEX idx_watchlist_user_symbol ON watchlist(user_id, symbol);
CREATE INDEX idx_stock_prices_symbol_updated ON stock_prices(symbol, updated_at);
CREATE INDEX idx_news_category_published ON news(category, published_at);
CREATE INDEX idx_activity_logs_user_created ON activity_logs(user_id, created_at);

-- Create views for common queries
CREATE VIEW portfolio_summary AS
SELECT 
    p.user_id,
    COUNT(*) as total_positions,
    SUM(p.shares * COALESCE(sp.current_price, p.avg_price)) as total_value,
    SUM(p.shares * p.avg_price) as total_cost,
    SUM(p.shares * COALESCE(sp.current_price, p.avg_price)) - SUM(p.shares * p.avg_price) as total_gain_loss
FROM portfolio p
LEFT JOIN stock_prices sp ON p.symbol = sp.symbol
WHERE p.is_active = 1
GROUP BY p.user_id;

CREATE VIEW sector_allocation AS
SELECT 
    p.user_id,
    p.sector,
    COUNT(*) as position_count,
    SUM(p.shares * COALESCE(sp.current_price, p.avg_price)) as sector_value
FROM portfolio p
LEFT JOIN stock_prices sp ON p.symbol = sp.symbol
WHERE p.is_active = 1
GROUP BY p.user_id, p.sector;

-- Create stored procedures for common operations
DELIMITER //

CREATE PROCEDURE GetUserPortfolio(IN userId INT)
BEGIN
    SELECT 
        p.*,
        sp.current_price,
        sp.day_change,
        sp.day_change_percent,
        (p.shares * COALESCE(sp.current_price, p.avg_price)) as current_value,
        (p.shares * p.avg_price) as cost_basis,
        ((p.shares * COALESCE(sp.current_price, p.avg_price)) - (p.shares * p.avg_price)) as gain_loss,
        (((COALESCE(sp.current_price, p.avg_price) - p.avg_price) / p.avg_price) * 100) as gain_loss_percent
    FROM portfolio p
    LEFT JOIN stock_prices sp ON p.symbol = sp.symbol
    WHERE p.user_id = userId AND p.is_active = 1
    ORDER BY p.symbol;
END //

CREATE PROCEDURE UpdateStockPrice(IN stockSymbol VARCHAR(10), IN newPrice DECIMAL(10,4))
BEGIN
    DECLARE oldPrice DECIMAL(10,4) DEFAULT 0;
    
    SELECT current_price INTO oldPrice FROM stock_prices WHERE symbol = stockSymbol;
    
    INSERT INTO stock_prices (symbol, current_price, day_change, day_change_percent, updated_at)
    VALUES (stockSymbol, newPrice, newPrice - COALESCE(oldPrice, newPrice), 
            CASE WHEN oldPrice > 0 THEN ((newPrice - oldPrice) / oldPrice * 100) ELSE 0 END, NOW())
    ON DUPLICATE KEY UPDATE 
        current_price = newPrice,
        day_change = newPrice - COALESCE(oldPrice, newPrice),
        day_change_percent = CASE WHEN oldPrice > 0 THEN ((newPrice - oldPrice) / oldPrice * 100) ELSE 0 END,
        updated_at = NOW();
END //

CREATE PROCEDURE CleanOldData()
BEGIN
    -- Clean old API requests (older than 24 hours)
    DELETE FROM api_requests WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);
    
    -- Clean old activity logs (older than 90 days)
    DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Clean old failed login attempts (older than 24 hours)
    DELETE FROM failed_logins WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);
    
    -- Clean expired sessions
    DELETE FROM user_sessions WHERE expires_at < NOW();
END //

DELIMITER ;

-- Create triggers for audit trail
DELIMITER //

CREATE TRIGGER portfolio_audit_insert
AFTER INSERT ON portfolio
FOR EACH ROW
BEGIN
    INSERT INTO portfolio_history (user_id, symbol, shares, price, action, transaction_date, notes)
    VALUES (NEW.user_id, NEW.symbol, NEW.shares, NEW.avg_price, 'buy', COALESCE(NEW.purchase_date, CURDATE()), 'Initial position');
END //

CREATE TRIGGER portfolio_audit_update
AFTER UPDATE ON portfolio
FOR EACH ROW
BEGIN
    IF NEW.shares != OLD.shares OR NEW.avg_price != OLD.avg_price THEN
        INSERT INTO portfolio_history (user_id, symbol, shares, price, action, transaction_date, notes)
        VALUES (NEW.user_id, NEW.symbol, NEW.shares - OLD.shares, NEW.avg_price, 
                CASE WHEN NEW.shares > OLD.shares THEN 'buy' ELSE 'sell' END, 
                CURDATE(), 'Position updated');
    END IF;
END //

DELIMITER ;

-- Grant permissions (adjust as needed for your environment)
-- CREATE USER 'portfolio_user'@'localhost' IDENTIFIED BY 'secure_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON stock_portfolio_db.* TO 'portfolio_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Final optimization
ANALYZE TABLE users, portfolio, watchlist, stock_prices, stock_symbols, news;

-- Show database structure
SHOW TABLES;

