## ADDED Requirements

### Requirement: Language switch is free of client script warnings

The language switcher SHALL change between supported locales without causing React to render a raw
`<script>` tag through the client component tree. Locale switching SHALL preserve the existing
theme and observability provider behavior while avoiding script-tag runtime warnings.

#### Scenario: Switching locale has no script warning

- **WHEN** a user switches from English to Ukrainian or from Ukrainian to English in a browser
- **THEN** the route updates to the selected locale
- **AND** the browser console does not receive the React warning about encountering a script tag
  while rendering a component

#### Scenario: Theme behavior survives locale switch

- **WHEN** a user has selected a light, dark, or system theme and then switches locale
- **THEN** the selected theme behavior remains active after the locale change
