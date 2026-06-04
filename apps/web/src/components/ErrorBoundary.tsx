import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Result, Button, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

const { Paragraph, Text } = Typography

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          padding: 24 
        }}>
          <Result
            status="error"
            title="应用出现错误"
            subTitle="很抱歉，应用遇到了一些问题。请尝试刷新页面或联系技术支持。"
            extra={
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                onClick={this.handleReset}
              >
                重新加载
              </Button>
            }
          >
            <div style={{ textAlign: 'left', marginTop: 24 }}>
              <Paragraph>
                <Text strong>错误详情：</Text>
              </Paragraph>
              <Paragraph>
                <Text code>{this.state.error?.toString()}</Text>
              </Paragraph>
              {this.state.errorInfo?.componentStack && (
                <details style={{ whiteSpace: 'pre-wrap' }}>
                  <Text type="secondary">{this.state.errorInfo.componentStack}</Text>
                </details>
              )}
            </div>
          </Result>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary