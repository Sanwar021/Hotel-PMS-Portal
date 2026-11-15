package handlers

import (
	"net/http"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetHotelSettings(c *gin.Context) {
	var hotel models.Hotel
	if err := database.DB.Preload("Properties").First(&hotel).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hotel configuration not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"hotel": hotel})
}

func UpdateHotelSettings(c *gin.Context) {
	var hotel models.Hotel
	if err := database.DB.First(&hotel).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hotel not found"})
		return
	}

	var req struct {
		Name              string  `json:"name"`
		Tagline           string  `json:"tagline"`
		Description       string  `json:"description"`
		Address           string  `json:"address"`
		Phone             string  `json:"phone"`
		Email             string  `json:"email"`
		Currency          string  `json:"currency"`
		TaxRate           float64 `json:"tax_rate"`
		ServiceChargeRate float64 `json:"service_charge_rate"`
		CheckInTime       string  `json:"check_in_time"`
		CheckOutTime      string  `json:"check_out_time"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		hotel.Name = req.Name
	}
	if req.Tagline != "" {
		hotel.Tagline = req.Tagline
	}
	if req.Description != "" {
		hotel.Description = req.Description
	}
	if req.Address != "" {
		hotel.Address = req.Address
	}
	if req.Phone != "" {
		hotel.Phone = req.Phone
	}
	if req.Email != "" {
		hotel.Email = req.Email
	}
	if req.Currency != "" {
		hotel.Currency = req.Currency
	}
	if req.TaxRate > 0 {
		hotel.TaxRate = req.TaxRate
	}
	if req.ServiceChargeRate > 0 {
		hotel.ServiceChargeRate = req.ServiceChargeRate
	}
	if req.CheckInTime != "" {
		hotel.CheckInTime = req.CheckInTime
	}
	if req.CheckOutTime != "" {
		hotel.CheckOutTime = req.CheckOutTime
	}

	if err := database.DB.Save(&hotel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update hotel settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Hotel settings updated successfully",
		"hotel":   hotel,
	})
}

func GetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	if err := database.DB.Preload("User").Order("created_at desc").Limit(100).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit logs"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"audit_logs": logs})
}

func GetNotifications(c *gin.Context) {
	var notifs []models.Notification
	if err := database.DB.Order("created_at desc").Limit(50).Find(&notifs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"notifications": notifs})
}

func MarkNotificationAsRead(c *gin.Context) {
	idStr := c.Param("id")
	notifID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	database.DB.Model(&models.Notification{}).Where("id = ?", notifID).Update("is_read", true)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

