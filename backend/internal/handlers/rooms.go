package handlers

import (
	"net/http"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"
	"hotelos/backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetRooms(c *gin.Context) {
	var rooms []models.Room
	query := database.DB.Preload("Floor").Preload("RoomType").Order("room_number asc")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if floorID := c.Query("floor_id"); floorID != "" {
		query = query.Where("floor_id = ?", floorID)
	}
	if roomTypeID := c.Query("room_type_id"); roomTypeID != "" {
		query = query.Where("room_type_id = ?", roomTypeID)
	}

	if err := query.Find(&rooms).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch rooms"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"rooms": rooms})
}

func GetRoomTypes(c *gin.Context) {
	var roomTypes []models.RoomType
	if err := database.DB.Preload("Rooms").Find(&roomTypes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch room types"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"room_types": roomTypes})
}

func GetFloors(c *gin.Context) {
	var floors []models.Floor
	if err := database.DB.Preload("Rooms").Order("floor_number asc").Find(&floors).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch floors"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"floors": floors})
}

type CreateRoomRequest struct {
	PropertyID   uuid.UUID         `json:"property_id" binding:"required"`
	FloorID      uuid.UUID         `json:"floor_id" binding:"required"`
	RoomTypeID   uuid.UUID         `json:"room_type_id" binding:"required"`
	RoomNumber   string            `json:"room_number" binding:"required"`
	Status       models.RoomStatus `json:"status"`
	IsSmoking    bool              `json:"is_smoking"`
	IsAccessible bool              `json:"is_accessible"`
	Notes        string            `json:"notes"`
}

func CreateRoom(c *gin.Context) {
	var req CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if room number already exists
	var count int64
	database.DB.Model(&models.Room{}).Where("room_number = ?", req.RoomNumber).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Room number already exists"})
		return
	}

	room := models.Room{
		PropertyID:   req.PropertyID,
		FloorID:      req.FloorID,
		RoomTypeID:   req.RoomTypeID,
		RoomNumber:   req.RoomNumber,
		Status:       models.RoomStatusAvailable,
		IsSmoking:    req.IsSmoking,
		IsAccessible: req.IsAccessible,
		Notes:        req.Notes,
	}
	if req.Status != "" {
		room.Status = req.Status
	}

	if err := database.DB.Create(&room).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create room"})
		return
	}

	database.DB.Preload("Floor").Preload("RoomType").First(&room, room.ID)
	websocket.BroadcastEvent("ROOM_CREATED", room)

	c.JSON(http.StatusCreated, gin.H{"room": room})
}

func UpdateRoomStatus(c *gin.Context) {
	idStr := c.Param("id")
	roomID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
		return
	}

	var req struct {
		Status models.RoomStatus `json:"status" binding:"required"`
		Notes  string            `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status is required"})
		return
	}

	var room models.Room
	if err := database.DB.First(&room, "id = ?", roomID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	room.Status = req.Status
	if req.Notes != "" {
		room.Notes = req.Notes
	}

	if err := database.DB.Save(&room).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update room status"})
		return
	}

	database.DB.Preload("Floor").Preload("RoomType").First(&room, room.ID)
	websocket.BroadcastEvent("ROOM_STATUS_CHANGED", room)

	c.JSON(http.StatusOK, gin.H{"room": room})
}

