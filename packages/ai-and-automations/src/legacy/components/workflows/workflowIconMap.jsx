/*
  Shared icon map for workflow node rendering.
  Uses react-icons/si (Simple Icons) for brand logos,
  lucide-react for core workflow nodes.
*/

import React from 'react';

// ── Custom MCP icon (Model Context Protocol logo) ──────────────────────────
function McpIcon({ size = 16, color = 'currentColor', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Interlocking double-loop MCP logo */}
      <path
        d="M72 18c-11 0-20 9-20 20v4c0 5.5-4.5 10-10 10H28c-11 0-20 9-20 20s9 20 20 20h4c5.5 0 10-4.5 10-10V68c0-5.5 4.5-10 10-10h14c11 0 20-9 20-20V18z"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M28 82c-11 0-20-9-20-20s9-20 20-20h4c5.5 0 10 4.5 10 10v14c0 11-9 20-20 20"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

// ── Lucide icons (core nodes: triggers, actions, logic, data, utility) ──────
import {
  Globe, Code2, Terminal, Pencil, ArrowUpDown, ArrowDown01, Copy, LayoutGrid,
  Sparkles, MessageSquare, Mail, FileSpreadsheet, Database, Cloud, Reply,
  MinusCircle, XCircle, Filter, Repeat, Clock, Merge, GitBranch, GitFork,
  PlayCircle, Webhook, Zap, Plug,
  Bot, Send, Phone, CreditCard, Store, Package, Ticket, Users, Shield,
  Calendar, FileText, Layers, Bell, BarChart, Container, Languages, CheckCircle,
  Search,
} from 'lucide-react';

// ── Brand icons (integrations) ──────────────────────────────────────────────
import {
  // AI
  SiAnthropic, SiPerplexity, SiHuggingface, SiDeepl,
  // Integrations
  SiGooglesheets, SiGmail,
  // CRM
  SiHubspot, SiZoho,
  // Communication
  SiDiscord, SiTelegram, SiWhatsapp, SiMattermost, SiLine,
  // Social
  SiInstagram, SiThreads,
  // Marketing
  SiMailchimp, SiBrevo, SiMailgun, SiFacebook,
  // Developer Tools
  SiGithub, SiGitlab, SiJira, SiLinear, SiJenkins, SiCircleci,
  SiBitbucket, SiSentry, SiGrafana, SiNpm, SiDocker,
  // Productivity
  SiNotion, SiAirtable, SiClickup, SiAsana, SiTrello, SiTodoist,
  SiGooglecalendar, SiGoogledrive, SiCalendly,
  // Finance
  SiStripe, SiPaypal, SiQuickbooks, SiXero, SiWise, SiPaddle,
  // eCommerce
  SiShopify, SiWoocommerce, SiWebflow,
  // Cloud
  SiCloudflare, SiGooglecloud, SiSupabase,
  // Databases
  SiPostgresql, SiMysql, SiMongodb, SiRedis, SiSnowflake,
  SiElasticsearch, SiTimescale, SiCratedb, SiBaserow,
} from 'react-icons/si';
import { FaSlack } from 'react-icons/fa';

// ── Microsoft brand icons (Phosphor Icons) ─────────────────────────────────
import {
  PiMicrosoftOutlookLogoFill,
  PiMicrosoftExcelLogoFill,
} from 'react-icons/pi';
import { GrOnedrive } from 'react-icons/gr';
import { BsMicrosoft } from 'react-icons/bs';

// ── Provider icons lacking a Simple Icon entry ─────────────────────────────
import { DeepSeek as LobeDeepSeek } from '@lobehub/icons';

// ── Lucide icon map (for core nodes) ────────────────────────────────────────
const LUCIDE_ICONS = {
  Globe, Code2, Terminal, Pencil, ArrowUpDown, ArrowDown01, Copy, LayoutGrid,
  Sparkles, MessageSquare, Mail, FileSpreadsheet, Database, Cloud, Reply,
  MinusCircle, XCircle, Filter, Repeat, Clock, Merge, GitBranch, GitFork,
  PlayCircle, Webhook, Zap, Plug,
  Bot, Send, Phone, CreditCard, Store, Package, Ticket, Users, Shield,
  Calendar, FileText, Layers, Bell, BarChart, Container, Languages, CheckCircle,
  Search,
};

// ── Brand icon map (registry key → react-icons/si component) ────────────────
// These take precedence over lucide icons when rendering.
const BRAND_ICONS = {
  // AI
  openAi: Bot,
  anthropicClaude: SiAnthropic,
  googleCloud: SiGooglecloud,
  amazonBedrock: Cloud, // no SI icon, use lucide Cloud
  azureOpenAi: BsMicrosoft,
  perplexity: SiPerplexity,
  huggingFace: SiHuggingface,
  deepL: SiDeepl,
  mistralAi: Sparkles, // no SI icon, use lucide
  deepSeek: LobeDeepSeek.Color,
  // LM sub-node variants (reuse the provider logos)
  lmChatOpenAi: Bot,
  lmChatAnthropic: SiAnthropic,
  lmChatDeepSeek: LobeDeepSeek.Color,
  // Integrations
  slack: FaSlack,
  googleSheets: SiGooglesheets,
  // CRM
  salesforce: Cloud,
  hubspot: SiHubspot,
  zohoCrm: SiZoho,
  affinity: Users,
  // Communication
  discord: SiDiscord,
  telegram: SiTelegram,
  whatsApp: SiWhatsapp,
  twilio: Phone,
  mattermost: SiMattermost,
  line: SiLine,
  // Marketing
  mailchimp: SiMailchimp,
  brevo: SiBrevo,
  sendGrid: Send,
  mailgun: SiMailgun,
  facebookLeadAds: SiFacebook,
  // Developer Tools
  github: SiGithub,
  gitLab: SiGitlab,
  jira: SiJira,
  linear: SiLinear,
  jenkins: SiJenkins,
  circleCI: SiCircleci,
  bitbucket: SiBitbucket,
  sentry: SiSentry,
  grafana: SiGrafana,
  npm: SiNpm,
  docker: SiDocker,
  // Productivity
  notion: SiNotion,
  airtable: SiAirtable,
  clickUp: SiClickup,
  asana: SiAsana,
  trello: SiTrello,
  todoist: SiTodoist,
  googleCalendar: SiGooglecalendar,
  googleDrive: SiGoogledrive,
  calendly: SiCalendly,
  // Finance
  stripe: SiStripe,
  payPal: SiPaypal,
  quickBooks: SiQuickbooks,
  xero: SiXero,
  wise: SiWise,
  paddle: SiPaddle,
  // eCommerce
  shopify: SiShopify,
  wooCommerce: SiWoocommerce,
  webflow: SiWebflow,
  // Cloud
  cloudflare: SiCloudflare,
  googleCloudStorage: SiGooglecloud,
  supabase: SiSupabase,
  // Databases
  postgres: SiPostgresql,
  mySql: SiMysql,
  mongoDb: SiMongodb,
  redis: SiRedis,
  snowflake: SiSnowflake,
  elasticsearch: SiElasticsearch,
  timescaleDb: SiTimescale,
  crateDb: SiCratedb,
  baserow: SiBaserow,
  // MCP
  mcpTrigger: McpIcon,
  // App Triggers — existing
  githubTrigger: SiGithub,
  slackTrigger: FaSlack,
  telegramTrigger: SiTelegram,
  discordTrigger: SiDiscord,
  whatsappTrigger: SiWhatsapp,
  instagramTrigger: SiInstagram,
  threadsTrigger: SiThreads,
  instagram: SiInstagram,
  threads: SiThreads,
  // App Triggers — Google
  googleDriveTrigger: SiGoogledrive,
  googleSheetsTrigger: SiGooglesheets,
  googleGmailTrigger: SiGmail,
  googleCalendarTrigger: SiGooglecalendar,
  // App Triggers — Microsoft
  microsoftOutlookTrigger: PiMicrosoftOutlookLogoFill,
  microsoftOneDriveTrigger: GrOnedrive,
  microsoftCalendarTrigger: BsMicrosoft,
  microsoftExcelTrigger: PiMicrosoftExcelLogoFill,
  // App Triggers — Jira
  jiraTrigger: SiJira,
};

// ── Unified icon map (lucide names as fallback) ─────────────────────────────
export const ICON_MAP = LUCIDE_ICONS;
export const BRAND_ICON_MAP = BRAND_ICONS;

export const CATEGORY_ICONS = {
  Triggers: Zap,
  Actions: Globe,
  Logic: GitBranch,
  Data: Pencil,
  AI: Sparkles,
  Integrations: Database,
  CRM: Users,
  Communication: MessageSquare,
  Marketing: Mail,
  'Developer Tools': Code2,
  Productivity: Calendar,
  Finance: CreditCard,
  eCommerce: Store,
  'Cloud Services': Cloud,
  Databases: Database,
  Utility: MinusCircle,
};
