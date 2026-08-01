import type * as React from "react"

import { css, cx } from "@emotion/css"
import { Avatar as AvatarPrimitive } from "radix-ui"

// The Tailwind original drove the size-dependent rules through named group
// variants (`group/avatar` + `group-data-[size=sm]/avatar:`), which depend on
// Tailwind emitting those literal marker classes. Nothing emits them here, so the
// descendants select on the root's own data-slot/data-size attributes instead —
// same behaviour, no reliance on a class Tailwind used to generate.
const AVATAR = '[data-slot="avatar"]'
const GROUP = '[data-slot="avatar-group"]'

const root = css`
  position: relative;
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 9999px;
  user-select: none;

  &[data-size="sm"] {
    width: 24px;
    height: 24px;
  }

  &[data-size="lg"] {
    width: 40px;
    height: 40px;
  }
`

const image = css`
  aspect-ratio: 1 / 1;
  width: 100%;
  height: 100%;
`

const fallback = css`
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--muted);
  font-size: 14px;
  line-height: 20px;
  color: var(--muted-foreground);

  ${AVATAR}[data-size="sm"] & {
    font-size: 12px;
    line-height: 16px;
  }
`

const badge = css`
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--primary);
  color: var(--primary-foreground);
  box-shadow: 0 0 0 2px var(--background);
  user-select: none;

  ${AVATAR}[data-size="sm"] & {
    width: 8px;
    height: 8px;

    & > svg {
      display: none;
    }
  }

  ${AVATAR}[data-size="default"] & {
    width: 10px;
    height: 10px;

    & > svg {
      width: 8px;
      height: 8px;
    }
  }

  ${AVATAR}[data-size="lg"] & {
    width: 12px;
    height: 12px;

    & > svg {
      width: 8px;
      height: 8px;
    }
  }
`

const group = css`
  display: flex;

  /* Tailwind's -space-x-2 overlaps every child after the first. */
  & > * + * {
    margin-left: -8px;
  }

  & > ${AVATAR} {
    box-shadow: 0 0 0 2px var(--background);
  }
`

const groupCount = css`
  position: relative;
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--muted);
  font-size: 14px;
  line-height: 20px;
  color: var(--muted-foreground);
  box-shadow: 0 0 0 2px var(--background);

  & > svg {
    width: 16px;
    height: 16px;
  }

  ${GROUP}:has([data-size="sm"]) & {
    width: 24px;
    height: 24px;

    & > svg {
      width: 12px;
      height: 12px;
    }
  }

  ${GROUP}:has([data-size="lg"]) & {
    width: 40px;
    height: 40px;

    & > svg {
      width: 20px;
      height: 20px;
    }
  }
`

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cx(root, className)}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image data-slot="avatar-image" className={cx(image, className)} {...props} />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cx(fallback, className)}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="avatar-badge" className={cx(badge, className)} {...props} />
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="avatar-group" className={cx(group, className)} {...props} />
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="avatar-group-count" className={cx(groupCount, className)} {...props} />
}

export { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage }
