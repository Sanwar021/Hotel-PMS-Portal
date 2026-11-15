package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	DBHost                 string
	DBPort                 string
	DBUser                 string
	DBPassword             string
	DBName                 string
	DBSSLMode              string
	RedisHost              string
	RedisPort              string
	JWTSecret              string
	JWTExpiresIn           string
	CORSOrigin             string
	AppEnv                 string
	SeedDemoData           bool
	BootstrapAdminUsername string
	BootstrapAdminEmail    string
	BootstrapAdminPassword string
	BootstrapHotelName     string
	BootstrapHotelCode     string
	FrontendDistDir        string
}

func (c *Config) ValidateProduction() error {
	if c.AppEnv != "production" {
		return nil
	}
	if len(c.JWTSecret) < 32 || c.JWTSecret == "hotelos_super_secure_jwt_secret_key_2026!" {
		return fmt.Errorf("production requires a unique JWT_SECRET of at least 32 characters")
	}
	if c.CORSOrigin == "*" || c.CORSOrigin == "" {
		return fmt.Errorf("production requires an explicit CORS_ORIGIN")
	}
	if c.DBSSLMode == "disable" {
		return fmt.Errorf("production PostgreSQL must use TLS (DB_SSLMODE=require or verify-full)")
	}
	return nil
}

func LoadConfig() *Config {
	_ = godotenv.Load()
	defaultAppEnv := "development"
	if os.Getenv("VERCEL_ENV") == "production" {
		defaultAppEnv = "production"
	}
	appEnv := getEnv("APP_ENV", defaultAppEnv)
	seedDemoData := os.Getenv("SEED_DEMO_DATA") == "true"
	if os.Getenv("SEED_DEMO_DATA") == "" {
		seedDemoData = appEnv != "production"
	}

	return &Config{
		Port:                   getEnv("PORT", "8095"),
		DBHost:                 getEnv("DB_HOST", "localhost"),
		DBPort:                 getEnv("DB_PORT", "5435"),
		DBUser:                 getEnv("DB_USER", "hotelos"),
		DBPassword:             getEnv("DB_PASSWORD", "hotelos_secret_2026"),
		DBName:                 getEnv("DB_NAME", "hotelos_db"),
		DBSSLMode:              getEnv("DB_SSLMODE", "disable"),
		RedisHost:              getEnv("REDIS_HOST", "localhost"),
		RedisPort:              getEnv("REDIS_PORT", "6385"),
		JWTSecret:              getEnv("JWT_SECRET", "hotelos_super_secure_jwt_secret_key_2026!"),
		JWTExpiresIn:           getEnv("JWT_EXPIRES_IN", "24h"),
		CORSOrigin:             getEnv("CORS_ORIGIN", "http://localhost:5173"),
		AppEnv:                 appEnv,
		SeedDemoData:           seedDemoData,
		BootstrapAdminUsername: getEnv("BOOTSTRAP_ADMIN_USERNAME", ""),
		BootstrapAdminEmail:    getEnv("BOOTSTRAP_ADMIN_EMAIL", ""),
		BootstrapAdminPassword: getEnv("BOOTSTRAP_ADMIN_PASSWORD", ""),
		BootstrapHotelName:     getEnv("BOOTSTRAP_HOTEL_NAME", ""),
		BootstrapHotelCode:     getEnv("BOOTSTRAP_HOTEL_CODE", ""),
		FrontendDistDir:        getEnv("FRONTEND_DIST_DIR", ""),
	}
}

func getEnv(key, defaultVal string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	return val
}
