/*
  Workflow Canvas — React Flow based visual editor for n8n workflows.
  Supports drag-and-drop from palette, node connections, and node selection.
*/

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import N8nBaseNode from './nodes/N8nBaseNode';
import N8nTriggerNode from './nodes/N8nTriggerNode';
import N8nBranchNode from './nodes/N8nBranchNode';
import N8nToolSubNode from './nodes/N8nToolSubNode';
import N8nLmSubNode from './nodes/N8nLmSubNode';
import N8nAgentNode from './nodes/N8nAgentNode';
import AddNodeButton from './nodes/AddNodeButton';
import WorkflowNodePalette from './WorkflowNodePalette';
import WorkflowNodeConfig from './WorkflowNodeConfig';
import { N8N_NODE_REGISTRY, getNodeDefaults, getNodeDefinition } from '../../helpers/n8nNodeRegistry';
import { Trash2, Undo2, Redo2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ── Node type map for React Flow ─────────────────────────────────────────────

const nodeTypes = {
  n8nNode: N8nBaseNode,
  n8nTrigger: N8nTriggerNode,
  n8nBranch: N8nBranchNode,
  n8nToolSubNode: N8nToolSubNode,
  n8nLmSubNode: N8nLmSubNode,
  n8nAgentNode: N8nAgentNode,
  addNode: AddNodeButton,
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { strokeWidth: 2, stroke: 'hsl(var(--muted-foreground))' },
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'hsl(var(--muted-foreground))' },
};

// ── Helper: generate unique ID ───────────────────────────────────────────────

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Inner canvas (needs ReactFlowProvider context) ───────────────────────────

const MAX_HISTORY = 50;

