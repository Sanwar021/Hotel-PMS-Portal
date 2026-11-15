package handlers

import (
	"net/http"
	"time"

	"hotelos/backend/internal/config"
	"hotelos/backend/internal/database"
	"hotelos/backend/internal/middleware"
	"hotelos/backend/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

func LoginHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username and access PIN are required"})
			return
		}

		var user models.User
		if err := database.DB.Where("username = ? OR email = ?", req.Username, req.Username).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or access PIN"})
			return
		}

		if !user.IsActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "Account is disabled. Contact system administrator."})
			return
		}
		if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
			c.JSON(http.StatusLocked, gin.H{"error": "Account is temporarily locked after repeated failed sign-in attempts"})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			user.FailedLoginAttempts++
			if user.FailedLoginAttempts >= 5 {
				lockedUntil := time.Now().Add(15 * time.Minute)
				user.LockedUntil = &lockedUntil
			}
			database.DB.Model(&user).Updates(map[string]interface{}{"failed_login_attempts": user.FailedLoginAttempts, "locked_until": user.LockedUntil})
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or access PIN"})
			return
		}
		now := time.Now()
		user.FailedLoginAttempts = 0
		user.LockedUntil = nil
		user.LastLoginAt = &now
		database.DB.Model(&user).Updates(map[string]interface{}{"failed_login_attempts": 0, "locked_until": nil, "last_login_at": now})

		token, err := middleware.GenerateToken(&user, cfg.JWTSecret, cfg.JWTExpiresIn)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authorization token"})
			return
		}

		c.JSON(http.StatusOK, LoginResponse{
			Token: token,
			User:  user,
		})
	}
}

func ChangePassword(c *gin.Context) {
	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.NewPassword) < 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Current password and a new password of at least 12 characters are required"})
		return
	}
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure new password"})
		return
	}
	now := time.Now()
	if err := database.DB.Model(&user).Updates(map[string]interface{}{"password_hash": string(hash), "password_changed_at": now}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password changed. Sign in again with the new password."})
}

func GetMeHandler(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	claims := claimsVal.(*middleware.JWTClaims)
	var user models.User
	if err := database.DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}
