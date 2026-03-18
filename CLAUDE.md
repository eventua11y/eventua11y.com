# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. For project conventions shared across all AI tools, see [AGENTS.md](AGENTS.md).

## Common Commands

### Development

- `npm run dev` - Start development server with watch mode for formatting and linting
- `npm start` - Start Astro development server only
- `astro dev` - Direct Astro development server (upstream, runs on port 4321)
- `netlify dev` - Run with Netlify edge functions (proxies to Astro, accessible on port 8888)

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
- `npx vitest run` - Run unit tests
- Tests run against `http://localhost:8888` by default (Netlify dev server)
- Set `PLAYWRIGHT_TEST_BASE_URL` environment variable to test against different URL

## Architecture Overview

- **Framework**: Astro 6.x with SSR via `@astrojs/netlify` adapter
- **Frontend**: Vue 3 components with `client:load` for interactive features
- **UI Components**: Web Awesome 3 web components (shadow DOM)
- **Content Management**: Sanity CMS with GROQ queries
- **Deployment**: Netlify with Deno-based edge functions
- **Testing**: Playwright (E2E) + axe-core (accessibility) + Vitest (unit)
- **Monitoring**: Sentry for error tracking and performance
- **Auth**: Supabase for user accounts (in progress)

### Key Files

- `src/layouts/default.astro` — Single layout with theme switching and meta tags
- `src/lib/sanity.ts` — Server-side Sanity client and GROQ queries
- `src/store/filtersStore.ts` — Vue reactive store for event filters
- `src/store/userStore.ts` — Vue reactive store for user preferences (theme, timezone)
- `netlify/edge-functions/` — Three API endpoints (events, books, user-info)
- `tests/accessibility.spec.ts` — Two-layer accessibility test suite

### Content Types

- **Events**: Accessibility events with CFS, attendance modes, costs
- **Deadlines**: Call for speakers deadlines (synthesised from CFS dates)
- **Awareness Days**: Accessibility awareness days/weeks
- **Books**: Book releases related to accessibility

### Event Processing

- International events (`internationalEvent: true`) use timezone-agnostic display
- Local events show times converted to the user's selected timezone
- CFS deadlines are auto-generated from CFS dates on events
- Filter state persists in `localStorage` under `eventua11y-filters`
- User preferences (theme, timezone) stored under `eventua11y-user`

## Environment Variables

- `SENTRY_AUTH_TOKEN`: Required for source map uploads during build
- `PLAYWRIGHT_TEST_BASE_URL`: Override test target URL (set by CI for deploy previews)
- `PUBLIC_SUPABASE_URL`: Supabase project URL (client-safe)
- `PUBLIC_SUPABASE_ANON_KEY`: Supabase publishable key (client-safe)

## Development Workflow

1. All tasks must be planned and recorded in a GitHub issue before implementation
2. Use `netlify dev` when testing edge functions or full functionality
3. Run `npm run check` before committing to ensure formatting compliance
4. Test timezone functionality by changing browser timezone or using UI selector
5. Verify accessibility with Playwright tests that include axe-core checks
