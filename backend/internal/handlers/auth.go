package handlers

import (
	"net/http"

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
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
			return
		}

		var user models.User
		if err := database.DB.Where("username = ? OR email = ?", req.Username, req.Username).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}

		if !user.IsActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "Account is disabled. Contact system administrator."})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}

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

