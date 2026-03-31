import { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Menu, theme, Tooltip } from 'antd';
import { ClockCircleOutlined, BarChartOutlined, FileTextOutlined, CalendarOutlined, LogoutOutlined, LinkOutlined } from '@ant-design/icons';
import { LogTimePage } from './pages/LogTimePage';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { InvoicePage } from './pages/InvoicePage';
import { XeroPage } from './pages/XeroPage';
import { LoginPage } from './pages/LoginPage';
import { checkAuthRequired, isAuthenticated, logout } from './api/auth';

const { Sider, Content } = Layout;

type Page = 'dashboard' | 'log' | 'calendar' | 'invoices' | 'xero';

export default function App() {
  const initialPage = (new URLSearchParams(window.location.search).get('xero') ? 'xero' : 'dashboard') as Page;
  const [page, setPage] = useState<Page>(initialPage);
  const [collapsed, setCollapsed] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAuthRequired().then(required => {
      if (!required || isAuthenticated()) setAuthed(true);
      setAuthChecked(true);
    });
  }, []);

  async function handleLogout() {
    await logout();
    setAuthed(false);
  }

  if (!authChecked) return null;
  if (!authed) return (
    <ConfigProvider theme={{ token: { colorPrimary: '#4361EE', borderRadius: 8 } }}>
      <LoginPage onLogin={() => setAuthed(true)} />
    </ConfigProvider>
  );

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#4361EE',
          borderRadius: 8,
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: 14,
          colorBgContainer: '#FFFFFF',
          colorBgLayout: '#F0F4FF',
          colorBorder: '#E2E8F0',
          colorText: '#0F172A',
          colorTextSecondary: '#64748B',
        },
        components: {
          Layout: {
            siderBg: '#0F172A',
            triggerBg: 'rgba(255,255,255,0.05)',
            triggerColor: '#94A3B8',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(67, 97, 238, 0.85)',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
            darkItemColor: '#94A3B8',
            darkItemSelectedColor: '#FFFFFF',
            darkItemHoverColor: '#E2E8F0',
            itemPaddingInline: 12,
          },
          Card: {
            boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 2px 8px rgba(15,23,42,0.06)',
          },
          Table: {
            headerBg: '#F8FAFF',
            rowHoverBg: '#F0F4FF',
          },
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={220}
          style={{ background: '#0F172A' }}
        >
          {/* Logo */}
          <div className={`sidebar__logo${collapsed ? ' sidebar__logo--collapsed' : ''}`}>
            <div className="sidebar__icon">🕐</div>
            {!collapsed && (
              <>
                <div className="sidebar__name">LogTime</div>
                <div className="sidebar__tagline">Jira time tracker</div>
              </>
            )}
          </div>

          {/* Navigation */}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[page]}
            onClick={({ key }) => setPage(key as Page)}
            style={{ marginTop: 8, background: 'transparent', border: 'none' }}
            items={[
              { key: 'dashboard', icon: <BarChartOutlined />, label: 'Dashboard' },
              { key: 'log', icon: <ClockCircleOutlined />, label: 'Log Time' },
              { key: 'calendar', icon: <CalendarOutlined />, label: 'Calendar' },
              { key: 'invoices', icon: <FileTextOutlined />, label: 'Invoices' },
              { key: 'xero', icon: <LinkOutlined />, label: 'Xero' },
              { type: 'divider' },
            ]}
          />

          {/* Footer hint */}
          {!collapsed && (
            <div className="sidebar__footer">
              data saved to /data/*.json
            </div>
          )}

          {/* Logout */}
          <Tooltip title="Logout" placement="right">
            <div
              onClick={handleLogout}
              style={{
                position: 'absolute', bottom: 48, left: 0, right: 0,
                display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '10px 24px',
                gap: 10, cursor: 'pointer', color: '#64748B',
                fontSize: 13,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E2E8F0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
            >
              <LogoutOutlined />
              {!collapsed && <span>Logout</span>}
            </div>
          </Tooltip>
        </Sider>

        <Content style={{ background: '#F0F4FF', overflowY: 'auto' }}>
          {page === 'log' && <LogTimePage />}
          {page === 'dashboard' && <DashboardPage />}
          {page === 'calendar' && <CalendarPage />}
          {page === 'invoices' && <InvoicePage />}
          {page === 'xero' && <XeroPage />}
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
