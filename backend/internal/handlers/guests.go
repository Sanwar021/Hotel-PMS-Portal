package handlers

import (
	"net/http"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetGuests(c *gin.Context) {
	var guests []models.Guest
	query := database.DB.Order("created_at desc")

	if search := c.Query("search"); search != "" {
		pat := "%" + search + "%"
		query = query.Where("first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ? OR phone ILIKE ? OR company_name ILIKE ?",
			pat, pat, pat, pat, pat)
	}
	if vip := c.Query("vip"); vip != "" {
		query = query.Where("vip_status = ?", vip)
	}

	if err := query.Find(&guests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch guests"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"guests": guests})
}

func GetGuestByID(c *gin.Context) {
	idStr := c.Param("id")
	guestID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guest ID"})
		return
	}

	var guest models.Guest
	if err := database.DB.First(&guest, "id = ?", guestID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guest not found"})
		return
	}

	// Fetch history of stays
	var reservations []models.Reservation
	database.DB.Preload("Room").Preload("RoomType").
		Where("guest_id = ?", guest.ID).
		Order("check_in_date desc").
		Find(&reservations)

	c.JSON(http.StatusOK, gin.H{
		"guest":        guest,
		"reservations": reservations,
	})
}

type CreateGuestRequest struct {
	FirstName   string           `json:"first_name" binding:"required"`
	LastName    string           `json:"last_name" binding:"required"`
	Email       string           `json:"email"`
	Phone       string           `json:"phone"`
	IDType      string           `json:"id_type"`
	IDNumber    string           `json:"id_number"`
	Nationality string           `json:"nationality"`
	Address     string           `json:"address"`
	City        string           `json:"city"`
	Country     string           `json:"country"`
	VIPStatus   models.VIPStatus `json:"vip_status"`
	Preferences string           `json:"preferences"`
	Notes       string           `json:"notes"`
	CompanyName string           `json:"company_name"`
}

func CreateGuest(c *gin.Context) {
	var req CreateGuestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var hotel models.Hotel
	database.DB.First(&hotel)

	guest := models.Guest{
		HotelID:     hotel.ID,
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Email:       req.Email,
		Phone:       req.Phone,
		IDType:      req.IDType,
		IDNumber:    req.IDNumber,
		Nationality: req.Nationality,
		Address:     req.Address,
		City:        req.City,
		Country:     req.Country,
		VIPStatus:   req.VIPStatus,
		Preferences: req.Preferences,
		Notes:       req.Notes,
		CompanyName: req.CompanyName,
	}
	if guest.Nationality == "" {
		guest.Nationality = "Bangladeshi"
	}
	if guest.VIPStatus == "" {
		guest.VIPStatus = models.VIPNone
	}

	if err := database.DB.Create(&guest).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create guest"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"guest": guest})
}

func UpdateGuest(c *gin.Context) {
	idStr := c.Param("id")
	guestID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid guest ID"})
		return
	}

	var guest models.Guest
	if err := database.DB.First(&guest, "id = ?", guestID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guest not found"})
		return
	}

	var req CreateGuestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	guest.FirstName = req.FirstName
	guest.LastName = req.LastName
	guest.Email = req.Email
	guest.Phone = req.Phone
	guest.IDType = req.IDType
	guest.IDNumber = req.IDNumber
	guest.Nationality = req.Nationality
	guest.Address = req.Address
	guest.City = req.City
	guest.Country = req.Country
	guest.VIPStatus = req.VIPStatus
	guest.Preferences = req.Preferences
	guest.Notes = req.Notes
	guest.CompanyName = req.CompanyName

	if err := database.DB.Save(&guest).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update guest"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"guest": guest})
}
