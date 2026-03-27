import { useEffect, useState, useCallback } from 'react';
import { Alert, Spin } from 'antd';
import { LogEntry } from '../types';
import { fetchLogs } from '../api/logs';
import { TimeLogForm } from '../components/log/TimeLogForm';
import { TimeLogTable } from '../components/log/TimeLogTable';

export function LogTimePage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await fetchLogs();
      setLogs(data);
    } catch {
      setError('Cannot connect to server. Make sure the server is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">Log Time</h1>
          <p className="page-subtitle">Track time spent on Jira tickets and team tasks</p>
        </div>
      </div>

      {error && <Alert type="error" description={error} showIcon style={{ borderRadius: 10 }} />}

      <TimeLogForm
        logs={logs}
        onCreated={entry => setLogs(prev => [entry, ...prev])}
      />

      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', padding: 60 }} />
      ) : (
        <TimeLogTable
          logs={logs}
          loading={false}
          onUpdated={updated => setLogs(prev => prev.map(l => l.id === updated.id ? updated : l))}
          onDeleted={id => setLogs(prev => prev.filter(l => l.id !== id))}
        />
      )}
    </div>
  );
}
