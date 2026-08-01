// Regression test for a real bug: saving a channel from the alarm form's inline
// dialog also created the alarm.
//
// Mechanism — Radix portals DialogContent out to <body>, so the two <form>
// elements are unrelated in the DOM. But React still bubbles the inner form's
// submit event up the REACT tree, and the dialog is rendered inside the alarm
// form's subtree. The outer onSubmit therefore fired on "Save channel".
//
// This pins both halves of the fix in the versions of React and Radix this repo
// actually ships: that the bubbling happens at all (so nobody "simplifies" the
// guards away believing the portal isolates it), and that each guard stops it.

import { expect, test } from "bun:test"

import * as Dialog from "@radix-ui/react-dialog"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

/** The shape the bug had: no stopPropagation, no target guard. */
function Unguarded({ onOuter, onInner }: Readonly<{ onOuter: () => void; onInner: () => void }>) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onOuter()
      }}
    >
      <Dialog.Root defaultOpen>
        <Dialog.Portal>
          <Dialog.Content>
            <Dialog.Title>Add channel</Dialog.Title>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onInner()
              }}
            >
              <button type="submit">Save channel</button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </form>
  )
}

/** Both fixes as shipped: inner stops propagation, outer checks the target. */
function Guarded({ onOuter, onInner }: Readonly<{ onOuter: () => void; onInner: () => void }>) {
  return (
    <form
      onSubmit={(e) => {
        if (e.target !== e.currentTarget) return
        e.preventDefault()
        onOuter()
      }}
    >
      <Dialog.Root defaultOpen>
        <Dialog.Portal>
          <Dialog.Content>
            <Dialog.Title>Add channel</Dialog.Title>
            <form
              onSubmit={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onInner()
              }}
            >
              <button type="submit">Save channel</button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </form>
  )
}

test("the bug is real: a portaled form's submit reaches the enclosing form", async () => {
  let outer = 0
  let inner = 0
  render(
    <Unguarded
      onOuter={() => {
        outer += 1
      }}
      onInner={() => {
        inner += 1
      }}
    />,
  )
  await userEvent.click(screen.getByRole("button", { name: "Save channel" }))
  expect(inner).toBe(1)
  // This is what created the unwanted alarm.
  expect(outer).toBe(1)
})

test("guarded: saving in the dialog does not submit the enclosing form", async () => {
  let outer = 0
  let inner = 0
  render(
    <Guarded
      onOuter={() => {
        outer += 1
      }}
      onInner={() => {
        inner += 1
      }}
    />,
  )
  await userEvent.click(screen.getByRole("button", { name: "Save channel" }))
  expect(inner).toBe(1)
  expect(outer).toBe(0)
})
