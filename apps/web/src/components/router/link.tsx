/**
 * next/link replacement - a plain anchor. JIMEL is a single-page SPA (inbox),
 * so links are only used for external URLs.
 */
import type { AnchorHTMLAttributes } from "react";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
};

export default function Link({ href, prefetch: _prefetch, children, ...props }: LinkProps) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
