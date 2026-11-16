package middleware

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTClaims struct {
	UserID   uuid.UUID       `json:"user_id"`
	Username string          `json:"username"`
	Email    string          `json:"email"`
	Role     models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(user *models.User, secret string, durationStr string) (string, error) {
	duration, err := time.ParseDuration(durationStr)
	if err != nil {
		duration = 24 * time.Hour
	}

	claims := JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "hotelos",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization header format"})
			c.Abort()
			return
		}

		tokenStr := parts[1]
		token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired authorization token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*JWTClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}
		var user models.User
		if err := database.DB.First(&user, "id = ?", claims.UserID).Error; err != nil || !user.IsActive {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User session is no longer active"})
			c.Abort()
			return
		}
		if user.PasswordChangedAt != nil && claims.IssuedAt != nil && user.PasswordChangedAt.After(claims.IssuedAt.Time) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Session expired after password change"})
			c.Abort()
			return
		}

		c.Set("claims", claims)
		c.Set("user_id", claims.UserID)
		c.Set("user_role", user.Role)
		c.Next()
	}
}

func RequireRole(allowedRoles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access forbidden: no role specified"})
			c.Abort()
			return
		}

		userRole := roleVal.(models.UserRole)
		// Super Admin and Hotel Manager are system-wide administrative roles.
		// Keeping this override centralized ensures new protected routes inherit
		// the same authorization policy without relying on frontend visibility.
		if userRole == models.RoleSuperAdmin || userRole == models.RoleHotelManager {
			c.Next()
			return
		}

		for _, r := range allowedRoles {
			if r == userRole {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Access forbidden: insufficient role permissions"})
		c.Abort()
	}
}

func AuditMutations() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		if c.Request.Method == http.MethodGet || c.Request.Method == http.MethodOptions || c.Writer.Status() >= 400 {
			return
		}
		var userID *uuid.UUID
		if value, ok := c.Get("user_id"); ok {
			if id, ok := value.(uuid.UUID); ok {
				userID = &id
			}
		}
		_ = database.DB.Create(&models.AuditLog{
			UserID: userID, Action: strings.ToLower(c.Request.Method), EntityType: c.FullPath(),
			EntityID: c.Param("id"), Details: "HTTP " + c.Request.Method + " completed", IPAddress: c.ClientIP(),
		}).Error
	}
}

func CORSMiddleware(allowedOrigin ...string) gin.HandlerFunc {
	origin := "http://localhost:5173"
	if len(allowedOrigin) > 0 && allowedOrigin[0] != "" {
		origin = allowedOrigin[0]
	}
	return func(c *gin.Context) {
		requestOrigin := c.GetHeader("Origin")
		if requestOrigin == origin || (origin == "*" && requestOrigin != "") {
			c.Writer.Header().Set("Access-Control-Allow-Origin", requestOrigin)
			c.Writer.Header().Set("Vary", "Origin")
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "false")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
