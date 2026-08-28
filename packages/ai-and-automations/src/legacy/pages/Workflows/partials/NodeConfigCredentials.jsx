/*
  NodeConfigCredentials — Credential management section for the node config panel.
  Shows a select dropdown per credential type with New / Edit / Delete actions.
  Opens CredentialSheet for create/edit operations.
*/

import React, { useState, useCallback, useEffect, useContext } from 'react';
import { Plus, Pencil, Trash2, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { credentialsApi } from '../../../api/workflowCredentials';
import { getCredentialSchema } from './credentialSchemas';
import CredentialSheet from './CredentialSheet';
import AccountSelector from './AccountSelector';
import { UserContext } from '../../../context/User';

// Map n8n credential types to the Connected Account provider.
// When a node requests one of these credential types, show the AccountSelector
// instead of the traditional credential form.
// Exported so other components (e.g. DynamicSelectField) can surface a
// matching "Reconnect <provider>" action when the OAuth token is revoked.
export const CREDENTIAL_TYPE_TO_ACCOUNT_PROVIDER = {
  // GitHub
  githubApi: 'github',
  githubOAuth2Api: 'github',
  // Google
  googleApi: 'google',
  googleSheetsOAuth2Api: 'google',
  googleDriveOAuth2Api: 'google',
  googleCalendarOAuth2Api: 'google',
  gmailOAuth2: 'google',
  googleCloudStorageOAuth2Api: 'google',
  // Microsoft
  microsoftOAuth2Api: 'microsoft',
  microsoftOutlookOAuth2Api: 'microsoft',
  microsoftTeamsOAuth2Api: 'microsoft',
  microsoftOneDriveOAuth2Api: 'microsoft',
  microsoftExcelOAuth2Api: 'microsoft',
  // Jira
  jiraSoftwareCloudApi: 'jira',
  jiraSoftwareServerApi: 'jira',
};

export default function NodeConfigCredentials({ credentialTypes, credentials, onChange }) {
  const [userState] = useContext(UserContext);
  const userId = userState?.user?.id;
  const [savedCreds, setSavedCreds] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCredType, setSheetCredType] = useState(null);
  const [sheetEditCred, setSheetEditCred] = useState(null);

  const loadCreds = useCallback(async () => {
    setLoading(true);
    try {
      const all = await credentialsApi.list();
      // Guard the shape, not just the null: a non-array here reaches the
      // render as savedCreds.filter and takes the whole studio down.
      setSavedCreds(Array.isArray(all) ? all : []);
    } catch (e) {
      console.error('Failed to load credentials:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCreds(); }, [loadCreds]);

  const openCreateSheet = useCallback((credType) => {
    setSheetCredType(credType);
    setSheetEditCred(null);
    setSheetOpen(true);
  }, []);

  const openEditSheet = useCallback(async (credType, credId) => {
    try {
      const cred = await credentialsApi.get(credId);
      setSheetCredType(credType);
      setSheetEditCred(cred);
      setSheetOpen(true);
    } catch (e) {
      console.error('Failed to fetch credential:', e);
    }
  }, []);

  const handleSaved = useCallback((result) => {
    // Update the node's credential reference
    if (sheetCredType && result) {
      onChange({
        ...credentials,
        [sheetCredType]: { id: result.id, name: result.name },
      });
    }
    loadCreds();
  }, [sheetCredType, credentials, onChange, loadCreds]);

  const handleDelete = useCallback(async (credType, credId) => {
    try {
      await credentialsApi.delete(credId);
      const current = credentials[credType];
      if (current?.id === credId) {
        onChange({ ...credentials, [credType]: { id: '', name: '' } });
      }
      await loadCreds();
    } catch (e) {
      console.error('Failed to delete credential:', e);
    }
  }, [credentials, onChange, loadCreds]);

  if (!credentialTypes || credentialTypes.length === 0) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className='space-y-3'>
        {credentialTypes.map((credType) => {
          const selected = credentials[credType] || { id: '', name: '' };
          const typeCreds = savedCreds.filter((c) => c.type === credType);
          const schema = getCredentialSchema(credType);
          const typeLabel = schema?.label || credType;

          // Connected Account-based OAuth providers — show account picker
          const accountProvider = CREDENTIAL_TYPE_TO_ACCOUNT_PROVIDER[credType];
          if (accountProvider) {
            return (
              <AccountSelector
                key={credType}
                provider={accountProvider}
                userId={userId}
                value={selected.id || ''}
                label={typeLabel}
                onChange={(accountId) => {
                  onChange({
                    ...credentials,
                    [credType]: accountId ? { id: accountId, name: typeLabel, account: true } : { id: '', name: '' },
                  });
                }}
              />
            );
          }

          return (
            <div key={credType} className='space-y-1.5'>
              <Label className='text-[11px] font-medium flex items-center gap-1.5'>
                <Key size={10} className='text-primary' />
                {typeLabel}
              </Label>

              <div className='flex items-center gap-1'>
                {/* Credential select */}
                <div className='flex-1'>
                  <Select
                    value={selected.id || '_none'}
                    onValueChange={(v) => {
                      if (v === '_none') {
                        onChange({ ...credentials, [credType]: { id: '', name: '' } });
                        return;
                      }
                      const cred = savedCreds.find((c) => c.id === v);
                      onChange({
                        ...credentials,
                        [credType]: cred ? { id: cred.id, name: cred.name } : { id: '', name: '' },
                      });
                    }}
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue placeholder='Select credential...' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='_none' className='text-xs text-muted-foreground'>
                        Select credential...
                      </SelectItem>
                      {typeCreds.map((c) => (
                        <SelectItem key={c.id} value={c.id} className='text-xs'>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Edit button */}
                {selected.id && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='outline'
                        size='icon'
                        className='h-8 w-8 shrink-0'
                        onClick={() => openEditSheet(credType, selected.id)}
                      >
                        <Pencil size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side='top' className='text-xs'>
                      Edit credential
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Delete button */}
                {selected.id && (
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:border-destructive/30'
                          >
                            <Trash2 size={12} />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent side='top' className='text-xs'>
                        Delete credential
                      </TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className='text-sm'>Delete credential</AlertDialogTitle>
                        <AlertDialogDescription className='text-xs'>
                          Are you sure you want to delete "{selected.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className='h-8 text-xs'>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className='h-8 text-xs bg-destructive hover:bg-destructive/90'
                          onClick={() => handleDelete(credType, selected.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* New button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      size='icon'
                      className='h-8 w-8 shrink-0 text-primary border-primary/30 hover:bg-primary/10'
                      onClick={() => openCreateSheet(credType)}
                    >
                      <Plus size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='text-xs'>
                    New credential
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <Loader2 size={10} className='animate-spin' />
            Loading credentials...
          </div>
        )}
      </div>

      {/* Credential Sheet */}
      <CredentialSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        credType={sheetCredType}
        editCredential={sheetEditCred}
        onSaved={handleSaved}
      />
    </TooltipProvider>
  );
}
