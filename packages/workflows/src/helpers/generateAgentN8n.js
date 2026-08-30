/*
  JSON Agent Config → n8n Workflow JSON Generator
  Generates n8n-compatible workflow JSON from Agent Studio configurations.
  Maps every canvas node type (Input, Output, Agent, Tool, Knowledge, Condition, Note)
  to corresponding n8n nodes. Uses HTTP Request nodes to call OpenAI-compatible APIs
  through the gateway, making it portable across any n8n installation.
*/

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Fallback UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function nextId() {
  return uuid();
}

function makeNodeName(base, existingNames) {
  if (!existingNames.has(base)) {
    existingNames.add(base);
    return base;
  }
  let i = 1;
  while (existingNames.has(`${base} ${i}`)) i++;
  const name = `${base} ${i}`;
  existingNames.add(name);
  return name;
}

// ─── n8n Node Factories ───────────────────────────────────────────────────────

function makeTriggerNode(position) {
  return {
    parameters: {},
    id: nextId(),
    name: 'When clicking "Execute Workflow"',
    type: 'n8n-nodes-base.manualTrigger',
    typeVersion: 1,
    position,
  };
}

function makeCodeNode(name, jsCode, position) {
  return {
    parameters: {
      jsCode,
      mode: 'runOnceForAllItems',
    },
    id: nextId(),
    name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position,
  };
}

function makeSetFieldsNode(name, fields, position) {
  return {
    parameters: {
      mode: 'manual',
      duplicateItem: false,
      assignments: {
        assignments: fields.map((f) => ({
          id: uuid(),
          name: f.name,
          value: f.value,
          type: f.type || 'string',
        })),
      },
      options: {},
    },
    id: nextId(),
    name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position,
  };
}

function makeHttpRequestNode(name, position, opts = {}) {
  return {
    parameters: {
      method: opts.method || 'POST',
      url: opts.url || '={{ $json.gateway_base_url }}/v1/chat/completions',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: opts.body || '={{ JSON.stringify($json.request_body) }}',
      options: {
        response: { response: { responseFormat: 'json' } },
        timeout: 120000,
      },
    },
    id: nextId(),
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position,
    credentials: {
      httpHeaderAuth: {
        id: 'CONFIGURE_ME',
        name: 'Gateway API Key',
      },
    },
  };
}

function makeIfNode(name, conditionExpr, position) {
  return {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '' },
        conditions: [{
          id: uuid(),
          leftValue: conditionExpr.left || '={{ $json.response }}',
          rightValue: conditionExpr.right || '',
          operator: {
            type: 'string',
            operation: conditionExpr.operation || 'contains',
          },
        }],
        combinator: 'and',
      },
      options: {},
    },
    id: nextId(),
    name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position,
  };
}

let stickyNoteCounter = 0;

function makeStickyNote(content, position, width = 300, height = 160) {
  stickyNoteCounter++;
  return {
    parameters: { content, width, height },
    id: nextId(),
    name: `Sticky Note${stickyNoteCounter > 1 ? ' ' + stickyNoteCounter : ''}`,
    type: 'n8n-nodes-base.stickyNote',
    typeVersion: 1,
    position,
  };
}

function makeExtractResponseCode(name, position) {
  return makeCodeNode(name, [
    'const items = $input.all();',
    'const results = [];',
    'for (const item of items) {',
    '  const body = item.json.body || item.json;',
    '  const content = body?.choices?.[0]?.message?.content || "";',
    '  results.push({',
    '    json: {',
    '      ...item.json,',
    '      response: content,',
    '      model: body?.model || "",',
    '      usage: body?.usage || {},',
    '    }',
    '  });',
    '}',
    'return results;',
  ].join('\n'), position);
}

