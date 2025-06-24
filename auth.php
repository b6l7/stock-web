<?php
/**
 * Authentication Handler
 * Stock Portfolio Monitor - User Authentication and Session Management
 */

require_once 'config.php';

class AuthHandler {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Handle authentication requests
     */
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';
        
        switch ($method) {
            case 'POST':
                switch ($action) {
                    case 'login':
                        $this->login();
                        break;
                    case 'register':
                        $this->register();
                        break;
                    case 'logout':
                        $this->logout();
                        break;
                    case 'refresh':
                        $this->refreshToken();
                        break;
                    default:
                        sendJsonResponse(['error' => 'Invalid action'], 400);
                }
                break;
            case 'GET':
                switch ($action) {
                    case 'profile':
                        $this->getProfile();
                        break;
                    case 'verify':
                        $this->verifyToken();
                        break;
                    default:
                        sendJsonResponse(['error' => 'Invalid action'], 400);
                }
                break;
            case 'PUT':
                if ($action === 'profile') {
                    $this->updateProfile();
                } else {
                    sendJsonResponse(['error' => 'Invalid action'], 400);
                }
                break;
            default:
                sendJsonResponse(['error' => 'Method not allowed'], 405);
        }
    }
    
    /**
     * User login
     */
    private function login() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            $input = $_POST;
        }
        
        $email = sanitizeInput($input['email'] ?? '');
        $password = $input['password'] ?? '';
        
        // Validate input
        if (empty($email) || empty($password)) {
            sendJsonResponse(['error' => 'Email and password are required'], 400);
        }
        
        if (!validateEmail($email)) {
            sendJsonResponse(['error' => 'Invalid email format'], 400);
        }
        
        try {
            // Find user
            $sql = "SELECT * FROM users WHERE email = ? AND is_active = 1";
            $user = $this->db->fetchOne($sql, [$email]);
            
            if (!$user) {
                sendJsonResponse(['error' => 'Invalid credentials'], 401);
            }
            
            // Verify password
            if (!verifyPassword($password, $user['password_hash'])) {
                // Log failed login attempt
                $this->logFailedLogin($email);
                sendJsonResponse(['error' => 'Invalid credentials'], 401);
            }
            
            // Check if account is locked
            if ($this->isAccountLocked($user['id'])) {
                sendJsonResponse(['error' => 'Account temporarily locked due to multiple failed login attempts'], 423);
            }
            
            // Generate session token
            $token = $this->createSession($user['id']);
            
            // Update last login
            $this->updateLastLogin($user['id']);
            
            // Log successful login
            logActivity($user['id'], 'login', 'User logged in successfully');
            
            // Prepare response
            $response = [
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'phone' => $user['phone'],
                    'country' => $user['country'],
                    'created_at' => $user['created_at'],
                    'preferences' => json_decode($user['preferences'] ?? '{}', true)
                ],
                'token' => $token
            ];
            
            sendJsonResponse($response);
            
        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Login failed'], 500);
        }
    }
    
    /**
     * User registration
     */
    private function register() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            $input = $_POST;
        }
        
        $firstName = sanitizeInput($input['firstName'] ?? '');
        $lastName = sanitizeInput($input['lastName'] ?? '');
        $email = sanitizeInput($input['email'] ?? '');
        $password = $input['password'] ?? '';
        $phone = sanitizeInput($input['phone'] ?? '');
        $country = sanitizeInput($input['country'] ?? '');
        
        // Validate input
        if (empty($firstName) || empty($lastName) || empty($email) || empty($password)) {
            sendJsonResponse(['error' => 'All required fields must be filled'], 400);
        }
        
        if (strlen($firstName) < 2 || strlen($lastName) < 2) {
            sendJsonResponse(['error' => 'First and last name must be at least 2 characters'], 400);
        }
        
        if (!validateEmail($email)) {
            sendJsonResponse(['error' => 'Invalid email format'], 400);
        }
        
        if (strlen($password) < 6) {
            sendJsonResponse(['error' => 'Password must be at least 6 characters'], 400);
        }
        
        try {
            // Check if user already exists
            $sql = "SELECT id FROM users WHERE email = ?";
            $existingUser = $this->db->fetchOne($sql, [$email]);
            
            if ($existingUser) {
                sendJsonResponse(['error' => 'User with this email already exists'], 409);
            }
            
            // Hash password
            $passwordHash = hashPassword($password);
            
            // Default preferences
            $preferences = json_encode([
                'notifications' => true,
                'newsletter' => false,
                'dark_mode' => true
            ]);
            
            // Insert new user
            $sql = "INSERT INTO users (first_name, last_name, email, password_hash, phone, country, preferences, created_at, is_active) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)";
            
            $userId = $this->db->insert($sql, [
                $firstName, $lastName, $email, $passwordHash, $phone, $country, $preferences
            ]);
            
            // Create session
            $token = $this->createSession($userId);
            
            // Log registration
            logActivity($userId, 'register', 'User registered successfully');
            
            // Prepare response
            $response = [
                'success' => true,
                'message' => 'Registration successful',
                'user' => [
                    'id' => $userId,
                    'email' => $email,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'phone' => $phone,
                    'country' => $country,
                    'created_at' => date('Y-m-d H:i:s'),
                    'preferences' => json_decode($preferences, true)
                ],
                'token' => $token
            ];
            
            sendJsonResponse($response, 201);
            
        } catch (Exception $e) {
            error_log("Registration error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Registration failed'], 500);
        }
    }
    
    /**
     * User logout
     */
    private function logout() {
        $token = $this->getTokenFromHeader();
        
        if ($token) {
            try {
                // Get user ID from token
                $userId = $this->getUserIdFromToken($token);
                
                // Delete session
                $sql = "DELETE FROM user_sessions WHERE token = ?";
                $this->db->execute($sql, [$token]);
                
                // Log logout
                if ($userId) {
                    logActivity($userId, 'logout', 'User logged out');
                }
                
                sendJsonResponse(['success' => true, 'message' => 'Logout successful']);
                
            } catch (Exception $e) {
                error_log("Logout error: " . $e->getMessage());
                sendJsonResponse(['error' => 'Logout failed'], 500);
            }
        } else {
            sendJsonResponse(['error' => 'No active session'], 400);
        }
    }
    
    /**
     * Get user profile
     */
    private function getProfile() {
        $userId = $this->authenticateRequest();
        
        try {
            $sql = "SELECT id, email, first_name, last_name, phone, country, created_at, last_login, preferences 
                    FROM users WHERE id = ? AND is_active = 1";
            $user = $this->db->fetchOne($sql, [$userId]);
            
            if (!$user) {
                sendJsonResponse(['error' => 'User not found'], 404);
            }
            
            $user['preferences'] = json_decode($user['preferences'] ?? '{}', true);
            
            sendJsonResponse(['success' => true, 'user' => $user]);
            
        } catch (Exception $e) {
            error_log("Get profile error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to get profile'], 500);
        }
    }
    
    /**
     * Update user profile
     */
    private function updateProfile() {
        $userId = $this->authenticateRequest();
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $firstName = sanitizeInput($input['firstName'] ?? '');
        $lastName = sanitizeInput($input['lastName'] ?? '');
        $phone = sanitizeInput($input['phone'] ?? '');
        $country = sanitizeInput($input['country'] ?? '');
        $preferences = $input['preferences'] ?? [];
        
        // Validate input
        if (empty($firstName) || empty($lastName)) {
            sendJsonResponse(['error' => 'First and last name are required'], 400);
        }
        
        try {
            $sql = "UPDATE users SET first_name = ?, last_name = ?, phone = ?, country = ?, preferences = ?, updated_at = NOW() 
                    WHERE id = ?";
            
            $this->db->execute($sql, [
                $firstName, $lastName, $phone, $country, json_encode($preferences), $userId
            ]);
            
            // Log profile update
            logActivity($userId, 'profile_update', 'User updated profile');
            
            sendJsonResponse(['success' => true, 'message' => 'Profile updated successfully']);
            
        } catch (Exception $e) {
            error_log("Update profile error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to update profile'], 500);
        }
    }
    
    /**
     * Verify token
     */
    private function verifyToken() {
        $token = $this->getTokenFromHeader();
        
        if (!$token) {
            sendJsonResponse(['valid' => false, 'error' => 'No token provided'], 401);
        }
        
        try {
            $userId = $this->getUserIdFromToken($token);
            
            if ($userId) {
                sendJsonResponse(['valid' => true, 'user_id' => $userId]);
            } else {
                sendJsonResponse(['valid' => false, 'error' => 'Invalid token'], 401);
            }
            
        } catch (Exception $e) {
            sendJsonResponse(['valid' => false, 'error' => 'Token verification failed'], 500);
        }
    }
    
    /**
     * Refresh token
     */
    private function refreshToken() {
        $userId = $this->authenticateRequest();
        
        try {
            // Delete old token
            $oldToken = $this->getTokenFromHeader();
            if ($oldToken) {
                $sql = "DELETE FROM user_sessions WHERE token = ?";
                $this->db->execute($sql, [$oldToken]);
            }
            
            // Create new token
            $newToken = $this->createSession($userId);
            
            sendJsonResponse(['success' => true, 'token' => $newToken]);
            
        } catch (Exception $e) {
            error_log("Refresh token error: " . $e->getMessage());
            sendJsonResponse(['error' => 'Failed to refresh token'], 500);
        }
    }
    
    /**
     * Create user session
     */
    private function createSession($userId) {
        $token = generateToken();
        $expiresAt = date('Y-m-d H:i:s', time() + SESSION_TIMEOUT);
        
        $sql = "INSERT INTO user_sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, NOW())";
        $this->db->execute($sql, [$userId, $token, $expiresAt]);
        
        return $token;
    }
    
    /**
     * Authenticate request and return user ID
     */
    private function authenticateRequest() {
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
    
    /**
     * Get token from Authorization header
     */
    private function getTokenFromHeader() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (strpos($authHeader, 'Bearer ') === 0) {
            return substr($authHeader, 7);
        }
        
        return null;
    }
    
    /**
     * Get user ID from token
     */
    private function getUserIdFromToken($token) {
        $sql = "SELECT user_id FROM user_sessions WHERE token = ? AND expires_at > NOW()";
        $session = $this->db->fetchOne($sql, [$token]);
        
        return $session ? $session['user_id'] : null;
    }
    
    /**
     * Update last login time
     */
    private function updateLastLogin($userId) {
        $sql = "UPDATE users SET last_login = NOW() WHERE id = ?";
        $this->db->execute($sql, [$userId]);
    }
    
    /**
     * Log failed login attempt
     */
    private function logFailedLogin($email) {
        $sql = "INSERT INTO failed_logins (email, ip_address, attempted_at) VALUES (?, ?, NOW())";
        $this->db->execute($sql, [$email, $_SERVER['REMOTE_ADDR']]);
    }
    
    /**
     * Check if account is locked
     */
    private function isAccountLocked($userId) {
        $sql = "SELECT COUNT(*) as attempts FROM failed_logins 
                WHERE email = (SELECT email FROM users WHERE id = ?) 
                AND attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)";
        $result = $this->db->fetchOne($sql, [$userId]);
        
        return $result['attempts'] >= 5; // Lock after 5 failed attempts in 1 hour
    }
}

// Handle the request
if ($_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    $auth = new AuthHandler();
    $auth->handleRequest();
} else {
    // Handle preflight requests
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}
?>

