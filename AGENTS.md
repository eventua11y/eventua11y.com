# AGENTS.md

This file provides information about AI agents and tools that can work with this repository.

## Model Context Protocol (MCP) Servers

This repository is configured to work with MCP servers, which allow AI agents to interact with external services and tools. The available MCP servers are configured in `.mcp.json` and `opencode.json`.

### Available MCP Servers

#### Netlify MCP Server

- **Purpose**: Interact with Netlify deployment and edge functions
- **Command**: `npx -y @netlify/mcp`
- **Use Cases**:
  - Deploy and manage site deployments
  - Work with Netlify edge functions
  - Access deployment logs and status
  - Manage environment variables

#### Sanity MCP Server

- **Purpose**: Interact with the Sanity CMS that stores event data
- **Command**: `npx -y mcp-remote https://mcp.sanity.io --transport http-only`
- **Use Cases**:
  - Query and manage events in the Sanity database
  - Access event schema and content types
  - Perform CRUD operations on event data
  - Work with the Sanity Studio configuration

## AI Agent Guidance

### Claude Code Integration

This repository includes a `CLAUDE.md` file that provides detailed guidance to Claude Code (claude.ai/code) when working with this codebase. It includes:

- Common development, build, and test commands
- Architecture overview and technology stack
- Key patterns and state management
- Testing strategy and accessibility requirements

### Working with This Repository

When AI agents work with this repository, they should:

1. **Understand the Tech Stack**: Astro 5.x, Vue 3, TypeScript, Shoelace components
2. **Respect Accessibility Standards**: All changes must maintain WCAG 2.2 Level AA compliance
3. **Use Netlify Edge Functions**: For server-side operations like fetching events from Sanity
4. **Test Thoroughly**: Run Playwright tests including accessibility checks with axe-core
5. **Follow Code Quality Standards**: Use `npm run check` and `npm run lint` before committing

### Development Workflow for Agents

1. **Setup**: Run `npm install` to install dependencies
2. **Development**:
   - Use `npm run dev` for general development with watch mode
   - Use `netlify dev` specifically when testing edge functions locally
3. **Code Quality**: Run `npm run check` to verify formatting
4. **Testing**: Use `npm test` to run Playwright E2E tests
5. **Build**: Run `npm run build` to create production build

## Repository Context

### Content Management

- **Events**: Stored in Sanity CMS, accessed via Netlify edge functions
- **Event Types**: Regular events, Call for Speakers deadlines, Awareness Days, Book releases
- **Localization**: Timezone conversion handled by edge functions using Day.js

### Key Features

- **Filtering**: Events can be filtered by CFS status, attendance mode, cost, and content type
- **Theme Switching**: Light/dark mode with persistent user preferences
- **Timezone Selection**: User-selectable timezone for event display
- **Accessibility**: Comprehensive accessibility testing and WCAG 2.2 Level AA compliance

## Additional Resources

- **Contributing Guide**: See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- **Claude Code Guide**: See [CLAUDE.md](CLAUDE.md) for detailed development guidance
- **README**: See [README.md](README.md) for general project information
