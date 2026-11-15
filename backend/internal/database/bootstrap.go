package database

import (
	"fmt"
	"strings"

	"hotelos/backend/internal/config"
	"hotelos/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// BootstrapProduction creates the minimum single-hotel tenant and first administrator once.
// It is safe to call from multiple instances because the hotel code and username are unique.
func BootstrapProduction(db *gorm.DB, cfg *config.Config) error {
	var count int64
	if err := db.Model(&models.User{}).Count(&count).Error; err != nil || count > 0 {
		return err
	}
	if cfg.BootstrapAdminUsername == "" || cfg.BootstrapAdminEmail == "" || len(cfg.BootstrapAdminPassword) < 12 || cfg.BootstrapHotelName == "" || cfg.BootstrapHotelCode == "" {
		return fmt.Errorf("clean production database requires BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD (12+ characters), BOOTSTRAP_HOTEL_NAME and BOOTSTRAP_HOTEL_CODE")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.BootstrapAdminPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return db.Transaction(func(tx *gorm.DB) error {
		var hotel models.Hotel
		hotel = models.Hotel{Name: cfg.BootstrapHotelName, Code: strings.ToUpper(cfg.BootstrapHotelCode), Currency: "BDT", TaxRate: 15, ServiceChargeRate: 10, CheckInTime: "14:00", CheckOutTime: "11:00"}
		result := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "code"}}, DoNothing: true}).Create(&hotel)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			if err := tx.First(&hotel, "code = ?", strings.ToUpper(cfg.BootstrapHotelCode)).Error; err != nil {
				return err
			}
		}
		property := models.Property{HotelID: hotel.ID, Name: cfg.BootstrapHotelName + " Main Property", Code: strings.ToUpper(cfg.BootstrapHotelCode) + "-MAIN", TotalFloors: 1}
		if err := tx.Create(&property).Error; err != nil {
			return err
		}
		admin := models.User{HotelID: &hotel.ID, Username: cfg.BootstrapAdminUsername, Email: cfg.BootstrapAdminEmail, PasswordHash: string(hash), FirstName: "System", LastName: "Administrator", Role: models.RoleSuperAdmin, IsActive: true}
		return tx.Create(&admin).Error
	})
}
