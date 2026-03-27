import { useState } from 'react';
import { Card, Input, Button, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { login } from '../api/auth';

interface Props { onLogin: () => void }

export function LoginPage({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!password) return;
    setLoading(true);
    setError('');
    const ok = await login(password);
    setLoading(false);
    if (ok) {
      onLogin();
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F0F4FF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Card style={{ width: 340, borderRadius: 12, boxShadow: '0 4px 24px rgba(15,23,42,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🕐</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>LogTime</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Enter password to continue</div>
        </div>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16, borderRadius: 8 }} />}

        <Input.Password
          prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onPressEnter={handleSubmit}
          size="large"
          style={{ marginBottom: 12 }}
        />
        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={handleSubmit}
        >
          Sign in
        </Button>
      </Card>
    </div>
  );
}