// Map canvas tool labels to n8n-compatible code/HTTP nodes
function makeToolN8nNodes(flowNode, names, position) {
  const label = flowNode.data?.label || 'Tool';
  const config = flowNode.data?.config;

  switch (label) {
    case 'Web Search': {
      const nodeName = makeNodeName('Web Search', names);
      return {
        primary: makeCodeNode(nodeName, [
          '// Web Search tool — calls a search API',
          'const query = $json.response || $json.input || "";',
          'const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;',
          '',
          'const resp = await fetch(searchUrl);',
          'const data = await resp.json();',
          '',
          'return [{',
          '  json: {',
          '    ...$json,',
          '    search_query: query,',
          '    search_results: data.RelatedTopics?.slice(0, 5)?.map(t => t.Text) || [],',
          '    search_abstract: data.Abstract || "",',
          '    response: data.Abstract || JSON.stringify(data.RelatedTopics?.slice(0, 3) || []),',
          '  }',
          '}];',
        ].join('\n'), position),
      };
    }
    case 'Code Exec': {
      const nodeName = makeNodeName('Code Execution', names);
      const code = config?.code || '// Write your custom code here\nreturn [{ json: { ...$json } }];';
      return {
        primary: makeCodeNode(nodeName, code, position),
      };
    }
    case 'File Read': {
      const nodeName = makeNodeName('Read File', names);
      return {
        primary: makeCodeNode(nodeName, [
          '// File Read tool placeholder',
          '// In n8n, use the "Read/Write Files from Disk" node instead for local files,',
          '// or "HTTP Request" for remote files.',
          'const filePath = $json.file_path || "data.json";',
          '',
          'return [{',
          '  json: {',
          '    ...$json,',
          '    file_path: filePath,',
          '    response: `[File read placeholder: ${filePath}]`,',
          '  }',
          '}];',
        ].join('\n'), position),
      };
    }
    case 'DB Query': {
      const nodeName = makeNodeName('DB Query', names);
      return {
        primary: makeCodeNode(nodeName, [
          '// Database Query tool placeholder',
          '// In n8n, replace this with a native database node (PostgreSQL, MySQL, etc.)',
          'const query = $json.query || $json.response || "";',
          '',
          'return [{',
          '  json: {',
          '    ...$json,',
          '    db_query: query,',
          '    response: `[DB query placeholder: ${query}]`,',
          '  }',
          '}];',
        ].join('\n'), position),
      };
    }
    default: {
      const nodeName = makeNodeName(label, names);
      return {
        primary: makeCodeNode(nodeName, [
          `// ${label} tool`,
          'return [{ json: { ...$json } }];',
        ].join('\n'), position),
      };
    }
  }
}

function makeKnowledgeN8nNode(flowNode, names, position) {
  const nodeName = makeNodeName('Knowledge Base', names);
  const source = flowNode.data?.source || 'default';
  return makeCodeNode(nodeName, [
    '// Knowledge Base / RAG retrieval',
    '// Replace with an HTTP Request to your RAG API endpoint',
    `const source = "${source}";`,
    'const query = $json.response || $json.input || "";',
    '',
    '// Example: call a RAG API',
    '// const resp = await fetch("https://your-rag-api/query", {',
    '//   method: "POST",',
    '//   headers: { "Content-Type": "application/json" },',
    '//   body: JSON.stringify({ query, source }),',
    '// });',
    '// const data = await resp.json();',
    '',
    'return [{',
    '  json: {',
    '    ...$json,',
    '    knowledge_query: query,',
    '    knowledge_source: source,',
    '    response: `[Knowledge retrieval placeholder for: ${query}]`,',
    '  }',
    '}];',
  ].join('\n'), position);
}

// ─── Single Agent Workflow ────────────────────────────────────────────────────

