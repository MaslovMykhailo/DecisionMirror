## ADDED Requirements

### Requirement: Browser-decodable app icon

The system SHALL expose a browser-decodable application icon on the deployed domain. The bytes
served for an icon URL MUST match the declared content type and the Next.js icon convention used by
the app.

#### Scenario: Root favicon is decodable

- **WHEN** a browser requests `/favicon.ico`
- **THEN** the response body is a valid ICO file if the response is declared as `image/x-icon` or
  `image/vnd.microsoft.icon`
- **AND** the browser can decode the icon without an icon decode error

#### Scenario: Generated icon metadata matches content

- **WHEN** the app uses a generated or SVG icon convention instead of a root ICO file
- **THEN** the emitted icon link points at that icon URL
- **AND** the response content type matches the icon bytes served from that URL

### Requirement: No obsolete project gitkeep placeholders

The repository SHALL NOT track `.gitkeep` placeholder files in project-owned source, test,
application, or OpenSpec directories once those directories contain real files or no longer need to
be versioned as empty directories.

#### Scenario: Project gitkeep files are absent

- **WHEN** the repository is scanned outside dependency and generated-output directories
- **THEN** no tracked `.gitkeep` files exist under project-owned directories such as `app/`,
  `components/`, `lib/`, `agent/`, `messages/`, `tests/`, or `e2e/`
