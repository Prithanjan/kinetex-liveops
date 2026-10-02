import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconGauge = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 18a9 9 0 1 1 16 0" />
    <path d="M12 14l4-4" />
  </Base>
);

export const IconRoute = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6" cy="18" r="2.4" />
    <circle cx="18" cy="6" r="2.4" />
    <path d="M8.4 18h4.1a3.5 3.5 0 0 0 0-7h-1a3.5 3.5 0 0 1 0-7" />
  </Base>
);

export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8.5" r="3.1" />
    <path d="M3.6 20c.6-3.1 2.8-4.9 5.4-4.9s4.8 1.8 5.4 4.9" />
    <path d="M16.4 6.7a2.9 2.9 0 0 1 0 5.5M18 20c-.2-1.5-.7-2.9-1.4-3.9" />
  </Base>
);

export const IconClipboard = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2.4" />
    <path d="M9 4V2.8h6V4M9 10h6M9 14h4" />
  </Base>
);
