import { useState, useRef, useEffect } from 'react'
import { Card, Input, Button, Spin, Typography, Divider, Drawer, Space, Tag } from 'antd'
import { SendOutlined, StopOutlined, HistoryOutlined, ThunderboltOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { Text, Paragraph } = Typography

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  sources?: Array<{
    id: string
    title: string
    content: string
    similarity: number
    metadata?: Record<string, any>
  }>
}

interface ChatSession {
  id: string
  title: string
  messageCount: number
  lastMessageAt: string
}

export default function ChatPage() {
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是知识库助手，可以解答关于内部文档、产品文档、技术文档的相关问题。请问有什么可以帮你的？',
      timestamp: Date.now(),
      sources: [],
    },
  ])
  const [input, setInput] = useState('')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>()
  const [showHistory, setShowHistory] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [selectedSources, setSelectedSources] = useState<Message['sources']>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 加载会话列表
  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    // TODO: 调用 API 获取会话列表
    // const res = await fetch('/api/chat/sessions')
    // setSessions(data)
  }

  const createSession = async () => {
    // TODO: 创建新会话
    setCurrentSessionId(undefined)
  }

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    setShowHistory(false)
    // TODO: 加载会话历史消息
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // TODO: 调用实际 API
      // const res = await fetch('/api/rag/query', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     question: input,
      //     sessionId: currentSessionId,
      //   }),
      // })
      // const data = await res.json()

      // 模拟响应
      await new Promise(resolve => setTimeout(resolve, 1500))

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '这是一个示例回答。实际应用中会调用 RAG 接口获取答案，并返回引用来源。[1][2]',
        timestamp: Date.now(),
        sources: [
          {
            id: 'doc-1',
            title: 'RAG 技术方案设计文档',
            content: 'RAG（Retrieval-Augmented Generation）是一种结合检索和生成的技术...',
            similarity: 0.92,
            metadata: { source: 'yuque', type: 'Markdown' },
          },
          {
            id: 'doc-2',
            title: '向量数据库选型指南',
            content: '常见的向量数据库包括 Milvus、Chroma、Weaviate 等...',
            similarity: 0.85,
            metadata: { source: 'pdf', type: 'PDF' },
          },
        ],
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '抱歉，回答生成时遇到错误，请稍后重试。',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const viewSources = (sources: Message['sources']) => {
    setSelectedSources(sources || [])
    setShowSources(true)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* 顶部工具栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button icon={<HistoryOutlined />} onClick={() => setShowHistory(true)}>
            历史会话
          </Button>
          <Button type="primary" onClick={createSession}>
            新对话
          </Button>
        </Space>
        {currentSessionId && (
          <Tag color="blue">当前会话：{currentSessionId.slice(0, 8)}...</Tag>
        )}
      </div>

      <Card
        style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}
      >
        {/* 消息列表 */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
                  color: msg.role === 'user' ? '#fff' : '#000',
                }}
              >
                <Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 8 }}>
                  {msg.content}
                </Paragraph>

                {/* 来源引用按钮 */}
                {msg.sources && msg.sources.length > 0 && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <ThunderboltOutlined /> 来源 ({msg.sources.length})
                      </Text>
                      <Button
                        size="small"
                        type="link"
                        onClick={() => viewSources(msg.sources)}
                      >
                        查看原文
                      </Button>
                    </Space>
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin tip="思考中..." />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <TextArea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="输入你的问题，按 Enter 发送（Shift+Enter 换行）"
            autoSize={{ minRows: 2, maxRows: 4 }}
            onPressEnter={e => {
              if (!e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              type="primary"
              icon={loading ? <StopOutlined /> : <SendOutlined />}
              onClick={loading ? () => {} : sendMessage}
              disabled={!input.trim() && !loading}
            >
              {loading ? '停止' : '发送'}
            </Button>
          </div>
        </div>
      </Card>

      {/* 历史会话抽屉 */}
      <Drawer
        title="历史会话"
        placement="left"
        width={300}
        open={showHistory}
        onClose={() => setShowHistory(false)}
      >
        {sessions.length === 0 ? (
          <Text type="secondary">暂无历史会话</Text>
        ) : (
          sessions.map(session => (
            <Card
              key={session.id}
              size="small"
              style={{ marginBottom: 12, cursor: 'pointer' }}
              onClick={() => selectSession(session.id)}
            >
              <Paragraph ellipsis={{ rows: 2 }}>{session.title}</Paragraph>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {session.messageCount} 条消息 · {new Date(session.lastMessageAt).toLocaleString()}
              </Text>
            </Card>
          ))
        )}
      </Drawer>

      {/* 来源引用抽屉 */}
      <Drawer
        title="引用来源"
        placement="right"
        width={500}
        open={showSources}
        onClose={() => setShowSources(false)}
      >
        {selectedSources.map((source, index) => (
          <Card
            key={source.id}
            size="small"
            style={{ marginBottom: 16 }}
            title={
              <Space>
                <Tag color="blue">[{index + 1}]</Tag>
                {source.title}
              </Space>
            }
            extra={
              <Text type="secondary">{(source.similarity * 100).toFixed(0)}% 匹配</Text>
            }
          >
            <Paragraph
              ellipsis={{ rows: 4, expandable: true, symbol: '展开' }}
              style={{ fontSize: 14, lineHeight: 1.8 }}
            >
              {source.content}
            </Paragraph>
            {source.metadata && (
              <Space style={{ marginTop: 8 }}>
                {source.metadata.source && <Tag>{source.metadata.source}</Tag>}
                {source.metadata.type && <Tag>{source.metadata.type}</Tag>}
              </Space>
            )}
          </Card>
        ))}
      </Drawer>
    </div>
  )
}