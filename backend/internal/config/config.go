package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	DBHost       string
	DBPort       string
	DBUser       string
	DBPassword   string
	DBName       string
	DBSSLMode    string
	RedisHost    string
	RedisPort    string
	JWTSecret    string
	JWTExpiresIn string
	CORSOrigin   string
}

func LoadConfig() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:         getEnv("PORT", "8095"),
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBPort:       getEnv("DB_PORT", "5435"),
		DBUser:       getEnv("DB_USER", "hotelos"),
		DBPassword:   getEnv("DB_PASSWORD", "hotelos_secret_2026"),
		DBName:       getEnv("DB_NAME", "hotelos_db"),
		DBSSLMode:    getEnv("DB_SSLMODE", "disable"),
		RedisHost:    getEnv("REDIS_HOST", "localhost"),
		RedisPort:    getEnv("REDIS_PORT", "6385"),
		JWTSecret:    getEnv("JWT_SECRET", "hotelos_super_secure_jwt_secret_key_2026!"),
		JWTExpiresIn: getEnv("JWT_EXPIRES_IN", "24h"),
		CORSOrigin:   getEnv("CORS_ORIGIN", "*"),
	}
}

func getEnv(key, defaultVal string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	return val
}
