![Eventua11y](https://github.com/mattobee/eventua11y/assets/3172945/a1cc64a6-c3f8-465a-b88f-e5f8524c3edd)

# Eventua11y.com

[![Netlify Status](https://api.netlify.com/api/v1/badges/147b62a2-2d05-4693-a42f-9f675c3c478d/deploy-status)](https://app.netlify.com/sites/eventua11y/deploys)

A curated list of digital accessibility events.

## Accessibility

The goal is for each page of this website to meet the requirements of [WCAG 2.2](https://www.w3.org/TR/WCAG22/) Level AA. If you notice a problem, please [report it](https://github.com/eventua11y/eventua11y.com/issues/new?template=a11y.yml) or email [help@eventua11y.com](mailto:help@eventua11y.com). See the full [accessibility statement](https://eventua11y.com/accessibility) on the website.

## Contributing

See the [contributing guide](CONTRIBUTING.md) for ways to get involved in this project, including some that don't require you to write a single line of code.

## Technology

### Frameworks and languages

- [Astro](https://astro.build/) -- the site framework, running in server-side rendering (SSR) mode
- [Vue](https://vuejs.org/) -- interactive components hydrated on the client
- [TypeScript](https://www.typescriptlang.org/) -- used throughout the project

### UI and styling

- [Shoelace](https://shoelace.style/) -- web component library providing the core UI elements
- Custom CSS with light and dark themes
- [PostCSS](https://postcss.org/) with Autoprefixer and cssnano

### Data and APIs

- [Sanity](https://sanity.io/) -- real-time content database for events and books, edited in [Sanity Studio](https://github.com/eventua11y/eventua11y-sanity)
- [Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/) (Deno runtime) -- three API endpoints:
  - `/api/get-events` -- fetches events from Sanity with timezone-aware date processing
  - `/api/get-books` -- fetches book club books from Sanity
  - `/api/get-user-info` -- returns user timezone and geolocation data
- [Day.js](https://github.com/iamkun/dayjs) -- date formatting and timezone conversion

### Hosting and monitoring

- [Netlify](https://www.netlify.com/) -- hosting with automatic deploys from the `main` branch. Feature branches are deployed to preview URLs.
- [Sentry](https://sentry.io/) -- error tracking and performance monitoring

### Testing

- [Playwright](https://playwright.dev/) -- end-to-end tests
- [axe-core](https://github.com/dequelabs/axe-core) -- automated accessibility testing in E2E tests
- [Vitest](https://vitest.dev/) -- unit tests

### Code quality

- [ESLint](https://eslint.org/) -- linting with plugins for Astro, Vue, TypeScript, Playwright, and jsx-a11y
- [Prettier](https://prettier.io/) -- code formatting

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version, see `.nvmrc`)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) (included as a dev dependency)

### Environment variables

The edge functions require the following environment variables, configured in Netlify:

| Variable             | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `SANITY_PROJECT`     | Sanity project ID                                            |
| `SANITY_DATASET`     | Sanity dataset name                                          |
| `SANITY_API_VERSION` | Sanity API version                                           |
| `SANITY_CDN`         | Whether to use the Sanity CDN (`true`/`false`)               |
| `SENTRY_AUTH_TOKEN`  | Sentry auth token (used during build for source map uploads) |

### Getting started

```sh
npm install
```

To run the dev server with Prettier and ESLint watching for changes:

```sh
npm run dev
```

Or to run just the Astro dev server:

```sh
npm start
```

To run locally with Netlify Edge Functions, use the Netlify CLI:

```sh
npx netlify dev
```

### Running tests

```sh
# End-to-end tests (Playwright)
npm test

# Unit tests (Vitest)
npm run test:unit

# Unit tests in watch mode
npm run test:unit:watch
```

### Building

```sh
npm run build
```

This runs Prettier/ESLint checks, builds the Astro site, and uploads source maps to Sentry.

## CI/CD

Pull requests trigger a GitHub Actions workflow that runs unit tests and end-to-end tests against Netlify deploy previews. An additional workflow checks for missing alt text on images.

Dependency updates are managed by [Dependabot](https://docs.github.com/en/code-security/dependabot).

## License

[MIT](LICENSE)
