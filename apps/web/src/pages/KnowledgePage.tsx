import { useState } from 'react'
import { Card, Table, Tag, Button, Space, Input, Select, Typography, message, Popconfirm } from 'antd'
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import DocumentModal from '../components/DocumentModal'

const { Title } = Typography

interface KnowledgeItem {
  key: string
  id: number
  title: string
  type: 'PDF' | 'Word' | 'Markdown' | '语雀'
  source: string
  createdAt: string
  updatedAt: string
  status: 'indexed' | 'indexing' | 'failed'
}

// 示例数据
const mockData: KnowledgeItem[] = [
  {
    key: '1',
    id: 1,
    title: 'KnowForge 技术方案',
    type: 'PDF',
    source: '本地上传',
    createdAt: '2026-05-01 10:00',
    updatedAt: '2026-05-01 10:05',
    status: 'indexed',
  },
  {
    key: '2',
    id: 2,
    title: '前端开发规范文档',
    type: '语雀',
    source: '语雀知识库',
    createdAt: '2026-05-02 14:30',
    updatedAt: '2026-05-02 14:35',
    status: 'indexed',
  },
  {
    key: '3',
    id: 3,
    title: '产品需求文档 v2.0',
    type: 'Word',
    source: '本地上传',
    createdAt: '2026-05-03 09:15',
    updatedAt: '2026-05-03 09:20',
    status: 'indexing',
  },
]

export default function KnowledgePage() {
  const [searchText, setSearchText] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [data, setData] = useState<KnowledgeItem[]>(mockData)

  const handleAdd = () => {
    setModalMode('add')
    setEditingRecord(null)
    setModalVisible(true)
  }

  const handleEdit = (record: KnowledgeItem) => {
    setModalMode('edit')
    setEditingRecord({
      ...record,
      type: record.type.toLowerCase()
    })
    setModalVisible(true)
  }

  const handleDelete = (id: number) => {
    setData(prevData => prevData.filter(item => item.id !== id))
    message.success('删除成功')
  }

  const handleSubmit = async (values: any) => {
    try {
      if (modalMode === 'add') {
        // 添加新文档
        const newDocument: KnowledgeItem = {
          key: Date.now().toString(),
          id: Date.now(),
          title: values.title,
          type: values.type.toUpperCase() as any,
          source: values.type === 'yuque' ? '语雀知识库' : '本地上传',
          createdAt: new Date().toLocaleString('zh-CN'),
          updatedAt: new Date().toLocaleString('zh-CN'),
          status: 'indexing',
        }
        setData(prevData => [newDocument, ...prevData])
        message.success('文档添加成功，正在索引中...')
      } else {
        // 编辑现有文档
        setData(prevData => 
          prevData.map(item => 
            item.id === editingRecord.id 
              ? { ...item, title: values.title, updatedAt: new Date().toLocaleString('zh-CN') }
              : item
          )
        )
        message.success('文档更新成功')
      }
      setModalVisible(false)
    } catch (error) {
      message.error('操作失败')
    }
  }

  const columns: ColumnsType<KnowledgeItem> = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          PDF: 'red',
          Word: 'blue',
          Markdown: 'green',
          语雀: 'purple',
        }
        return <Tag color={colorMap[type]}>{type}</Tag>
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          indexed: { text: '已索引', color: 'green' },
          indexing: { text: '索引中', color: 'processing' },
          failed: { text: '失败', color: 'red' },
        }
        const s = statusMap[status] || { text: status, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个文档吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="搜索文档"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              style={{ width: 150 }}
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: 'all', label: '全部类型' },
                { value: 'PDF', label: 'PDF' },
                { value: 'Word', label: 'Word' },
                { value: 'Markdown', label: 'Markdown' },
                { value: '语雀', label: '语雀' },
              ]}
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加文档
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <DocumentModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        initialValues={editingRecord}
        mode={modalMode}
      />
    </div>
  )
}