function generateSingleAgentWorkflow(cfg, agentName, agentType) {
  stickyNoteCounter = 0;
  const names = new Set();
  const nodes = [];
  const connections = {};

  const X = 250;
  const Y = 300;
  const DX = 280;
  let col = 0;

  // 1. Manual trigger
  const trigger = makeTriggerNode([X + col * DX, Y]);
  nodes.push(trigger);
  col++;

  // 2. Build request body
  const messages = [];
  if (cfg.system_prompt) messages.push({ role: 'system', content: cfg.system_prompt });
  if (cfg.pre_instructions?.trim()) messages.push({ role: 'system', content: cfg.pre_instructions });
  messages.push({ role: 'user', content: '{{USER_INPUT}}' });
  if (cfg.post_instructions?.trim()) messages.push({ role: 'system', content: cfg.post_instructions });

  const messagesJson = JSON.stringify(messages, null, 2)
    .replace('"{{USER_INPUT}}"', agentType === 'custom'
      ? '"Provide your input here"'
      : '"{{ $json.chatInput || \'Hello\' }}"');

  const reqBody = {
    model: cfg.model || 'gpt-4o',
    temperature: cfg.temperature ?? 0.7,
    top_p: cfg.top_p ?? 1,
    max_tokens: cfg.max_tokens ?? 4096,
    stream: false,
  };
  if (cfg.json_output) {
    if (cfg.json_schema?.trim()) {
      try { reqBody.response_format = { type: 'json_schema', json_schema: JSON.parse(cfg.json_schema) }; } catch { reqBody.response_format = { type: 'json_object' }; }
    } else {
      reqBody.response_format = { type: 'json_object' };
    }
  }
  reqBody.messages = '%%MESSAGES%%';
  const bodyStr = JSON.stringify(reqBody, null, 2).replace('"%%MESSAGES%%"', messagesJson);

  const setupName = makeNodeName('Build Request', names);
  const setupNode = makeCodeNode(setupName, [
    '// Configure your gateway URL and build the chat completions request',
    'const gatewayBaseUrl = "http://localhost:3000";  // Change to your gateway URL',
    '',
    `const messages = ${messagesJson};`,
    '',
    'return [{',
    '  json: {',
    '    gateway_base_url: gatewayBaseUrl,',
    `    request_body: ${bodyStr}`,
    '  }',
    '}];',
  ].join('\n'), [X + col * DX, Y]);
  nodes.push(setupNode);
  col++;

  // 3. HTTP Request
  const httpName = makeNodeName(agentName || 'AI Agent', names);
  const httpNode = makeHttpRequestNode(httpName, [X + col * DX, Y]);
  nodes.push(httpNode);
  col++;

  // 4. Extract response
  const extractName = makeNodeName('Extract Response', names);
  const extractNode = makeExtractResponseCode(extractName, [X + col * DX, Y]);
  nodes.push(extractNode);

  // 5. Setup note
  nodes.push(makeStickyNote([
    `## ${agentName || 'Agent'} Workflow`,
    '',
    '**Setup required:**',
    '1. Update the gateway URL in "Build Request"',
    '2. Create an HTTP Header Auth credential in n8n:',
    '   - Header Name: `Authorization`',
    '   - Header Value: `Bearer sk-your-api-key`',
    '3. Assign the credential to the HTTP Request node',
    '',
    agentType === 'custom'
      ? '**Custom agent** — modify the input in the "Build Request" node.'
      : '**Conversational agent** — connect a Chat trigger for interactive use.',
  ].join('\n'), [X, Y - 220], 500, 180));

  // Connections
  connections[trigger.name] = { main: [[{ node: setupNode.name, type: 'main', index: 0 }]] };
  connections[setupNode.name] = { main: [[{ node: httpNode.name, type: 'main', index: 0 }]] };
  connections[httpNode.name] = { main: [[{ node: extractNode.name, type: 'main', index: 0 }]] };

  return wrapWorkflow(`${agentName || 'Agent'} Workflow`, nodes, connections);
}

// ─── Multi-Agent Workflow ─────────────────────────────────────────────────────

