# Frizeria 9 - Project TODO

## Core Features
- [x] Dark Luxury frontend design with responsive layout
- [x] Modern booking modal with calendar and time slots
- [x] Admin Dashboard with real-time visual schedule grid
- [x] Database schema (users, bookings, services, settings)
- [x] Business hours management
- [x] Closed days (holidays/vacation) management
- [x] Service management (add, edit, delete)
- [x] Dynamic services from database in booking modal
- [x] Timezone fixes for correct date handling
- [x] Double booking prevention
- [x] Past time booking prevention
- [x] Service edit functionality with real-time updates

## Completed
- [x] Service deactivation/activation toggle (isActive field)
  - [x] Update services.update endpoint to accept isActive field
  - [x] Add toggleServiceStatus function to db.ts
  - [x] Add services.toggle endpoint to routers.ts
  - [x] Add getAllServicesAdmin endpoint for admin view
  - [x] Update ServicesPage.tsx UI with toggle button (Eye/EyeOff icons)
  - [x] Inactive services are filtered from public booking modal (getAll returns only active)
  - [x] Add comprehensive tests for toggle functionality (6 tests, all passing)

## Completed Features
- [x] Update Home.tsx to display dynamic services from database
  - [x] Services section now renders dynamically from trpc.services.getAll
  - [x] Pricing section displays all services with prices from database
  - [x] Service images mapped by name (Tuns, Bărbierit, etc.)
  - [x] Proper loading, error, and empty states handling
  - [x] Only active services displayed to public
  - [x] All 16 tests passing (10 existing + 6 new service tests)

## Future Features
- [ ] SMS/WhatsApp notifications for bookings
- [ ] Analytics and reporting dashboard
- [ ] Photo gallery on homepage
- [ ] Email reminders 24h before appointment
- [ ] Customer review/rating system
