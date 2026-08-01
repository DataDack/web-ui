import { injectGlobal } from '@emotion/css'

// Default values for every design token the kit reads, injected once at
// import time. The selectors are wrapped in :where() so they carry ZERO
// specificity: a consumer that defines its own `:root { --primary: ... }` or
// `.dark { ... }` — as both DataDack consoles do — always wins, whatever the
// stylesheet order. A consumer that defines nothing still renders correctly.
//
// Values are copied from the shared console theme.
injectGlobal(`
  :where(:root) {
    --background: #f5f5f6;
    --foreground: #1a1a1b;
    --card: #ffffff;
    --popover: #ffffff;
    --popover-foreground: #1a1a1b;
    --primary: #c9971b;
    --primary-foreground: #221a03;
    --secondary: #e5e5e7;
    --secondary-foreground: #1a1a1b;
    --muted: #e5e5e7;
    --muted-foreground: #717177;
    --accent: #e5e5e7;
    --accent-foreground: #1a1a1b;
    --destructive: #ba1a1a;
    --border: rgb(0 0 0 / 0.08);
    --input: rgb(0 0 0 / 0.06);
    --ring: #909096;

    --brand-gold: #c9971b;
    --brand-gold-hover: #d9ac33;
    --brand-gold-foreground: #221a03;

    --status-success: #5d5fae;
    --status-success-bg: rgb(112 114 192 / 0.13);
    --status-warning: #c96000;
    --status-warning-bg: rgb(201 96 0 / 0.12);
    --status-danger: #ba1a1a;
    --status-danger-bg: rgb(186 26 26 / 0.1);
    --status-info: #2387ad;
    --status-info-bg: rgb(40 163 208 / 0.12);
    --status-neutral: #717177;
    --status-neutral-bg: rgb(113 113 119 / 0.12);

    --chart-grid: rgb(0 0 0 / 0.07);

    --border-glass: rgb(0 0 0 / 0.08);
    --glass-1-bg: rgb(255 255 255 / 0.55);
    --glass-2-bg: rgb(255 255 255 / 0.65);

    --dur-base: 250ms;
    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  }

  :where(.dark) {
    --background: #0a0a0d;
    --foreground: #f2f2f5;
    --card: #18181c;
    --popover: #201f20;
    --popover-foreground: #e5e2e3;
    --primary: #e9b94f;
    --primary-foreground: #1f1604;
    --secondary: #353436;
    --secondary-foreground: #e5e2e3;
    --muted: #353436;
    --muted-foreground: #c6c6cc;
    --accent: #353436;
    --accent-foreground: #e5e2e3;
    --destructive: #dc2626;
    --border: rgb(255 255 255 / 0.1);
    --input: rgb(255 255 255 / 0.08);
    --ring: #c3c6d2;

    --brand-gold: #e9b94f;
    --brand-gold-hover: #f4cd6f;
    --brand-gold-foreground: #1f1604;

    --status-success: #c0c1ff;
    --status-success-bg: rgb(192 193 255 / 0.13);
    --status-warning: #ffb77b;
    --status-warning-bg: rgb(255 183 123 / 0.13);
    --status-danger: #ffb4ab;
    --status-danger-bg: rgb(255 180 171 / 0.12);
    --status-info: #8ed9f5;
    --status-info-bg: rgb(142 217 245 / 0.12);
    --status-neutral: #909096;
    --status-neutral-bg: rgb(144 144 150 / 0.14);

    --chart-grid: rgb(255 255 255 / 0.08);

    --border-glass: rgb(255 255 255 / 0.1);
    --glass-1-bg: rgb(255 255 255 / 0.02);
    --glass-2-bg: rgb(255 255 255 / 0.03);
  }
`)
