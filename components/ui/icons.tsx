import type { SVGProps } from "react";

/**
 * Reforge's icon set.
 *
 * Hand-drawn rather than pulled from Lucide: the default icon packs are
 * instantly recognisable as a template choice, and their 2px stroke fights the
 * hairline weight the rest of the system uses. Everything here is a 24-unit
 * grid at stroke 1.25, round caps and joins — one weight, no exceptions.
 *
 * All are decorative by default (`aria-hidden`); pass `aria-hidden={false}`
 * plus a title only if an icon ever carries meaning on its own.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      width="1em"
      height="1em"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowUpRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 17 17 7" />
      <path d="M8.5 7H17v8.5" />
    </Icon>
  );
}

export function ArrowLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </Icon>
  );
}

export function ArrowUp(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </Icon>
  );
}

/** Theme: light. A sun drawn as a ring with detached rays, not a spiked blob. */
export function Sun(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M18.4 5.6l-1.1 1.1M6.7 17.3l-1.1 1.1" />
    </Icon>
  );
}

/** Theme: system. A display, because "system" means the machine's choice. */
export function Display(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.75" y="4" width="18.5" height="12.5" rx="2" />
      <path d="M9 20h6M12 16.5V20" />
    </Icon>
  );
}

/** Theme: dark. */
export function Moon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z" />
    </Icon>
  );
}

/** The build action. A four-point spark — not a rocket, not a magic wand. */
export function Spark(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3c.4 3.9 1.7 6.4 5.5 6.9-3.8.6-5.1 3.1-5.5 7-.4-3.9-1.7-6.4-5.5-7C10.3 9.4 11.6 6.9 12 3Z" />
      <path d="M18.5 15.5c.2 1.6.7 2.6 2.2 2.8-1.5.2-2 1.2-2.2 2.8-.2-1.6-.7-2.6-2.2-2.8 1.5-.2 2-1.2 2.2-2.8Z" />
    </Icon>
  );
}

/** Analysis. A scanning frame over a page — reading, not searching. */
export function Scan(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8.5V6a3 3 0 0 1 3-3h2.5M21 8.5V6a3 3 0 0 0-3-3h-2.5M3 15.5V18a3 3 0 0 0 3 3h2.5M21 15.5V18a3 3 0 0 1-3 3h-2.5" />
      <path d="M7.5 12h9" />
    </Icon>
  );
}

/** Page structure. */
export function Layers(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
      <path d="m3.5 12.5 8.5 4.5 8.5-4.5" />
      <path d="m3.5 17 8.5 4.5 8.5-4.5" />
    </Icon>
  );
}

/** Navigation / routes. */
export function Route(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6H14a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8h5.5" />
    </Icon>
  );
}

/** Users / audience. */
export function Users(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9.5" cy="8" r="3.25" />
      <path d="M3.5 20a6 6 0 0 1 12 0" />
      <path d="M16.5 5.2a3.25 3.25 0 0 1 0 5.6M18 20a6 6 0 0 0-2.2-4.65" />
    </Icon>
  );
}

/** Business model. */
export function Vault(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="12" cy="12" r="3.75" />
      <path d="M12 8.25V4.5M12 19.5v-3.75M15.75 12h3.75M4.5 12h3.75" />
    </Icon>
  );
}

/** Core problem — a fault line, not a warning triangle. */
export function Fault(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h6l-2.5 5H13l-2 7 9-11h-6l2-5H8Z" />
    </Icon>
  );
}

/** Improvements — an upward step, not a lightbulb. */
export function Steps(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 20h5v-5h5v-5h5V5" />
      <path d="M3 20V9" />
    </Icon>
  );
}

/** UI direction. */
export function Palette(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-.9 2-1.8 0-1.3-1.1-1.7-1.1-2.9 0-.9.7-1.6 1.7-1.6H16a5 5 0 0 0 5-5c0-3.9-4-6.7-9-6.7Z" />
      <circle cx="7.75" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.75" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function Plus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function Minus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  );
}

export function Check(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Icon>
  );
}

export function Close(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

/** A change that rewrote an existing value. */
export function Swap(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </Icon>
  );
}

export function ExternalLink(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10" />
    </Icon>
  );
}

export function Exit(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.5" />
      <path d="M16 8.5 19.5 12 16 15.5" />
      <path d="M19.5 12H9.5" />
    </Icon>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Icon>
  );
}

/** Clock, for history entries. */
export function History(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 7v5.2l3.4 2" />
    </Icon>
  );
}

export function Link(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.9 6.4" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0L5 13.3a4 4 0 0 0 5.7 5.7l1.4-1.4" />
    </Icon>
  );
}
