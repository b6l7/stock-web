<?php
/**
 * Portfolio Management Handler
 * Stock Portfolio Monitor - Portfolio and Stock Operations
 */

require_once 'config.php';
require_once 'auth.php';

class PortfolioHandler {
    private $db;
    private $authHandler;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->authHandler = new AuthHandler();
    }
    
    /**
     * Handle portfolio requests
     */
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';
        
        switch ($method) {
            case 'GET':
                switch ($action) {
                    case 'portfolio':
                        $this->getPortfolio();
                        break;
                    case 'watchlist':
                        $this->getWatchlist();
                        break;
                    case 'position':
                        $this->getPosition();
                        break;
                    case 'analytics':
                        $this->getAnalytics();
                        break;
                    case 'search':
                        $this->searchStocks();
                        break;
                    default:
                        sendJsonResponse(['error' => 'Invalid action'], 400);
                }
                break;
            case 'POST':
                switch ($action) {
                    case 'position':
                        $this->addPosition();
                        break;
                    case 'watchlist':
                        $this->addToWatchlist();
                        break;
                    case 'contact':
                        $this->handleContact();
                        break;
                    default:
                        sendJsonResponse(['error' => 'Invalid action'], 400);
                }
                break;
            case 'PUT':
                switch ($action) {
                    case 'position':
                        $this->updatePosition();
                        break;
                    case 'watchlist':
                        $this->updateWatchlistItem();
                        break;
                    default:
                        sendJsonResponse(['error' => 'Invalid action'], 400);
                }
                break;
            case 'DELETE':
                switch ($action) {
                    case 'position':
                        $this->deletePosition();
                        break;
                    case 'watchlist':
                        $this->removeFromWatchlist();
                        break;
                    default:
                        sendJsonResponse(['error' => 'Invalid action'], 400);
                }
                break;
            default:
                sendJsonResponse(['error' => 'Method not allowed'], 405);
        }
    }
    
    /**
     * Get user's portfolio
     */
    private function getPortfolio() {
        $userId = $this->authenticateUser();
        
        try {
            $sql = "SELECT p.*, s.current_price, s.day_change, s.day_change_percent, s.updated_at as price_updated
                    FROM portfolio p
                    LEFT JOIN stock_prices s ON p.symbol = s.symbol
                    WHERE p.user_id = ? AND p.is_active = 1
                    ORDER BY p.symbol";
            
            $positions = $this->db->fetchAll($sql, [$userId]);
            
            // Calculate metrics for each position
            foreach ($positions as &$position) {
                $currentValue = $position['shares'] * $position['current_price'];
                $costBasis = $position['shares'] * $position['avg_price'];
                $gainLoss = $currentValue - $costBasis;
                $gainLossPercent = $costBasis > 0 ? ($gainLoss / $costBasis) * 100 : 0;
                
                $position['current_value'] = $currentValue;
                $position['cost_basis'] = $costBasis;
                $position['gain_loss'] = $gainLoss;
                $position['gain_loss_percent'] = $gainLossPercent;
                $position['day_gain_loss'] = $position['shares'] * $position['day_change'];
            }
            
            // Calculate portfolio totals
            $totalValue = array_sum(array_column($positions, 'current_value'));
            $totalCost = array_sum(array_column($positions, 'cost_basis'));
            $totalGainLoss = $totalValue - $totalCost;
            $totalGainLossPercent = $totalCost > 0 ? ($totalGainLoss / $totalCost) * 100 : 0;
            $totalDayGainLoss = array_sum(array_column($positions, 'day_gain_loss'));
            $totalDayGainLossPercent = $totalValue > 0 ? ($totalDayGainLoss / $totalValue) * 100 : 0;
            
            $response = [
                'success' => true,
                'portfolio' => $positions,
                'summary' => [
                    'total_value' => $totalValue,
                    'total_cost' => $totalCost,
                    'total_gain_loss' => $totalGainLoss,
                    'total_gain_loss_percent' => $totalGainLossPercent,
                    'day_gain_loss' => $totalDayGainLoss,
                    'day_gain_loss_percent' => $totalDayGainLossPercent,
                    'position_count' => count($positions)
                ]
            ];
            
            sendJsonResponse($response);
            
        } catch (Exception $e) {
            error_log("Get portfolio error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to get portfolio'], 500);
        }
    }
    
    /**
     * Add new position
     */
    private function addPosition() {
        $userId = $this->authenticateUser();
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $symbol = strtoupper(sanitizeInput($input['symbol'] ?? ''));
        $name = sanitizeInput($input['name'] ?? '');
        $shares = floatval($input['shares'] ?? 0);
        $avgPrice = floatval($input['avgPrice'] ?? 0);
        $currentPrice = floatval($input['currentPrice'] ?? 0);
        $sector = sanitizeInput($input['sector'] ?? '');
        $purchaseDate = $input['purchaseDate'] ?? date('Y-m-d');
        
        // Validate input
        if (empty($symbol) || empty($name) || $shares <= 0 || $avgPrice <= 0 || $currentPrice <= 0 || empty($sector)) {
            sendJsonResponse(['error' => 'All fields are required and must be valid'], 400);
        }
        
        if (!validateStockSymbol($symbol)) {
            sendJsonResponse(['error' => 'Invalid stock symbol format'], 400);
        }
        
        try {
            $this->db->beginTransaction();
            
            // Check if position already exists
            $sql = "SELECT id, shares, avg_price FROM portfolio WHERE user_id = ? AND symbol = ? AND is_active = 1";
            $existingPosition = $this->db->fetchOne($sql, [$userId, $symbol]);
            
            if ($existingPosition) {
                // Update existing position (average down/up)
                $totalShares = $existingPosition['shares'] + $shares;
                $totalCost = ($existingPosition['shares'] * $existingPosition['avg_price']) + ($shares * $avgPrice);
                $newAvgPrice = $totalCost / $totalShares;
                
                $sql = "UPDATE portfolio SET shares = ?, avg_price = ?, updated_at = NOW() WHERE id = ?";
                $this->db->execute($sql, [$totalShares, $newAvgPrice, $existingPosition['id']]);
                
                $message = "Updated existing position for $symbol";
            } else {
                // Add new position
                $sql = "INSERT INTO portfolio (user_id, symbol, name, shares, avg_price, sector, purchase_date, created_at, is_active) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)";
                $this->db->execute($sql, [$userId, $symbol, $name, $shares, $avgPrice, $sector, $purchaseDate]);
                
                $message = "Added new position for $symbol";
            }
            
            // Update or insert stock price
            $this->updateStockPrice($symbol, $currentPrice);
            
            $this->db->commit();
            
            // Log activity
            logActivity($userId, 'add_position', "Added/Updated position: $symbol");
            
            sendJsonResponse(['success' => true, 'message' => $message], 201);
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("Add position error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to add position'], 500);
        }
    }
    
    /**
     * Update existing position
     */
    private function updatePosition() {
        $userId = $this->authenticateUser();
        
        $input = json_decode(file_get_contents('php://input'), true);
        $positionId = intval($_GET['id'] ?? 0);
        
        $shares = floatval($input['shares'] ?? 0);
        $avgPrice = floatval($input['avgPrice'] ?? 0);
        $currentPrice = floatval($input['currentPrice'] ?? 0);
        $sector = sanitizeInput($input['sector'] ?? '');
        
        if ($positionId <= 0 || $shares <= 0 || $avgPrice <= 0 || $currentPrice <= 0 || empty($sector)) {
            sendJsonResponse(['error' => 'Invalid input data'], 400);
        }
        
        try {
            // Verify ownership
            $sql = "SELECT symbol FROM portfolio WHERE id = ? AND user_id = ? AND is_active = 1";
            $position = $this->db->fetchOne($sql, [$positionId, $userId]);
            
            if (!$position) {
                sendJsonResponse(['error' => 'Position not found'], 404);
            }
            
            $this->db->beginTransaction();
            
            // Update position
            $sql = "UPDATE portfolio SET shares = ?, avg_price = ?, sector = ?, updated_at = NOW() WHERE id = ?";
            $this->db->execute($sql, [$shares, $avgPrice, $sector, $positionId]);
            
            // Update stock price
            $this->updateStockPrice($position['symbol'], $currentPrice);
            
            $this->db->commit();
            
            // Log activity
            logActivity($userId, 'update_position', "Updated position: {$position['symbol']}");
            
            sendJsonResponse(['success' => true, 'message' => 'Position updated successfully']);
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("Update position error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to update position'], 500);
        }
    }
    
    /**
     * Delete position
     */
    private function deletePosition() {
        $userId = $this->authenticateUser();
        $positionId = intval($_GET['id'] ?? 0);
        
        if ($positionId <= 0) {
            sendJsonResponse(['error' => 'Invalid position ID'], 400);
        }
        
        try {
            // Verify ownership
            $sql = "SELECT symbol FROM portfolio WHERE id = ? AND user_id = ? AND is_active = 1";
            $position = $this->db->fetchOne($sql, [$positionId, $userId]);
            
            if (!$position) {
                sendJsonResponse(['error' => 'Position not found'], 404);
            }
            
            // Soft delete
            $sql = "UPDATE portfolio SET is_active = 0, updated_at = NOW() WHERE id = ?";
            $this->db->execute($sql, [$positionId]);
            
            // Log activity
            logActivity($userId, 'delete_position', "Deleted position: {$position['symbol']}");
            
            sendJsonResponse(['success' => true, 'message' => 'Position deleted successfully']);
            
        } catch (Exception $e) {
            error_log("Delete position error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to delete position'], 500);
        }
    }
    
    /**
     * Get watchlist
     */
    private function getWatchlist() {
        $userId = $this->authenticateUser();
        
        try {
            $sql = "SELECT w.*, s.current_price, s.day_change, s.day_change_percent, s.updated_at as price_updated
                    FROM watchlist w
                    LEFT JOIN stock_prices s ON w.symbol = s.symbol
                    WHERE w.user_id = ? AND w.is_active = 1
                    ORDER BY w.created_at DESC";
            
            $watchlist = $this->db->fetchAll($sql, [$userId]);
            
            // Add alert status for each item
            foreach ($watchlist as &$item) {
                $item['alert_triggered'] = false;
                
                if ($item['target_price'] && $item['current_price']) {
                    if ($item['alert_type'] === 'above' && $item['current_price'] >= $item['target_price']) {
                        $item['alert_triggered'] = true;
                    } elseif ($item['alert_type'] === 'below' && $item['current_price'] <= $item['target_price']) {
                        $item['alert_triggered'] = true;
                    }
                }
            }
            
            sendJsonResponse(['success' => true, 'watchlist' => $watchlist]);
            
        } catch (Exception $e) {
            error_log("Get watchlist error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to get watchlist'], 500);
        }
    }
    
    /**
     * Add to watchlist
     */
    private function addToWatchlist() {
        $userId = $this->authenticateUser();
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $symbol = strtoupper(sanitizeInput($input['symbol'] ?? ''));
        $name = sanitizeInput($input['name'] ?? '');
        $currentPrice = floatval($input['price'] ?? 0);
        $targetPrice = floatval($input['targetPrice'] ?? 0);
        $alertType = sanitizeInput($input['alertType'] ?? 'above');
        $notes = sanitizeInput($input['notes'] ?? '');
        
        if (empty($symbol) || empty($name) || $currentPrice <= 0) {
            sendJsonResponse(['error' => 'Symbol, name, and current price are required'], 400);
        }
        
        if (!validateStockSymbol($symbol)) {
            sendJsonResponse(['error' => 'Invalid stock symbol format'], 400);
        }
        
        try {
            // Check if already in watchlist
            $sql = "SELECT id FROM watchlist WHERE user_id = ? AND symbol = ? AND is_active = 1";
            $existing = $this->db->fetchOne($sql, [$userId, $symbol]);
            
            if ($existing) {
                sendJsonResponse(['error' => 'Stock already in watchlist'], 409);
            }
            
            $this->db->beginTransaction();
            
            // Add to watchlist
            $sql = "INSERT INTO watchlist (user_id, symbol, name, target_price, alert_type, notes, created_at, is_active) 
                    VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)";
            $this->db->execute($sql, [$userId, $symbol, $name, $targetPrice ?: null, $alertType, $notes]);
            
            // Update stock price
            $this->updateStockPrice($symbol, $currentPrice);
            
            $this->db->commit();
            
            // Log activity
            logActivity($userId, 'add_watchlist', "Added to watchlist: $symbol");
            
            sendJsonResponse(['success' => true, 'message' => "Added $symbol to watchlist"], 201);
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("Add to watchlist error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to add to watchlist'], 500);
        }
    }
    
    /**
     * Get portfolio analytics
     */
    private function getAnalytics() {
        $userId = $this->authenticateUser();
        $period = $_GET['period'] ?? '1M';
        
        try {
            // Get portfolio performance data
            $performanceData = $this->getPortfolioPerformance($userId, $period);
            
            // Get sector allocation
            $sectorData = $this->getSectorAllocation($userId);
            
            // Get risk metrics
            $riskMetrics = $this->getRiskMetrics($userId);
            
            // Get top performers
            $topPerformers = $this->getTopPerformers($userId);
            
            $response = [
                'success' => true,
                'analytics' => [
                    'performance' => $performanceData,
                    'sectors' => $sectorData,
                    'risk_metrics' => $riskMetrics,
                    'top_performers' => $topPerformers,
                    'period' => $period
                ]
            ];
            
            sendJsonResponse($response);
            
        } catch (Exception $e) {
            error_log("Get analytics error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to get analytics'], 500);
        }
    }
    
    /**
     * Search stocks
     */
    private function searchStocks() {
        $query = sanitizeInput($_GET['q'] ?? '');
        
        if (strlen($query) < 1) {
            sendJsonResponse(['success' => true, 'results' => []]);
        }
        
        try {
            // Search in stock database (simplified - in real app would use external API)
            $sql = "SELECT symbol, name FROM stock_symbols 
                    WHERE symbol LIKE ? OR name LIKE ? 
                    ORDER BY symbol LIMIT 10";
            
            $searchTerm = "%$query%";
            $results = $this->db->fetchAll($sql, [$searchTerm, $searchTerm]);
            
            sendJsonResponse(['success' => true, 'results' => $results]);
            
        } catch (Exception $e) {
            error_log("Search stocks error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Search failed'], 500);
        }
    }
    
    /**
     * Handle contact form
     */
    private function handleContact() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = sanitizeInput($input['name'] ?? '');
        $email = sanitizeInput($input['email'] ?? '');
        $subject = sanitizeInput($input['subject'] ?? '');
        $message = sanitizeInput($input['message'] ?? '');
        
        if (empty($name) || empty($email) || empty($subject) || empty($message)) {
            sendJsonResponse(['error' => 'All fields are required'], 400);
        }
        
        if (!validateEmail($email)) {
            sendJsonResponse(['error' => 'Invalid email format'], 400);
        }
        
        try {
            // Save contact message
            $sql = "INSERT INTO contact_messages (name, email, subject, message, created_at) VALUES (?, ?, ?, ?, NOW())";
            $this->db->execute($sql, [$name, $email, $subject, $message]);
            
            // Send email notification (simplified)
            $this->sendContactEmail($name, $email, $subject, $message);
            
            sendJsonResponse(['success' => true, 'message' => 'Message sent successfully']);
            
        } catch (Exception $e) {
            error_log("Contact form error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to send message'], 500);
        }
    }
    
    /**
     * Helper Methods
     */
    
    private function authenticateUser() {
        $token = $this->getTokenFromHeader();
        
        if (!$token) {
            sendJsonResponse(['error' => 'Authentication required'], 401);
        }
        
        $userId = $this->getUserIdFromToken($token);
        
        if (!$userId) {
            sendJsonResponse(['error' => 'Invalid or expired token'], 401);
        }
        
        return $userId;
    }
    
    private function getTokenFromHeader() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (strpos($authHeader, 'Bearer ') === 0) {
            return substr($authHeader, 7);
        }
        
        return null;
    }
    
    private function getUserIdFromToken($token) {
        $sql = "SELECT user_id FROM user_sessions WHERE token = ? AND expires_at > NOW()";
        $session = $this->db->fetchOne($sql, [$token]);
        
        return $session ? $session['user_id'] : null;
    }
    
    private function updateStockPrice($symbol, $price) {
        $sql = "INSERT INTO stock_prices (symbol, current_price, updated_at) 
                VALUES (?, ?, NOW()) 
                ON DUPLICATE KEY UPDATE current_price = ?, updated_at = NOW()";
        $this->db->execute($sql, [$symbol, $price, $price]);
    }
    
    private function getPortfolioPerformance($userId, $period) {
        // Simplified performance calculation
        $days = $this->getPeriodDays($period);
        $data = [];
        
        for ($i = $days; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-$i days"));
            $value = 100000 + (rand(-5000, 10000)); // Simulated data
            $data[] = ['date' => $date, 'value' => $value];
        }
        
        return $data;
    }
    
    private function getSectorAllocation($userId) {
        $sql = "SELECT p.sector, SUM(p.shares * COALESCE(s.current_price, p.avg_price)) as value
                FROM portfolio p
                LEFT JOIN stock_prices s ON p.symbol = s.symbol
                WHERE p.user_id = ? AND p.is_active = 1
                GROUP BY p.sector";
        
        return $this->db->fetchAll($sql, [$userId]);
    }
    
    private function getRiskMetrics($userId) {
        // Simplified risk metrics
        return [
            'beta' => 1.2,
            'sharpe_ratio' => 0.8,
            'volatility' => 15.5,
            'max_drawdown' => -8.2,
            'var_95' => -3.5
        ];
    }
    
    private function getTopPerformers($userId) {
        $sql = "SELECT p.symbol, p.name, 
                       ((COALESCE(s.current_price, p.avg_price) - p.avg_price) / p.avg_price * 100) as gain_loss_percent
                FROM portfolio p
                LEFT JOIN stock_prices s ON p.symbol = s.symbol
                WHERE p.user_id = ? AND p.is_active = 1
                ORDER BY gain_loss_percent DESC
                LIMIT 5";
        
        return $this->db->fetchAll($sql, [$userId]);
    }
    
    private function getPeriodDays($period) {
        switch ($period) {
            case '1M': return 30;
            case '3M': return 90;
            case '6M': return 180;
            case '1Y': return 365;
            case '2Y': return 730;
            default: return 30;
        }
    }
    
    private function sendContactEmail($name, $email, $subject, $message) {
        // Simplified email sending (in production, use proper email service)
        $to = CONTACT_EMAIL;
        $emailSubject = "Contact Form: $subject";
        $emailBody = "Name: $name\nEmail: $email\n\nMessage:\n$message";
        $headers = "From: $email\r\nReply-To: $email\r\n";
        
        mail($to, $emailSubject, $emailBody, $headers);
    }
}

// Handle the request
if ($_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    $portfolio = new PortfolioHandler();
    $portfolio->handleRequest();
} else {
    // Handle preflight requests
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}
?>

