package database

import (
	"fmt"
	"log"
	"time"

	"hotelos/backend/internal/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func hashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes)
}

func SeedDatabase(db *gorm.DB) error {
	// Check if already seeded
	var hotelCount int64
	db.Model(&models.Hotel{}).Count(&hotelCount)
	if hotelCount > 0 {
		log.Println("Database already seeded. Skipping initial seed.")
		return nil
	}

	log.Println("Seeding database with realistic HotelOS Grand Residence enterprise data...")

	// 1. HOTEL
	hotel := models.Hotel{
		Name:              "HotelOS Grand Residence",
		Code:              "HGR-DHAKA",
		Tagline:           "The Epitome of Modern Hospitality & Timeless Luxury",
		Description:       "HotelOS Grand Residence offers world-class luxury accommodations, authentic dining, and bespoke concierge hospitality situated in the heart of Dhaka's diplomatic zone.",
		Address:           "Road 79, Gulshan-2",
		City:              "Dhaka",
		Country:           "Bangladesh",
		Phone:             "+880 2 988 5000",
		Email:             "reservations@grandresidence.hotelos.com",
		Website:           "https://grandresidence.hotelos.com",
		Currency:          "BDT",
		TaxRate:           15.0,
		ServiceChargeRate: 10.0,
		CheckInTime:       "14:00",
		CheckOutTime:      "11:00",
		LogoURL:           "/assets/logo.svg",
	}
	if err := db.Create(&hotel).Error; err != nil {
		return err
	}

	// 2. USERS
	users := []models.User{
		{
			HotelID:      &hotel.ID,
			Username:     "admin",
			Email:        "admin@hotelos.com",
			PasswordHash: hashPassword("admin123"),
			FirstName:    "Alexander",
			LastName:     "Vance",
			Role:         models.RoleSuperAdmin,
			IsActive:     true,
		},
		{
			HotelID:      &hotel.ID,
			Username:     "manager",
			Email:        "manager@hotelos.com",
			PasswordHash: hashPassword("manager123"),
			FirstName:    "Shahriar",
			LastName:     "Khan",
			Role:         models.RoleHotelManager,
			IsActive:     true,
		},
		{
			HotelID:      &hotel.ID,
			Username:     "reception",
			Email:        "frontdesk@hotelos.com",
			PasswordHash: hashPassword("reception123"),
			FirstName:    "Nusrat",
			LastName:     "Jahan",
			Role:         models.RoleReceptionist,
			IsActive:     true,
		},
		{
			HotelID:      &hotel.ID,
			Username:     "accountant",
			Email:        "finance@hotelos.com",
			PasswordHash: hashPassword("account123"),
			FirstName:    "Farhan",
			LastName:     "Chowdhury",
			Role:         models.RoleAccountant,
			IsActive:     true,
		},
		{
			HotelID:      &hotel.ID,
			Username:     "housekeeping",
			Email:        "hk@hotelos.com",
			PasswordHash: hashPassword("clean123"),
			FirstName:    "Salma",
			LastName:     "Begum",
			Role:         models.RoleHousekeepingStaff,
			IsActive:     true,
		},
		{
			HotelID:      &hotel.ID,
			Username:     "restaurant",
			Email:        "dining@hotelos.com",
			PasswordHash: hashPassword("dine123"),
			FirstName:    "Tanvir",
			LastName:     "Hossain",
			Role:         models.RoleRestaurantStaff,
			IsActive:     true,
		},
	}
	if err := db.Create(&users).Error; err != nil {
		return err
	}

	// 3. PROPERTY
	property := models.Property{
		HotelID:     hotel.ID,
		Name:        "Grand Residence Main Wing",
		Code:        "GR-MAIN",
		Address:     "Road 79, Gulshan-2, Dhaka",
		TotalFloors: 4,
		TotalRooms:  40,
	}
	if err := db.Create(&property).Error; err != nil {
		return err
	}

	// 4. FLOORS
	floors := []models.Floor{
		{PropertyID: property.ID, FloorNumber: 1, Name: "1st Floor - Garden View"},
		{PropertyID: property.ID, FloorNumber: 2, Name: "2nd Floor - Premium Suites"},
		{PropertyID: property.ID, FloorNumber: 3, Name: "3rd Floor - Executive Club"},
		{PropertyID: property.ID, FloorNumber: 4, Name: "4th Floor - Penthouse & Royal"},
	}
	if err := db.Create(&floors).Error; err != nil {
		return err
	}

	// 5. ROOM TYPES (5 Distinct Luxury Categories)
	roomTypes := []models.RoomType{
		{
			PropertyID:       property.ID,
			Name:             "Deluxe King Room",
			Code:             "DLX-K",
			Description:      "Spacious luxury bedroom with plush king bed, marble en-suite rainfall bath, and custom mahogany work desk.",
			BasePrice:        8500.00,
			WeekendPrice:     9500.00,
			CapacityAdults:   2,
			CapacityChildren: 1,
			MaxOccupancy:     3,
			BedType:          "1 King Bed",
			SizeSqm:          36.0,
			Amenities:        "Complimentary Wi-Fi, 55\" 4K Smart TV, Nespresso Machine, Mini Bar, Marble En-suite, Safe, City Skyline View",
			ImageURL:         "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80",
		},
		{
			PropertyID:       property.ID,
			Name:             "Superior Twin Room",
			Code:             "SUP-TW",
			Description:      "Elegant room equipped with two premium double beds, ergonomic seating, and designer lighting.",
			BasePrice:        7500.00,
			WeekendPrice:     8200.00,
			CapacityAdults:   2,
			CapacityChildren: 2,
			MaxOccupancy:     4,
			BedType:          "2 Double Beds",
			SizeSqm:          34.0,
			Amenities:        "Complimentary Wi-Fi, 50\" Smart TV, Tea/Coffee maker, Work Desk, Bathrobes, Mini Fridge",
			ImageURL:         "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
		},
		{
			PropertyID:       property.ID,
			Name:             "Executive Club Suite",
			Code:             "EXEC-SUI",
			Description:      "Generous suite featuring a separate parlor lounge, dining table, walk-in closet, and VIP Executive Lounge access.",
			BasePrice:        16000.00,
			WeekendPrice:     18000.00,
			CapacityAdults:   2,
			CapacityChildren: 2,
			MaxOccupancy:     4,
			BedType:          "1 King Bed + Sofa Bed",
			SizeSqm:          58.0,
			Amenities:        "VIP Lounge Access, Butler Service on demand, Jacuzzi tub, 65\" OLED TV, Espresso Bar, Lake View Balcony",
			ImageURL:         "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
		},
		{
			PropertyID:       property.ID,
			Name:             "Accessible Queen Room",
			Code:             "ACC-Q",
			Description:      "Thoughtfully designed barrier-free room with extra wide doorways, roll-in shower with safety bench, and ADA compliant fixtures.",
			BasePrice:        8000.00,
			WeekendPrice:     8000.00,
			CapacityAdults:   2,
			CapacityChildren: 1,
			MaxOccupancy:     2,
			BedType:          "1 Queen Bed",
			SizeSqm:          38.0,
			Amenities:        "Roll-in Shower, Emergency Assist Cord, Lowered Vanity, Wide Entryways, Wi-Fi, Smart TV",
			ImageURL:         "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
		},
		{
			PropertyID:       property.ID,
			Name:             "Grand Presidential Suite",
			Code:             "PRES-SUI",
			Description:      "The pinnacle of luxury. 110 square meters of curated grandeur with master bedroom, private conference parlor, and butler pantry.",
			BasePrice:        35000.00,
			WeekendPrice:     40000.00,
			CapacityAdults:   4,
			CapacityChildren: 2,
			MaxOccupancy:     6,
			BedType:          "1 California King + 1 Queen",
			SizeSqm:          110.0,
			Amenities:        "Private Butler, Airport Limousine Transfer, Kitchenette, Private Terrace, Jacuzzi & Sauna, Bang & Olufsen Sound",
			ImageURL:         "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
		},
	}
	if err := db.Create(&roomTypes).Error; err != nil {
		return err
	}

	// 6. RATE PLANS
	ratePlans := []models.RatePlan{
		{
			HotelID:                 hotel.ID,
			Name:                    "Best Available Rate (Room Only)",
			Code:                    "BAR-RO",
			Description:             "Standard flexible room rate with full 24h cancellation privilege.",
			MealPlan:                "Room Only",
			PriceModifierPercentage: 0,
			IsRefundable:            true,
			CancellationHours:       24,
		},
		{
			HotelID:                 hotel.ID,
			Name:                    "Bed & Breakfast Gourmet",
			Code:                    "BAR-BB",
			Description:             "Includes full hot gourmet breakfast buffet at The Pearl Bistro.",
			MealPlan:                "Bed & Breakfast",
			PriceModifierPercentage: 12.0,
			IsRefundable:            true,
			CancellationHours:       24,
		},
		{
			HotelID:                 hotel.ID,
			Name:                    "Corporate Executive Stay",
			Code:                    "CORP-EXEC",
			Description:             "Negotiated corporate tariff including laundry allowance and breakfast.",
			MealPlan:                "Bed & Breakfast",
			PriceModifierPercentage: -15.0,
			IsRefundable:            true,
			CancellationHours:       12,
		},
		{
			HotelID:                 hotel.ID,
			Name:                    "Half Board Culinary Package",
			Code:                    "HB-PACKAGE",
			Description:             "Includes gourmet breakfast and 3-course dinner per night.",
			MealPlan:                "Half Board",
			PriceModifierPercentage: 25.0,
			IsRefundable:            false,
			CancellationHours:       48,
		},
	}
	if err := db.Create(&ratePlans).Error; err != nil {
		return err
	}

	// 7. ROOMS (40 Real Rooms across 4 Floors)
	var allRooms []models.Room
	roomStatuses := []models.RoomStatus{
		models.RoomStatusAvailable, models.RoomStatusOccupied, models.RoomStatusReserved,
		models.RoomStatusAvailable, models.RoomStatusDirty, models.RoomStatusAvailable,
		models.RoomStatusCleaning, models.RoomStatusInspected, models.RoomStatusOccupied,
		models.RoomStatusMaintenance,
	}

	for fIdx, floor := range floors {
		floorNum := floor.FloorNumber
		for r := 1; r <= 10; r++ {
			roomNum := fmt.Sprintf("%d%02d", floorNum, r)
			status := roomStatuses[(fIdx*10+r-1)%len(roomStatuses)]

			// Distribute room types realistically
			var assignedType models.RoomType
			if floorNum == 4 && (r == 9 || r == 10) {
				assignedType = roomTypes[4] // Presidential Suite on 4th floor
			} else if (floorNum == 3 && r >= 7) || (floorNum == 4 && r >= 5) {
				assignedType = roomTypes[2] // Executive Suite
			} else if floorNum == 1 && (r == 1 || r == 2) {
				assignedType = roomTypes[3] // Accessible Queen on 1st floor
			} else if r%3 == 0 {
				assignedType = roomTypes[1] // Superior Twin
			} else {
				assignedType = roomTypes[0] // Deluxe King
			}

			room := models.Room{
				PropertyID:   property.ID,
				FloorID:      floor.ID,
				RoomTypeID:   assignedType.ID,
				RoomNumber:   roomNum,
				Status:       status,
				IsSmoking:    false,
				IsAccessible: assignedType.Code == "ACC-Q",
				KeyCardCode:  fmt.Sprintf("KC-%s", roomNum),
				Notes:        fmt.Sprintf("Standard inspection passed for room %s", roomNum),
			}
			allRooms = append(allRooms, room)
		}
	}
	if err := db.Create(&allRooms).Error; err != nil {
		return err
	}

	// 8. 30 REALISTIC GUESTS / CRM PROFILES
	guestData := []struct {
		First, Last, Email, Phone, Nat, IDType, IDNum, Company, Notes string
		VIP                                                           models.VIPStatus
		Points, Stays                                                 int
		Spent                                                         float64
	}{
		{"Rahim", "Chowdhury", "rahim.chowdhury@apextech.com", "+880 1711 234567", "Bangladeshi", "National ID", "1985269123456", "Apex Technologies Ltd", "Prefers high floor room facing Gulshan Lake. Decaf coffee in room.", models.VIPPlatinum, 4500, 12, 185000},
		{"Samantha", "Hayes", "s.hayes@unicef.org", "+1 202 555 0192", "American", "Passport", "P58291048", "UNICEF Bangladesh Mission", "Frequent mission lead. Extra pillows requested.", models.VIPGold, 2800, 7, 98000},
		{"Tariq", "Mansoor", "tariq@gulfinvest.ae", "+971 50 123 4567", "Emirati", "Passport", "A89214710", "Gulf Crescent Holdings", "Presidential suite guest. Diplomatic check-in.", models.VIPPlatinum, 8200, 5, 320000},
		{"Farhana", "Ahmed", "farhana.ahmed@dhakabank.com", "+880 1819 876543", "Bangladeshi", "National ID", "1990269876543", "Dhaka Bank Capital", "Late checkout needed on business trips.", models.VIPSilver, 1200, 4, 42000},
		{"David", "Kowalski", "dkowalski@nordicpulp.se", "+46 70 123 4567", "Swedish", "Passport", "S9281745", "Nordic Engineering", "Quiet room required for remote calls.", models.VIPNone, 400, 2, 22500},
		{"Tanvir", "Rahman", "tanvir.r@bengalgroup.com", "+880 1912 345678", "Bangladeshi", "National ID", "1982269345678", "Bengal Group Bangladesh", "Corporate account holder. Prefers executive floor.", models.VIPGold, 3100, 9, 134000},
		{"Elena", "Rostova", "e.rostova@gazprom-asia.sg", "+65 9123 4567", "Singaporean", "Passport", "E7361928", "Energy Asia Pte", "Allergic to down feathers. Synthetic bedding.", models.VIPSilver, 1500, 3, 38000},
		{"Zubair", "Hasan", "zubair@greenfieldbd.com", "+880 1611 987654", "Bangladeshi", "National ID", "1994269987654", "Greenfield Agro", "Regular weekend guest.", models.VIPNone, 600, 3, 27000},
		{"Marcus", "Aurelius", "m.vance@vancestrategies.co.uk", "+44 20 7946 0912", "British", "Passport", "GB837192", "Vance Advisory London", "VIP guest visiting ministry delegation.", models.VIPPlatinum, 6000, 6, 210000},
		{"Nabila", "Sultana", "nabila.s@squarepharma.com", "+880 1713 556677", "Bangladeshi", "National ID", "1988269556677", "Square Pharmaceuticals", "Early check-in requested for morning symposium.", models.VIPSilver, 1900, 5, 54000},
		{"Kenji", "Sato", "sato.kenji@mitsubishi-trade.jp", "+81 90 1234 5678", "Japanese", "Passport", "JP928103", "Mitsubishi Heavy Industries", "Prefers green tea kettle & non-smoking room.", models.VIPGold, 3900, 8, 112000},
		{"Shirin", "Akter", "shirin.akter@brac.net", "+880 1817 112233", "Bangladeshi", "National ID", "1992269112233", "BRAC International", "NGO rate agreement. Twin beds preferred.", models.VIPNone, 500, 2, 19000},
		{"Jean-Luc", "Picard", "jl.picard@stardiffusion.fr", "+33 6 12 34 56 78", "French", "Passport", "FR847291", "Parisian Fine Arts", "Wine and sparkling water on arrival.", models.VIPGold, 2700, 4, 68000},
		{"Mahmudul", "Haque", "mahmudul@transcombd.com", "+880 1715 443322", "Bangladeshi", "National ID", "1981269443322", "Transcom Group", "Board meeting guest.", models.VIPSilver, 2100, 6, 75000},
		{"Chloe", "Dubois", "chloe@montrealbio.ca", "+1 514 555 0184", "Canadian", "Passport", "CA918237", "Quebec Pharma", "Requires invoice billed to company address.", models.VIPNone, 800, 2, 28000},
		{"Kazi", "Imran", "imran@beximco.com", "+880 1914 998877", "Bangladeshi", "National ID", "1986269998877", "BEXIMCO Textiles", "Suite booking regular.", models.VIPGold, 3500, 8, 142000},
		{"Ananya", "Sen", "ananya.sen@tcs.com", "+91 98 2012 3456", "Indian", "Passport", "Z829104", "Tata Consultancy Services", "Vegetarian breakfast preference.", models.VIPSilver, 1400, 3, 33000},
		{"Saif", "Kamal", "saif@pathao.com", "+880 1618 776655", "Bangladeshi", "National ID", "1995269776655", "Pathao HQ", "Tech summit delegate.", models.VIPNone, 300, 1, 12000},
		{"Ingrid", "Bergman", "ingrid@nordicstay.no", "+47 912 34 567", "Norwegian", "Passport", "NO847291", "Oslo Maritime", "Prefers high floor quiet corner room.", models.VIPNone, 700, 2, 21000},
		{"Ashraf", "Zaman", "ashraf@incepta.com", "+880 1716 332211", "Bangladeshi", "National ID", "1979269332211", "Incepta Pharmaceuticals", "Prefers room 305 specifically.", models.VIPSilver, 2400, 7, 89000},
		{"Li", "Wei", "li.wei@huawei-bd.com", "+86 138 0013 8000", "Chinese", "Passport", "CN928371", "Huawei Technologies BD", "Long-stay corporate contract.", models.VIPGold, 4200, 10, 178000},
		{"Tasnim", "Faria", "tasnim.faria@grameenphone.com", "+880 1711 009988", "Bangladeshi", "National ID", "1993269009988", "Grameenphone Ltd", "Wedding anniversary stay. Rose petals setup.", models.VIPSilver, 1600, 4, 52000},
		{"Oliver", "Smith", "oliver.smith@deloitte.co.uk", "+44 7700 900077", "British", "Passport", "GB910284", "Deloitte Advisory UK", "Audit engagement lead.", models.VIPGold, 2900, 5, 85000},
		{"Kamrul", "Islam", "kamrul@akijgroup.com", "+880 1814 665544", "Bangladeshi", "National ID", "1983269665544", "Akij Group", "Prefers ground/first floor room.", models.VIPNone, 900, 3, 31000},
		{"Rachel", "Green", "rachel@bloomingdales.com", "+1 212 555 0143", "American", "Passport", "US982716", "Fashion Retail Corp", "Deluxe King with extra vanity mirror.", models.VIPNone, 450, 1, 16000},
		{"Arif", "Hussain", "arif.h@summitpower.com", "+880 1911 223344", "Bangladeshi", "National ID", "1978269223344", "Summit Power International", "Corporate executive package.", models.VIPPlatinum, 5200, 11, 230000},
		{"Maria", "Garcia", "maria.g@santander.es", "+34 600 123 456", "Spanish", "Passport", "ES748291", "Santander Global", "Quiet room away from elevators.", models.VIPNone, 350, 1, 14000},
		{"Zahid", "Parvez", "zahid@abg.com.bd", "+880 1714 887766", "Bangladeshi", "National ID", "1987269887766", "Ananta Group", "Prefers early morning airport taxi.", models.VIPSilver, 1800, 5, 62000},
		{"Monira", "Sultana", "monira@unwomen.org", "+880 1612 445566", "Bangladeshi", "National ID", "1991269445566", "UN Women Regional Hub", "Workshop organizer.", models.VIPNone, 750, 2, 24000},
		{"Christian", "Bale", "christian@apexcinema.com", "+1 310 555 0199", "American", "Passport", "US819203", "Media Production House", "High confidentiality, private dining.", models.VIPPlatinum, 7100, 4, 290000},
	}

	var allGuests []models.Guest
	for _, g := range guestData {
		guest := models.Guest{
			HotelID:       hotel.ID,
			FirstName:     g.First,
			LastName:      g.Last,
			Email:         g.Email,
			Phone:         g.Phone,
			IDType:        g.IDType,
			IDNumber:      g.IDNum,
			Nationality:   g.Nat,
			Address:       "Gulshan / Banani Area",
			City:          "Dhaka",
			Country:       g.Nat,
			VIPStatus:     g.VIP,
			LoyaltyPoints: g.Points,
			TotalStays:    g.Stays,
			TotalSpent:    g.Spent,
			Preferences:   g.Notes,
			Notes:         "Valued patron of HotelOS Grand Residence.",
			CompanyName:   g.Company,
		}
		allGuests = append(allGuests, guest)
	}
	if err := db.Create(&allGuests).Error; err != nil {
		return err
	}

	// 9. 25 REALISTIC RESERVATIONS WITH RICH OPERATIONAL STATUSES
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// We will create reservations with statuses:
	// - Checked-in (currently in-house, today is between checkin & checkout)
	// - Confirmed (upcoming arrivals today or tomorrow)
	// - Checked-out (completed past stays)
	// - Cancelled
	type ResSpec struct {
		GuestIdx     int
		RoomIdx      int
		RoomTypeIdx  int
		RatePlanIdx  int
		CheckInOff   int // days offset from today
		Duration     int // nights
		Status       models.ReservationStatus
		Source       models.BookingSource
		AdvancePaid  float64
		SpecialNotes string
	}

	resSpecs := []ResSpec{
		// Currently In-House (Checked-In):
		{0, 1, 0, 0, -2, 4, models.ResCheckedIn, models.SourceDirect, 17000.00, "Lake view room confirmed. Welcome amenity delivered."},
		{1, 8, 0, 1, -1, 3, models.ResCheckedIn, models.SourceCorporate, 19040.00, "UNICEF tariff applied. Extra foam pillows placed."},
		{2, 38, 4, 0, -3, 6, models.ResCheckedIn, models.SourceDirect, 105000.00, "VIP Limousine service airport pickup completed."},
		{5, 27, 2, 2, -1, 4, models.ResCheckedIn, models.SourceCorporate, 27200.00, "Bengal Group account billing authorized."},
		{8, 39, 4, 1, -2, 5, models.ResCheckedIn, models.SourceTelephone, 98000.00, "Complimentary champagne placed in suite."},
		{10, 15, 1, 0, -1, 3, models.ResCheckedIn, models.SourceOTA, 15000.00, "Booking.com guaranteed reservation."},
		{13, 2, 0, 0, -2, 5, models.ResCheckedIn, models.SourceDirect, 17000.00, "Direct corporate rate."},

		// Today's Arrivals (Confirmed, checking in today!):
		{3, 0, 0, 0, 0, 3, models.ResConfirmed, models.SourceDirect, 8500.00, "Arriving ~15:00. Airport transfer arranged."},
		{6, 3, 0, 1, 0, 2, models.ResConfirmed, models.SourceWebsite, 9520.00, "Early check-in requested if available."},
		{9, 5, 0, 0, 0, 4, models.ResConfirmed, models.SourceTelephone, 8500.00, "Attending medical symposium at Radisson."},
		{15, 26, 2, 2, 0, 3, models.ResConfirmed, models.SourceCorporate, 20400.00, "BEXIMCO board delegate."},
		{20, 11, 0, 0, 0, 7, models.ResConfirmed, models.SourceCorporate, 30000.00, "Huawei 1-week corporate stay."},

		// Today's Departures (Checked-In, leaving today):
		{4, 18, 1, 0, -3, 3, models.ResCheckedIn, models.SourceOTA, 22500.00, "Checkout scheduled for 11:30 AM."},
		{7, 7, 0, 0, -2, 2, models.ResCheckedIn, models.SourceWalkIn, 17000.00, "Express checkout requested."},

		// Future Bookings:
		{11, 4, 0, 0, 2, 3, models.ResConfirmed, models.SourceDirect, 0.00, "BRAC workshop team."},
		{12, 28, 2, 1, 3, 4, models.ResConfirmed, models.SourceWebsite, 35840.00, "French embassy cultural delegate."},
		{14, 16, 1, 0, 4, 2, models.ResConfirmed, models.SourceCorporate, 0.00, "Montreal tech exchange."},
		{16, 12, 0, 0, 5, 3, models.ResConfirmed, models.SourceOTA, 12750.00, "Agoda prepaid voucher."},
		{17, 6, 0, 0, 6, 2, models.ResConfirmed, models.SourceWalkIn, 0.00, "Pathao developer conference."},

		// Past Completed Bookings (Checked-Out):
		{18, 14, 1, 0, -8, 4, models.ResCheckedOut, models.SourceDirect, 30000.00, "Stay completed satisfactorily. Excellent rating."},
		{19, 24, 2, 2, -10, 5, models.ResCheckedOut, models.SourceCorporate, 68000.00, "Incepta quarterly planning visit."},
		{21, 9, 0, 1, -12, 3, models.ResCheckedOut, models.SourceWebsite, 28560.00, "Anniversary package enjoyed."},
		{22, 25, 2, 0, -15, 4, models.ResCheckedOut, models.SourceCorporate, 64000.00, "Deloitte engagement completed."},

		// Cancelled Bookings:
		{23, 20, 1, 0, -1, 3, models.ResCancelled, models.SourceDirect, 0.00, "Flight cancelled due to storm."},
		{24, 21, 0, 0, 1, 2, models.ResCancelled, models.SourceWebsite, 0.00, "Schedule changed by guest."},
	}

	for idx, spec := range resSpecs {
		g := allGuests[spec.GuestIdx]
		rt := roomTypes[spec.RoomTypeIdx]
		rp := ratePlans[spec.RatePlanIdx]

		var assignedRoomID *uuid.UUID
		if spec.Status != models.ResCancelled {
			assignedRoomID = &allRooms[spec.RoomIdx].ID
		}

		cIn := today.AddDate(0, 0, spec.CheckInOff)
		cOut := cIn.AddDate(0, 0, spec.Duration)

		basePrice := rt.BasePrice * (1 + rp.PriceModifierPercentage/100.0)
		subtotal := basePrice * float64(spec.Duration)
		tax := subtotal * 0.15
		service := subtotal * 0.10
		total := subtotal + tax + service

		resNum := fmt.Sprintf("RES-2026-%04d", idx+1)
		res := models.Reservation{
			HotelID:           hotel.ID,
			PropertyID:        property.ID,
			ReservationNumber: resNum,
			GuestID:           g.ID,
			RoomID:            assignedRoomID,
			RoomTypeID:        rt.ID,
			RatePlanID:        &rp.ID,
			CheckInDate:       cIn,
			CheckOutDate:      cOut,
			Nights:            spec.Duration,
			Adults:            rt.CapacityAdults,
			Children:          0,
			BookingSource:     spec.Source,
			Status:            spec.Status,
			BaseRate:          basePrice,
			TaxAmount:         tax,
			ServiceCharge:     service,
			TotalAmount:       total,
			PaidAmount:        spec.AdvancePaid,
			SpecialRequests:   spec.SpecialNotes,
			Notes:             fmt.Sprintf("Auto-seeded reservation %s", resNum),
		}

		if spec.Status == models.ResCancelled {
			canTime := now.Add(-24 * time.Hour)
			res.CancelledAt = &canTime
			res.CancellationReason = "Trip rescheduled by client"
		}

		if err := db.Create(&res).Error; err != nil {
			return err
		}

		// If CheckedIn or CheckedOut, create a real GuestFolio with active transactions!
		if spec.Status == models.ResCheckedIn || spec.Status == models.ResCheckedOut {
			folioStatus := models.FolioOpen
			if spec.Status == models.ResCheckedOut {
				folioStatus = models.FolioSettled
			}

			folio := models.GuestFolio{
				ReservationID: res.ID,
				GuestID:       g.ID,
				RoomID:        assignedRoomID,
				Status:        folioStatus,
				TotalCharges:  total,
				TotalPayments: spec.AdvancePaid,
				Balance:       total - spec.AdvancePaid,
			}
			if err := db.Create(&folio).Error; err != nil {
				return err
			}

			// Add Room Charge Transaction
			txRoom := models.FolioTransaction{
				FolioID:     folio.ID,
				Type:        models.TxRoomCharge,
				Description: fmt.Sprintf("%d Nights Accommodation - %s", spec.Duration, rt.Name),
				Amount:      subtotal,
				IsCredit:    false,
			}
			db.Create(&txRoom)

			// Add Tax Transaction
			txTax := models.FolioTransaction{
				FolioID:     folio.ID,
				Type:        models.TxTax,
				Description: "Government VAT (15%)",
				Amount:      tax,
				IsCredit:    false,
			}
			db.Create(&txTax)

			// Add Service Charge Transaction
			txSvc := models.FolioTransaction{
				FolioID:     folio.ID,
				Type:        models.TxServiceCharge,
				Description: "Hospitality Service Charge (10%)",
				Amount:      service,
				IsCredit:    false,
			}
			db.Create(&txSvc)

			// If advance payment was made, add payment transaction
			if spec.AdvancePaid > 0 {
				txPay := models.FolioTransaction{
					FolioID:     folio.ID,
					Type:        models.TxPayment,
					Description: "Advance Deposit / Card Payment",
					Amount:      spec.AdvancePaid,
					IsCredit:    true,
				}
				db.Create(&txPay)

				// Create Payment Record
				payNum := fmt.Sprintf("PAY-2026-%04d", idx+1)
				payment := models.Payment{
					PaymentNumber:  payNum,
					FolioID:        &folio.ID,
					GuestID:        g.ID,
					Amount:         spec.AdvancePaid,
					PaymentMethod:  models.PayMethodCreditCard,
					TransactionRef: fmt.Sprintf("TXN-VISA-%d", 789123+idx),
					Status:         models.PaymentCompleted,
					Notes:          "Guaranteed reservation deposit",
				}
				db.Create(&payment)
			}

			// Create Invoice
			invNum := fmt.Sprintf("INV-2026-%04d", idx+1)
			invStatus := models.InvoicePartiallyPaid
			if spec.Status == models.ResCheckedOut || folio.Balance == 0 {
				invStatus = models.InvoicePaid
			}
			invoice := models.Invoice{
				InvoiceNumber:  invNum,
				FolioID:        folio.ID,
				ReservationID:  res.ID,
				GuestID:        g.ID,
				Subtotal:       subtotal,
				TaxAmount:      tax,
				ServiceCharge:  service,
				DiscountAmount: 0,
				GrandTotal:     total,
				PaidAmount:     spec.AdvancePaid,
				Status:         invStatus,
				DueDate:        cOut,
				Notes:          "Official HotelOS Guest Tax Invoice",
			}
			db.Create(&invoice)
		}
	}

	// 10. RESTAURANT & POS SETUP
	// Tables
	tables := []models.RestaurantTable{
		{TableNumber: "T-01", Capacity: 2, Location: "indoor", Status: "available"},
		{TableNumber: "T-02", Capacity: 2, Location: "indoor", Status: "occupied"},
		{TableNumber: "T-03", Capacity: 4, Location: "indoor", Status: "available"},
		{TableNumber: "T-04", Capacity: 4, Location: "indoor", Status: "reserved"},
		{TableNumber: "T-05", Capacity: 6, Location: "indoor", Status: "available"},
		{TableNumber: "T-06", Capacity: 4, Location: "terrace", Status: "available"},
		{TableNumber: "T-07", Capacity: 4, Location: "terrace", Status: "occupied"},
		{TableNumber: "T-08", Capacity: 2, Location: "terrace", Status: "available"},
		{TableNumber: "T-09", Capacity: 8, Location: "private_dining", Status: "reserved"},
		{TableNumber: "T-10", Capacity: 4, Location: "patio", Status: "available"},
	}
	db.Create(&tables)

	// Menu Categories
	menuCats := []models.MenuCategory{
		{Name: "Gourmet Appetizers", Code: "APP", Icon: "Salad", DisplayOrder: 1, IsActive: true},
		{Name: "Signature Mains & Steaks", Code: "MAINS", Icon: "UtensilsCrossed", DisplayOrder: 2, IsActive: true},
		{Name: "Heritage Flavors", Code: "HERITAGE", Icon: "Soup", DisplayOrder: 3, IsActive: true},
		{Name: "Artisan Beverages & Coffee", Code: "BEV", Icon: "Coffee", DisplayOrder: 4, IsActive: true},
		{Name: "Decadent Desserts", Code: "DESSERT", Icon: "Cake", DisplayOrder: 5, IsActive: true},
	}
	db.Create(&menuCats)

	// Menu Items
	menuItems := []models.MenuItem{
		{CategoryID: menuCats[0].ID, Name: "Crispy Calamari Fritti", Description: "Flash-fried spiced squid with saffron aioli and lemon zest", Price: 850.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[0].ID, Name: "Burrata & Heirloom Salad", Description: "Fresh Italian burrata, heirloom tomatoes, aged Modena balsamic, micro basil", Price: 1150.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[0].ID, Name: "Truffle Mushroom Velouté", Description: "Wild forest mushrooms, black truffle drizzle, artisan sourdough toast", Price: 750.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[1].ID, Name: "Australian Wagyu Ribeye (300g)", Description: "MBS 7+ prime beef, truffle mash, charred broccolini, green peppercorn jus", Price: 4200.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[1].ID, Name: "Pan-Seared Norwegian Salmon", Description: "Wild salmon fillet, asparagus risotto, citrus dill velouté", Price: 2600.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[1].ID, Name: "Herb-Crusted Rack of Lamb", Description: "New Zealand lamb, rosemary potato gratin, mint glaze", Price: 3400.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[2].ID, Name: "Grand Residence Kacchi Biryani", Description: "Aromatic chinigura rice with slow-braised mutton, saffron potato, egg & burhani", Price: 1250.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[2].ID, Name: "Smoked Ilish in Mustard Sauce", Description: "Signature Padma river Hilsa gently simmered in fresh ground mustard gravy", Price: 1650.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[3].ID, Name: "Single Origin Ethiopian Pour-over", Description: "Yirgacheffe floral notes brewed fresh tableside", Price: 420.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[3].ID, Name: "Fresh Passionfruit & Mint Cooler", Description: "Crushed passionfruit, fresh garden mint, sparkling soda water", Price: 380.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[4].ID, Name: "Warm Belgian Molten Lava Cake", Description: "Valrhona 70% dark chocolate center served with vanilla bean gelato", Price: 680.00, TaxPercentage: 10.0, IsAvailable: true},
		{CategoryID: menuCats[4].ID, Name: "Saffron Pistachio Tres Leches", Description: "Sponge soaked in three saffron-infused milks, topped with toasted pistachio", Price: 550.00, TaxPercentage: 10.0, IsAvailable: true},
	}
	db.Create(&menuItems)

	// 11. INVENTORY ITEMS & SUPPLIERS
	suppliers := []models.Supplier{
		{Name: "Bengal Textiles & Linens Ltd", ContactPerson: "Mahbubur Rahman", Email: "sales@bengallinens.com", Phone: "+880 1711 990011", Address: "Tejgaon Industrial Area, Dhaka", TaxNumber: "BIN-1829103"},
		{Name: "Meghna Foods & Gourmet Imports", ContactPerson: "Farzana Karim", Email: "order@meghnafoods.com", Phone: "+880 1819 223344", Address: "Kawran Bazar, Dhaka", TaxNumber: "BIN-8472910"},
		{Name: "Apex Hospitality Amenities", ContactPerson: "Kamal Uddin", Email: "contact@apexamenities.bd", Phone: "+880 1912 887766", Address: "Savar EPZ, Dhaka", TaxNumber: "BIN-3928174"},
		{Name: "ElectroClean Facility Supplies", ContactPerson: "Rafiqul Islam", Email: "info@electroclean.com.bd", Phone: "+880 1611 334455", Address: "Mirpur-1, Dhaka", TaxNumber: "BIN-5829104"},
	}
	db.Create(&suppliers)

	inventoryItems := []models.InventoryItem{
		{Category: "Linen", SKU: "LIN-K-001", Name: "400 TC Egyptian Cotton King Sheet", Unit: "pcs", CurrentStock: 85, MinimumStock: 30, ReorderQuantity: 50, CostPerUnit: 1850.00, SupplierID: &suppliers[0].ID},
		{Category: "Linen", SKU: "LIN-TW-002", Name: "400 TC Egyptian Cotton Twin Sheet", Unit: "pcs", CurrentStock: 60, MinimumStock: 25, ReorderQuantity: 40, CostPerUnit: 1400.00, SupplierID: &suppliers[0].ID},
		{Category: "Linen", SKU: "TOW-BATH-001", Name: "650 GSM Turkish Bath Towel", Unit: "pcs", CurrentStock: 120, MinimumStock: 40, ReorderQuantity: 60, CostPerUnit: 750.00, SupplierID: &suppliers[0].ID},
		{Category: "Linen", SKU: "TOW-HAND-002", Name: "500 GSM Hand Towel", Unit: "pcs", CurrentStock: 140, MinimumStock: 50, ReorderQuantity: 80, CostPerUnit: 350.00, SupplierID: &suppliers[0].ID},
		{Category: "Amenities", SKU: "AMN-SHAM-001", Name: "Luxury Verbena Shampoo (50ml)", Unit: "bottles", CurrentStock: 380, MinimumStock: 150, ReorderQuantity: 300, CostPerUnit: 45.00, SupplierID: &suppliers[2].ID},
		{Category: "Amenities", SKU: "AMN-COND-002", Name: "Luxury Verbena Conditioner (50ml)", Unit: "bottles", CurrentStock: 360, MinimumStock: 150, ReorderQuantity: 300, CostPerUnit: 45.00, SupplierID: &suppliers[2].ID},
		{Category: "Amenities", SKU: "AMN-DENT-003", Name: "Eco Bamboo Dental Kit", Unit: "sets", CurrentStock: 290, MinimumStock: 100, ReorderQuantity: 200, CostPerUnit: 35.00, SupplierID: &suppliers[2].ID},
		{Category: "F&B", SKU: "FNB-COFF-001", Name: "Nespresso Compatible Capsules (Assorted)", Unit: "boxes", CurrentStock: 18, MinimumStock: 25, ReorderQuantity: 50, CostPerUnit: 850.00, SupplierID: &suppliers[1].ID}, // LOW STOCK ALERT!
		{Category: "F&B", SKU: "FNB-WTR-002", Name: "Grand Residence Mineral Water (500ml)", Unit: "bottles", CurrentStock: 520, MinimumStock: 200, ReorderQuantity: 400, CostPerUnit: 18.00, SupplierID: &suppliers[1].ID},
		{Category: "Housekeeping", SKU: "HK-CHEM-001", Name: "Hospital Grade Multi-Surface Disinfectant", Unit: "liters", CurrentStock: 12, MinimumStock: 20, ReorderQuantity: 30, CostPerUnit: 620.00, SupplierID: &suppliers[3].ID}, // LOW STOCK ALERT!
		{Category: "Housekeeping", SKU: "HK-GLV-002", Name: "Nitrile Protective Gloves (Box of 100)", Unit: "boxes", CurrentStock: 35, MinimumStock: 15, ReorderQuantity: 25, CostPerUnit: 480.00, SupplierID: &suppliers[3].ID},
		{Category: "Maintenance", SKU: "MNT-BULB-001", Name: "Warm LED Recessed Spotlight (7W)", Unit: "pcs", CurrentStock: 42, MinimumStock: 20, ReorderQuantity: 30, CostPerUnit: 220.00, SupplierID: &suppliers[3].ID},
	}
	db.Create(&inventoryItems)

	// 12. HOUSEKEEPING TASKS FOR DIRTY / CLEANING ROOMS
	hkTasks := []models.HousekeepingTask{
		{
			RoomID:           allRooms[4].ID, // Room 105
			AssignedToUserID: &users[4].ID,
			TaskType:         models.HKCheckoutTurnover,
			Priority:         models.PriorityHigh,
			Status:           models.RoomStatusDirty,
			Checklist:        `[{"item":"Strip and replace bed linens","done":false},{"item":"Sanitize bathroom and replace towels","done":false},{"item":"Restock mini bar and amenities","done":false},{"item":"Vacuum carpet and mop tiles","done":false}]`,
			Notes:            "Guest checked out at 10:45 AM. Next arrival booked at 15:00.",
		},
		{
			RoomID:           allRooms[6].ID, // Room 107
			AssignedToUserID: &users[4].ID,
			TaskType:         models.HKDailyCleaning,
			Priority:         models.PriorityMedium,
			Status:           models.RoomStatusCleaning,
			Checklist:        `[{"item":"Make beds","done":true},{"item":"Clean bathroom","done":true},{"item":"Replenish tea and bottled water","done":false}]`,
			Notes:            "Guest in-house. Do not disturb until 12:00.",
		},
		{
			RoomID:           allRooms[7].ID, // Room 108
			AssignedToUserID: &users[4].ID,
			TaskType:         models.HKCheckoutTurnover,
			Priority:         models.PriorityUrgent,
			Status:           models.RoomStatusInspected,
			Checklist:        `[{"item":"Full turnover completed","done":true},{"item":"Supervisory inspection approved","done":true}]`,
			Notes:            "Supervisor inspected and cleared for arrival.",
		},
	}
	db.Create(&hkTasks)

	// 13. MAINTENANCE REQUESTS
	maintRequests := []models.MaintenanceRequest{
		{
			RoomID:           &allRooms[9].ID, // Room 110
			EquipmentName:    "Daikin VRV Air Conditioner",
			Title:            "AC cooling capacity reduced; thermostat sensor replacement required",
			Description:      "Room 110 thermostat reporting Err-04. Cooling set to 20C but room holding at 26C.",
			Priority:         models.PriorityHigh,
			Status:           models.MaintInProgress,
			AssignedToUserID: &users[1].ID,
			ReportedByUserID: &users[2].ID,
			Cost:             4500.00,
		},
		{
			RoomID:           &allRooms[19].ID, // Room 210
			EquipmentName:    "Balcony Sliding Door Track",
			Title:            "Lubricate and realign balcony roller mechanism",
			Description:      "Door catches on heavy drag when sliding open.",
			Priority:         models.PriorityMedium,
			Status:           models.MaintReported,
			AssignedToUserID: &users[1].ID,
			ReportedByUserID: &users[4].ID,
			Cost:             1200.00,
		},
	}
	db.Create(&maintRequests)

	// 14. EMPLOYEES & SHIFTS
	employees := []models.Employee{
		{EmployeeCode: "EMP-001", UserID: &users[0].ID, FirstName: "Alexander", LastName: "Vance", Department: "Management", Designation: "General Manager", Phone: "+880 1711 000001", Email: "alexander@hotelos.com", HireDate: time.Date(2022, 1, 15, 0, 0, 0, 0, time.UTC), Salary: 250000.00, Status: "active"},
		{EmployeeCode: "EMP-002", UserID: &users[1].ID, FirstName: "Shahriar", LastName: "Khan", Department: "Management", Designation: "Hotel Operations Manager", Phone: "+880 1711 000002", Email: "shahriar@hotelos.com", HireDate: time.Date(2023, 3, 1, 0, 0, 0, 0, time.UTC), Salary: 160000.00, Status: "active"},
		{EmployeeCode: "EMP-003", UserID: &users[2].ID, FirstName: "Nusrat", LastName: "Jahan", Department: "Front Desk", Designation: "Senior Receptionist", Phone: "+880 1711 000003", Email: "nusrat@hotelos.com", HireDate: time.Date(2023, 6, 15, 0, 0, 0, 0, time.UTC), Salary: 55000.00, Status: "active"},
		{EmployeeCode: "EMP-004", UserID: &users[3].ID, FirstName: "Farhan", LastName: "Chowdhury", Department: "Accounts", Designation: "Chief Financial Accountant", Phone: "+880 1711 000004", Email: "farhan@hotelos.com", HireDate: time.Date(2022, 8, 10, 0, 0, 0, 0, time.UTC), Salary: 95000.00, Status: "active"},
		{EmployeeCode: "EMP-005", UserID: &users[4].ID, FirstName: "Salma", LastName: "Begum", Department: "Housekeeping", Designation: "Housekeeping Supervisor", Phone: "+880 1711 000005", Email: "salma@hotelos.com", HireDate: time.Date(2023, 2, 20, 0, 0, 0, 0, time.UTC), Salary: 42000.00, Status: "active"},
		{EmployeeCode: "EMP-006", UserID: &users[5].ID, FirstName: "Tanvir", LastName: "Hossain", Department: "F&B", Designation: "Head Mixologist & Restaurant Captain", Phone: "+880 1711 000006", Email: "tanvir@hotelos.com", HireDate: time.Date(2023, 9, 1, 0, 0, 0, 0, time.UTC), Salary: 48000.00, Status: "active"},
		{EmployeeCode: "EMP-007", FirstName: "Anisur", LastName: "Rahman", Department: "Maintenance", Designation: "Chief Facility Engineer", Phone: "+880 1711 000007", Email: "anisur@hotelos.com", HireDate: time.Date(2022, 5, 1, 0, 0, 0, 0, time.UTC), Salary: 70000.00, Status: "active"},
		{EmployeeCode: "EMP-008", FirstName: "Sabrina", LastName: "Mostafa", Department: "Front Desk", Designation: "Guest Relations Officer", Phone: "+880 1711 000008", Email: "sabrina@hotelos.com", HireDate: time.Date(2024, 1, 10, 0, 0, 0, 0, time.UTC), Salary: 50000.00, Status: "active"},
		{EmployeeCode: "EMP-009", FirstName: "Mizanur", LastName: "Hasan", Department: "F&B", Designation: "Executive Sous Chef", Phone: "+880 1711 000009", Email: "mizanur@hotelos.com", HireDate: time.Date(2023, 4, 1, 0, 0, 0, 0, time.UTC), Salary: 85000.00, Status: "active"},
		{EmployeeCode: "EMP-010", FirstName: "Fatema", LastName: "Zohra", Department: "Housekeeping", Designation: "Room Attendant", Phone: "+880 1711 000010", Email: "fatema@hotelos.com", HireDate: time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC), Salary: 32000.00, Status: "active"},
	}
	db.Create(&employees)

	// 15. AUDIT LOGS & NOTIFICATIONS
	notifications := []models.Notification{
		{
			Title:   "VIP Arrival Today",
			Message: "Mr. Tariq Mansoor (Gulf Crescent Holdings, Presidential Suite) arriving via private flight.",
			Type:    "warning",
			Link:    "/frontdesk",
			IsRead:  false,
		},
		{
			Title:   "Low Stock Alert: F&B & Housekeeping",
			Message: "Nespresso Coffee Capsules and Surface Disinfectants have reached reorder thresholds.",
			Type:    "error",
			Link:    "/inventory",
			IsRead:  false,
		},
		{
			Title:   "Daily Financial Audit Complete",
			Message: "Night audit balanced successfully for prior business cycle.",
			Type:    "success",
			Link:    "/finance",
			IsRead:  true,
		},
		{
			Title:   "Room Turnover Required",
			Message: "Room 105 checkout turnover requested with priority high.",
			Type:    "info",
			Link:    "/housekeeping",
			IsRead:  false,
		},
	}
	db.Create(&notifications)

	log.Println("✓ Database seeding completed successfully with 40 rooms, 30 guests, 25 reservations, folios, restaurant items, inventory, and staff!")
	return nil
}
