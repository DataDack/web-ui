/*
  Canvas State → n8n Workflow JSON Generator
  Converts React Flow nodes/edges into a valid n8n-compatible workflow JSON
  that can be imported directly into any n8n instance.
*/

import { N8N_NODE_REGISTRY, findRegistryKeyByN8nType } from './n8nNodeRegistry';

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
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

/**
 * Expand dot-notation keys in a flat parameters object into a nested object.
 * e.g. { 'rule.interval.0.field': 'minutes' } → { rule: { interval: [{ field: 'minutes' }] } }
 */
function expandParameters(flat) {
  const result = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value === undefined || value === null || value === '') continue;
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const isNextIndex = /^\d+$/.test(nextPart);
      if (!(part in current)) {
        current[part] = isNextIndex ? [] : {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

/**
 * Build n8n parameters from canvas node data.
 * The registry may store params with dot-notation keys; we expand them into
 * the nested structure n8n expects.
 */
function buildNodeParameters(data) {
  const registryKey = data.registryKey;
  const def = registryKey ? N8N_NODE_REGISTRY[registryKey] : null;
  const params = data.parameters || (def ? { ...def.defaults } : {});

  // Check if any keys use dot-notation
  const hasDotKeys = Object.keys(params).some((k) => k.includes('.'));
  if (hasDotKeys) {
    return expandParameters(params);
  }
  return { ...params };
}

/**
 * Convert React Flow canvas state to n8n workflow JSON.
 *
 * @param {Object} options
 * @param {Array} options.nodes - React Flow nodes array
 * @param {Array} options.edges - React Flow edges array
 * @param {string} options.workflowName - Name for the workflow
 * @param {Object} [options.settings] - Optional n8n workflow settings
 * @returns {Object} n8n-compatible workflow JSON
 */
export function generateWorkflowN8n({ nodes, edges, workflowName, settings = {} }) {
  const existingNames = new Set();
  const nodeIdToName = {};

  // Pass 1: assign unique names to each node
  for (const node of nodes) {
    const label = node.data?.label || 'Unnamed';
    const uniqueName = makeNodeName(label, existingNames);
    nodeIdToName[node.id] = uniqueName;
  }

  // Pass 2: build n8n nodes array
  const n8nNodes = nodes.map((node) => {
    const data = node.data || {};
    const name = nodeIdToName[node.id];
    const registryKey = data.registryKey;
    const def = registryKey ? N8N_NODE_REGISTRY[registryKey] : null;

    const n8nNode = {
      parameters: buildNodeParameters(data),
      id: node.id,
      name,
      type: data.n8nType || (def ? def.n8nType : 'n8n-nodes-base.noOp'),
      typeVersion: data.typeVersion || (def ? def.typeVersion : 1),
      position: [Math.round(node.position?.x || 0), Math.round(node.position?.y || 0)],
    };

    // Add credentials if present
    if (data.credentials && Object.keys(data.credentials).length > 0) {
      n8nNode.credentials = data.credentials;
    }

    return n8nNode;
  });

  // Pass 3: build connections from edges
  const connections = {};

  for (const edge of edges) {
    const sourceName = nodeIdToName[edge.source];
    const targetName = nodeIdToName[edge.target];
    if (!sourceName || !targetName) continue;

    // Connection type: 'main' by default. Typed langchain ports (ai_tool,
    // ai_languageModel) get their own connection group. We key off edge.type
    // (set by the canvas when dragging from a typed port). n8n expects the
    // same string on both the outer key and the per-target entry.
    let connType = 'main';
    if (edge.type === 'ai_tool') connType = 'ai_tool';
    else if (edge.type === 'ai_languageModel') connType = 'ai_languageModel';

    // Determine output index from sourceHandle (e.g. 'output_0' → 0, 'output_1' → 1)
    let outputIndex = 0;
    if (edge.sourceHandle) {
      const match = edge.sourceHandle.match(/output_(\d+)/);
      if (match) outputIndex = parseInt(match[1], 10);
    }

    // Determine target input index from targetHandle
    let targetIndex = 0;
    if (edge.targetHandle) {
      const match = edge.targetHandle.match(/input_(\d+)/);
      if (match) targetIndex = parseInt(match[1], 10);
    }

    if (!connections[sourceName]) {
      connections[sourceName] = {};
    }
    if (!connections[sourceName][connType]) {
      connections[sourceName][connType] = [];
    }

    // Ensure the array has enough slots for the output index
    while (connections[sourceName][connType].length <= outputIndex) {
      connections[sourceName][connType].push([]);
    }

    connections[sourceName][connType][outputIndex].push({
      node: targetName,
      type: connType,
      index: targetIndex,
    });
  }

  return {
    name: workflowName || 'Untitled Workflow',
    nodes: n8nNodes,
    connections,
    pinData: {},
    settings: {
      executionOrder: 'v1',
      ...settings,
    },
    staticData: null,
    meta: {
      instanceId: uuid(),
    },
    tags: [],
  };
}

/**
 * Validate canvas state before n8n export.
 * Returns an array of error strings (empty if valid).
 */
export function validateWorkflow(nodes, edges) {
  const errors = [];

  if (nodes.length === 0) {
    errors.push('Workflow has no nodes');
    return errors;
  }

  // Check for duplicate labels
  const labels = nodes.map((n) => n.data?.label || 'Unnamed');
  const seen = new Set();
  for (const label of labels) {
    if (seen.has(label)) {
      // Not a hard error — generateWorkflowN8n handles this by renaming
    }
    seen.add(label);
  }

  // Check for at least one trigger node
  const hasTrigger = nodes.some((n) => n.type === 'n8nTrigger');
  if (!hasTrigger) {
    errors.push('Workflow should have at least one trigger node');
  }

  // Check for disconnected nodes (no incoming or outgoing edges, except triggers)
  const connectedIds = new Set();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }
  for (const node of nodes) {
    if (node.type === 'n8nTrigger') continue;
    if (!connectedIds.has(node.id)) {
      errors.push(`Node "${node.data?.label || node.id}" is not connected to any other node`);
    }
  }

  return errors;
}

/**
 * Download workflow as n8n JSON file.
 */
/**
 * Collect npm dependencies required by all nodes on the canvas.
 * Returns a merged { packageName: version } map.
 */
export function collectWorkflowDependencies(nodes) {
  const deps = {};
  for (const node of nodes) {
    const registryKey = node.data?.registryKey;
    if (!registryKey) continue;
    const def = N8N_NODE_REGISTRY[registryKey];
    if (def?.dependencies) {
      Object.assign(deps, def.dependencies);
    }
  }
  return deps;
}

/**
 * Convert n8n workflow JSON (nodes + connections) into React Flow canvas format.
 * Returns { nodes, edges } suitable for canvas_data.
 */
export function n8nJsonToCanvasData(n8nJson) {
  const n8nNodes = n8nJson.nodes || [];
  const n8nConnections = n8nJson.connections || {};

  // Map n8n node name → node id
  const nameToId = {};

  // Convert nodes
  const nodes = n8nNodes.map((n8nNode) => {
    const registryKey = findRegistryKeyByN8nType(n8nNode.type);
    const def = registryKey ? N8N_NODE_REGISTRY[registryKey] : null;

    const id = n8nNode.id || uuid();
    nameToId[n8nNode.name] = id;

    return {
      id,
      type: def?.canvasType || 'n8nNode',
      position: {
        x: n8nNode.position?.[0] ?? 0,
        y: n8nNode.position?.[1] ?? 0,
      },
      data: {
        label: n8nNode.name,
        registryKey: registryKey || n8nNode.type,
        n8nType: n8nNode.type,
        typeVersion: n8nNode.typeVersion || 1,
        parameters: flattenParameters(n8nNode.parameters || {}),
        credentials: n8nNode.credentials || {},
        color: def?.color || '#666',
        icon: def?.icon || 'Box',
        description: def?.description || '',
        inputs: def?.inputs || ['main'],
        outputs: def?.outputs || ['main'],
        outputLabels: def?.outputLabels,
      },
    };
  });

  // Convert connections to edges. n8n groups connections by type (main,
  // ai_tool, ai_languageModel, ...). Main edges use the numeric input/output
  // handles on base nodes; typed edges use the matching literal handle ID on
  // the sub-node and agent renderers.
  const edges = [];
  const TYPED_CONN_TYPES = new Set(['ai_tool', 'ai_languageModel']);

  for (const [sourceName, conn] of Object.entries(n8nConnections)) {
    const sourceId = nameToId[sourceName];
    if (!sourceId) continue;

    for (const [connType, groups] of Object.entries(conn)) {
      if (!Array.isArray(groups)) continue;
      const isTyped = TYPED_CONN_TYPES.has(connType);

      groups.forEach((targets, outputIndex) => {
        if (!Array.isArray(targets)) return;
        targets.forEach((target) => {
          const targetId = nameToId[target.node];
          if (!targetId) return;
          edges.push({
            id: `e-${sourceId}-${connType}-${outputIndex}-${targetId}-${target.index || 0}`,
            source: sourceId,
            target: targetId,
            sourceHandle: isTyped ? connType : `output_${outputIndex}`,
            targetHandle: isTyped ? connType : `input_${target.index || 0}`,
            type: isTyped ? connType : 'smoothstep',
            animated: !isTyped,
          });
        });
      });
    }
  }

  return { nodes, edges };
}

/**
 * Flatten nested n8n parameters into dot-notation keys for our flat parameter store.
 */
function flattenParameters(params, prefix = '') {
  const result = {};
  for (const [key, val] of Object.entries(params)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val != null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenParameters(val, fullKey));
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

export function downloadWorkflowJson(n8nJson, fileName) {
  const blob = new Blob([JSON.stringify(n8nJson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'workflow.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
