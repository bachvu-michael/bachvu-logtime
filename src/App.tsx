import { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Menu, theme, Tooltip, Drawer, Button } from 'antd';
import {
  ClockCircleOutlined, BarChartOutlined, FileTextOutlined,
  CalendarOutlined, LogoutOutlined, BulbOutlined, MenuOutlined, HeartOutlined,
} from '@ant-design/icons';
import { LogTimePage }   from './pages/LogTimePage';
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage }  from './pages/CalendarPage';
import { InvoicePage }   from './pages/InvoicePage';
import { BillsPage }     from './pages/BillsPage';
import { CyclePage }     from './pages/CyclePage';
import { LoginPage }     from './pages/LoginPage';
import { checkAuthRequired, isAuthenticated, logout } from './api/auth';

const { Sider, Content } = Layout;
type Page = 'dashboard' | 'log' | 'calendar' | 'invoices' | 'bills' | 'cycle';

const NAV_ITEMS = [
  { key: 'dashboard', icon: <BarChartOutlined />,    label: 'Dashboard' },
  { key: 'log',       icon: <ClockCircleOutlined />, label: 'Log Time' },
  { key: 'calendar',  icon: <CalendarOutlined />,    label: 'Calendar' },
  { key: 'invoices',  icon: <FileTextOutlined />,    label: 'Invoices' },
  { key: 'bills',     icon: <BulbOutlined />,        label: 'Bills' },
  { key: 'cycle',     icon: <HeartOutlined />,       label: 'Chu kỳ' },
] as const;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function App() {
  const [page, setPage]           = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawer]   = useState(false);
  const [authed, setAuthed]       = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const isMobile = useIsMobile();

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

  function navigate(key: Page) {
    setPage(key);
    setDrawer(false);
  }

  const PAGE_LABELS: Record<Page, string> = {
    dashboard: 'Dashboard', log: 'Log Time', calendar: 'Calendar',
    invoices: 'Invoices', bills: 'Bills', cycle: 'Chu kỳ',
  };

  if (!authChecked) return null;
  if (!authed) return (
    <ConfigProvider theme={{ token: { colorPrimary: '#4361EE', borderRadius: 8 } }}>
      <LoginPage onLogin={() => setAuthed(true)} />
    </ConfigProvider>
  );

  const sidebarContent = (
    <>
      <div className={`sidebar__logo${collapsed && !isMobile ? ' sidebar__logo--collapsed' : ''}`}>
        <div className="sidebar__icon">🕐</div>
        {(!collapsed || isMobile) && (
          <>
            <div className="sidebar__name">LogTime</div>
            <div className="sidebar__tagline">Jira time tracker</div>
          </>
        )}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[page]}
        onClick={({ key }) => navigate(key as Page)}
        style={{ marginTop: 8, background: 'transparent', border: 'none' }}
        items={[
          ...NAV_ITEMS,
          { type: 'divider' as const },
        ]}
      />
      {(!collapsed || isMobile) && (
        <div className="sidebar__footer">data saved to MySQL</div>
      )}
      <Tooltip title="Logout" placement="right">
        <div
          onClick={handleLogout}
          style={{
            position: 'absolute', bottom: 48, left: 0, right: 0,
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            padding: collapsed && !isMobile ? '10px 0' : '10px 24px',
            gap: 10, cursor: 'pointer', color: '#64748B', fontSize: 13,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#E2E8F0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
        >
          <LogoutOutlined />
          {(!collapsed || isMobile) && <span>Logout</span>}
        </div>
      </Tooltip>
    </>
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
          Card: { boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 2px 8px rgba(15,23,42,0.06)' },
          Table: { headerBg: '#F8FAFF', rowHoverBg: '#F0F4FF' },
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      {isMobile ? (
        /* ── Mobile Layout ── */
        <div className="mobile-layout">
          {/* Top header */}
          <div className="mobile-header">
            <div className="mobile-header__left">
              <div className="sidebar__icon" style={{ width: 30, height: 30, fontSize: 14 }}>🕐</div>
              <span className="mobile-header__title">{PAGE_LABELS[page]}</span>
            </div>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawer(true)}
              className="mobile-header__menu-btn"
              aria-label="Open menu"
            />
          </div>

          {/* Page content */}
          <div className="mobile-content">
            {page === 'log'       && <LogTimePage />}
            {page === 'dashboard' && <DashboardPage />}
            {page === 'calendar'  && <CalendarPage />}
            {page === 'invoices'  && <InvoicePage />}
            {page === 'bills'     && <BillsPage />}
            {page === 'cycle'     && <CyclePage />}
          </div>

          {/* Bottom tab bar */}
          <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                className={`bottom-nav__item${page === item.key ? ' bottom-nav__item--active' : ''}`}
                onClick={() => navigate(item.key as Page)}
                aria-label={item.label}
                aria-current={page === item.key ? 'page' : undefined}
              >
                <span className="bottom-nav__icon">{item.icon}</span>
                <span className="bottom-nav__label">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile drawer */}
          <Drawer
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="sidebar__icon" style={{ width: 28, height: 28, fontSize: 13 }}>🕐</div>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>LogTime</span>
              </div>
            }
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawer(false)}
            width={260}
            styles={{ body: { padding: 0, background: '#0F172A' }, header: { background: '#0F172A', borderBottom: '1px solid rgba(255,255,255,0.07)' }, title: { color: '#fff' } }}
            closeIcon={<span style={{ color: '#94A3B8' }}>✕</span>}
          >
            {sidebarContent}
          </Drawer>
        </div>
      ) : (
        /* ── Desktop Layout ── */
        <Layout style={{ minHeight: '100vh' }}>
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            width={220}
            style={{ background: '#0F172A' }}
          >
            {sidebarContent}
          </Sider>
          <Content style={{ background: '#F0F4FF', overflowY: 'auto' }}>
            {page === 'log'       && <LogTimePage />}
            {page === 'dashboard' && <DashboardPage />}
            {page === 'calendar'  && <CalendarPage />}
            {page === 'invoices'  && <InvoicePage />}
            {page === 'bills'     && <BillsPage />}
            {page === 'cycle'     && <CyclePage />}
          </Content>
        </Layout>
      )}
    </ConfigProvider>
  );
}
