# PostPony

A web-based application for postponing sports matches as quick and easy as the Pony Express — it calculates optimal times based on venue availability, team/player availability, and holidays.

## Tech Stack

- **Backend**: [Hono](https://hono.dev/) (TypeScript SSR)
- **Frontend**: [HTMX](https://htmx.org/), [Eta](https://eta.js.org/) (Templating), Beer.css (Material Design 3), design system via CSS custom properties
- **Data Store**: SQLite via `@libsql/client` (local file in dev, [Turso](https://turso.tech) in production)
- **Testing**: [Vitest](https://vitest.dev/) (Unit), [Playwright](https://playwright.dev/) (E2E & A11y)
- **Tooling**: [Vite](https://vitejs.dev/), [mise-en-place](https://mise.jdx.dev/)

## Prerequisites

- **Node.js**: v26.1.0 or later (required for native `Temporal` API support)
- **npm**: v10+
- **mise-en-place**: Recommended for managing tools and environments.

## Getting Started

1. **Copy Template Files**:
   Before starting, copy the template configuration files:
   ```bash
   cp -r developer-local-settings-template developer-local-settings
   cp .env-template .env
   ```
   Adjust the values in `.env` as needed — it is git-ignored, so your local configuration stays private.

2. **Setup /etc/hosts**:
   To access the application at `game-scheduler.localhost`, you need to add an entry to your hosts file.

   **Linux & macOS**:
   ```bash
   sudo sh -c 'echo "127.0.0.1 game-scheduler.localhost" >> /etc/hosts'
   ```

   Or manually edit `/etc/hosts` using your preferred text editor (requires sudo):
   ```bash
   sudo nano /etc/hosts
   ```
   Add the following line:
   ```
   127.0.0.1 game-scheduler.localhost
   ```

3. **Local SSL Certificates**:
   To generate local SSL certificates for `game-scheduler.localhost`, run:
   ```bash
   npm run certs
   ```
   Or directly:
   ```bash
   ./scripts/create-certs.sh
   ```
   This requires `mkcert` to be installed on your system.

4. **Install Dependencies**:
   ```bash
   npm install
   ```

5. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The server will be available at `https://game-scheduler.localhost:3000` if certificates are generated.


6. **Build for Production**:
   ```bash
   npm run build
   ```

7. **Start Production Server**:
   ```bash
   npm start
   ```

## Development Workflow

### Quality Assurance

We use a comprehensive verification script that runs linting, unit tests, and E2E tests:

```bash
npm run verify
```

### Individual Scripts

- `npm run lint`: Run TypeScript type checking on source code.
- `npm run lint:e2e`: Run TypeScript type checking on E2E tests.
- `npm test`: Run unit tests using Vitest.
- `npm run test:e2e`: Run end-to-end tests using Playwright (includes accessibility audits).
- `npm run clean`: Remove build and test artifacts.

### Watch Mode

- `npm run dev`: Watch source and restart server.
- `npm run dev:test`: Watch and run unit tests.
- `npm run dev:lint`: Watch and run TypeScript compiler.

## Guidelines & Standards

- **Accessibility**: All UI changes must adhere to **WCAG 2.2 AA**. Automated checks are integrated into Playwright tests.
- **Security**: The application uses a **Dual-Password System** (Organizer Password & Invitation Password). No traditional user accounts are required for players.
- **Multi-Tenancy**: Architecture supports multiple clubs using logical separation (`club_id`).
- **Code Style**:
    - Use 2-space indentation (4 for Markdown).
    - Entity names are singular (e.g., `Venue`, `Player`).
    - Max line length: 120 characters.

## Documentation

Detailed documentation can be found in the `docs/` folder:

- [Project Specification](docs/specification.md)
- [Implementation Plan](docs/implementation_plan.md)
- [Architecture Decision Records (ADRs)](docs/adr)
- [Use Cases](docs/use_cases.md)