function topoSort(flowNodes, flowEdges) {
  const graph = {};
  const inDegree = {};
  const ids = flowNodes.map((n) => n.id);

  for (const id of ids) {
    graph[id] = [];
    inDegree[id] = 0;
  }
  for (const edge of flowEdges) {
    if (graph[edge.source] && inDegree[edge.target] !== undefined) {
      graph[edge.source].push(edge.target);
      inDegree[edge.target]++;
    }
  }

  const queue = ids.filter((id) => inDegree[id] === 0);
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

function generateMultiAgentWorkflow(cfg, agentName, subAgents, flowGraph) {
  stickyNoteCounter = 0;
  const names = new Set();
  const n8nNodes = [];
  const connections = {};

  const flowNodes = flowGraph?.nodes ?? [];
  const flowEdges = flowGraph?.edges ?? [];
  const sortedIds = topoSort(flowNodes, flowEdges);

  // Build lookup maps
  const flowNodeById = {};
  for (const fn of flowNodes) flowNodeById[fn.id] = fn;

  const agentById = {};
  for (const sa of subAgents) agentById[sa.id] = sa;

  // Identify entry nodes (no incoming edges)
  const hasIncoming = new Set();
  for (const edge of flowEdges) hasIncoming.add(edge.target);

  // Position helpers
  const X_START = 250;
  const Y_BASE = 300;
  const DX = 320;
  let col = 0;

  // ── 1. Manual trigger ──
  const trigger = makeTriggerNode([X_START, Y_BASE]);
  n8nNodes.push(trigger);
  col++;

  // ── 2. Setup / config node ──
  const setupName = makeNodeName('Setup', names);
  const setupNode = makeCodeNode(setupName, [
    '// Configure your gateway URL here',
    'const gatewayBaseUrl = "http://localhost:3000";  // Change to your gateway URL',
    '',
    'return [{',
    '  json: {',
    '    gateway_base_url: gatewayBaseUrl,',
    '    input: "Provide your input here",',
    '    pipeline_context: {},',
    '  }',
    '}];',
  ].join('\n'), [X_START + col * DX, Y_BASE]);
  n8nNodes.push(setupNode);
  connections[trigger.name] = { main: [[{ node: setupNode.name, type: 'main', index: 0 }]] };
  col++;

  // ── 3. Process each canvas node in topological order ──
  // Maps canvas flow-node-id → the "output" n8n node name (the one to connect FROM)
  const outputNodeName = {};
  // Maps canvas flow-node-id → the "input" n8n node name (the one to connect TO)
  const inputNodeName = {};

  for (const flowId of sortedIds) {
    const fn = flowNodeById[flowId];
    if (!fn) continue;

    const x = X_START + col * DX;
    const y = Y_BASE;

    switch (fn.type) {
      // ── Input Node → passes through as the initial data ──
      case 'inputNode': {
        const nodeName = makeNodeName('Input', names);
        const node = makeSetFieldsNode(nodeName, [
          { name: 'input', value: `={{ $json.input || "" }}`, type: 'string' },
          { name: 'inputType', value: fn.data?.inputType || 'Text', type: 'string' },
          { name: 'gateway_base_url', value: '={{ $json.gateway_base_url }}', type: 'string' },
          { name: 'pipeline_context', value: '={{ $json.pipeline_context }}', type: 'string' },
        ], [x, y]);
        n8nNodes.push(node);
        outputNodeName[flowId] = nodeName;
        inputNodeName[flowId] = nodeName;
        col++;
        break;
      }

      // ── Output Node → final output formatter ──
      case 'outputNode': {
        const nodeName = makeNodeName('Output', names);
        const node = makeCodeNode(nodeName, [
          '// Pipeline output',
          `const outputType = "${fn.data?.outputType || 'Text'}";`,
          'const response = $json.response || $json.input || "";',
          '',
          'return [{',
          '  json: {',
          '    output: response,',
          '    output_type: outputType,',
          '    pipeline_context: $json.pipeline_context || {},',
          '  }',
          '}];',
        ].join('\n'), [x, y]);
        n8nNodes.push(node);
        outputNodeName[flowId] = nodeName;
        inputNodeName[flowId] = nodeName;
        col++;
        break;
      }

      // ── Agent Node → Build Messages + HTTP Request + Extract Response ──
      case 'agentNode': {
        const sa = fn.data?._subAgentId ? agentById[fn.data._subAgentId] : null;
        const agName = sa?.name || fn.data?.label || 'Agent';

        const sysMessages = [];
        if (sa?.system_prompt) sysMessages.push({ role: 'system', content: sa.system_prompt });
        if (sa?.role) sysMessages.push({ role: 'system', content: `Your role: ${sa.role}` });

        const model = sa?.model || fn.data?.model || cfg.model || 'gpt-4o';
        const temp = sa?.temperature ?? cfg.temperature ?? 0.7;
        const maxTok = sa?.max_tokens ?? cfg.max_tokens ?? 4096;

        const buildName = makeNodeName(`Build ${agName}`, names);
        const buildNode = makeCodeNode(buildName, [
          `// Build chat completion request for: ${agName}`,
          `const systemMessages = ${JSON.stringify(sysMessages, null, 2)};`,
          '',
          'const userContent = $json.response || $json.input || "";',
          'const messages = [...systemMessages, { role: "user", content: userContent }];',
          '',
          'return [{',
          '  json: {',
          '    gateway_base_url: $json.gateway_base_url,',
          '    pipeline_context: $json.pipeline_context || {},',
          `    request_body: {`,
          `      model: "${model}",`,
          `      temperature: ${temp},`,
          `      max_tokens: ${maxTok},`,
          '      stream: false,',
          '      messages,',
          '    }',
          '  }',
          '}];',
        ].join('\n'), [x, y]);
        n8nNodes.push(buildNode);

        const httpName = makeNodeName(agName, names);
        const httpNode = makeHttpRequestNode(httpName, [x + DX, y]);
        n8nNodes.push(httpNode);

        const extractName = makeNodeName(`Parse ${agName}`, names);
        const extractNode = makeExtractResponseCode(extractName, [x + DX * 2, y]);
        n8nNodes.push(extractNode);

        connections[buildName] = { main: [[{ node: httpName, type: 'main', index: 0 }]] };
        connections[httpName] = { main: [[{ node: extractName, type: 'main', index: 0 }]] };

        inputNodeName[flowId] = buildName;
        outputNodeName[flowId] = extractName;
        col += 3;
        break;
      }

      // ── Tool Node → mapped to appropriate n8n node ──
      case 'toolNode': {
        const { primary } = makeToolN8nNodes(fn, names, [x, y]);
        n8nNodes.push(primary);
        inputNodeName[flowId] = primary.name;
        outputNodeName[flowId] = primary.name;
        col++;
        break;
      }

      // ── Knowledge Node → RAG retrieval placeholder ──
      case 'knowledgeNode': {
        const kNode = makeKnowledgeN8nNode(fn, names, [x, y]);
        n8nNodes.push(kNode);
        inputNodeName[flowId] = kNode.name;
        outputNodeName[flowId] = kNode.name;
        col++;
        break;
      }

      // ── Condition Node → n8n IF node ──
      case 'conditionNode': {
        const condStr = fn.data?.condition;
        let condExpr = { left: '={{ $json.response }}', right: '', operation: 'contains' };
        if (typeof condStr === 'string' && condStr.trim()) {
          condExpr.right = condStr;
        } else if (condStr && typeof condStr === 'object') {
          condExpr = {
            left: condStr.left || '={{ $json.response }}',
            right: condStr.right || condStr.value || '',
            operation: condStr.operator || condStr.operation || 'contains',
          };
        }
        const condName = makeNodeName(fn.data?.label || 'Condition', names);
        const condNode = makeIfNode(condName, condExpr, [x, y]);
        n8nNodes.push(condNode);
        inputNodeName[flowId] = condName;
        outputNodeName[flowId] = condName;
        col++;
        break;
      }

      // ── Note Node → n8n Sticky Note ──
      case 'noteNode': {
        const notePos = fn.position ? [fn.position.x || x, fn.position.y || y] : [x, y - 200];
        n8nNodes.push(makeStickyNote(
          fn.data?.text || fn.data?.label || 'Note',
          notePos,
          260,
          120,
        ));
        // Notes don't participate in data flow
        break;
      }

      default:
        break;
    }
  }

  // ── 4. Wire edges from flow graph ──
  for (const edge of flowEdges) {
    const srcName = outputNodeName[edge.source];
    const tgtName = inputNodeName[edge.target];
    if (!srcName || !tgtName) continue;

    // For condition nodes, handle true/false output handles
    const srcFlowNode = flowNodeById[edge.source];
    if (srcFlowNode?.type === 'conditionNode') {
      // n8n IF node: main[0] = true branch, main[1] = false branch
      if (!connections[srcName]) connections[srcName] = { main: [[], []] };
      const outputIndex = edge.sourceHandle === 'false' ? 1 : 0;
      if (!connections[srcName].main[outputIndex]) connections[srcName].main[outputIndex] = [];
      connections[srcName].main[outputIndex].push({ node: tgtName, type: 'main', index: 0 });
    } else {
      if (!connections[srcName]) connections[srcName] = { main: [[]] };
      if (!connections[srcName].main[0]) connections[srcName].main[0] = [];
      connections[srcName].main[0].push({ node: tgtName, type: 'main', index: 0 });
    }
  }

  // ── 5. Connect Setup → entry nodes ──
  const entryTargets = [];
  for (const fn of flowNodes) {
    if (fn.type === 'noteNode') continue;
    if (!hasIncoming.has(fn.id) && inputNodeName[fn.id]) {
      entryTargets.push({ node: inputNodeName[fn.id], type: 'main', index: 0 });
    }
  }
  if (entryTargets.length > 0) {
    connections[setupNode.name] = { main: [entryTargets] };
  }

  // ── 6. Info sticky note ──
  const agentList = subAgents.map((sa) => `- ${sa.name}${sa.role ? ` (${sa.role})` : ''}`).join('\n');
  const nodeTypeCounts = {};
  for (const fn of flowNodes) {
    if (fn.type === 'noteNode') continue;
    nodeTypeCounts[fn.type] = (nodeTypeCounts[fn.type] || 0) + 1;
  }
  const summary = Object.entries(nodeTypeCounts)
    .map(([t, c]) => `${c} ${t.replace('Node', '')}`)
    .join(', ');

  n8nNodes.push(makeStickyNote([
    `## ${agentName || 'Multi-Agent'} Pipeline`,
    '',
    `**Nodes:** ${summary}`,
    subAgents.length > 0 ? `\n**Agents:**\n${agentList}` : '',
    '',
    '**Setup required:**',
    '1. Update gateway URL in "Setup" node',
    '2. Create HTTP Header Auth credential:',
    '   - Header: `Authorization`',
    '   - Value: `Bearer sk-your-api-key`',
    '3. Assign credential to all HTTP Request nodes',
  ].join('\n'), [X_START, Y_BASE - 280], 520, 260));

  const workflowName = agentName
    ? `${agentName} Workflow`
    : 'Multi-Agent Pipeline';
  return wrapWorkflow(workflowName, n8nNodes, connections);
}

// ─── Workflow Envelope ────────────────────────────────────────────────────────

function wrapWorkflow(name, nodes, connections) {
  return {
    name,
    nodes,
    connections,
    pinData: {},
    settings: {
      executionOrder: 'v1',
    },
    staticData: null,
    meta: {
      instanceId: uuid(),
    },
    tags: [],
    id: uuid(),
    versionId: uuid(),
  };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function generateAgentN8n({ cfg, agentName, agentType, agentMode, subAgents, flowGraph }) {
  if (agentMode === 'multiagent') {
    return generateMultiAgentWorkflow(cfg, agentName, subAgents || [], flowGraph);
  }
  return generateSingleAgentWorkflow(cfg, agentName, agentType);
}
