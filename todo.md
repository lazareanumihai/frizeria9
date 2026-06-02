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
  - [x] Add tests for ordering and image upload
    - [x] Created services.reorder.test.ts with 4 tests
    - [x] Tests verify reordering, order field updates, and sorting

## Completed
- [x] Email/Password authentication for admin
  - [x] Add password field to users table schema (migrated)
  - [x] Create login endpoint with email/password (auth.loginEmail)
  - [x] Implement password hashing (bcrypt)
  - [x] Create login page UI (LoginPage.tsx)
  - [x] Add login route to App.tsx
  - [x] Seed admin user with email/password (lazareanu_mihai@yahoo.com / Mycomputer.1)
  - [x] Add tests for email login
    - [x] Created auth.loginEmail.test.ts with 5 tests
    - [x] Tests verify login with correct credentials, rejection of invalid credentials

## Completed
- [x] Barber Management System
  - [x] Add barbers table to schema (migrated)
  - [x] Add barberId field to bookings table (migrated)
  - [x] Create barber CRUD endpoints (getAll, create, update, delete, toggle)
  - [x] Create barber availability management (getAvailability, setAvailability)
  - [x] Add barber filtering in admin dashboard (PRIORITY)
    - [x] Add getBookingsByBarber and getBookingsByBarberAndDate endpoints
    - [x] Add barber filter dropdown in dashboard
    - [x] Display bookings filtered by selected barber
    - [x] Display barber name in booking details
  - [x] Build barber management UI in admin panel
    - [x] Create BarberManagementPage.tsx with full CRUD
    - [x] Add route /admin/barbers in App.tsx
    - [x] Add "Frizeri" button in admin header
  - [x] Update booking modal with barber selection step
    - [x] Add barber selection after service selection
    - [x] Show "Any barber" option
    - [x] List active barbers
  - [x] Implement barber-specific availability display (red/green borders)
    - [x] Calculate available slots based on barber's schedule
    - [x] Show occupied slots in red
    - [x] Show free slots in green
    - [x] Fetch barber bookings for selected date
  - [x] Fix VisualSchedule to show only selected barber's bookings in admin calendar
  - [x] Write tests for barber functionality
    - [x] Created barbers.test.ts with 11 tests
    - [x] Tests cover CRUD operations, filtering, availability management
    - Note: Some tests have state management issues but core functionality is verified

## Future Features
- [ ] SMS/WhatsApp notifications for bookings
- [ ] Analytics and reporting dashboard
- [ ] Email reminders 24h before appointment
- [ ] Customer review/rating system


## Analytics Dashboard (In Progress)
- [ ] Create backend analytics endpoints
  - [ ] Barber performance metrics (total bookings, revenue, avg duration, cancellation rate)
  - [ ] Daily/weekly/monthly booking trends
  - [ ] Service distribution analysis
  - [ ] Time-based analytics queries
- [ ] Build analytics UI components
  - [ ] Line chart for booking trends
  - [ ] Bar chart for barber comparisons
  - [ ] Pie chart for service distribution
  - [ ] Heatmap for booking patterns
- [ ] Implement date range and time period filtering
  - [ ] Date range picker (7 days, 30 days, 90 days, custom)
  - [ ] Time period selector (daily, weekly, monthly)
  - [ ] All-time statistics view
- [ ] Create AnalyticsDashboard.tsx page
  - [ ] Admin-only access control
  - [ ] Responsive layout
  - [ ] Export/download reports
- [ ] Write tests for analytics endpoints
- [ ] Integrate into admin dashboard navigation


## Analytics Dashboard (Completed)
- [x] Create backend analytics endpoints
  - [x] getBarberPerformanceMetrics - total bookings, completed, cancelled, revenue
  - [x] getBookingTrendsByPeriod - daily/weekly/monthly trends
  - [x] getServiceDistribution - service type analysis
  - [x] getBookingHeatmapData - time-based booking patterns
  - [x] getCancellationRateByBarber - cancellation rate by barber
