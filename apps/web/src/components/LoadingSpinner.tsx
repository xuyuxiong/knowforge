import { Spin, Typography } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

const { Text } = Typography

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large'
  tip?: string
  fullscreen?: boolean
}

export default function LoadingSpinner({ 
  size = 'default', 
  tip = '加载中...', 
  fullscreen = false 
}: LoadingSpinnerProps) {
  const icon = <LoadingOutlined style={{ fontSize: 24 }} spin />
  
  if (fullscreen) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999,
      }}>
        <Spin 
          indicator={icon} 
          size={size} 
          tip={tip}
          style={{ color: '#1890ff' }}
        />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 0',
    }}>
      <Spin 
        indicator={icon} 
        size={size} 
        tip={tip}
      />
    </div>
  )
}