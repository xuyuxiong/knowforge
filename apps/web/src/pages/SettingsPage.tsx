import { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Switch, Select, Divider, Typography, Alert, message, Spin, Space } from 'antd'
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { knowledgeApi } from '../services/api'

const { Title } = Typography

const layout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 },
}

export default function SettingsPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // 从本地存储加载配置
      const savedSettings = localStorage.getItem('rag-settings')
      if (savedSettings) {
        form.setFieldsValue(JSON.parse(savedSettings))
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const onFinish = async (values: any) => {
    setSaving(true)
    try {
      // 保存到本地存储
      localStorage.setItem('rag-settings', JSON.stringify(values))
      
      // TODO: 调用 API 保存到后端
      // await knowledgeApi.updateSettings(values)
      
      message.success('配置保存成功')
    } catch (error) {
      console.error('保存配置失败:', error)
      message.error('配置保存失败')
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = () => {
    const defaultSettings = {
      embeddingModel: 'bge-large-zh-v1.5',
      embeddingDimension: 1024,
      llmModel: 'qwen-max',
      retrievalMethod: 'hybrid',
      topK: 5,
      rerank: true,
      chunkStrategy: 'semantic',
      chunkSize: 500,
      overlapSize: 100,
    }
    
    form.setFieldsValue(defaultSettings)
    localStorage.setItem('rag-settings', JSON.stringify(defaultSettings))
    message.success('配置已重置为默认值')
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Spin spinning={loading}>
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Card title="模型配置" style={{ marginBottom: 16 }}>
            <Form.Item
              label="嵌入模型"
              name="embeddingModel"
              rules={[{ required: true, message: '请选择嵌入模型' }]}
              initialValue="bge-large-zh-v1.5"
            >
              <Select>
                <Select.Option value="bge-large-zh-v1.5">bge-large-zh-v1.5（中文推荐）</Select.Option>
                <Select.Option value="text-embedding-3-small">text-embedding-3-small</Select.Option>
                <Select.Option value="m3e-base">m3e-base</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="向量维度"
              name="embeddingDimension"
              initialValue={1024}
            >
              <Select>
                <Select.Option value={1024}>1024</Select.Option>
                <Select.Option value={768}>768</Select.Option>
                <Select.Option value={512}>512</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="大语言模型"
              name="llmModel"
              initialValue="qwen-max"
            >
              <Select>
                <Select.Option value="qwen-max">Qwen-Max</Select.Option>
                <Select.Option value="qwen-plus">Qwen-Plus</Select.Option>
                <Select.Option value="qwen-turbo">Qwen-Turbo</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="API Key"
              name="llmApiKey"
              tooltip="用于调用大语言模型的API密钥"
            >
              <Input.Password placeholder="输入 LLM API Key" />
            </Form.Item>
          </Card>

          <Card title="检索配置" style={{ marginBottom: 16 }}>
            <Form.Item
              label="检索方式"
              name="retrievalMethod"
              initialValue="hybrid"
            >
              <Select>
                <Select.Option value="hybrid">混合检索（向量 + 关键词）</Select.Option>
                <Select.Option value="vector">仅向量检索</Select.Option>
                <Select.Option value="keyword">仅关键词检索</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="召回数量"
              name="topK"
              initialValue={5}
              tooltip="每次检索返回的文档片段数量"
            >
              <Select>
                <Select.Option value={3}>3</Select.Option>
                <Select.Option value={5}>5</Select.Option>
                <Select.Option value={10}>10</Select.Option>
                <Select.Option value={20}>20</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="重排序"
              name="rerank"
              valuePropName="checked"
              initialValue={true}
              tooltip="使用重排序模型提升检索精度"
            >
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </Form.Item>

            <Form.Item
              label="相似度阈值"
              name="similarityThreshold"
              initialValue={0.7}
              tooltip="低于此阈值的文档将被过滤"
            >
              <Select>
                <Select.Option value={0.5}>0.5（宽松）</Select.Option>
                <Select.Option value={0.7}>0.7（标准）</Select.Option>
                <Select.Option value={0.9}>0.9（严格）</Select.Option>
              </Select>
            </Form.Item>
          </Card>

          <Card title="语雀集成" style={{ marginBottom: 16 }}>
            <Alert
              message="语雀 MCP 服务"
              description={
                <div>
                  <p>使用语雀 MCP Server 实现文档自动同步</p>
                  <ul>
                    <li>服务代码：<code>mcp.ant.yuque.yuquemcpserver</code></li>
                    <li>需在 MCP 市场申请权限</li>
                    <li>支持全量/增量同步</li>
                  </ul>
                </div>
              }
              type="info"
              showIcon
            />
            
            <Form.Item
              label="语雀 Token"
              name="yuqueToken"
              tooltip="用于访问语雀 API 的访问令牌"
            >
              <Input.Password placeholder="输入语雀访问令牌" />
            </Form.Item>

            <Form.Item
              label="同步间隔"
              name="syncInterval"
              initialValue={3600}
              tooltip="自动同步的时间间隔（秒）"
            >
              <Select>
                <Select.Option value={1800}>30分钟</Select.Option>
                <Select.Option value={3600}>1小时</Select.Option>
                <Select.Option value={7200}>2小时</Select.Option>
                <Select.Option value={86400}>1天</Select.Option>
              </Select>
            </Form.Item>
          </Card>

          <Card title="系统设置" style={{ marginBottom: 16 }}>
            <Form.Item
              label="分块策略"
              name="chunkStrategy"
              initialValue="semantic"
            >
              <Select>
                <Select.Option value="semantic">语义分块（推荐）</Select.Option>
                <Select.Option value="fixed">固定长度分块</Select.Option>
                <Select.Option value="hybrid">混合分块</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="块大小"
              name="chunkSize"
              initialValue={500}
              tooltip="每个文本块的最大 token 数"
            >
              <Select>
                <Select.Option value={300}>300 tokens</Select.Option>
                <Select.Option value={500}>500 tokens</Select.Option>
                <Select.Option value={800}>800 tokens</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="重叠大小"
              name="overlapSize"
              initialValue={100}
              tooltip="块之间的重叠 token 数，保持上下文连贯"
            >
              <Select>
                <Select.Option value={50}>50 tokens</Select.Option>
                <Select.Option value={100}>100 tokens</Select.Option>
                <Select.Option value={200}>200 tokens</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="最大文件大小"
              name="maxFileSize"
              initialValue={50}
              tooltip="单个上传文件的最大大小（MB）"
            >
              <Select>
                <Select.Option value={10}>10 MB</Select.Option>
                <Select.Option value={50}>50 MB</Select.Option>
                <Select.Option value={100}>100 MB</Select.Option>
              </Select>
            </Form.Item>
          </Card>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={resetSettings}
                style={{ marginRight: 8 }}
              >
                重置配置
              </Button>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                size="large" 
                htmlType="submit"
                loading={saving}
              >
                保存配置
              </Button>
            </Space>
          </div>
        </Form>
      </Spin>
    </div>
  )
}