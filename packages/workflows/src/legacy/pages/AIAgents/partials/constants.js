/*
Copyright (C) 2025 DataDack Technologies Pvt. Ltd.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import {
  Bot,
  Globe,
  Zap,
  Code2,
  FileText,
  Database,
  LayoutGrid,
  Settings2,
  Search,
} from 'lucide-react';
import {
  OpenAI,
  Claude,
  Gemini,
  DeepSeek,
  Mistral,
  Cohere,
  Cloudflare,
  Ollama,
  OpenRouter,
  Perplexity,
  XAI,
  Moonshot,
  Minimax,
  Jina,
  Dify,
  Suno,
  SiliconCloud,
  Replicate,
  Xinference,
  Coze,
} from '@lobehub/icons';

// ── Provider metadata (channel type → label + icon) ─────────────────────────
// Only includes non-Chinese, globally relevant providers for the Agent Studio UI.
export const PROVIDER_META = {
  1:  { label: 'OpenAI',           icon: OpenAI },
  14: { label: 'Anthropic Claude', icon: Claude.Color },
  33: { label: 'AWS Claude',       icon: Claude.Color },
  3:  { label: 'Azure OpenAI',     icon: OpenAI },
  24: { label: 'Google Gemini',    icon: Gemini.Color },
  41: { label: 'Vertex AI',        icon: Gemini.Color },
  11: { label: 'Google PaLM2',     icon: Gemini.Color },
  43: { label: 'DeepSeek',         icon: DeepSeek.Color },
  42: { label: 'Mistral AI',       icon: Mistral.Color },
  34: { label: 'Cohere',           icon: Cohere.Color },
  4:  { label: 'Ollama',           icon: Ollama },
  20: { label: 'OpenRouter',       icon: OpenRouter },
  27: { label: 'Perplexity',       icon: Perplexity.Color },
  48: { label: 'xAI',              icon: XAI },
  25: { label: 'Moonshot',         icon: Moonshot },
  35: { label: 'MiniMax',          icon: Minimax.Color },
  39: { label: 'Cloudflare',       icon: Cloudflare.Color },
  38: { label: 'Jina',             icon: Jina },
  37: { label: 'Dify',             icon: Dify.Color },
  36: { label: 'Suno API',         icon: Suno },
  40: { label: 'SiliconCloud',     icon: SiliconCloud.Color },
  47: { label: 'Xinference',       icon: Xinference.Color },
  49: { label: 'Coze',             icon: Coze },
  52: { label: 'Vidu',             icon: null },
  53: { label: 'SubModel',         icon: null },
  55: { label: 'Sora',             icon: OpenAI },
  56: { label: 'Replicate',        icon: Replicate },
};

// ── Constants ────────────────────────────────────────────────────────────────

export const TOOL_CATALOG = [
  { key: 'run_agent', name: 'Run Agent', category: 'VectorShift', icon: Bot, description: 'Execute another agent as a sub-task' },
  { key: 'web_search', name: 'Web Search', category: 'Web Search', icon: Globe, description: 'Search the web for real-time information' },
  { key: 'llm_call', name: 'LLM Call', category: 'LLM', icon: Zap, description: 'Call a language model directly' },
  { key: 'code_execution', name: 'Code Execution', category: 'LLM', icon: Code2, description: 'Execute code in a sandbox environment' },
  { key: 'file_read', name: 'File Read', category: 'File Ops', icon: FileText, description: 'Read files from storage' },
  { key: 'file_write', name: 'File Write', category: 'File Ops', icon: FileText, description: 'Write files to storage' },
  { key: 'db_query', name: 'DB Query', category: 'Data', icon: Database, description: 'Query a connected database' },
  { key: 'data_transform', name: 'Data Transform', category: 'Data', icon: LayoutGrid, description: 'Transform and reshape data' },
  { key: 'modify_image', name: 'Modify Image', category: 'VectorShift', icon: Settings2, description: 'Edit and transform images' },
  { key: 'analyze_image', name: 'Analyze Image', category: 'VectorShift', icon: Search, description: 'Analyze image content' },
  { key: 'generate_image', name: 'Generate Image', category: 'VectorShift', icon: Bot, description: 'Generate images from prompts' },
];

export const TOOL_CATEGORIES = ['All', 'VectorShift', 'LLM', 'Web Search', 'File Ops', 'Data'];

export const INPUT_TYPE_OPTIONS = ['Text', 'Number', 'Boolean', 'JSON', 'Image', 'Audio', 'File'];

export const DEFAULT_CFG = {
  system_prompt: '',
  model: 'gpt-4o',
  temperature: 0.7,
  top_p: 1,
  max_tokens: 4096,
  tools: [],
  stream_response: true,
  use_personal_api_key: false,
  personal_api_key: '',
  json_output: false,
  json_schema: '',
  custom_state_enabled: false,
  custom_state_schema: '',
  input_schema: [],
  // ── Message Pipeline ─────────────────────────────────────────────
  pre_instructions: '',        // injected after system prompt, before history
  post_instructions: '',       // injected after user message
  // ── Parameter Mapping ────────────────────────────────────────────
  // 'static' = use cfg values, 'state' = read from state variables
  param_source: {
    temperature: 'static',
    top_p: 'static',
    max_tokens: 'static',
    model: 'static',
  },
  inputs: [
    { id: 'default_input_message', name: 'message', type: 'Text', isDefault: true },
    { id: crypto.randomUUID(), name: 'input_0', type: 'Text' },
  ],
  outputs: [
    { id: 'default_output_response', name: 'response', type: 'JSON', isDefault: true },
    { id: crypto.randomUUID(), name: 'output_0', type: 'Text' },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function parseCfg(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...DEFAULT_CFG, ...parsed };
    }
  } catch (_) { }
  return { ...DEFAULT_CFG };
}

export function getNextIOName(prefix, existingItems) {
  const nums = existingItems
    .map((item) => {
      const match = item.name.match(new RegExp(`^${prefix}_(\\d+)$`));
      return match ? parseInt(match[1], 10) : -1;
    })
    .filter((n) => n >= 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 0;
  return `${prefix}_${next}`;
}
