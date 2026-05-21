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

## Completed
- [x] Service ordering and image management
  - [x] Add order field to services table schema (migrated)
  - [x] Add imageUrl field to services table (migrated)
  - [x] Update services.update endpoint to handle order and imageUrl
  - [x] Update services.create endpoint to accept imageUrl
  - [x] Add image preview in ServicesPage.tsx admin view
  - [x] Add imageUrl field to edit form
  - [x] Implement image upload (drag & drop) instead of URL input
    - [x] Create backend uploadImage endpoint with S3 storage
    - [x] Add drag & drop UI in ServicesPage.tsx
    - [x] Upload to S3 storage
  - [x] Update Home.tsx to use imageUrl from database (with fallback images)
  - [x] Add drag-to-reorder UI in ServicesPage.tsx
    - [x] Reorder button to enter/exit reorder mode
    - [x] Drag and drop services to reorder
    - [x] Save/Cancel buttons for reorder
    - [x] Backend reorder endpoint
  - [ ] Add tests for ordering and image upload

## Future Features
- [ ] SMS/WhatsApp notifications for bookings
- [ ] Analytics and reporting dashboard
- [ ] Email reminders 24h before appointment
- [ ] Customer review/rating system
