package database

import (
	"fmt"
	"strings"

	"hotelos/backend/internal/config"
	"hotelos/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ProvisionManager creates or resets a Manager only when explicitly enabled
// through environment variables. This supports existing production databases
// without embedding a credential in source or changing the Super Admin.
func ProvisionManager(db *gorm.DB, cfg *config.Config) error {
	if cfg.ManagerUsername == "" && cfg.ManagerEmail == "" && cfg.ManagerAccessPIN == "" {
		return nil
	}
	if cfg.ManagerUsername == "" || cfg.ManagerEmail == "" || len(cfg.ManagerAccessPIN) != 4 {
		return fmt.Errorf("MANAGER_USERNAME, MANAGER_EMAIL and a 4-digit MANAGER_ACCESS_PIN must be provided together")
	}
	for _, character := range cfg.ManagerAccessPIN {
		if character < '0' || character > '9' {
			return fmt.Errorf("MANAGER_ACCESS_PIN must contain exactly four digits")
		}
	}

	var hotel models.Hotel
	if err := db.Order("created_at ASC").First(&hotel).Error; err != nil {
		return fmt.Errorf("manager requires an existing hotel: %w", err)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.ManagerAccessPIN), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return db.Transaction(func(tx *gorm.DB) error {
		var manager models.User
		result := tx.Unscoped().Where("LOWER(username) = ? OR LOWER(email) = ?", strings.ToLower(cfg.ManagerUsername), strings.ToLower(cfg.ManagerEmail)).First(&manager)
		if result.Error != nil && result.Error != gorm.ErrRecordNotFound {
			return result.Error
		}
		updates := map[string]interface{}{
			"hotel_id": &hotel.ID, "username": cfg.ManagerUsername, "email": strings.ToLower(cfg.ManagerEmail),
			"password_hash": string(hash), "role": models.RoleHotelManager, "is_active": true,
			"failed_login_attempts": 0, "locked_until": nil, "deleted_at": nil,
		}
		if result.Error == gorm.ErrRecordNotFound {
			manager = models.User{HotelID: &hotel.ID, Username: cfg.ManagerUsername, Email: strings.ToLower(cfg.ManagerEmail), PasswordHash: string(hash), FirstName: "Hotel", LastName: "Manager", Role: models.RoleHotelManager, IsActive: true}
			return tx.Create(&manager).Error
		}
		return tx.Unscoped().Model(&manager).Updates(updates).Error
	})
}
