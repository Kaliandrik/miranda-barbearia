## Goal
- Upgrade the barber dashboard and booking flow with date-specific blocking controls, real-time sync fixes, and CSS refinements.

## Constraints & Preferences
- Dark mode premium (bg-zinc-950, white text, subtle borders).
- Mobile-first, with large touch targets.
- Supabase anon key must have SELECT/INSERT policies for public booking flow to work.
- Only one barber for now (auto-selected); step 2 (barber choice) removed.
- Font: Inter, custom scrollbar, smooth animations.
- Dashboard login via Supabase Auth (email + password, not hardcoded).
- Price auto-calculated from selected services in edit modal.
- WhatsApp notifications on booking, edit, and 30/15-min reminders.
- send-reminders cron job yet to be configured (needs cron-job.org).

## Progress
### Done
- CSS: Inter font, custom scrollbar, fade-in/slide-up/scale-in animations, improved index.html (lang pt-BR, preconnect, theme-color, meta description).
- Removed barber selection step (step 2) from BookingFlow → auto-selects first professional from DB, reduces flow to 4 steps: Phone → Services+DateTime → Payment → Confirm. Step label shows "X / 3", "Fim" for step 4.
- StepDateTime no longer uses Supabase Realtime (requires manual config); now refetches professional data when professionalId, calendarMonth, or selectedDate changes.
- StepDateTime receives professionalId prop and displays the correct barber's schedule (not hardcoded "Miranda").
- Fixed isAvailableDay: when professional data hasn't loaded or workDays is null/empty, all days are blocked (was falling back to "all available").
- Added loadingProf/profError states in StepDateTime; shows loading spinner, error message (with RLS hint), or "Nenhum dia configurado".
- Added RLS SQL for anon SELECT (professionals, appointments) and anon INSERT (appointments).
- Refactored Dashboard saveHours: conflict detection runs BEFORE saving; modal offers "Ignorar" (save without notify) and "Notificar" (save + WhatsApp). Extracted helper functions: findAffectedAppointments, notifyClients, performSave.
- Added blocked_slots (date-keyed time slots) and blocked_dates (full-day blocks) to Professional type and updateProfessional.
- StepDateTime now reads blocked_slots[selectedDate] and includes them in allBlocked; checks blockedDates in isAvailableDay; added selectedDate to useEffect deps so blocks reflect immediately.
- Dashboard loads/saves blockedSlots and blockedDates alongside existing fields.
- Dashboard UI: "Fechar Expediente de Hoje" button with confirmation modal (calculates remaining slots from current time → adds to blocked_slots[today]).
- Dashboard UI: "Bloqueio de Datas" section with date picker input, "Bloquear" button, and removable date chips.

### In Progress
- None.

### Blocked
- Supabase Realtime on professionals table not yet enabled in Database > Replication.
- send-reminders cron job not yet configured on cron-job.org.
- RLS for authenticated UPDATE may still need user to run the provided SQL.

## Key Decisions
- Removed Realtime dependency entirely; instead refetch on user interactions (month navigation, date change, professional switch) — more reliable and works immediately.
- blocked_slots is a JSONB object (date → string[]) stored on professionals, avoiding a separate table.
- blocked_dates is a simple JSONB array of date strings for full-day blocking.
- saveHours now checks conflicts before persisting, so the barber can cancel or choose to notify first.
- When no work days are configured or data fails to load, all days show as unavailable (safe default).

## Next Steps
1. Run RLS SQL in Supabase SQL Editor (anon SELECT on professionals/appointments, anon INSERT on appointments, authenticated UPDATE on both).
2. Enable Realtime on professionals table in Supabase Dashboard > Database > Replication.
3. Create barber user in Supabase Auth (barbeiro@miranda.app).
4. Add VITE_ADMIN_EMAIL to Vercel env vars.
5. Create cron job at cron-job.org (every 5 min) for send-reminders function.

## Critical Context
- getProfessionals() returns all professionals; StepDateTime finds by professionalId prop (or falls back to "Miranda" by name).
- allBlocked = [...occupiedTimes, ...blockedTimes, ...dateBlockedSlots].
- isAvailableDay returns false when fetchDone is false, workDays is null/empty, blockedDates includes the ISO date, or the day's key in workDays is not "true".
- StepDateTime's useEffect dependencies: [professionalId, calendarMonth, selectedDate].
- saveHours now uses helper functions: findAffectedAppointments, performSave, notifyClients.
- "Ignorar" in conflict modal → save without notify; "Notificar" → save + WhatsApp.
- send-reminders Edge Function uses Z-API credentials (instanceId: 3F55EFFCBDE761620C2CEA958B74C323, token: 41D5947E5F902FB837FDA3C2).

## Relevant Files
- src/components/Dashboard.tsx: login, appointments list, hours config (work days, start/end, blocked times, blocked dates, close today), conflict modal, close today modal, edit modal
- src/components/StepDateTime.tsx: mini calendar + time grid, reads blocked_slots/blockedDates, refetches on professionalId/month/selectedDate
- src/components/BookingFlow.tsx: 4-step wizard (phone → services+datetime → payment → confirm), auto-selects first professional
- src/components/StepServices.tsx: service selection cards
- src/components/StepConfirm.tsx: confirmation receipt, accepts professionalName
- src/components/MyAppointments.tsx: modal with past/future appointments by phone
- src/lib/supabase.ts: types (Service, Professional, Appointment), getProfessionals, updateProfessional, etc.
- src/index.css: Inter font, custom scrollbar, animations, global styles
- supabase/functions/send-reminders/index.ts: 30/15-min WhatsApp reminder Edge Function
- supabase/functions/disparar-whatsapp/index.ts: booking/edit confirmation WhatsApp Edge Function