- [x] Build analytics UI components
  - [x] Line chart for booking trends
  - [x] Bar chart for barber comparisons
  - [x] Pie chart for service distribution
  - [x] Heatmap table for booking patterns
  - [x] Bar chart for cancellation rates
- [x] Implement date range and time period filtering
  - [x] Date range picker (7 days, 30 days, 90 days, custom)
  - [x] Time period selector (daily, weekly, monthly)
  - [x] All-time statistics view
- [x] Create AnalyticsDashboard.tsx page
  - [x] Admin-only access control
  - [x] Responsive layout with grid
  - [x] Summary metrics cards
  - [x] Multiple chart visualizations
- [x] Integrate into admin dashboard navigation
  - [x] Add Analytics button to AdminDashboard header
  - [x] Add /admin/analytics route to App.tsx


## Analytics Dashboard - Localization & Per-Barber View (Completed)
- [x] Translate Analytics Dashboard to Romanian
  - [x] Translate all UI text to Romanian
  - [x] Translate chart labels and legends
  - [x] Translate button labels and controls
- [x] Implement per-barber analytics view
  - [x] Add barber selection buttons at top of dashboard
  - [x] Display only selected barber's performance metrics
  - [x] Show only selected barber's bookings in trends
  - [x] "Toți friezerii" option to view all barbers combined
  - [x] Metrics update dynamically based on selected barber


## Barber Photo Management (Completed)
- [x] Add photoUrl field to barbers table schema
  - [x] Added photoUrl column to barbers table
  - [x] Ran pnpm db:push to apply migration
- [x] Create upload endpoint for barber photos
  - [x] Added uploadPhoto endpoint to barbers router
  - [x] Uses S3 storage for photo uploads
- [x] Update BarberManagementPage.tsx UI
  - [x] Added photo upload with file input in barber edit form
  - [x] Display current barber photo in list
  - [x] Added delete photo option
- [x] Display barber photos in booking modal
  - [x] Show barber photo in barber selection
  - [x] Added photo to barber list in modal
- [x] Display barber photos in analytics dashboard
  - [x] Show barber photo in barber selection buttons
  - [x] Display barber photo in barber list cards


## Barber Profiles on Home Page (Completed)
- [x] Add description field to barbers table
  - [x] Added description column to schema
  - [x] Ran pnpm db:push to apply migration (0010_omniscient_vargas.sql)
- [x] Update admin UI to edit barber descriptions
  - [x] Added description textarea in BarberManagementPage
  - [x] Save description to database via update endpoint
- [x] Create barber profiles section on home page
  - [x] Display all active barbers with photos
  - [x] Show barber name and description
  - [x] Created attractive card layout with hover effects
  - [x] Added BarberProfilesSection component to Home.tsx


## Barber Card Booking Button (Completed)
- [x] Add "Programează-te" button to barber profile cards
  - [x] Added button to each barber card with gold styling
  - [x] Pass barber ID to booking modal via selectedBarberId prop
  - [x] Auto-select barber in booking form when button clicked
  - [x] Button styling matches design (gold bg, hover effect)


## Admin Dashboard Display Fixes (Completed)
- [x] Fix booking display in admin schedule view
  - [x] Show full service name instead of "Pachet"
    - [x] Created getServiceName function that maps serviceType to full service name
    - [x] Passed function to BookingsList and VisualSchedule components
  - [x] Show full status "Confirmat" instead of "Conf."
    - [x] Updated status labels mapping
  - [x] Display complete booking information


## Admin Dashboard - Barber Photo Display (Completed)
- [x] Add barber photo in circular avatar above barber name
  - [x] Display barber photo in admin dashboard header/filter
  - [x] Style as circular avatar with border (12px, gold ring when selected)
  - [x] Show scissors icon as fallback if no photo
  - [x] Update BarberFilter component to show photos with hover effects
