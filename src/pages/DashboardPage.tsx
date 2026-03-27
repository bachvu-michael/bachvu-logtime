import { useEffect, useState, useCallback } from 'react';
import { Alert, Spin, Select, Empty } from 'antd';
import { LogEntry } from '../types';
import { fetchLogs, fetchMonths } from '../api/logs';
import { DashboardSummary } from '../components/dashboard/DashboardSummary';
import { TimePerTicketChart } from '../components/dashboard/TimePerTicketChart';
import { TimePerTicketTreeMap } from '../components/dashboard/TimePerTicketTreeMap';
import { TimePerDayChart } from '../components/dashboard/TimePerDayChart';
import { toTimePerTicket } from '../utils/chartDataTransformers';

export function DashboardPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (month?: string) => {
    try {
      setError('');
      setLoading(true);
      const [data, availableMonths] = await Promise.all([
        fetchLogs(month),
        fetchMonths(),
      ]);
      setLogs(data);
      setMonths(availableMonths);
    } catch {
      setError('Cannot connect to server. Make sure the server is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(selectedMonth); }, [load, selectedMonth]);

  return (
    <div className="page-content page-content--wide" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your logged time</p>
        </div>
        <Select
          allowClear
          placeholder="All months"
          style={{ width: 170 }}
          value={selectedMonth}
          onChange={v => setSelectedMonth(v)}
          options={months.map(m => ({ value: m, label: m }))}
        />
      </div>

      {error && <Alert type="error" description={error} showIcon style={{ borderRadius: 10 }} />}

      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', padding: 80 }} />
      ) : logs.length === 0 ? (
        <Empty
          description="No data yet — log some time entries first"
          style={{ padding: '100px 0', color: '#64748B' }}
        />
      ) : (
        <>
          <DashboardSummary logs={logs} />
          <TimePerTicketChart data={toTimePerTicket(logs)} />
          <TimePerTicketTreeMap data={toTimePerTicket(logs)} />
          <TimePerDayChart logs={logs} />
        </>
      )}
    </div>
  );
}
