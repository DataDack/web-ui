/*
  JSON Agent Config → Python Code Generator
  Generates executable Python scripts from Agent Studio configurations.
*/

function indent(code, level = 1) {
  const pad = '    '.repeat(level);
  return code.split('\n').map((l) => (l.trim() ? pad + l : '')).join('\n');
}

function pyString(s) {
  if (!s) return '""';
  // Use triple-quoted string for multiline
  if (s.includes('\n') || s.includes('"')) {
    const escaped = s.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
    return `"""${escaped}"""`;
  }
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function generateImports(cfg, agentMode) {
  const lines = [
    '"""',
    'Auto-generated Agent Script',
    'Generated from Agent Studio configuration.',
    '"""',
    '',
  ];
  if (agentMode === 'multiagent') {
    lines.push('from __future__ import annotations');
    lines.push('from typing import TypedDict, Annotated');
    lines.push('import operator');
    lines.push('import openai');
    lines.push('import json');
    lines.push('');
    lines.push('from langgraph.graph import StateGraph, START, END');
  } else {
    lines.push('import openai');
    lines.push('import json');
    if (cfg.stream_response) {
      lines.push('import sys');
    }
  }
  return lines.join('\n');
}

function generateConfig(cfg, agentName) {
  const lines = [
    '',
    '# ── Configuration ──────────────────────────────────────────────────────────',
    `GATEWAY_BASE_URL = "http://localhost:3000"  # Change to your gateway URL`,
    `API_KEY = "sk-your-api-key-here"            # Your API key`,
    `MODEL = "${cfg.model || 'gpt-4o'}"`,
    `AGENT_NAME = "${agentName || 'Agent'}"`,
  ];

  const ps = cfg.param_source ?? {};
  if (ps.temperature !== 'state') lines.push(`TEMPERATURE = ${cfg.temperature ?? 0.7}`);
  if (ps.top_p !== 'state') lines.push(`TOP_P = ${cfg.top_p ?? 1}`);
  if (ps.max_tokens !== 'state') lines.push(`MAX_TOKENS = ${cfg.max_tokens ?? 4096}`);
  lines.push(`STREAM = ${cfg.stream_response !== false ? 'True' : 'False'}`);

  if (cfg.json_output) {
    lines.push(`JSON_OUTPUT = True`);
  }

  return lines.join('\n');
}

function generateStateInit(cfg) {
  let stateVars = [];
  try {
    stateVars = JSON.parse(cfg.custom_state_schema || '[]');
  } catch { /* ignore */ }
  if (!Array.isArray(stateVars) || stateVars.length === 0) return '';

  const lines = [
    '',
    '# ── State Variables ────────────────────────────────────────────────────────',
    'state = {',
  ];

  for (const sv of stateVars) {
    let defaultVal = '""';
    if (sv.type === 'number') defaultVal = sv.defaultValue || '0';
    else if (sv.type === 'boolean') defaultVal = sv.defaultValue === 'true' ? 'True' : 'False';
    else if (sv.type === 'json' || sv.type === 'array') defaultVal = sv.defaultValue || '{}' ;
    else defaultVal = `"${sv.defaultValue || ''}"`;
    lines.push(`    "${sv.name}": ${defaultVal},`);
  }

  lines.push('}');
  return lines.join('\n');
}

function generateClientSetup() {
  return [
    '',
    '# ── Client Setup ──────────────────────────────────────────────────────────',
    'client = openai.OpenAI(',
    '    base_url=f"{GATEWAY_BASE_URL}/v1",',
    '    api_key=API_KEY,',
    ')',
  ].join('\n');
}

function generateSystemPrompt(cfg) {
  if (!cfg.system_prompt) return '';
  return [
    '',
    `SYSTEM_PROMPT = ${pyString(cfg.system_prompt)}`,
  ].join('\n');
}

function generatePrePostInstructions(cfg) {
  const lines = [];
  if (cfg.pre_instructions?.trim()) {
    lines.push(`PRE_INSTRUCTIONS = ${pyString(cfg.pre_instructions)}`);
  }
  if (cfg.post_instructions?.trim()) {
    lines.push(`POST_INSTRUCTIONS = ${pyString(cfg.post_instructions)}`);
  }
  return lines.length > 0 ? '\n' + lines.join('\n') : '';
}

function generateApiCallParams(cfg, modelVar = 'MODEL') {
  const ps = cfg.param_source ?? {};
  const params = [`    model=${modelVar}`];
  params.push('    messages=messages');

  if (ps.temperature === 'state') params.push('    temperature=state.get("temperature", 0.7)');
  else params.push('    temperature=TEMPERATURE');

  if (ps.top_p === 'state') params.push('    top_p=state.get("top_p", 1)');
  else params.push('    top_p=TOP_P');

  if (ps.max_tokens === 'state') params.push('    max_tokens=state.get("max_tokens", 4096)');
  else params.push('    max_tokens=MAX_TOKENS');

  params.push('    stream=STREAM');

  if (cfg.json_output) {
    if (cfg.json_schema?.trim()) {
      params.push(`    response_format={"type": "json_schema", "json_schema": ${cfg.json_schema.trim()}}`);
    } else {
      params.push('    response_format={"type": "json_object"}');
    }
  }

  return params.join(',\n');
}

function generateConversationalAgent(cfg) {
  const hasPreInst = !!cfg.pre_instructions?.trim();
  const hasPostInst = !!cfg.post_instructions?.trim();

  const lines = [
    '',
    '',
    '# ── Conversational Agent ───────────────────────────────────────────────────',
    '',
    'def run_agent():',
    '    """Run the conversational agent in an interactive loop."""',
    '    messages = []',
    '',
    '    # System prompt',
    '    if SYSTEM_PROMPT:',
    '        messages.append({"role": "system", "content": SYSTEM_PROMPT})',
  ];

  if (hasPreInst) {
    lines.push('');
    lines.push('    # Pre-instructions (injected after system prompt)');
    lines.push('    messages.append({"role": "system", "content": PRE_INSTRUCTIONS})');
  }

  lines.push('');
  lines.push('    print(f"\\n🤖 {AGENT_NAME} is ready. Type \'quit\' to exit.\\n")');
  lines.push('');
  lines.push('    while True:');
  lines.push('        user_input = input("You: ").strip()');
  lines.push('        if not user_input or user_input.lower() in ("quit", "exit"):');
  lines.push('            break');
  lines.push('');
  lines.push('        messages.append({"role": "user", "content": user_input})');

  if (hasPostInst) {
    lines.push('');
    lines.push('        # Post-instructions (injected after user message)');
    lines.push('        messages.append({"role": "system", "content": POST_INSTRUCTIONS})');
  }

  lines.push('');
  lines.push('        response = client.chat.completions.create(');
  lines.push(generateApiCallParams(cfg));
  lines.push('        )');
  lines.push('');

  if (cfg.stream_response !== false) {
    lines.push('        # Stream response');
    lines.push('        print(f"\\n{AGENT_NAME}: ", end="", flush=True)');
    lines.push('        full_response = ""');
    lines.push('        for chunk in response:');
    lines.push('            delta = chunk.choices[0].delta.content or ""');
    lines.push('            print(delta, end="", flush=True)');
    lines.push('            full_response += delta');
    lines.push('        print("\\n")');
    lines.push('');
    lines.push('        messages.append({"role": "assistant", "content": full_response})');
  } else {
    lines.push('        assistant_msg = response.choices[0].message.content');
    lines.push('        print(f"\\n{AGENT_NAME}: {assistant_msg}\\n")');
    lines.push('        messages.append({"role": "assistant", "content": assistant_msg})');
  }

  if (hasPostInst) {
    lines.push('');
    lines.push('        # Remove post-instructions from history to keep context clean');
    lines.push('        messages = [m for m in messages if m.get("content") != POST_INSTRUCTIONS or m.get("role") != "system"]');
  }

  lines.push('');
  lines.push('');
  lines.push('if __name__ == "__main__":');
  lines.push('    run_agent()');

  return lines.join('\n');
}

function generateCustomAgent(cfg) {
  const inputs = cfg.inputs ?? [];
  const outputs = cfg.outputs ?? [];
  const hasPreInst = !!cfg.pre_instructions?.trim();
  const hasPostInst = !!cfg.post_instructions?.trim();

  // Build function signature from inputs
  const params = inputs
    .filter((inp) => !inp.isDefault)
    .map((inp) => `${inp.name}: str`)
    .join(', ');
  const allParams = params || 'message: str';

  const lines = [
    '',
    '',
    '# ── Custom Agent ──────────────────────────────────────────────────────────',
    '',
    `def run_agent(${allParams}) -> dict:`,
    '    """Run the custom agent with typed inputs and outputs."""',
    '    messages = []',
    '',
    '    # System prompt',
    '    if SYSTEM_PROMPT:',
    '        messages.append({"role": "system", "content": SYSTEM_PROMPT})',
  ];

  if (hasPreInst) {
    lines.push('    messages.append({"role": "system", "content": PRE_INSTRUCTIONS})');
  }

  // Build user message from inputs
  if (inputs.length > 1) {
    lines.push('');
    lines.push('    # Combine inputs into user message');
    lines.push('    user_content = "\\n".join([');
    for (const inp of inputs.filter((i) => !i.isDefault)) {
      lines.push(`        f"${inp.name}: {${inp.name}}",`);
    }
    lines.push('    ])');
    lines.push('    messages.append({"role": "user", "content": user_content})');
  } else {
    lines.push('    messages.append({"role": "user", "content": message})');
  }

  if (hasPostInst) {
    lines.push('    messages.append({"role": "system", "content": POST_INSTRUCTIONS})');
  }

  lines.push('');
  lines.push('    response = client.chat.completions.create(');
  lines.push(generateApiCallParams(cfg));
  lines.push('    )');
  lines.push('');

  if (cfg.stream_response !== false) {
    lines.push('    full_response = ""');
    lines.push('    for chunk in response:');
    lines.push('        delta = chunk.choices[0].delta.content or ""');
    lines.push('        full_response += delta');
    lines.push('');
    lines.push('    result = full_response');
  } else {
    lines.push('    result = response.choices[0].message.content');
  }

  if (cfg.json_output) {
    lines.push('    return json.loads(result)');
  } else {
    // Map to output structure
    const outputNames = outputs.filter((o) => !o.isDefault).map((o) => o.name);
    if (outputNames.length > 0) {
      lines.push('    return {');
      for (const name of outputNames) {
        lines.push(`        "${name}": result,`);
      }
      lines.push('    }');
    } else {
      lines.push('    return {"response": result}');
    }
  }

  lines.push('');
  lines.push('');
  lines.push('if __name__ == "__main__":');
  lines.push(`    result = run_agent(${inputs.length > 1 ? inputs.filter((i) => !i.isDefault).map((i) => `${i.name}="test"`).join(', ') : 'message="Hello"'})`);
  lines.push('    print(json.dumps(result, indent=2))');

  return lines.join('\n');
}

function topoSort(nodes, edges) {
  const graph = {};
  const inDegree = {};
  const nodeIds = nodes.map((n) => n.id);

  for (const id of nodeIds) {
    graph[id] = [];
    inDegree[id] = 0;
  }

  for (const edge of edges) {
    if (graph[edge.source] && inDegree[edge.target] !== undefined) {
      graph[edge.source].push(edge.target);
      inDegree[edge.target]++;
    }
  }

  const queue = nodeIds.filter((id) => inDegree[id] === 0);
  const sorted = [];

  while (queue.length > 0) {
    const node = queue.shift();
    sorted.push(node);
    for (const neighbor of graph[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return sorted;
}

function generateMultiAgent(cfg, subAgents, flowGraph) {
  // Helper to make safe Python function names
  const toFnName = (sa) => (sa?.name || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'agent';

  // Determine execution order from flow graph
  const agentNodes = (flowGraph?.nodes ?? []).filter(
    (n) => n.type === 'agentNode' && n.data?._subAgentId
  );
  const sortedNodeIds = topoSort(flowGraph?.nodes ?? [], flowGraph?.edges ?? []);
  const sortedAgentNodes = sortedNodeIds
    .map((id) => agentNodes.find((n) => n.id === id))
    .filter(Boolean);

  const orderedAgents = sortedAgentNodes.length > 0
    ? sortedAgentNodes.map((n) => subAgents.find((sa) => sa.id === n.data._subAgentId)).filter(Boolean)
    : subAgents;

  // Build edge map for conditional routing
  const edgeMap = {};
  for (const edge of (flowGraph?.edges ?? [])) {
    const srcNode = agentNodes.find((n) => n.id === edge.source);
    const tgtNode = agentNodes.find((n) => n.id === edge.target);
    if (srcNode && tgtNode) {
      const srcAgent = subAgents.find((sa) => sa.id === srcNode.data._subAgentId);
      const tgtAgent = subAgents.find((sa) => sa.id === tgtNode.data._subAgentId);
      if (srcAgent && tgtAgent) {
        if (!edgeMap[srcAgent.id]) edgeMap[srcAgent.id] = [];
        edgeMap[srcAgent.id].push(tgtAgent);
      }
    }
  }

  // Find entry nodes (no incoming edges from agent nodes)
  const hasIncoming = new Set();
  for (const edge of (flowGraph?.edges ?? [])) {
    const tgtNode = agentNodes.find((n) => n.id === edge.target);
    if (tgtNode) hasIncoming.add(tgtNode.data._subAgentId);
  }
  const entryAgents = orderedAgents.filter((sa) => !hasIncoming.has(sa.id));

  const lines = [
    '',
    '',
    '# ── Graph State ───────────────────────────────────────────────────────────',
    '',
    'class AgentState(TypedDict):',
    '    """State that flows through the agent graph."""',
    '    input: str',
    '    current_output: str',
    '    history: Annotated[list[str], operator.add]  # Accumulates outputs from each node',
    '    current_node: str',
    '',
    '',
    '# ── Node Functions ────────────────────────────────────────────────────────',
    '# Each node takes the graph state, calls the LLM, and returns updated state.',
  ];

  for (const sa of subAgents) {
    const fnName = toFnName(sa);
    lines.push('');
    lines.push('');
    lines.push(`def ${fnName}_node(state: AgentState) -> dict:`);
    lines.push(`    """${sa.name}${sa.role ? ` — ${sa.role}` : ''}"""`);
    lines.push(`    print(f"  \\u2192 Running ${sa.name}...")`);
    lines.push('');
    lines.push('    messages = [');
    if (sa.system_prompt) {
      lines.push(`        {"role": "system", "content": ${pyString(sa.system_prompt)}},`);
    }
    lines.push('        {"role": "user", "content": state["current_output"]},');
    lines.push('    ]');
    lines.push('');
    lines.push('    response = client.chat.completions.create(');
    lines.push(`        model="${sa.model || cfg.model || 'gpt-4o'}",`);
    lines.push('        messages=messages,');
    lines.push(`        temperature=${sa.temperature ?? 0.7},`);
    lines.push(`        max_tokens=${sa.max_tokens ?? 4096},`);
    lines.push('    )');
    lines.push('');
    lines.push('    output = response.choices[0].message.content');
    lines.push('    return {');
    lines.push('        "current_output": output,');
    lines.push(`        "history": [f"[${sa.name}]: {output[:200]}..."],`);
    lines.push(`        "current_node": "${fnName}",`);
    lines.push('    }');
  }

  // Build the graph
  lines.push('');
  lines.push('');
  lines.push('# ── Build LangGraph ───────────────────────────────────────────────────────');
  lines.push('');
  lines.push('def build_graph() -> StateGraph:');
  lines.push('    """Construct the multi-agent graph from canvas configuration."""');
  lines.push('    graph = StateGraph(AgentState)');
  lines.push('');

  // Add nodes
  lines.push('    # Add nodes');
  for (const sa of subAgents) {
    const fnName = toFnName(sa);
    lines.push(`    graph.add_node("${fnName}", ${fnName}_node)`);
  }

  lines.push('');
  lines.push('    # Add edges (from canvas flow)');

  // Entry edges: START → first nodes
  if (entryAgents.length > 0) {
    for (const sa of entryAgents) {
      lines.push(`    graph.add_edge(START, "${toFnName(sa)}")`);
    }
  } else if (orderedAgents.length > 0) {
    lines.push(`    graph.add_edge(START, "${toFnName(orderedAgents[0])}")`);
  }

  // Inter-agent edges from flow graph
  for (const sa of subAgents) {
    const targets = edgeMap[sa.id];
    if (targets && targets.length > 0) {
      for (const tgt of targets) {
        lines.push(`    graph.add_edge("${toFnName(sa)}", "${toFnName(tgt)}")`);
      }
    }
  }

  // Terminal edges: nodes with no outgoing edges → END
  const hasOutgoing = new Set(Object.keys(edgeMap));
  const terminalAgents = subAgents.filter((sa) => !hasOutgoing.has(sa.id));
  for (const sa of terminalAgents) {
    lines.push(`    graph.add_edge("${toFnName(sa)}", END)`);
  }

  lines.push('');
  lines.push('    return graph.compile()');

  // Runner
  lines.push('');
  lines.push('');
  lines.push('# ── Run ───────────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('def run_pipeline(user_input: str) -> str:');
  lines.push('    """Execute the multi-agent pipeline."""');
  lines.push('    app = build_graph()');
  lines.push('');
  lines.push('    result = app.invoke({');
  lines.push('        "input": user_input,');
  lines.push('        "current_output": user_input,');
  lines.push('        "history": [],');
  lines.push('        "current_node": "",');
  lines.push('    })');
  lines.push('');
  lines.push('    return result["current_output"]');
  lines.push('');
  lines.push('');
  lines.push('if __name__ == "__main__":');
  lines.push('    print("\\n\\u2699\\ufe0f  Multi-Agent Pipeline (LangGraph)\\n")');
  lines.push('    user_input = input("Enter input: ").strip()');
  lines.push('    result = run_pipeline(user_input)');
  lines.push('    print(f"\\n\\u2705 Final Output:\\n{result}")');

  return lines.join('\n');
}

export function generateAgentPython({ cfg, agentName, agentType, agentMode, subAgents, flowGraph }) {
  const parts = [];

  parts.push(generateImports(cfg, agentMode));
  parts.push(generateConfig(cfg, agentName));
  parts.push(generateClientSetup());
  parts.push(generateSystemPrompt(cfg));
  parts.push(generatePrePostInstructions(cfg));
  parts.push(generateStateInit(cfg));

  if (agentMode === 'multiagent') {
    parts.push(generateMultiAgent(cfg, subAgents || [], flowGraph));
  } else if (agentType === 'custom') {
    parts.push(generateCustomAgent(cfg));
  } else {
    parts.push(generateConversationalAgent(cfg));
  }

  return parts.filter(Boolean).join('\n');
}
