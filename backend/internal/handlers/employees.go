package handlers

import (
	"net/http"

	"hotelos/backend/internal/database"
	"hotelos/backend/internal/models"

	"github.com/gin-gonic/gin"
)

func GetEmployees(c *gin.Context) {
	var employees []models.Employee
	query := database.DB.Preload("Shifts").Order("employee_code asc")

	if dept := c.Query("department"); dept != "" {
		query = query.Where("department = ?", dept)
	}

	if err := query.Find(&employees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employees"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"employees": employees})
}

func GetShifts(c *gin.Context) {
	var shifts []models.Shift
	if err := database.DB.Preload("Employee").Order("date asc").Find(&shifts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shifts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"shifts": shifts})
}
