/*
  WorkflowStudio — Full-page n8n workflow editor.
  Fetches workflow data, renders the visual canvas, and handles save/export/deploy.
*/

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { Button } from "@datadack/common-ui"
import { workflowsApi } from '../../api/workflows';
import { automationPath } from '../../../runtime';
import { useWebSocket } from '../../hooks/useWebSocket';
import WorkflowCanvas from '../../components/workflows/WorkflowCanvas';
import StudioToolbar from './partials/StudioToolbar';
import DeploymentPanel from './partials/DeploymentPanel';
import ExecutionLogsPanel from './partials/ExecutionLogsPanel';
import VersionHistoryPanel from './partials/VersionHistoryPanel';
import {
  generateWorkflowN8n,
  validateWorkflow,
  downloadWorkflowJson,
  collectWorkflowDependencies,
} from '../../helpers/generateWorkflowN8n';
import { flushPendingTriggerSaves } from '../../helpers/triggerSaveRegistry';

export default function WorkflowStudio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [wcu, setWcu] = useState(1);
  const [timeout, setTimeout] = useState(900);
  const [dirty, setDirty] = useState(false);
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const [logsPanelOpen, setLogsPanelOpen] = useState(false);
  const [versionsPanelOpen, setVersionsPanelOpen] = useState(false);
  const [executionResults, setExecutionResults] = useState(null);
  // Tracks the full deploy flow (save → deploy-mutation) so the Deploy button
  // stays disabled during the save phase too. deployMutation.isPending only
  // covers the HTTP request itself, leaving a window where a second click
  // could re-trigger saveAndWait + deployMutation and queue a duplicate.
  const [deployInFlight, setDeployInFlight] = useState(false);
  const canvasStateRef = useRef({ nodes: [], edges: [] });

  // Fetch workflow data
  const {
    data: workflow,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowsApi.get(id),
    enabled: !!id,
  });

  // Fetch deploy status (initial load only, updates come via WebSocket)
  const { data: deployInfo, refetch: refetchDeploy } = useQuery({
    queryKey: ['workflow-deploy-status', id],
    queryFn: () => workflowsApi.deployStatus(id),
    enabled: !!id,
  });

  // Real-time deploy status updates via WebSocket
  useWebSocket(
    id ? `deploy-status:${id}` : null,
    useCallback(
      (payload) => {
        queryClient.setQueryData(['workflow-deploy-status', id], (old) => ({
          ...old,
          ...payload,
        }));
      },
      [id, queryClient],
    ),
    { enabled: !!id },
  );

  // Initialize state from fetched data
  useEffect(() => {
    if (workflow) {
      setName(workflow.name || '');
      setDescription(workflow.description || '');
      setWcu(workflow.wcu || 1);
      setTimeout(workflow.timeout || 900);
      if (workflow.canvas_data) {
        try {
          const parsed = JSON.parse(workflow.canvas_data);
          canvasStateRef.current = {
            nodes: parsed.nodes || [],
            edges: parsed.edges || [],
          };
        } catch {
          canvasStateRef.current = { nodes: [], edges: [] };
        }
      }
    }
  }, [workflow]);

  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: (data) => workflowsApi.deploy(id, data),
    onSuccess: (result) => {
      // A deploy can succeed and still be worth reading about: a node with no
      // renderer, a credential value nothing supplies, a package the platform
      // has no copy of. Saying only "deployed" sends the author away confident
      // in a workflow whose first run will fail. The detail is in the
      // deployment panel; this points at it.
      const warnings = result?.warnings?.length ?? 0;
      if (warnings > 0) {
        toast.warn(
          `Deployed with ${warnings} ${warnings === 1 ? 'warning' : 'warnings'} — open Test Workflow for details`,
        );
      } else {
        toast.success('Workflow deployed successfully');
      }
      refetchDeploy();
    },
    onError: (err) => {
      toast.error(`Deploy failed: ${err.message}`);
      refetchDeploy();
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data) => workflowsApi.update(id, data),
    onSuccess: (data) => {
      if (data?.lambda_error) {
        toast.error(data.lambda_error);
      } else if (data?.lambda_created) {
        toast.success('Workflow saved & deployed');
      } else if (data?.lambda_updating) {
        toast.success('Workflow saved & updated');
      } else {
        toast.success('Workflow saved');
      }
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      refetchDeploy();
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  // Undeploy mutation
  const undeployMutation = useMutation({
    mutationFn: () => workflowsApi.undeploy(id),
    onSuccess: () => {
      toast.success('Workflow undeployed');
      refetchDeploy();
    },
    onError: (err) => toast.error(`Undeploy failed: ${err.message}`),
  });


  // Canvas change handler
  const onCanvasChange = useCallback(({ nodes, edges }) => {
    canvasStateRef.current = { nodes, edges };
    setDirty(true);
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    const { nodes, edges } = canvasStateRef.current;

    const n8nJson = generateWorkflowN8n({ nodes, edges, workflowName: name });
    const dependencies = collectWorkflowDependencies(nodes);
    const canvasData = JSON.stringify({
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    try {
      await saveMutation.mutateAsync({
        name,
        description,
        canvas_data: canvasData,
        n8n_json: JSON.stringify(n8nJson),
        metadata: JSON.stringify({ dependencies }),
        wcu,
        timeout,
      });
    } catch {
      return;
    }
    // Register pending app-trigger webhook setups now that the workflow is
    // persisted. Each trigger panel toasts its own failure.
    if (id) await flushPendingTriggerSaves(id);
  }, [name, description, wcu, timeout, saveMutation, id]);

  // Collect credential IDs from canvas nodes
  const collectCredentialIds = useCallback(() => {
    const { nodes } = canvasStateRef.current;
    const credIds = new Set();
    for (const node of nodes) {
      const creds = node.data?.credentials;
      if (creds) {
        for (const credRef of Object.values(creds)) {
          if (credRef?.id) credIds.add(credRef.id);
        }
      }
    }
    return [...credIds];
  }, []);

  // Single-call deploy: the backend's POST /workflow/:id/deploy now accepts
  // the full save payload and does save + bundle + publish + alias update in
  // one request. deployInFlight guards against double-clicks.
  const runDeploy = useCallback(async ({ description: versionDescription, version }) => {
    if (deployInFlight) return;
    setDeployInFlight(true);
    try {
      const { nodes, edges } = canvasStateRef.current;
      const n8nJson = generateWorkflowN8n({ nodes, edges, workflowName: name });
      const dependencies = collectWorkflowDependencies(nodes);
      const canvasData = JSON.stringify({ nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } });

      try {
        await deployMutation.mutateAsync({
          name,
          description,
          canvas_data: canvasData,
          n8n_json: JSON.stringify(n8nJson),
          metadata: JSON.stringify({ dependencies }),
          wcu,
          timeout,
          credential_ids: collectCredentialIds(),
          version_tag: version,
          version_description: versionDescription || '',
        });
      } catch {
        return;
      }
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      if (id) await flushPendingTriggerSaves(id);
    } finally {
      setDeployInFlight(false);
    }
  }, [deployInFlight, deployMutation, collectCredentialIds, name, description, wcu, timeout, id, queryClient]);

  const handleDeploy = runDeploy;
  const handleRedeploy = runDeploy;

  // Invoke mutation
  const invokeMutation = useMutation({
    mutationFn: (payload) => workflowsApi.invoke(id, payload, { useLatest: true }),
    onError: (err) => toast.error(`Invoke failed: ${err.message}`),
  });

  const handleInvoke = useCallback(async (payload) => {
    try {
      const resp = await invokeMutation.mutateAsync(payload);
      // Store per-node results for the Input Data panel
      // The response body contains { results: { "NodeName": [...] } }
      const bodyResults = resp?.body?.results || resp?.body?.body?.results;
      if (bodyResults) {
        // Map node names back to node IDs for the config panel
        const { nodes } = canvasStateRef.current;
        const resultsByNodeId = {};
        for (const [nodeName, output] of Object.entries(bodyResults)) {
          const node = nodes.find((n) => n.data?.label === nodeName);
          if (node) {
            // output is usually [{json: {...}}] — extract the json from first item
            const firstItem = Array.isArray(output) ? output[0]?.json : output;
            resultsByNodeId[node.id] = firstItem || output;
          }
        }
        setExecutionResults(resultsByNodeId);
      }
      return resp;
    } catch {
      return null;
    }
  }, [invokeMutation]);

  // Export as n8n JSON
  const handleExport = useCallback(() => {
    const { nodes, edges } = canvasStateRef.current;

    const errors = validateWorkflow(nodes, edges);
    if (errors.length > 0) {
      toast.warn(`Workflow warnings:\n${errors.join('\n')}`);
    }

    const n8nJson = generateWorkflowN8n({ nodes, edges, workflowName: name });
    const fileName = `${name || 'workflow'}.json`;
    downloadWorkflowJson(n8nJson, fileName);
    toast.success('Workflow JSON downloaded');
  }, [name]);


  // Parse initial canvas data
  const initialCanvasData = (() => {
    if (!workflow?.canvas_data) return { nodes: [], edges: [] };
    try {
      const parsed = JSON.parse(workflow.canvas_data);
      return { nodes: parsed.nodes || [], edges: parsed.edges || [] };
    } catch {
      return { nodes: [], edges: [] };
    }
  })();

  const currentDeployStatus = deployInfo?.deploy_status || workflow?.deploy_status || 'undeployed';
  const isDeploying = deployInFlight || deployMutation.isPending || currentDeployStatus === 'deploying';

  // Test button is only useful when the workflow has a Manual Trigger — otherwise
  // there's nothing to "test" (non-manual triggers fire via their own webhooks).
  const hasManualTrigger = (initialCanvasData.nodes || []).some((n) => {
    const d = n.data || {};
    return d.registryKey === 'manualTrigger' || d.n8nType === 'n8n-nodes-base.manualTrigger';
  });


  // Loading state
  if (isLoading) {
    return (
      <div className='h-screen flex items-center justify-center'>
        <Loader2 size={24} className='animate-spin text-primary' />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className='h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground'>
        <p>Failed to load workflow</p>
        <Button variant='outline' size='sm' onClick={() => navigate(automationPath('workflows'))}>
          Back to Workflows
        </Button>
      </div>
    );
  }

  return (
    <div className='h-screen flex flex-col bg-background relative'>
      {/* Toolbar */}
      <StudioToolbar
        name={name}
        onNameChange={(v) => { setName(v); setDirty(true); }}
        description={description}
        onDescriptionChange={(v) => { setDescription(v); setDirty(true); }}
        wcu={wcu}
        onWcuChange={(v) => { setWcu(v); setDirty(true); }}
        timeout={timeout}
        onTimeoutChange={(v) => { setTimeout(v); setDirty(true); }}
        dirty={dirty}
        saving={saveMutation.isPending}
        onSave={handleSave}
        onExport={handleExport}
        onBack={() => navigate(automationPath('workflows'))}
        deployStatus={currentDeployStatus}
        deploying={isDeploying}
        deployInfo={deployInfo}
        onDeploy={handleDeploy}
        onRedeploy={handleRedeploy}
        onOpenTestPanel={() => { setTestPanelOpen(true); setLogsPanelOpen(false); setVersionsPanelOpen(false); }}
        onOpenLogsPanel={() => { setLogsPanelOpen(true); setTestPanelOpen(false); setVersionsPanelOpen(false); }}
        onOpenVersionsPanel={() => { setVersionsPanelOpen(true); setTestPanelOpen(false); setLogsPanelOpen(false); }}
        hasManualTrigger={hasManualTrigger}
      />

      {/* Canvas */}
      <div className='flex-1 overflow-hidden'>
        {workflow && (
          <WorkflowCanvas
            key={workflow.id}
            initialNodes={initialCanvasData.nodes}
            initialEdges={initialCanvasData.edges}
            onChange={onCanvasChange}
            executionResults={executionResults}
            deployInfo={deployInfo}
          />
        )}
      </div>

      {/* Test/Invoke panel */}
      <DeploymentPanel
        open={testPanelOpen}
        deployInfo={deployInfo}
        onInvoke={handleInvoke}
        invoking={invokeMutation.isPending}
        onClose={() => setTestPanelOpen(false)}
      />

      {/* Execution Logs panel */}
      <ExecutionLogsPanel
        workflowId={id}
        open={logsPanelOpen}
        onClose={() => setLogsPanelOpen(false)}
      />

      {/* Version History panel */}
      <VersionHistoryPanel
        workflowId={id}
        deployInfo={deployInfo}
        open={versionsPanelOpen}
        onClose={() => setVersionsPanelOpen(false)}
      />

    </div>
  );
}
