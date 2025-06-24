<?php
/**
 * Database Configuration
 * Stock Portfolio Monitor - Database Connection Settings
 */

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'stock_portfolio_db');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Application configuration
define('APP_NAME', 'Stock Portfolio Monitor');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'http://localhost');

// Security configuration
define('JWT_SECRET', 'your-secret-key-here-change-in-production');
define('PASSWORD_SALT', 'your-salt-here-change-in-production');
define('SESSION_TIMEOUT', 86400); // 24 hours in seconds

// API configuration
define('API_RATE_LIMIT', 100); // requests per hour
define('MAX_UPLOAD_SIZE', 5242880); // 5MB in bytes

// Email configuration (for contact form)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'your-email@gmail.com');
define('SMTP_PASSWORD', 'your-app-password');
define('CONTACT_EMAIL', 'hamzamohamedcod@gmail.com');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Timezone
date_default_timezone_set('Asia/Kuala_Lumpur');

/**
 * Database Connection Class
 */
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            die("Database connection failed. Please check your configuration.");
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    /**
     * Execute a prepared statement
     */
    public function execute($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Database query failed: " . $e->getMessage());
            throw new Exception("Database operation failed");
        }
    }
    
    /**
     * Fetch single row
     */
    public function fetchOne($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetch();
    }
    
    /**
     * Fetch multiple rows
     */
    public function fetchAll($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Insert record and return last insert ID
     */
    public function insert($sql, $params = []) {
        $this->execute($sql, $params);
        return $this->connection->lastInsertId();
    }
    
    /**
     * Update/Delete and return affected rows
     */
    public function modify($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Begin transaction
     */
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    /**
     * Commit transaction
     */
    public function commit() {
        return $this->connection->commit();
    }
    
    /**
     * Rollback transaction
     */
    public function rollback() {
        return $this->connection->rollback();
    }
}

/**
 * Utility Functions
 */

/**
 * Sanitize input data
 */
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

/**
 * Validate email address
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

/**
 * Hash password
 */
function hashPassword($password) {
    return password_hash($password . PASSWORD_SALT, PASSWORD_DEFAULT);
}

/**
 * Verify password
 */
function verifyPassword($password, $hash) {
    return password_verify($password . PASSWORD_SALT, $hash);
}

/**
 * Generate random token
 */
function generateToken($length = 32) {
    return bin2hex(random_bytes($length));
}

/**
 * Send JSON response
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }
    
    echo json_encode($data);
    exit;
}

/**
 * Log activity
 */
function logActivity($userId, $action, $details = '') {
    try {
        $db = Database::getInstance();
        $sql = "INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, NOW())";
        $db->execute($sql, [$userId, $action, $details]);
    } catch (Exception $e) {
        error_log("Failed to log activity: " . $e->getMessage());
    }
}

/**
 * Format currency
 */
function formatCurrency($amount) {
    return '$' . number_format($amount, 2);
}

/**
 * Format percentage
 */
function formatPercentage($value) {
    return number_format($value, 2) . '%';
}

/**
 * Calculate percentage change
 */
function calculatePercentageChange($oldValue, $newValue) {
    if ($oldValue == 0) return 0;
    return (($newValue - $oldValue) / $oldValue) * 100;
}

/**
 * Validate stock symbol
 */
function validateStockSymbol($symbol) {
    return preg_match('/^[A-Z]{1,5}$/', $symbol);
}

/**
 * Rate limiting
 */
function checkRateLimit($identifier, $limit = API_RATE_LIMIT) {
    $db = Database::getInstance();
    $sql = "SELECT COUNT(*) as count FROM api_requests WHERE identifier = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)";
    $result = $db->fetchOne($sql, [$identifier]);
    
    if ($result['count'] >= $limit) {
        sendJsonResponse(['error' => 'Rate limit exceeded'], 429);
    }
    
    // Log this request
    $sql = "INSERT INTO api_requests (identifier, created_at) VALUES (?, NOW())";
    $db->execute($sql, [$identifier]);
}

/**
 * Clean old data
 */
function cleanOldData() {
    try {
        $db = Database::getInstance();
        
        // Clean old API requests (older than 24 hours)
        $db->execute("DELETE FROM api_requests WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
        
        // Clean old activity logs (older than 30 days)
        $db->execute("DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
        
        // Clean old sessions (older than session timeout)
        $timeout = SESSION_TIMEOUT / 3600; // Convert to hours
        $db->execute("DELETE FROM user_sessions WHERE created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)", [$timeout]);
        
    } catch (Exception $e) {
        error_log("Failed to clean old data: " . $e->getMessage());
    }
}

// Auto-clean old data (run occasionally)
if (rand(1, 100) === 1) {
    cleanOldData();
}

/**
 * Initialize database connection
 */
try {
    $db = Database::getInstance();
} catch (Exception $e) {
    error_log("Failed to initialize database: " . $e->getMessage());
    if (php_sapi_name() !== 'cli') {
        http_response_code(500);
        die("Service temporarily unavailable");
    }
}
?>

