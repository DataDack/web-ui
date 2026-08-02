import type { ReactElement } from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Command,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Label,
  Logo,
  PageHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetTitle,
  Skeleton,
  StatCard,
  StatGrid,
  StatusBadge,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

/**
 * One realistic composition per component family, with a sentinel class applied
 * to the component actually under test.
 *
 * Radix compounds are rendered `defaultOpen` so their portalled content mounts —
 * a closed dropdown renders nothing, and a test that asserts on nothing passes
 * for the wrong reason.
 */
export interface Specimen {
  /** Export name under test; also the test title. */
  name: string
  /** Rendered tree, with SENTINEL applied to the component under test. */
  node: ReactElement
  /**
   * Set when the sentinel lands on an element that legitimately carries no
   * generated class — a pure behaviour wrapper with no styles of its own.
   */
  unstyled?: boolean
}

export const SENTINEL = "probe-sentinel"

const cls = { className: SENTINEL }

export const specimens: Specimen[] = [
  // --- plain elements -------------------------------------------------------
  { name: "Badge", node: <Badge {...cls}>badge</Badge> },
  { name: "Button", node: <Button {...cls}>click</Button> },
  { name: "Card", node: <Card {...cls}>card</Card> },
  { name: "CardHeader", node: <Card><CardHeader {...cls}>h</CardHeader></Card> },
  { name: "CardTitle", node: <Card><CardTitle {...cls}>t</CardTitle></Card> },
  {
    name: "CardDescription",
    node: <Card><CardDescription {...cls}>d</CardDescription></Card>,
  },
  { name: "CardContent", node: <Card><CardContent {...cls}>c</CardContent></Card> },
  { name: "CardFooter", node: <Card><CardFooter {...cls}>f</CardFooter></Card> },
  { name: "CardAction", node: <Card><CardAction {...cls}>a</CardAction></Card> },
  { name: "Input", node: <Input {...cls} /> },
  { name: "Textarea", node: <Textarea {...cls} /> },
  { name: "Label", node: <Label {...cls}>label</Label> },
  { name: "Separator", node: <Separator {...cls} /> },
  { name: "Skeleton", node: <Skeleton {...cls} /> },
  { name: "Switch", node: <Switch {...cls} /> },
  { name: "Checkbox", node: <Checkbox {...cls} /> },

  // --- avatar ---------------------------------------------------------------
  { name: "Avatar", node: <Avatar {...cls}><AvatarFallback>AB</AvatarFallback></Avatar> },
  {
    name: "AvatarFallback",
    node: <Avatar><AvatarFallback {...cls}>AB</AvatarFallback></Avatar>,
  },

  // --- tabs -----------------------------------------------------------------
  {
    name: "Tabs",
    node: (
      <Tabs defaultValue="a" {...cls}>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">body</TabsContent>
      </Tabs>
    ),
  },
  {
    name: "TabsList",
    node: (
      <Tabs defaultValue="a">
        <TabsList {...cls}>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
  },
  {
    name: "TabsTrigger",
    node: (
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a" {...cls}>
            A
          </TabsTrigger>
        </TabsList>
      </Tabs>
    ),
  },
  {
    name: "TabsContent",
    node: (
      <Tabs defaultValue="a">
        <TabsContent value="a" {...cls}>
          body
        </TabsContent>
      </Tabs>
    ),
  },

  // --- table ----------------------------------------------------------------
  { name: "Table", node: <Table {...cls}><TableBody /></Table> },
  {
    name: "TableHeader",
    node: (
      <Table>
        <TableHeader {...cls}>
          <TableRow>
            <TableHead>h</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    ),
  },
  {
    name: "TableRow",
    node: (
      <Table>
        <TableBody>
          <TableRow {...cls}>
            <TableCell>c</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
  {
    name: "TableCell",
    node: (
      <Table>
        <TableBody>
          <TableRow>
            <TableCell {...cls}>c</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
  {
    name: "TableHead",
    node: (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead {...cls}>h</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    ),
  },

  // --- overlays (rendered open so the portal content exists) ----------------
  {
    name: "DialogContent",
    node: (
      <Dialog defaultOpen>
        <DialogContent {...cls}>
          <DialogTitle>title</DialogTitle>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: "DialogTitle",
    node: (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle {...cls}>title</DialogTitle>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: "DialogHeader",
    node: (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader {...cls}>
            <DialogTitle>t</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: "DialogFooter",
    node: (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>t</DialogTitle>
          <DialogFooter {...cls}>f</DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: "DialogDescription",
    node: (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>t</DialogTitle>
          <DialogDescription {...cls}>d</DialogDescription>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: "SheetContent",
    node: (
      <Sheet defaultOpen>
        <SheetContent {...cls}>
          <SheetTitle>title</SheetTitle>
        </SheetContent>
      </Sheet>
    ),
  },
  {
    name: "PopoverContent",
    node: (
      <Popover defaultOpen>
        <PopoverTrigger>open</PopoverTrigger>
        <PopoverContent {...cls}>body</PopoverContent>
      </Popover>
    ),
  },
  {
    name: "DropdownMenuContent",
    node: (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>open</DropdownMenuTrigger>
        <DropdownMenuContent {...cls}>
          <DropdownMenuItem>item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
  {
    name: "DropdownMenuItem",
    node: (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem {...cls}>item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
  {
    name: "DropdownMenuLabel",
    node: (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel {...cls}>label</DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
  {
    name: "DropdownMenuSeparator",
    node: (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSeparator {...cls} />
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
  {
    name: "SelectTrigger",
    node: (
      <Select>
        <SelectTrigger {...cls}>
          <SelectValue placeholder="pick" />
        </SelectTrigger>
      </Select>
    ),
  },
  {
    name: "SelectContent",
    node: (
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="pick" />
        </SelectTrigger>
        <SelectContent {...cls}>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    ),
  },
  {
    name: "SelectItem",
    node: (
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a" {...cls}>
            A
          </SelectItem>
        </SelectContent>
      </Select>
    ),
  },
  {
    name: "TooltipContent",
    node: (
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>hover</TooltipTrigger>
          <TooltipContent {...cls}>tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },

  // --- accordion ------------------------------------------------------------
  {
    name: "AccordionItem",
    node: (
      <Accordion type="single" defaultValue="a" collapsible>
        <AccordionItem value="a" {...cls}>
          <AccordionTrigger>trigger</AccordionTrigger>
          <AccordionContent>body</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    name: "AccordionTrigger",
    node: (
      <Accordion type="single" defaultValue="a" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger {...cls}>trigger</AccordionTrigger>
          <AccordionContent>body</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },

  // --- input-otp ------------------------------------------------------------
  {
    name: "InputOTPGroup",
    node: (
      <InputOTP maxLength={4}>
        <InputOTPGroup {...cls}>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    ),
  },
  {
    name: "InputOTPSlot",
    node: (
      <InputOTP maxLength={4}>
        <InputOTPGroup>
          <InputOTPSlot index={0} {...cls} />
        </InputOTPGroup>
      </InputOTP>
    ),
  },

  // --- scroll area ----------------------------------------------------------
  { name: "ScrollArea", node: <ScrollArea {...cls}>body</ScrollArea> },

  // --- command --------------------------------------------------------------
  {
    name: "Command",
    node: (
      <Command {...cls}>
        <CommandList>
          <CommandItem>item</CommandItem>
        </CommandList>
      </Command>
    ),
  },
  {
    name: "CommandItem",
    node: (
      <Command>
        <CommandList>
          <CommandItem {...cls}>item</CommandItem>
        </CommandList>
      </Command>
    ),
  },

  // --- console blocks -------------------------------------------------------
  { name: "PageHeader", node: <PageHeader title="Title" {...cls} /> },
  { name: "StatCard", node: <StatCard label="Label" value="1" {...cls} /> },
  { name: "StatGrid", node: <StatGrid {...cls}><div>x</div></StatGrid> },
  { name: "StatusBadge", node: <StatusBadge status="available" {...cls} /> },
  { name: "Logo", node: <Logo {...cls} /> },
]
