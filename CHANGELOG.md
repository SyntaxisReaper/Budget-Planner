# Budget Planner - Changelog & Feature Summary

## Version 5.x.x - Personal Assistant & Unified Architecture
*Current Version: v5.1.1*

- **Visual & Layout Improvements (v5.1.1):**
  - **Branding Alignment:** Updated primary buttons and application accents to strictly match the logo's dark olive color scheme.
  - **Goal Cards Redesign:** Streamlined Goal progress cards by replacing bulky edit/delete buttons with sleek, inline action links.
  - **Task UI Polish:** Removed generic button outlines from the Task checkboxes and trash icons for a cleaner look.
  - **Bug Fixes:**
    - Restored the missing "Budget Planner" link in the main navigation menu.
    - Fixed a layout bug in the Budget Planner that caused text boxes to stretch across the screen on mobile devices.
    - Fixed a state synchronization issue where previously saved budget allocations wouldn't populate into the input boxes upon page load.
    - Fixed an "Invalid target_type" API error that prevented users from allocating budget amounts towards their Subscriptions.

- **UX/UI Polish (v5.1.0):**
  - **Procedural Web Audio Engine:** Added satisfying haptic-synced UI sounds (cha-ching, chimes) for goals and debts, with a global mute toggle.
  - **Pull-to-Refresh:** Added spring-based pull-to-refresh mechanism for Dashboard and Transactions pages.
  - **Non-Blocking Undo:** Replaced disruptive confirmation popups with a smooth 4-second Undo toast pattern for deleting Transactions and Debts.
  - **Live Currency Formatting:** Replaced static inputs with `<CurrencyInput />` for live Indian comma formatting (e.g. 1,00,000) during entry.
  - **Premium Empty States:** Added illustrated `<EmptyState />` components to lists replacing basic "No data" texts.
  - **Offline Awareness:** Added an `<OfflineBanner />` that slides down globally when network connection is lost.

*Previous Version: v5.0.0*

- **Cross-Module Linking Architecture:** Introduced a foundational `links` table to connect any entity (e.g. attaching Notes to Debts or Tasks to Trips) for a completely unified ecosystem.
- **Contacts Hub:** Merged isolated participant lists into a central `people` database that consolidates IOUs and Trip participation.
- **Task Management (Kanban/List):** Track to-dos and action items globally.
- **Notes & Journals:** Keep track of ideas, logs, and free-text entries.
- **Unified Calendar Agenda:** A single timeline summarizing all due dates from Tasks, Trips, Subscriptions, and Debts.
- **Navigation Redesign:** Reorganized the UI into categorized groups (Finance, Life, Assistant, System) for scalability across 12+ modules.

## Version 4.x.x - Travel Finance & Refinement
*Current Version: v4.0.1*

- **Travel Finance Module:** Added a dedicated "Trips" section allowing users to create trips, invite participants, and log trip-specific expenses.
- **Smart Trip Ledgers:** Automatically calculates "Who owes Who" (Debts Simplification) among trip participants.
- **Itinerary System:** Built-in trip itineraries for easy travel planning.
- **Bug Fixes:**
  - Fixed a major runtime crash in the main Transactions page caused by category prediction loading state.
  - Fixed an issue where the mobile app was continuously logging out users on the Trips page by switching the authentication method to use a global Supabase JWT middleware.
  - Revamped modal UI/UX (Create Trip, Log Trip Expense) to match the global glassmorphic design system using Framer Motion.
  - Subscriptions are now visibly displayed on the Budget Planner page.

## Version 3.x.x - Native Polish, Automation, & Analytics
- **Native Capacitor Polish:** Implemented native hardware back-button handling, status bar themes, splash screens, and capacitor local notifications.
- **Biometrics & Security:** Added fingerprint/face unlock options for Android via Capacitor Native Biometric.
- **Smart Auto-Categorization:** AI-like pattern matching (TF-IDF/Frequency based) auto-categorizes expenses as you type based on historical transactions.
- **People Ledger:** Expanded the Debts module to track interpersonal loans and rent, including WhatsApp integration to send UPI payment links directly.
- **Advanced UI Overhaul:**
  - Bottom sheet dialogs for mobile (drag to dismiss).
  - Haptic feedback (vibrations) on interactions.
  - Skeleton loaders for smoother data fetching.
- **Advanced Search & Reports:** Export transactions and analytics to PDF reports (jsPDF + html2canvas).

## Version 2.x.x - Full Unified Ledger & Goals
- **Unified Ledger:** Replaced basic expenses with a comprehensive double-entry transaction system (Income, Expense, Transfer In/Out, Debt Payment, Goal Contribution).
- **Accounts System:** Ability to manage multiple accounts (Cash, Bank, Credit Card) with real-time balance tracking.
- **Budget Planner Page:** Monthly cycle-based budgeting, allocating income to various wishlist items, needs, and tracking the surplus/deficit.
- **Goals Tracking:** Piggy-bank style goals with visual progress bars.
- **Subscriptions:** Recurring subscription tracking.
- **PWA Capabilities:** Made the web app installable as a PWA with offline caching via Workbox/Vite-PWA.

## Version 1.x.x - Initial Foundation
- **Core Setup:** Initialized React + Vite frontend and Node.js + Express backend.
- **Authentication:** Integrated Supabase for user signup/login, session management, and JWTs.
- **Database Architecture:** Created PostgreSQL schemas for Users, Transactions, Items, and Settings.
- **Basic Dashboard:** Simple monthly overview charts (Recharts) and transaction lists.
- **Theming:** Implemented CSS custom properties for a premium dark-mode, glassmorphism aesthetic.
