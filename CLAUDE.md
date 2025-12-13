# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development

- `npm run dev` - Start development server with watch mode for formatting and linting
- `npm start` - Start Astro development server only
- `astro dev` - Direct Astro development server (runs on port 4321)
- `netlify dev` - Run with Netlify edge functions (runs on port 8888)

### Building and Deployment

- `npm run build` - Run checks, build the site, and upload source maps to Sentry
- `npm run preview` - Preview the built site locally
- `astro build` - Build the site without additional steps

### Code Quality

- `npm run check` - Check code formatting with Prettier
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint and auto-fix with ESLint
- `npm run check:watch` - Watch mode for formatting and linting

### Testing

- `npm test` or `npx playwright test` - Run all Playwright tests
- `npm run test:ui` or `npx playwright test --ui` - Run tests in interactive UI mode
- Tests run against `http://localhost:8888` by default (Netlify dev server)
- Set `PLAYWRIGHT_TEST_BASE_URL` environment variable to test against different URL

## Architecture Overview

### Technology Stack

- **Framework**: Astro 5.x with server-side rendering
- **Frontend**: Vue 3 components with TypeScript
- **UI Components**: Shoelace web components
- **Content Management**: Sanity CMS for events data
- **Deployment**: Netlify with edge functions
- **Testing**: Playwright for E2E testing with accessibility testing via axe-core
- **Monitoring**: Sentry for error tracking

### Key Architecture Patterns

#### Hybrid Rendering

- Astro handles static rendering with selective client-side hydration
- Vue components are hydrated only when interactivity is needed
- Server adapter configured for Netlify deployment

#### Data Flow

- Events fetched from Sanity CMS via Netlify edge functions (`/api/get-events`, `/api/get-books`)
- Client-side state management using Vue's reactive system
- Timezone conversion and localization handled by edge functions using Day.js

#### Component Structure

- **Layout**: Single `default.astro` layout with theme switching and meta tags
- **Pages**: Astro pages in `src/pages/` (index, accessibility, curation-policy, past-events)
- **Components**: Vue components for interactive elements (filtering, events display)
- **Stores**: Vue reactive stores for filters and user preferences

### State Management

- `filtersStore.ts`: Event filtering, CFS status, attendance mode, cost filtering
- `userStore.ts`: User preferences (theme, timezone)
- Local storage persistence for user preferences

### Styling Architecture

- CSS custom properties for theming (light/dark modes)
- Utility-first approach with CSS utility classes
- Shoelace component theming
- Theme switching handled by inline script to prevent FOUC

### Edge Functions

Located in `netlify/edge-functions/`:

- `get-events.ts`: Fetches and processes events from Sanity
  - Creates synthetic "Call for Speakers" deadline events from CFS dates
  - Implements 5-minute caching to reduce API calls
  - Handles timezone conversion for international vs. local events
- `get-books.ts`: Fetches book releases
- `get-user-info.ts`: User location/timezone detection

### Content Types

- **Events**: Regular accessibility events with CFS, attendance modes, costs
- **Deadlines**: Call for speakers deadlines
- **Awareness Days**: Accessibility awareness days/weeks
- **Books**: Book releases related to accessibility

### Testing Strategy

- Comprehensive E2E testing with Playwright
- Accessibility testing integrated via @axe-core/playwright
- Tests cover filtering, theme switching, timezone selection, and core user flows
- Focus on ensuring WCAG 2.2 Level AA compliance

## Development Notes

### Environment Variables

- `SENTRY_AUTH_TOKEN`: Required for source map uploads
- `PLAYWRIGHT_TEST_BASE_URL`: Override test target URL

### Browser Support

- Primary testing on Chromium
- Custom element support required for Shoelace components

### Accessibility Requirements

- All pages must conform to WCAG 2.2 Level AA
- Regular accessibility testing with automated and manual methods
- Skip link implementation and proper semantic markup

## Important Project Specifics

### Event Processing Logic

- International events (with `internationalEvent: true`) use timezone-agnostic time display
- Local events show times converted to user's selected timezone
- "Call for Speakers" deadlines are automatically generated from CFS dates on events

### Filter State Persistence

- Filter selections persist in localStorage under `eventua11y-filters`
- User preferences (theme, timezone) stored separately in `eventua11y-user`
- Filter state includes: CFS status, attendance mode, cost filters, content type toggles

### Development Workflow

1. All tasks must be planned and recorded in a GitHub issue before implementation
2. Use `netlify dev` when testing edge functions or full functionality
3. Run `npm run check` before committing to ensure formatting compliance
4. Test timezone functionality by changing browser timezone or using UI selector
5. Verify accessibility with Playwright tests that include axe-core checks
