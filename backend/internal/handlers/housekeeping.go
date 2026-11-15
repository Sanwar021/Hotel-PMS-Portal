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

func GetHousekeepingTasks(c *gin.Context) {
	var tasks []models.HousekeepingTask
	query := database.DB.Preload("Room").Preload("Room.Floor").Preload("Room.RoomType").Preload("Assignee").
		Order("created_at desc")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if priority := c.Query("priority"); priority != "" {
		query = query.Where("priority = ?", priority)
	}

	if err := query.Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch housekeeping tasks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tasks": tasks})
}

type CreateTaskRequest struct {
	RoomID           uuid.UUID                   `json:"room_id" binding:"required"`
	AssignedToUserID *uuid.UUID                  `json:"assigned_to_user_id"`
	TaskType         models.HousekeepingTaskType `json:"task_type" binding:"required"`
	Priority         models.PriorityLevel        `json:"priority"`
	Notes            string                      `json:"notes"`
	Checklist        string                      `json:"checklist"`
}

func CreateHousekeepingTask(c *gin.Context) {
	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	priority := models.PriorityMedium
	if req.Priority != "" {
		priority = req.Priority
	}

	checklist := req.Checklist
	if checklist == "" {
		checklist = `[{"item":"Strip and replace bed linens","done":false},{"item":"Sanitize bathroom and replace towels","done":false},{"item":"Restock mini bar and amenities","done":false},{"item":"Vacuum carpet and mop tiles","done":false}]`
	}

	task := models.HousekeepingTask{
		RoomID:           req.RoomID,
		AssignedToUserID: req.AssignedToUserID,
		TaskType:         req.TaskType,
		Priority:         priority,
		Status:           models.RoomStatusDirty,
		Checklist:        checklist,
		Notes:            req.Notes,
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create housekeeping task"})
		return
	}

	database.DB.Preload("Room").Preload("Room.Floor").Preload("Assignee").First(&task, task.ID)
	websocket.BroadcastEvent("HOUSEKEEPING_TASK_CREATED", task)

	c.JSON(http.StatusCreated, gin.H{"task": task})
}

type UpdateTaskStatusRequest struct {
	Status    models.RoomStatus `json:"status" binding:"required"` // dirty, cleaning, inspected, available
	Checklist string            `json:"checklist"`
	Notes     string            `json:"notes"`
}

func UpdateHousekeepingStatus(c *gin.Context) {
	idStr := c.Param("id")
	taskID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var req UpdateTaskStatusRequest
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

	var task models.HousekeepingTask
	if err := tx.Preload("Room").First(&task, "id = ?", taskID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	now := time.Now()
	task.Status = req.Status
	if req.Checklist != "" {
		task.Checklist = req.Checklist
	}
	if req.Notes != "" {
		task.Notes = req.Notes
	}

	if req.Status == models.RoomStatusCleaning && task.StartedAt == nil {
		task.StartedAt = &now
	}
	if req.Status == models.RoomStatusAvailable || req.Status == models.RoomStatusInspected {
		task.CompletedAt = &now
	}

	if err := tx.Save(&task).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	// SYNCHRONIZE ROOM STATUS!
	// If task is marked inspected or available/clean, update the actual Room model!
	if task.Room != nil {
		if req.Status == models.RoomStatusAvailable || req.Status == "clean" {
			task.Room.Status = models.RoomStatusAvailable
		} else if req.Status == models.RoomStatusInspected {
			task.Room.Status = models.RoomStatusInspected
		} else if req.Status == models.RoomStatusCleaning {
			task.Room.Status = models.RoomStatusCleaning
		} else if req.Status == models.RoomStatusDirty {
			task.Room.Status = models.RoomStatusDirty
		}
		tx.Save(task.Room)
		websocket.BroadcastEvent("ROOM_STATUS_CHANGED", task.Room)
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit housekeeping update"})
		return
	}

	database.DB.Preload("Room").Preload("Room.Floor").Preload("Assignee").First(&task, task.ID)
	websocket.BroadcastEvent("HOUSEKEEPING_TASK_UPDATED", task)

	c.JSON(http.StatusOK, gin.H{
		"task":    task,
		"message": fmt.Sprintf("Housekeeping task updated to '%s'. Room status synchronized.", req.Status),
	})
}