function CanvasInner({ initialNodes, initialEdges, onChange, onSelectionChange, executionResults, deployInfo, readOnly = false }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [palettePinned, setPalettePinned] = useState(() => {
    try { return localStorage.getItem('workflow-palette-pinned') === 'true'; } catch { return false; }
  });

  const togglePin = useCallback(() => {
    setPalettePinned((prev) => {
      const next = !prev;
      try { localStorage.setItem('workflow-palette-pinned', String(next)); } catch {}
      return next;
    });
  }, []);
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  // ── Undo / Redo history ──────────────────────────────────────────────────
  const historyRef = useRef([{ nodes: JSON.parse(JSON.stringify(initialNodes)), edges: JSON.parse(JSON.stringify(initialEdges)) }]);
  const historyIndexRef = useRef(0);
  const isRestoringRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryButtons = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Snapshot current state into history (called after discrete actions only)
  const takeSnapshot = useCallback(() => {
    if (isRestoringRef.current) return;
    // Read latest state via setters to avoid stale closures
    setNodes((nds) => {
      setEdges((eds) => {
        const snap = { nodes: JSON.parse(JSON.stringify(nds)), edges: JSON.parse(JSON.stringify(eds)) };
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        historyRef.current.push(snap);
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
        historyIndexRef.current = historyRef.current.length - 1;
        syncHistoryButtons();
        return eds;
      });
      return nds;
    });
  }, [setNodes, setEdges, syncHistoryButtons]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isRestoringRef.current = true;
    historyIndexRef.current--;
    const { nodes: n, edges: e } = historyRef.current[historyIndexRef.current];
    const restoredN = JSON.parse(JSON.stringify(n));
    const restoredE = JSON.parse(JSON.stringify(e));
    setNodes(restoredN);
    setEdges(restoredE);
    if (onChange) onChange({ nodes: restoredN, edges: restoredE });
    syncHistoryButtons();
    requestAnimationFrame(() => { isRestoringRef.current = false; });
  }, [setNodes, setEdges, onChange, syncHistoryButtons]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isRestoringRef.current = true;
    historyIndexRef.current++;
    const { nodes: n, edges: e } = historyRef.current[historyIndexRef.current];
    const restoredN = JSON.parse(JSON.stringify(n));
    const restoredE = JSON.parse(JSON.stringify(e));
    setNodes(restoredN);
    setEdges(restoredE);
    if (onChange) onChange({ nodes: restoredN, edges: restoredE });
    syncHistoryButtons();
    requestAnimationFrame(() => { isRestoringRef.current = false; });
  }, [setNodes, setEdges, onChange, syncHistoryButtons]);

  // Notify parent of changes (no history push — only discrete actions push)
  const notifyParent = useCallback(
    (n, e) => { if (onChange) onChange({ nodes: n.filter((nd) => nd.id !== '__add_node__'), edges: e }); },
    [onChange],
  );

  // Connect handler. Typed ports (ai_tool, ai_languageModel) get tagged edges
  // so the n8n compiler emits them under connections.<source>.<type> rather
  // than the default main shape, and each style gets its own stroke.
  const onConnect = useCallback(
    (connection) => {
      const handleType = (() => {
        const s = connection.sourceHandle;
        const t = connection.targetHandle;
        if (s === 'ai_tool' || t === 'ai_tool') return 'ai_tool';
        if (s === 'ai_languageModel' || t === 'ai_languageModel') return 'ai_languageModel';
        return null;
      })();
      const decorated = handleType
        ? {
            ...connection,
            type: handleType,
            animated: false,
            style: {
              strokeWidth: 2,
              stroke: handleType === 'ai_tool' ? '#6366f1' : '#10b981',
              strokeDasharray: '5 5',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: handleType === 'ai_tool' ? '#6366f1' : '#10b981',
            },
          }
        : connection;
      setEdges((eds) => {
        const updated = addEdge(decorated, eds);
        setTimeout(() => {
          setNodes((nds) => { notifyParent(nds, updated); return nds; });
          takeSnapshot();
        }, 0);
        return updated;
      });
    },
    [setEdges, setNodes, notifyParent, takeSnapshot]
  );

  // Node click → select for config panel, auto-close palette unless pinned
  const onNodeClick = useCallback(
    (_, node) => {
      if (node.id === '__add_node__') return;
      setSelectedNodeId(node.id);
      if (onSelectionChange) onSelectionChange(node.id);
      if (!palettePinned) setPaletteOpen(false);
    },
    [onSelectionChange, palettePinned]
  );

  // Pane click → deselect
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    if (onSelectionChange) onSelectionChange(null);
  }, [onSelectionChange]);

  // Drag over handler
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Drop handler — add node from palette
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }

      const { registryKey } = data;
      const def = N8N_NODE_REGISTRY[registryKey];
      if (!def) return;

      // Prevent adding duplicate of the same trigger type
      if (def.canvasType === 'n8nTrigger') {
        const duplicate = nodes.some((n) => n.data?.registryKey === registryKey);
        if (duplicate) {
          toast.warning(`${def.label} trigger already exists in this workflow`);
          return;
        }
      }

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode = {
        id: uid(),
        type: def.canvasType,
        position,
        data: {
          label: def.label,
          registryKey,
          n8nType: def.n8nType,
          typeVersion: def.typeVersion,
          parameters: getNodeDefaults(registryKey),
          credentials: {},
          color: def.color,
          icon: def.icon,
          description: def.description,
          inputs: def.inputs,
          outputs: def.outputs,
          outputLabels: def.outputLabels,
        },
      };

      setNodes((nds) => {
        const updated = [...nds, newNode];
        setEdges((eds) => { notifyParent(updated, eds); return eds; });
        return updated;
      });
      setTimeout(() => takeSnapshot(), 0);

      setSelectedNodeId(newNode.id);
      if (onSelectionChange) onSelectionChange(newNode.id);
    },
    [screenToFlowPosition, setNodes, setEdges, notifyParent, takeSnapshot, onSelectionChange]
  );

  // Update node data from config panel
  const updateNodeData = useCallback(
    (nodeId, newData) => {
      setNodes((nds) => {
        const updated = nds.map((n) => {
          if (n.id !== nodeId) return n;
          return { ...n, data: { ...n.data, ...newData } };
        });
        setEdges((eds) => { notifyParent(updated, eds); return eds; });
        return updated;
      });
      setTimeout(() => takeSnapshot(), 0);
    },
    [setNodes, setEdges, notifyParent, takeSnapshot]
  );

  // Delete selected node
  const deleteNode = useCallback(
    (nodeId) => {
      setNodes((nds) => {
        const updated = nds.filter((n) => n.id !== nodeId);
        setEdges((eds) => {
          const filteredEdges = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
          notifyParent(updated, filteredEdges);
          return filteredEdges;
        });
        return updated;
      });
      setTimeout(() => takeSnapshot(), 0);
      setSelectedNodeId(null);
      if (onSelectionChange) onSelectionChange(null);
    },
    [setNodes, setEdges, notifyParent, takeSnapshot, onSelectionChange]
  );

  // Keyboard handler
  const onKeyDown = useCallback(
    (event) => {
      // Cmd+K — open palette and focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
        deleteNode(selectedNodeId);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if (((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) ||
        ((event.ctrlKey || event.metaKey) && event.key === 'y')) {
        event.preventDefault();
        redo();
      }
    },
    [selectedNodeId, deleteNode, undo, redo]
  );

  // Find selected node
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  // Node drag stop — snapshot after drag completes (not every pixel)
  const onNodeDragStop = useCallback(() => {
    setNodes((nds) => {
      setEdges((eds) => { notifyParent(nds, eds); return eds; });
      return nds;
    });
    setTimeout(() => takeSnapshot(), 0);
  }, [setNodes, setEdges, notifyParent, takeSnapshot]);

  // Pass-through node/edge changes to React Flow (no history push here)
  const onNodesChangeWrapped = useCallback(
    (changes) => {
      // Filter out changes targeting the virtual add-node button
      const filtered = changes.filter((c) => c.id !== '__add_node__');
      if (filtered.length > 0) onNodesChange(filtered);
    },
    [onNodesChange]
  );

  const onEdgesChangeWrapped = useCallback(
    (changes) => {
      const filtered = changes.filter((c) => c.id !== '__add_edge__');
      if (filtered.length > 0) onEdgesChange(filtered); else return;
      // Snapshot on edge removal (not just visual changes)
      const hasRemoval = changes.some((c) => c.type === 'remove');
      if (hasRemoval) {
        setTimeout(() => {
          setNodes((nds) => {
            setEdges((eds) => { notifyParent(nds, eds); return eds; });
            return nds;
          });
          takeSnapshot();
        }, 0);
      }
    },
    [onEdgesChange, setNodes, setEdges, notifyParent, takeSnapshot]
  );


  // Compute add-node button positioned after the rightmost node, with a connecting edge
  const { displayNodes, displayEdges } = useMemo(() => {
    if (readOnly || nodes.length === 0) return { displayNodes: nodes, displayEdges: edges };
    let rightmost = nodes[0];
    for (const n of nodes) {
      if (n.position.x > rightmost.position.x) rightmost = n;
    }
    const addNode = {
      id: '__add_node__',
      type: 'addNode',
      position: { x: rightmost.position.x + 300, y: rightmost.position.y + 15 },
      selectable: false,
      draggable: true,
      focusable: false,
      data: { onClick: () => setPaletteOpen(true) },
    };
    const addEdge = {
      id: '__add_edge__',
      source: rightmost.id,
      target: '__add_node__',
      type: 'smoothstep',
      animated: true,
      style: { strokeWidth: 2, stroke: 'hsl(var(--muted-foreground))' },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'hsl(var(--muted-foreground))' },
    };
    return {
      displayNodes: [...nodes, addNode],
      displayEdges: [...edges, addEdge],
    };
  }, [nodes, edges, readOnly]);

  return (
    <div className='flex h-full w-full' onKeyDown={readOnly ? undefined : onKeyDown} tabIndex={readOnly ? -1 : 0}>
      {/* Left: Node Palette — hidden in read-only */}
      {!readOnly && (
        <div
          className='shrink-0 h-full overflow-hidden transition-[width] duration-200 ease-in-out'
          style={{ width: paletteOpen ? 280 : 0 }}
        >
          {paletteOpen && (
            <div className='w-[280px] h-full'>
              <WorkflowNodePalette
              onCollapse={() => setPaletteOpen(false)}
              pinned={palettePinned}
              onTogglePin={togglePin}
            />
            </div>
          )}
        </div>
      )}

      {/* Center: Canvas */}
      <div className='flex-1 h-full' ref={reactFlowWrapper}>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={readOnly ? undefined : onNodesChangeWrapped}
          onEdgesChange={readOnly ? undefined : onEdgesChangeWrapped}
          onConnect={readOnly ? undefined : onConnect}
          onDrop={readOnly ? undefined : onDrop}
          onDragOver={readOnly ? undefined : onDragOver}
          onNodeClick={readOnly ? undefined : onNodeClick}
          onNodeDragStop={readOnly ? undefined : onNodeDragStop}
          onPaneClick={readOnly ? undefined : onPaneClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onInit={(instance) => { if (initialNodes.length > 0) instance.fitView({ padding: 0.3, maxZoom: 1 }); }}
          snapToGrid
          snapGrid={[15, 15]}
          deleteKeyCode={null}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          edgesUpdatable={!readOnly}
          elementsSelectable={!readOnly}
          style={{ backgroundColor: 'var(--workflow-canvas-bg)' }}
        >
          <Background gap={15} size={1} color='var(--workflow-grid)' />
          <Controls
            position='bottom-left'
            className='overflow-hidden'
            showInteractive={!readOnly}
          />
          <MiniMap
            position='bottom-right'
            nodeColor={(node) => node.data?.color || 'hsl(var(--muted-foreground))'}
            maskColor='hsl(var(--muted) / 0.6)'
          />
          {!readOnly && (
            <Panel position='top-left'>
              <div className='flex items-center gap-1'>
                {!paletteOpen && (
                  <Button variant='outline' size='icon' className='h-8 w-8' onClick={() => setPaletteOpen(true)} title='Show palette'>
                    <PanelLeftOpen size={14} />
                  </Button>
                )}
                <Button variant='outline' size='icon' className='h-8 w-8' onClick={undo} disabled={!canUndo} title='Undo (Ctrl+Z)'>
                  <Undo2 size={14} />
                </Button>
                <Button variant='outline' size='icon' className='h-8 w-8' onClick={redo} disabled={!canRedo} title='Redo (Ctrl+Shift+Z)'>
                  <Redo2 size={14} />
                </Button>
              </div>
            </Panel>
          )}
          {!readOnly && selectedNodeId && (
            <Panel position='top-right'>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='destructive'
                    size='sm'
                    className='h-8 text-xs gap-1.5'
                  >
                    <Trash2 size={12} />
                    Delete Node
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className='text-sm'>Delete node</AlertDialogTitle>
                    <AlertDialogDescription className='text-xs'>
                      Are you sure you want to delete this node? Connected edges will also be removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className='h-8 text-xs'>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className='h-8 text-xs bg-destructive hover:bg-destructive/90'
                      onClick={() => deleteNode(selectedNodeId)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Right: Config Panel — hidden in read-only */}
      {!readOnly && (
        <div
          className='shrink-0 h-full overflow-hidden border-l transition-[width] duration-300 ease-in-out'
          style={{ width: selectedNode ? 380 : 0, borderLeftWidth: selectedNode ? 1 : 0 }}
        >
          {selectedNode && (
            <div className='w-[380px] h-full'>
              <WorkflowNodeConfig
                selectedNode={selectedNode}
                onUpdate={updateNodeData}
                allNodes={nodes}
                edges={edges}
                lastExecutionData={executionResults}
                deployInfo={deployInfo}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Exported wrapper with provider ───────────────────────────────────────────

export default function WorkflowCanvas({ initialNodes = [], initialEdges = [], onChange, executionResults, deployInfo, readOnly = false }) {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <ReactFlowProvider>
      <CanvasInner
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onChange={onChange}
        onSelectionChange={setSelectedId}
        executionResults={executionResults}
        deployInfo={deployInfo}
        readOnly={readOnly}
      />
    </ReactFlowProvider>
  );
}
