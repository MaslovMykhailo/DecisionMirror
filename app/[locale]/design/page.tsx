import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Internal design-kit reference. Renders every type-scale step, the brand accent
 * palette, semantic surfaces, radius, and elevation tokens so the kit can be
 * verified visually in light and dark themes. Not part of the product surface.
 */

const TYPE_SCALE = [
  { token: "text-display", label: "Display — 3rem" },
  { token: "text-h1", label: "Heading 1 — 2.25rem" },
  { token: "text-h2", label: "Heading 2 — 1.875rem" },
  { token: "text-h3", label: "Heading 3 — 1.5rem" },
  { token: "text-h4", label: "Heading 4 — 1.25rem" },
  { token: "text-body", label: "Body — 1rem" },
  { token: "text-small", label: "Small — 0.875rem" },
  { token: "text-caption", label: "Caption — 0.75rem" },
] as const;

const ACCENTS = [
  { token: "bg-brand-sky", label: "sky" },
  { token: "bg-brand-mint", label: "mint" },
  { token: "bg-brand-pink", label: "pink" },
  { token: "bg-brand-yellow", label: "yellow" },
] as const;

const SURFACES = [
  { bg: "bg-background", fg: "text-foreground", label: "background / foreground" },
  { bg: "bg-card", fg: "text-card-foreground", label: "card / card-foreground" },
  { bg: "bg-primary", fg: "text-primary-foreground", label: "primary / primary-foreground" },
  {
    bg: "bg-secondary",
    fg: "text-secondary-foreground",
    label: "secondary / secondary-foreground",
  },
  { bg: "bg-muted", fg: "text-muted-foreground", label: "muted / muted-foreground" },
  { bg: "bg-accent", fg: "text-accent-foreground", label: "accent / accent-foreground" },
  {
    bg: "bg-destructive",
    fg: "text-destructive-foreground",
    label: "destructive / destructive-foreground",
  },
] as const;

const ELEVATIONS = [
  { token: "shadow-sm", label: "shadow-sm" },
  { token: "shadow-md", label: "shadow-md" },
  { token: "shadow-lg", label: "shadow-lg" },
] as const;

export default function DesignKitPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-12 p-8">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-h1 font-semibold tracking-tight">Design kit</h1>
        <ThemeToggle />
      </header>

      <section className="space-y-4">
        <h2 className="text-h3 text-muted-foreground font-display">Type scale</h2>
        <div className="space-y-3">
          {TYPE_SCALE.map(({ token, label }) => (
            <p key={token} className={`${token} font-display`}>
              {label}
            </p>
          ))}
          <p className="text-body max-w-prose">
            Body copy uses Inter. The quick brown fox jumps over the lazy dog. Швидка бура лисиця
            перестрибує через лінивого пса.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-h3 text-muted-foreground font-display">Brand accents</h2>
        <div className="flex flex-wrap gap-4">
          {ACCENTS.map(({ token, label }) => (
            <div key={token} className="space-y-1">
              <div className={`${token} h-16 w-24 rounded-lg`} />
              <span className="text-caption text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-h3 text-muted-foreground font-display">Semantic surfaces</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SURFACES.map(({ bg, fg, label }) => (
            <div key={label} className={`${bg} ${fg} rounded-lg border p-4`}>
              <span className="text-small">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-h3 text-muted-foreground font-display">Radius &amp; elevation</h2>
        <div className="flex flex-wrap items-end gap-6">
          {(["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl"] as const).map((r) => (
            <div key={r} className="space-y-1">
              <div className={`${r} bg-secondary h-16 w-16 border`} />
              <span className="text-caption text-muted-foreground">{r}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-6 pt-2">
          {ELEVATIONS.map(({ token, label }) => (
            <div key={token} className="space-y-1">
              <div className={`${token} bg-card h-16 w-24 rounded-lg`} />
              <span className="text-caption text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
