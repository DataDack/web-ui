import React, { useState, useMemo, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  BrainCircuit,
  Users,
  User,
  MessageSquare,
  Wrench,
  Copy,
  Check,
  Upload,
  Play,
  Link,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StudioFormModal from './StudioFormModal';
import DeploymentPanel from '../../pages/Workflows/partials/DeploymentPanel';
import { workflowsApi } from '../../api/workflows';
import { automationPath } from '../../../runtime';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const columnHelper = createColumnHelper();

const TYPE_META = {
  conversational: {
    label: 'Conversational',
    icon: MessageSquare,
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  custom: {
    label: 'Custom',
    icon: Wrench,
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
};

const MODE_META = {
  multiagent: {
    label: 'Multi-Agent',
    icon: Users,
    className: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20',
  },
  single: {
    label: 'Single',
    icon: User,
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
};

function TypeBadge({ value, meta }) {
  const entry = meta[value];
  if (!entry) return <span className='text-muted-foreground text-xs'>{value || '—'}</span>;
  const Icon = entry.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${entry.className}`}
    >
      <Icon size={10} />
      {entry.label}
    </span>
  );
}

function TimestampCell({ value }) {
  if (!value) return <span className='text-muted-foreground text-xs'>—</span>;
  const date = new Date(value * 1000);
  return (
    <span className='text-xs text-muted-foreground' title={date.toLocaleString()}>
      {date.toLocaleDateString()}
    </span>
  );
}

function CopyIdCell({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className='inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-muted/40 px-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'
      title={value}
    >
      {copied ? <Check size={12} className='text-green-400 shrink-0' /> : <Copy size={12} className='shrink-0' />}
      <span className='text-xs font-medium'>{copied ? 'Copied' : 'Copy ID'}</span>
    </button>
  );
}

function CopyWebhookButton({ workflowId }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/api/v1/workflow/webhook/${workflowId}/v/default`;
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Webhook URL copied');
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className='flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/70 hover:bg-blue-500/10 hover:text-blue-500 transition-colors'
      title='Copy webhook URL'
    >
      {copied ? <Check size={15} className='text-emerald-500' /> : <Link size={15} />}
    </button>
  );
}

function SortIcon({ isSorted }) {
  if (isSorted === 'asc') return <ChevronUp size={13} className='ml-1 inline' />;
  if (isSorted === 'desc') return <ChevronDown size={13} className='ml-1 inline' />;
  return <ChevronsUpDown size={13} className='ml-1 inline opacity-30' />;
}

/**
 * StudioTable — reusable table for both AI Agents and Workflows.
 * Props:
 *   entityLabel  — "Agent" | "Workflow"
 *   queryKey     — TanStack Query key (string)
 *   data         — PageInfo object from API: { items, total, page, page_size }
 *   isLoading    — boolean
 *   api          — { create, update, delete } functions
 *   page         — current page number (controlled)
 *   onPageChange — (newPage) => void
 *   search       — current search string (controlled)
 *   onSearch     — (newSearch) => void
 */
export default function StudioTable({
  entityLabel,
  queryKey,
  data,
  isLoading,
  api,
  page,
  onPageChange,
  search,
  onSearch,
  hiddenColumns = [],
  onImport,
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sorting, setSorting] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [testTarget, setTestTarget] = useState(null); // workflow to test
  const [invoking, setInvoking] = useState(false);

  // Fetch deploy status for the test panel target
  const { data: testDeployInfo } = useQuery({
    queryKey: ['workflow-deploy-status', testTarget?.id],
    queryFn: () => workflowsApi.deployStatus(testTarget.id),
    enabled: !!testTarget?.id,
  });

  const handleInvoke = useCallback(async (payload) => {
    if (!testTarget?.id) return null;
    setInvoking(true);
    try {
      return await workflowsApi.invoke(testTarget.id, payload, { useLatest: true });
    } catch (err) {
      toast.error(`Invoke failed: ${err.message}`);
      return null;
    } finally {
      setInvoking(false);
    }
  }, [testTarget]);

  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(id),
    onSuccess: () => { toast.success(`${entityLabel} deleted`); invalidate(); },
    onError: (e) => toast.error(e.message),
    onSettled: () => setDeleteTarget(null),
  });

  const PAGE_SIZE = data?.page_size ?? 20;

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'sno',
        header: 'S.No.',
        cell: ({ row }) => (
          <span className='text-sm text-muted-foreground font-medium'>
            {(page - 1) * PAGE_SIZE + row.index + 1}
          </span>
        ),
        enableSorting: false,
        size: 60,
      }),
      columnHelper.accessor('id', {
        header: 'ID',
        cell: ({ getValue }) => <CopyIdCell value={getValue()} />,
        enableSorting: false,
        size: 110,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ getValue }) => (
          <span className='font-semibold text-sm text-foreground'>
            {getValue()}
          </span>
        ),
        size: 180,
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: ({ getValue }) => (
          <span
            className='text-sm text-muted-foreground line-clamp-1 max-w-[250px]'
            title={getValue()}
          >
            {getValue() || '—'}
          </span>
        ),
        enableSorting: false,
        size: 240,
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: ({ getValue }) => <TypeBadge value={getValue()} meta={TYPE_META} />,
        size: 130,
      }),
      columnHelper.accessor('deploy_status', {
        id: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue();
          if (status === 'deployed') {
            return (
              <span className='inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500'>
                <span className='w-1.5 h-1.5 rounded-full bg-emerald-400' />
                Deployed
              </span>
            );
          }
          if (status === 'deploying') {
            return (
              <span className='inline-flex items-center gap-1.5 text-xs font-medium text-amber-500'>
                <span className='w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse' />
                Deploying
              </span>
            );
          }
          if (status === 'failed') {
            return (
              <span className='inline-flex items-center gap-1.5 text-xs font-medium text-red-400'>
                <span className='w-1.5 h-1.5 rounded-full bg-red-400' />
                Failed
              </span>
            );
          }
          return (
            <span className='inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
              <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground/40' />
              Not deployed
            </span>
          );
        },
        size: 110,
      }),
      columnHelper.accessor('default_version_tag', {
        id: 'active_version',
        header: 'Live',
        cell: ({ getValue }) => {
          const tag = getValue();
          return (
            <span className='text-xs text-muted-foreground font-medium whitespace-nowrap'>
              {tag || '—'}
            </span>
          );
        },
        size: 80,
      }),
      columnHelper.accessor('latest_version_tag', {
        id: 'latest_version',
        header: 'Latest',
        cell: ({ getValue }) => {
          const tag = getValue();
          return (
            <span className='text-xs text-muted-foreground font-medium whitespace-nowrap'>
              {tag || '—'}
            </span>
          );
        },
        size: 80,
      }),
      columnHelper.accessor('agent_mode', {
        header: 'Mode',
        cell: ({ getValue }) => (
          <TypeBadge value={getValue() ?? 'single'} meta={MODE_META} />
        ),
        size: 120,
      }),
      columnHelper.accessor('created_at', {
        header: 'Created',
        cell: ({ getValue }) => <TimestampCell value={getValue()} />,
        size: 100,
      }),
      columnHelper.accessor('updated_at', {
        header: 'Updated',
        cell: ({ getValue }) => <TimestampCell value={getValue()} />,
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const item = row.original;
          const isDeployed = item.deploy_status === 'deployed';
          return (
            <div className='flex items-center justify-end gap-1'>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditRow(item); setViewOnly(false); setModalOpen(true);
                }}
                className='flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/70 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-colors'
                title='Edit'
              >
                <Pencil size={15} />
              </button>
              {queryKey === 'workflows' && isDeployed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTestTarget(item);
                  }}
                  className='flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/70 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors'
                  title='Test workflow'
                >
                  <Play size={15} />
                </button>
              )}
              {queryKey === 'workflows' && isDeployed && (item.trigger_types || []).includes('webhook') && (
                <CopyWebhookButton workflowId={item.id} />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(item);
                }}
                className='flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-colors'
                title='Delete'
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
        size: 160,
        enableSorting: false,
      }),
    ].filter((col) => !hiddenColumns.includes(col.id ?? col.accessorKey)),
    [deleteMutation, navigate, queryKey, page, PAGE_SIZE, hiddenColumns],
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  return (
    <div className='flex flex-col gap-5'>
      {/* Toolbar */}
      <div className='flex items-center justify-between gap-3'>
        <div className='relative flex-1 max-w-sm'>
          <Search
            size={15}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none'
          />
          <Input
            value={search}
            onChange={(e) => { onSearch(e.target.value); onPageChange(1); }}
            placeholder={`Search ${entityLabel.toLowerCase()}s…`}
            className='pl-9'
          />
        </div>
        <div className='flex items-center gap-2'>
          {onImport && (
            <>
              <input
                type='file'
                accept='.json'
                id='import-workflow-file'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const json = JSON.parse(ev.target.result);
                      onImport(json);
                    } catch {
                      toast.error('Invalid JSON file');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
              <Button
                variant='outline'
                onClick={() => document.getElementById('import-workflow-file')?.click()}
              >
                <Upload size={15} />
                Import
              </Button>
            </>
          )}
          <Button onClick={() => { setEditRow(null); setViewOnly(false); setModalOpen(true); }}>
            <Plus size={15} />
            New {entityLabel}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className='rounded-xl border border-border bg-card shadow-sm overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className='border-b border-border bg-muted/30'>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className='px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider'
                    >
                      {header.isPlaceholder ? null : (
                        <span
                          className={header.column.getCanSort() ? 'cursor-pointer select-none inline-flex items-center gap-1 hover:text-foreground transition-colors' : ''}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <SortIcon isSorted={header.column.getIsSorted()} />
                          )}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className='divide-y divide-border'>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className='py-20 text-center'>
                    <Loader2 size={22} className='mx-auto animate-spin text-[#D4AF37]' />
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className='py-20 text-center'>
                    <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                      <BrainCircuit size={36} strokeWidth={1.2} className='opacity-20' />
                      <span className='text-sm'>No {entityLabel.toLowerCase()}s yet</span>
                      <button
                        onClick={() => { setEditRow(null); setViewOnly(false); setModalOpen(true); }}
                        className='mt-1 text-xs text-[#D4AF37] hover:text-[#B8860B] underline-offset-2 hover:underline transition-colors'
                      >
                        Create your first {entityLabel.toLowerCase()}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => {
                      if (queryKey === 'agents') navigate(automationPath(`agents/${row.original.id}`));
                      else if (queryKey === 'workflows') navigate(automationPath(`workflows/${row.original.id}`));
                    }}
                    className='hover:bg-[#D4AF37]/[0.04] transition-colors cursor-pointer'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className='px-5 py-4 align-middle'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between text-sm text-muted-foreground px-1'>
          <span className='text-xs'>
            {data?.total} {entityLabel.toLowerCase()}s total
          </span>
          <div className='flex items-center gap-2'>
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className='rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            >
              Previous
            </button>
            <span className='px-2 text-xs font-medium'>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className='rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit / View modal */}
      {modalOpen && (
        <StudioFormModal
          entityLabel={entityLabel}
          queryKey={queryKey}
          initial={editRow}
          api={api}
          readOnly={viewOnly}
          onClose={() => { setModalOpen(false); setEditRow(null); setViewOnly(false); }}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent className='bg-background rounded-lg p-6 max-w-sm'>
          <DialogHeader>
            <DialogTitle>Delete {entityLabel}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='mt-4 gap-2'>
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
              className='rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className='inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed'
            >
              {deleteMutation.isPending && <Loader2 size={14} className='animate-spin' />}
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test workflow panel */}
      {queryKey === 'workflows' && (
        <DeploymentPanel
          open={!!testTarget}
          deployInfo={testDeployInfo}
          onInvoke={handleInvoke}
          invoking={invoking}
          onClose={() => setTestTarget(null)}
        />
      )}
    </div>
  );
}
