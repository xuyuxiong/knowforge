import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          wireframe: false,
        },
        components: {
          Layout: {
            headerBg: '#fff',
            headerPadding: 0,
            siderBg: '#fff',
          },
          Menu: {
            itemBorderRadius: 4,
            itemMarginInline: 8,
          },
        },
      }}
    >
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ConfigProvider>
  </React.StrictMode>,
)