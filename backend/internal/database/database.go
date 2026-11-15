package database

import (
	"fmt"
	"log"
	"time"

	"hotelos/backend/internal/config"
	"hotelos/backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to PostgreSQL database: %w", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get generic database object: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("✓ Successfully connected to PostgreSQL")
	return DB, nil
}

func MigrateDB(db *gorm.DB) error {
	log.Println("Running database migrations...")
	err := db.AutoMigrate(
		&models.Hotel{},
		&models.Property{},
		&models.Floor{},
		&models.RoomType{},
		&models.Room{},
		&models.Guest{},
		&models.RatePlan{},
		&models.Reservation{},
		&models.GuestFolio{},
		&models.FolioTransaction{},
		&models.Invoice{},
		&models.Payment{},
		&models.HousekeepingTask{},
		&models.RestaurantTable{},
		&models.MenuCategory{},
		&models.MenuItem{},
		&models.RestaurantOrder{},
		&models.RestaurantOrderItem{},
		&models.InventoryItem{},
		&models.InventoryMovement{},
		&models.Supplier{},
		&models.PurchaseOrder{},
		&models.PurchaseOrderItem{},
		&models.MaintenanceRequest{},
		&models.Employee{},
		&models.Shift{},
		&models.User{},
		&models.AuditLog{},
		&models.Notification{},
	)
	if err != nil {
		return fmt.Errorf("failed to auto-migrate database: %w", err)
	}
	log.Println("✓ Database migrations completed successfully")
	return nil
}

