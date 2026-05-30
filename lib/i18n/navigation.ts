import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware wrappers around Next.js navigation APIs. Components import
 * `Link`/`useRouter`/etc. from here so every navigation respects the active
 * locale and the routing configuration.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
