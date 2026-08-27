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

import React, { useState, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BrainCircuit } from 'lucide-react';
import { agentsApi } from '../../api/agents';
import StudioTable from '../../components/agents/StudioTable';
import { StatusContext } from '../../context/Status';
import { useTranslation } from 'react-i18next';
import FeatureGate from '../../components/FeatureGate';

const PAGE_SIZE = 20;

export default function AIAgents() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);

  const maintenanceConfig = useMemo(() => {
    try {
      const raw = statusState?.status?.maintenance_mode;
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }, [statusState?.status?.maintenance_mode]);

  const featureStatus = maintenanceConfig.agents === true ? 'maintenance' : (maintenanceConfig.agents || 'off');

  const { data, isLoading } = useQuery({
    queryKey: ['agents', page, search],
    queryFn: () => agentsApi.list({ page, pageSize: PAGE_SIZE, keyword: search }),
    keepPreviousData: true,
    enabled: featureStatus === 'off',
  });

  if (featureStatus !== 'off') {
    return (
      <FeatureGate
        feature='agents'
        featureLabel={t('AI Agents')}
        status={featureStatus}
        maintenanceConfig={maintenanceConfig}
      />
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Page header */}
      <div className='flex items-center gap-3'>
        <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20'>
          <BrainCircuit size={18} className='text-[#D4AF37]' />
        </div>
        <div>
          <h1 className='text-lg font-semibold leading-tight'>AI Agents</h1>
          <p className='text-xs text-muted-foreground'>
            Build and manage intelligent agents that reason and execute tasks
          </p>
        </div>
      </div>

      <StudioTable
        entityLabel='Agent'
        queryKey='agents'
        data={data}
        isLoading={isLoading}
        api={agentsApi}
        page={page}
        onPageChange={setPage}
        search={search}
        onSearch={setSearch}
        hiddenColumns={['status', 'version', 'active_version', 'latest_version']}
      />
    </div>
  );
}
