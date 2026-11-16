package handlers

import (
	"net/http"
	"strings"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var validUserRoles = map[models.UserRole]bool{
	models.RoleSuperAdmin: true, models.RoleHotelOwner: true, models.RoleGeneralManager: true,
	models.RoleHotelManager: true, models.RoleReceptionist: true, models.RoleHousekeepingStaff: true,
	models.RoleAccountant: true, models.RoleRestaurantManager: true, models.RoleRestaurantStaff: true,
	models.RoleInventoryManager: true, models.RoleMaintenanceStaff: true,
}

func currentRole(c *gin.Context) models.UserRole {
	role, _ := c.Get("user_role")
	value, _ := role.(models.UserRole)
	return value
}

func managerCanModify(c *gin.Context, target models.User) bool {
	return currentRole(c) == models.RoleSuperAdmin || target.Role != models.RoleSuperAdmin
}

func GetUsers(c *gin.Context) {
	var users []models.User
	query := database.DB.Order("first_name ASC, last_name ASC")
	if err := query.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve staff accounts"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

type staffAccountRequest struct {
	Username  string          `json:"username" binding:"required"`
	Email     string          `json:"email" binding:"required,email"`
	FirstName string          `json:"first_name" binding:"required"`
	LastName  string          `json:"last_name" binding:"required"`
	Role      models.UserRole `json:"role" binding:"required"`
	AccessPIN string          `json:"access_pin"`
	IsActive  *bool           `json:"is_active"`
}

func validPIN(pin string) bool {
	if len(pin) != 4 {
		return false
	}
	for _, character := range pin {
		if character < '0' || character > '9' {
			return false
		}
	}
	return true
}

func CreateUser(c *gin.Context) {
	var req staffAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil || !validPIN(req.AccessPIN) || !validUserRoles[req.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Valid staff details, role, and a 4-digit access PIN are required"})
		return
	}
	if req.Role == models.RoleSuperAdmin && currentRole(c) != models.RoleSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only Super Admin can create another Super Admin"})
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(req.AccessPIN), bcrypt.DefaultCost)
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	var hotel models.Hotel
	if err := database.DB.First(&hotel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Hotel configuration is unavailable"})
		return
	}
	user := models.User{HotelID: &hotel.ID, Username: strings.TrimSpace(req.Username), Email: strings.ToLower(strings.TrimSpace(req.Email)), PasswordHash: string(hash), FirstName: strings.TrimSpace(req.FirstName), LastName: strings.TrimSpace(req.LastName), Role: req.Role, IsActive: active}
	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email is already in use"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"user": user})
}

func UpdateUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	var target models.User
	if err := database.DB.First(&target, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if !managerCanModify(c, target) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Manager cannot modify the Super Admin account"})
		return
	}
	var req staffAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil || !validUserRoles[req.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Valid staff details and role are required"})
		return
	}
	if req.Role == models.RoleSuperAdmin && currentRole(c) != models.RoleSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only Super Admin can assign the Super Admin role"})
		return
	}
	updates := map[string]interface{}{"username": strings.TrimSpace(req.Username), "email": strings.ToLower(strings.TrimSpace(req.Email)), "first_name": strings.TrimSpace(req.FirstName), "last_name": strings.TrimSpace(req.LastName), "role": req.Role}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.AccessPIN != "" {
		if !validPIN(req.AccessPIN) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Access PIN must contain exactly four digits"})
			return
		}
		hash, _ := bcrypt.GenerateFromPassword([]byte(req.AccessPIN), bcrypt.DefaultCost)
		updates["password_hash"] = string(hash)
		updates["failed_login_attempts"] = 0
		updates["locked_until"] = nil
	}
	if err := database.DB.Model(&target).Updates(updates).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email is already in use"})
		return
	}
	database.DB.First(&target, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"user": target})
}

func DeleteUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	if currentID, ok := c.Get("user_id"); ok && currentID == id {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot delete your own active account"})
		return
	}
	var target models.User
	if err := database.DB.First(&target, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if !managerCanModify(c, target) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Manager cannot delete the Super Admin account"})
		return
	}
	if err := database.DB.Delete(&target).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete staff account"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Staff account deleted"})
}
