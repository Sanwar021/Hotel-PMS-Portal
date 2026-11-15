package handlers

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type NIDParseRequest struct {
	RawText string `json:"raw_text" binding:"required"`
}

type NIDParseResult struct {
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	IDNumber    string   `json:"id_number"`
	DateOfBirth string   `json:"date_of_birth"`
	Address     string   `json:"address"`
	Nationality string   `json:"nationality"`
	Warnings    []string `json:"warnings"`
}

var (
	nidNumberPattern = regexp.MustCompile(`(?i)(?:national\s*id|nid|id\s*no|no\.?|number)?\s*[:#-]?\s*([0-9][0-9\s-]{8,20}[0-9])`)
	namePattern      = regexp.MustCompile(`(?i)^(?:name|নাম)\s*[:：-]\s*(.+)$`)
	birthPattern     = regexp.MustCompile(`(?i)(?:date\s*of\s*birth|birth|dob|জন্ম\s*তারিখ)\s*[:：-]?\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{4}|[0-9]{4}[./-][0-9]{1,2}[./-][0-9]{1,2})`)
	addressPattern   = regexp.MustCompile(`(?i)^(?:address|ঠিকানা)\s*[:：-]\s*(.+)$`)
)

func ParseNIDText(c *gin.Context) {
	var req NIDParseRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.RawText) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Scanned NID text is required"})
		return
	}

	result := NIDParseResult{Nationality: "Bangladeshi", Warnings: make([]string, 0)}
	text := strings.ReplaceAll(req.RawText, "\r", "")
	lines := strings.Split(text, "\n")

	if match := nidNumberPattern.FindStringSubmatch(text); len(match) > 1 {
		result.IDNumber = digitsOnly(match[1])
		if len(result.IDNumber) != 10 && len(result.IDNumber) != 13 && len(result.IDNumber) != 17 {
			result.Warnings = append(result.Warnings, "Review the extracted NID number")
		}
	}

	for _, rawLine := range lines {
		line := strings.TrimSpace(rawLine)
		if line == "" {
			continue
		}
		if result.FirstName == "" {
			if match := namePattern.FindStringSubmatch(line); len(match) > 1 {
				parts := strings.Fields(strings.TrimSpace(match[1]))
				if len(parts) > 0 {
					result.FirstName = parts[0]
					if len(parts) > 1 {
						result.LastName = strings.Join(parts[1:], " ")
					}
				}
			}
		}
		if result.Address == "" {
			if match := addressPattern.FindStringSubmatch(line); len(match) > 1 {
				result.Address = strings.TrimSpace(match[1])
			}
		}
	}

	if match := birthPattern.FindStringSubmatch(text); len(match) > 1 {
		result.DateOfBirth = normalizeNIDDate(match[1])
	}
	if result.IDNumber == "" {
		result.Warnings = append(result.Warnings, "NID number was not detected; enter it manually")
	}
	if result.FirstName == "" {
		result.Warnings = append(result.Warnings, "Name was not detected; enter it manually")
	}
	if result.DateOfBirth == "" {
		result.Warnings = append(result.Warnings, "Date of birth was not detected; enter it manually")
	}

	c.JSON(http.StatusOK, gin.H{"identity": result})
}

func digitsOnly(value string) string {
	return strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, value)
}

func normalizeNIDDate(value string) string {
	value = strings.ReplaceAll(strings.ReplaceAll(value, ".", "-"), "/", "-")
	for _, layout := range []string{"02-01-2006", "2-1-2006", "2006-01-02", "2006-1-2"} {
		if parsed, err := time.Parse(layout, value); err == nil && !parsed.After(time.Now()) {
			return parsed.Format("2006-01-02")
		}
	}
	return ""
}
