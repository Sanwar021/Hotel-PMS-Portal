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
	if err := db.Exec("SELECT pg_advisory_lock(hashtext('hotelos_schema_migration'))").Error; err != nil {
		return err
	}
	defer db.Exec("SELECT pg_advisory_unlock(hashtext('hotelos_schema_migration'))")
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS btree_gist").Error; err != nil {
		return err
	}
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
	statements := []string{
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_property_number ON rooms(property_id, room_number) WHERE deleted_at IS NULL",
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_folios_reservation ON guest_folios(reservation_id) WHERE deleted_at IS NULL",
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_ref ON payments(transaction_ref) WHERE deleted_at IS NULL AND transaction_ref <> '' AND status = 'completed'",
		"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservation_dates_valid') THEN ALTER TABLE reservations ADD CONSTRAINT reservation_dates_valid CHECK (check_out_date > check_in_date); END IF; END $$",
		"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservation_occupancy_valid') THEN ALTER TABLE reservations ADD CONSTRAINT reservation_occupancy_valid CHECK (adults >= 1 AND children >= 0); END IF; END $$",
		"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folio_totals_valid') THEN ALTER TABLE guest_folios ADD CONSTRAINT folio_totals_valid CHECK (total_charges >= 0 AND total_payments >= 0 AND balance >= 0); END IF; END $$",
		"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prevent_room_overlap') THEN ALTER TABLE reservations ADD CONSTRAINT prevent_room_overlap EXCLUDE USING gist (room_id WITH =, daterange(check_in_date, check_out_date, '[)') WITH &&) WHERE (deleted_at IS NULL AND room_id IS NOT NULL AND status IN ('confirmed','checked_in')); END IF; END $$",
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			return fmt.Errorf("database invariant migration failed: %w", err)
		}
	}
	log.Println("✓ Database migrations completed successfully")
	return nil
}
