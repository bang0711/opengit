import type * as React from "react";
import { Link as RRLink } from "react-router-dom";

// Drop-in for next/link: accepts `href` as a string or {pathname, query} object
// (the shapes used across the app) and forwards to react-router's `to`.
export type Href =
  | string
  | { pathname: string; query?: Record<string, string | number | undefined> };

export function hrefToPath(href: Href): string {
  if (typeof href === "string") return href;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(href.query ?? {})) {
    if (v !== undefined) params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${href.pathname}?${qs}` : href.pathname;
}

type Props = Omit<React.ComponentProps<typeof RRLink>, "to"> & { href: Href };

export default function Link({ href, ...props }: Props) {
  return <RRLink to={hrefToPath(href)} {...props} />;
}
