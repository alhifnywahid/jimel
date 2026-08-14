/**
 * Pengganti next/link - anchor biasa. JIMEL adalah SPA satu halaman (inbox),
 * jadi link cuma dipakai untuk tautan eksternal.
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
