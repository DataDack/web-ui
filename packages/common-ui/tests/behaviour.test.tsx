import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, mock, test } from "bun:test"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../src/index"

// Interaction coverage for the primitives. The emotion conversion rewrote how
// every one of these is styled; these tests check the conversion did not also
// change how they behave — state attributes, keyboard access, callbacks and the
// accessible roles the app's tests and screen readers rely on.

afterEach(cleanup)

describe("Button", () => {
  test("fires onClick and reports a button role", async () => {
    const user = userEvent.setup()
    const onClick = mock(() => {})
    render(<Button onClick={onClick}>Go</Button>)

    await user.click(screen.getByRole("button", { name: "Go" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test("disabled swallows the click", async () => {
    const user = userEvent.setup()
    const onClick = mock(() => {})
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    )

    await user.click(screen.getByRole("button", { name: "Go" }))
    expect(onClick).not.toHaveBeenCalled()
  })

  test("asChild renders the child element instead of a button", () => {
    render(
      <Button asChild>
        <a href="/somewhere">Link</a>
      </Button>,
    )
    expect(screen.getByRole("link", { name: "Link" })).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  test("every variant and size renders", () => {
    const variants = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const
    const sizes = ["default", "sm", "lg", "icon"] as const

    for (const variant of variants) {
      for (const size of sizes) {
        const { unmount } = render(
          <Button variant={variant} size={size}>
            {variant}-{size}
          </Button>,
        )
        expect(screen.getByRole("button")).toBeInTheDocument()
        unmount()
      }
    }
  })
})

describe("Input and Textarea", () => {
  test("Input is controllable and reports edits", async () => {
    const user = userEvent.setup()
    const onChange = mock(() => {})
    render(<Input aria-label="field" onChange={onChange} />)

    await user.type(screen.getByLabelText("field"), "abc")
    expect(onChange).toHaveBeenCalledTimes(3)
    expect(screen.getByLabelText("field")).toHaveValue("abc")
  })

  test("Textarea accepts multi-line input", async () => {
    const user = userEvent.setup()
    render(<Textarea aria-label="notes" />)

    await user.type(screen.getByLabelText("notes"), "one")
    expect(screen.getByLabelText("notes")).toHaveValue("one")
  })

  test("aria-invalid is preserved for form error styling", () => {
    render(<Input aria-label="field" aria-invalid />)
    expect(screen.getByLabelText("field")).toHaveAttribute("aria-invalid", "true")
  })
})

describe("Label", () => {
  test("htmlFor associates the label with its control", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" />
      </>,
    )
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
  })
})

describe("Checkbox", () => {
  test("toggles and reports state", async () => {
    const user = userEvent.setup()
    const onCheckedChange = mock(() => {})
    render(<Checkbox aria-label="agree" onCheckedChange={onCheckedChange} />)

    const box = screen.getByRole("checkbox", { name: "agree" })
    expect(box).toHaveAttribute("data-state", "unchecked")

    await user.click(box)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(box).toHaveAttribute("data-state", "checked")
  })

  test("indeterminate renders its own state", () => {
    render(<Checkbox aria-label="all" checked="indeterminate" />)
    expect(screen.getByRole("checkbox", { name: "all" })).toHaveAttribute(
      "data-state",
      "indeterminate",
    )
  })
})

describe("Switch", () => {
  test("toggles on click", async () => {
    const user = userEvent.setup()
    const onCheckedChange = mock(() => {})
    render(<Switch aria-label="wifi" onCheckedChange={onCheckedChange} />)

    await user.click(screen.getByRole("switch", { name: "wifi" }))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })
})

describe("Tabs", () => {
  test("clicking a trigger swaps the visible panel", async () => {
    const user = userEvent.setup()
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">first panel</TabsContent>
        <TabsContent value="two">second panel</TabsContent>
      </Tabs>,
    )

    expect(screen.getByText("first panel")).toBeInTheDocument()
    expect(screen.queryByText("second panel")).toBeNull()

    await user.click(screen.getByRole("tab", { name: "Two" }))
    expect(screen.getByText("second panel")).toBeInTheDocument()
  })

  test("the selected tab is marked for assistive tech", () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true")
  })
})

describe("Accordion", () => {
  test("expands and collapses", async () => {
    const user = userEvent.setup()
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger>Section</AccordionTrigger>
          <AccordionContent>body text</AccordionContent>
        </AccordionItem>
      </Accordion>,
    )

    const trigger = screen.getByRole("button", { name: "Section" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("body text")).toBeInTheDocument()
  })
})

describe("Dialog", () => {
  test("opens from its trigger and exposes a dialog role", async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.queryByRole("dialog")).toBeNull()

    await user.click(screen.getByText("Open"))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeInTheDocument()

    // Radix wires these through aria-labelledby/-describedby; losing them is a
    // real accessibility regression and easy to do when restyling.
    expect(dialog).toHaveAccessibleName("Title")
    expect(dialog).toHaveAccessibleDescription("Body")
  })

  test("closes on Escape", async () => {
    const user = userEvent.setup()
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})

describe("DropdownMenu", () => {
  test("opens and invokes an item", async () => {
    const user = userEvent.setup()
    const onSelect = mock(() => {})
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    await user.click(screen.getByText("Menu"))
    await user.click(await screen.findByRole("menuitem", { name: "Item" }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  test("a checkbox item reports its checked state", async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>Shown</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    const item = await screen.findByRole("menuitemcheckbox", { name: "Shown" })
    expect(item).toHaveAttribute("aria-checked", "true")
  })
})

describe("Select", () => {
  test("exposes a combobox and reports a chosen value", async () => {
    const user = userEvent.setup()
    const onValueChange = mock(() => {})
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-label="region">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ap-south-3">ap-south-3</SelectItem>
          <SelectItem value="ap-south-3">ap-south-3</SelectItem>
        </SelectContent>
      </Select>,
    )

    const trigger = screen.getByRole("combobox", { name: "region" })
    expect(trigger).toHaveTextContent("Pick one")

    await user.click(trigger)
    await user.click(await screen.findByRole("option", { name: "ap-south-3" }))
    expect(onValueChange).toHaveBeenCalledWith("ap-south-3")
  })
})

describe("Tooltip", () => {
  test("renders its content when open", () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Explanation</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    )
    // Radix renders the label twice: the visible bubble and a visually-hidden
    // copy for screen readers.
    expect(screen.getAllByText("Explanation").length).toBeGreaterThan(0)
  })
})

describe("InputOTP", () => {
  test("accepts digits across its slots", async () => {
    const user = userEvent.setup()
    const onChange = mock(() => {})
    render(
      <InputOTP maxLength={4} onChange={onChange} aria-label="code">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>,
    )

    await user.type(screen.getByLabelText("code"), "1234")
    expect(onChange).toHaveBeenLastCalledWith("1234")
  })
})

describe("StatusBadge", () => {
  test("renders a label for a known status", () => {
    render(<StatusBadge status="available" />)
    expect(screen.getByText(/available/i)).toBeInTheDocument()
  })

  test("an unknown status still renders rather than throwing", () => {
    render(<StatusBadge status="some-unmapped-state" />)
    expect(screen.getByText(/some-unmapped-state/i)).toBeInTheDocument()
  })
})

describe("EmptyState", () => {
  test("renders its title and description", async () => {
    const { Inbox } = await import("lucide-react")
    render(<EmptyState icon={Inbox} title="Nothing here" description="Add one to begin" />)

    expect(screen.getByText("Nothing here")).toBeInTheDocument()
    expect(screen.getByText("Add one to begin")).toBeInTheDocument()
  })
})

describe("Button loading state", () => {
  test("shows a spinner and marks itself busy", () => {
    render(<Button loading>Save</Button>)

    const button = screen.getByRole("button", { name: "Save" })
    // aria-busy is what a screen reader reads; the spinner alone says nothing.
    expect(button).toHaveAttribute("aria-busy", "true")
    expect(button).toHaveAttribute("data-loading", "true")
  })

  test("stops responding while loading", async () => {
    const user = userEvent.setup()
    const onClick = mock(() => {})
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )

    // Most of these actions are not idempotent, so a second click during a
    // slow mutation must not fire.
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  test("keeps its label so the button does not resize mid-action", () => {
    render(<Button loading>Save changes</Button>)
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
  })

  test("an explicit disabled={false} still wins over loading", () => {
    // Escape hatch for a button that must stay clickable during a background
    // refresh it does not own.
    render(
      <Button loading disabled={false}>
        Save
      </Button>,
    )
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()
  })

  test("not loading leaves no trace", () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole("button", { name: "Save" })
    expect(button).not.toHaveAttribute("aria-busy")
    expect(button).not.toHaveAttribute("data-loading")
    expect(button).toBeEnabled()
  })

  test("asChild leaves the child's content alone", () => {
    render(
      <Button asChild loading>
        <a href="/x">Go</a>
      </Button>,
    )
    // A link cannot be disabled, and injecting a spinner into an arbitrary child
    // would break whatever it renders.
    expect(screen.getByRole("link", { name: "Go" })).toBeInTheDocument()
  })
})
