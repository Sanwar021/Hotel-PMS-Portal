package handlers

import (
	"fmt"
	"net/http"
	"time"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"
	"hotelos/backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetMaintenanceRequests(c *gin.Context) {
	var requests []models.MaintenanceRequest
	query := database.DB.Preload("Room").Preload("Assignee").Order("created_at desc")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch maintenance requests"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

type CreateMaintenanceRequest struct {
	RoomID        *uuid.UUID           `json:"room_id"`
	EquipmentName string               `json:"equipment_name"`
	Title         string               `json:"title" binding:"required"`
	Description   string               `json:"description"`
	Priority      models.PriorityLevel `json:"priority"`
	BlockRoom     bool                 `json:"block_room"`
}

func CreateMaintenance(c *gin.Context) {
	var req CreateMaintenanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	priority := models.PriorityMedium
	if req.Priority != "" {
		priority = req.Priority
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	maint := models.MaintenanceRequest{
		RoomID:        req.RoomID,
		EquipmentName: req.EquipmentName,
		Title:         req.Title,
		Description:   req.Description,
		Priority:      priority,
		Status:        models.MaintReported,
	}

	if err := tx.Create(&maint).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create maintenance request"})
		return
	}

	// Block room if requested
	if req.BlockRoom && req.RoomID != nil {
		var room models.Room
		if err := tx.First(&room, "id = ?", *req.RoomID).Error; err == nil {
			room.Status = models.RoomStatusMaintenance
			tx.Save(&room)
			websocket.BroadcastEvent("ROOM_STATUS_CHANGED", room)
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit maintenance request"})
		return
	}

	database.DB.Preload("Room").First(&maint, maint.ID)
	websocket.BroadcastEvent("MAINTENANCE_CREATED", maint)

	c.JSON(http.StatusCreated, gin.H{"request": maint})
}

type UpdateMaintenanceStatusRequest struct {
	Status      models.MaintenanceStatus `json:"status" binding:"required"`
	Cost        float64                  `json:"cost"`
	ReleaseRoom bool                     `json:"release_room"`
}

func UpdateMaintenanceStatus(c *gin.Context) {
	idStr := c.Param("id")
	maintID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	var req UpdateMaintenanceStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status is required"})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var maint models.MaintenanceRequest
	if err := tx.Preload("Room").First(&maint, "id = ?", maintID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Maintenance request not found"})
		return
	}

	maint.Status = req.Status
	if req.Cost > 0 {
		maint.Cost = req.Cost
	}

	if req.Status == models.MaintCompleted {
		now := time.Now()
		maint.CompletedAt = &now

		// Release room back to clean/available or dirty for cleaning
		if maint.Room != nil && req.ReleaseRoom {
			maint.Room.Status = models.RoomStatusAvailable
			tx.Save(maint.Room)
			websocket.BroadcastEvent("ROOM_STATUS_CHANGED", maint.Room)
		}
	}

	if err := tx.Save(&maint).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update maintenance request"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit maintenance update"})
		return
	}

	database.DB.Preload("Room").First(&maint, maint.ID)
	websocket.BroadcastEvent("MAINTENANCE_UPDATED", maint)

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Maintenance request updated to '%s'.", req.Status),
		"request": maint,
	})
}

