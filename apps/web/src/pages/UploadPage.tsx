import { useState } from 'react'
import { Card, Upload, Button, Progress, Alert, Typography, Space, Tag, Input, message } from 'antd'
import { InboxOutlined, UploadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { documentApi } from '../services/api'

const { Dragger } = Upload
const { Title, Text } = Typography

interface UploadTask {
  id: string
  name: string
  size: number
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  message?: string
}

export default function UploadPage() {
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([])
  const [yuqueUrl, setYuqueUrl] = useState('')
  const [syncing, setSyncing] = useState(false)

  const updateTask = (id: string, updates: Partial<UploadTask>) => {
    setUploadTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ))
  }

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    accept: '.pdf,.doc,.docx,.md,.markdown',
    customRequest: async ({ file, onSuccess, onError, onProgress }) => {
      const taskId = Date.now().toString()
      const uploadFile = file as File
      
      setUploadTasks(prev => [...prev, {
        id: taskId,
        name: uploadFile.name,
        size: uploadFile.size,
        progress: 0,
        status: 'uploading',
      }])

      try {
        const result = await documentApi.uploadFile(uploadFile, (progress) => {
          updateTask(taskId, { progress })
          onProgress?.({ percent: progress })
        })
        
        updateTask(taskId, { 
          status: 'completed', 
          progress: 100,
          message: '上传成功'
        })
        
        onSuccess?.(result)
        message.success(`${uploadFile.name} 上传成功`)
      } catch (error) {
        updateTask(taskId, { 
          status: 'error', 
          message: '上传失败'
        })
        onError?.(error as any)
        message.error(`${uploadFile.name} 上传失败`)
      }
    },
    onRemove(file) {
      setUploadTasks(prev => prev.filter(task => task.name !== file.name))
    },
  }

  const supportedFormats = [
    { name: 'PDF', ext: '.pdf', desc: '支持文本型和扫描件（OCR）' },
    { name: 'Word', ext: '.docx', desc: '支持.docx格式' },
    { name: 'Markdown', ext: '.md', desc: '支持 Markdown 文件' },
    { name: '语雀', ext: 'link', desc: '粘贴语雀文档链接' },
  ]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <Title level={4}>上传文档</Title>
        <Alert
          message="支持的格式"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              {supportedFormats.map((fmt) => (
                <div key={fmt.name}>
                  <Tag color="blue">{fmt.ext}</Tag>
                  <Text type="secondary">{fmt.desc}</Text>
                </div>
              ))}
            </Space>
          }
          type="info"
          showIcon
        />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个或批量上传，每个文件最大 50MB
          </p>
        </Dragger>
      </Card>

      {uploadTasks.length > 0 && (
        <Card title="上传任务">
          {uploadTasks.map((task) => (
            <div key={task.id} style={{ marginBottom: 16 }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text>{task.name}</Text>
                <Space>
                  {task.status === 'completed' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  <Text>{((task.size) / 1024 / 1024).toFixed(2)} MB</Text>
                </Space>
              </Space>
              <Progress
                percent={task.progress}
                status={task.status === 'error' ? 'exception' : task.status === 'completed' ? 'success' : 'active'}
                style={{ marginTop: 8 }}
              />
              {task.message && <Text type="secondary">{task.message}</Text>}
            </div>
          ))}
        </Card>
      )}

      <Card title="语雀文档同步">
        <Space.Compact style={{ width: '100%' }}>
          <Input 
            placeholder="粘贴语雀文档链接，例如：https://yuque.example.com/team/book/doc"
            value={yuqueUrl}
            onChange={(e) => setYuqueUrl(e.target.value)}
          />
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            loading={syncing}
            onClick={async () => {
              if (!yuqueUrl.trim()) {
                message.warning('请输入语雀文档链接')
                return
              }
              
              setSyncing(true)
              try {
                await documentApi.syncYuqueDocument(yuqueUrl)
                message.success('语雀文档同步成功')
                setYuqueUrl('')
              } catch (error) {
                message.error('语雀文档同步失败')
              } finally {
                setSyncing(false)
              }
            }}
          >
            同步
          </Button>
        </Space.Compact>
      </Card>
    </div>
  )
}