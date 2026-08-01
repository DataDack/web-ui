import type * as React from 'react'

import { css, cx } from '@emotion/css'

import { fontMono, mix } from '../lib/styles'

const container = css`
  position: relative;
  width: 100%;
  overflow-x: auto;
`

const table = css`
  width: 100%;
  caption-side: bottom;
  font-size: 14px;
  line-height: 20px;
  border-collapse: collapse;
`

const header = css`
  & tr {
    border-bottom: 1px solid var(--border);
  }
`

const body = css`
  & tr:last-child {
    border-bottom: 0;
  }
`

const row = css`
  border-bottom: 1px solid var(--border);
  transition-property: color, background-color, border-color;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${mix('--muted', 40)};
  }
`

const head = css`
  color: ${mix('--muted-foreground', 80)};
  height: 36px;
  padding: 0 12px;
  text-align: left;
  vertical-align: middle;
  font-family: ${fontMono};
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.15em;
  white-space: nowrap;
  text-transform: uppercase;
`

const cell = css`
  padding: 10px 12px;
  vertical-align: middle;
  white-space: nowrap;
`

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    // Wide tables scroll inside their own container so the page body never
    // scrolls horizontally.
    <div data-slot="table-container" className={container}>
      <table data-slot="table" className={cx(table, className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cx(header, className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cx(body, className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr data-slot="table-row" className={cx(row, className)} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return <th data-slot="table-head" className={cx(head, className)} {...props} />
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={cx(cell, className)} {...props} />
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
