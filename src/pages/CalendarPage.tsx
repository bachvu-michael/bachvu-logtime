import { useEffect, useState, useCallback } from 'react';
import { Alert, Spin } from 'antd';
import { LogEntry } from '../types';
import { fetchLogs } from '../api/logs';
import { CalendarView } from '../components/calendar/CalendarView';

export function CalendarPage() {
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

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
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">View time logs by month or week</p>
        </div>
      </div>

      {error && <Alert type="error" description={error} showIcon style={{ borderRadius: 10 }} />}

      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', padding: 60 }} />
      ) : (
        <CalendarView logs={logs} />
      )}
    </div>
  );
}
