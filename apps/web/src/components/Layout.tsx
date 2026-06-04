import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu, theme, Grid, Button, Drawer } from 'antd'
import {
  MessageOutlined,
  FolderOutlined,
  UploadOutlined,
  SettingOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useLayout } from '../store/globalStore'

const { Header, Sider, Content } = AntLayout
const { useBreakpoint } = Grid

const menuItems: MenuProps['items'] = [
  {
    key: '/chat',
    icon: <MessageOutlined />,
    label: '智能问答',
  },
  {
    key: '/knowledge',
    icon: <FolderOutlined />,
    label: '知识库',
  },
  {
    key: '/upload',
    icon: <UploadOutlined />,
    label: '文档上传',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const screens = useBreakpoint()
  const { sidebarCollapsed, toggleSidebar } = useLayout()
  const [drawerVisible, setDrawerVisible] = useState(false)
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const isMobile = !screens.md
  const isTablet = screens.md && !screens.lg

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key)
    if (isMobile) {
      setDrawerVisible(false)
    }
  }

  const getPageTitle = () => {
    const item = menuItems?.find(item => (item as any)?.key === location.pathname)
    return item ? (item as any)?.label : 'KnowForge'
  }

  const renderMenu = () => (
    <Menu
      theme="light"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ border: 'none' }}
    />
  )

  const renderSider = () => (
    <Sider
      collapsible={!isMobile}
      collapsed={isMobile ? false : sidebarCollapsed}
      onCollapse={!isMobile ? toggleSidebar : undefined}
      theme="light"
      width={isMobile ? '100%' : 200}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: isMobile ? 'relative' : 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: sidebarCollapsed && !isMobile ? 18 : 20,
          fontWeight: 'bold',
          color: '#1677ff',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {sidebarCollapsed && !isMobile ? '📚' : '📚 KnowForge'}
      </div>
      {renderMenu()}
    </Sider>
  )

  if (isMobile) {
    return (
      <AntLayout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
          }}
        >
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setDrawerVisible(true)}
          />
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {getPageTitle()}
          </div>
          <div style={{ width: 32 }} />
        </Header>
        
        <Drawer
          title="菜单"
          placement="left"
          closable={false}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={280}
        >
          {renderSider()}
        </Drawer>
        
        <Content
          style={{
            margin: 16,
            padding: 16,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 'calc(100vh - 96px)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    )
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {renderSider()}
      <AntLayout style={{ marginLeft: sidebarCollapsed ? 80 : 200 }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {getPageTitle()}
          </div>
          <div>
            <span style={{ marginRight: 16 }}>👤 林傒</span>
          </div>
        </Header>
        <Content
          style={{
            margin: isTablet ? 16 : 24,
            padding: isTablet ? 16 : 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 'calc(100vh - 112px)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}