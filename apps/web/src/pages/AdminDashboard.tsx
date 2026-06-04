import React, { useState, useEffect } from 'react'
import {
  Layout,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Tag,
  Avatar,
  Statistic,
  Row,
  Col,
  DatePicker,
} from 'antd'
import { UserOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons'
import { useRequest } from 'ahooks'
import { userApi } from '../services/api'
import dayjs from 'dayjs'

const { Content } = Layout
const { Option } = Select
const { RangePicker } = DatePicker

interface User {
  id: string
  username: string
  email: string
  displayName: string
  role: 'admin' | 'editor' | 'viewer'
  status: 'active' | 'inactive' | 'suspended'
  avatar?: string
  createdAt: string
  lastLoginAt?: string
  loginCount: number
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  newUsersToday: number
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()

  // 获取用户统计
  const { data: stats, loading: statsLoading } = useRequest(userApi.getStats)

  // 获取用户列表
  const { data: userList, loading: usersLoading, refresh } = useRequest(
    () => userApi.getAllUsers(),
    {
      onSuccess: (data) => setUsers(data),
    }
  )

  // 创建/编辑用户
  const handleCreateOrUpdateUser = async (values: any) => {
    try {
      if (editingUser) {
        await userApi.updateUser(editingUser.id, values)
        message.success('用户更新成功')
      } else {
        await userApi.createUser(values)
        message.success('用户创建成功')
      }
      
      setModalVisible(false)
      form.resetFields()
      setEditingUser(null)
      refresh()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    }
  }

  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个用户吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await userApi.deleteUser(userId)
          message.success('用户删除成功')
          refresh()
        } catch (error: any) {
          message.error(error.message || '删除失败')
        }
      },
    })
  }

  // 切换用户状态
  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'suspended') {
        await userApi.activateUser(userId)
        message.success('用户已启用')
      } else {
        await userApi.suspendUser(userId)
        message.success('用户已禁用')
      }
      refresh()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    }
  }

  // 打开编辑模态框
  const openEditModal = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    })
    setModalVisible(true)
  }

  // 打开创建模态框
  const openCreateModal = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (text: any, record: User) => (
        <Space>
          <Avatar 
            src={record.avatar} 
            icon={<UserOutlined />} 
            size="small"
          />
          <div>
            <div>{record.displayName}</div>
            <div style={{ fontSize: 12, color: '#666' }}>@{record.username}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={
          role === 'admin' ? 'red' : 
          role === 'editor' ? 'orange' : 'blue'
        }>
          {role === 'admin' ? '管理员' : 
           role === 'editor' ? '编辑者' : '查看者'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={
          status === 'active' ? 'green' : 
          status === 'suspended' ? 'red' : 'default'
        }>
          {status === 'active' ? '活跃' : 
           status === 'suspended' ? '禁用' : '未激活'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '从未登录',
    },
    {
      title: '登录次数',
      dataIndex: 'loginCount',
      key: 'loginCount',
    },
    {
      title: '操作',
      key: 'actions',
      render: (text: any, record: User) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Button
            type="text"
            danger
            icon={<LockOutlined />}
            onClick={() => handleToggleStatus(record.id, record.status)}
          >
            {record.status === 'suspended' ? '启用' : '禁用'}
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ margin: '24px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1>用户管理</h1>
          
          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总用户数"
                  value={stats?.totalUsers || 0}
                  loading={statsLoading}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="活跃用户"
                  value={stats?.activeUsers || 0}
                  loading={statsLoading}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="禁用用户"
                  value={stats?.suspendedUsers || 0}
                  loading={statsLoading}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="今日新增"
                  value={stats?.newUsersToday || 0}
                  loading={statsLoading}
                />
              </Card>
            </Col>
          </Row>

          {/* 操作按钮 */}
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" onClick={openCreateModal}>
              创建用户
            </Button>
          </div>

          {/* 用户列表 */}
          <Table
            columns={columns}
            dataSource={users}
            loading={usersLoading}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </div>

        {/* 创建/编辑用户模态框 */}
        <Modal
          title={editingUser ? '编辑用户' : '创建用户'}
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false)
            form.resetFields()
            setEditingUser(null)
          }}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateOrUpdateUser}
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, max: 20, message: '用户名长度为3-20位' },
              ]}
            >
              <Input disabled={!!editingUser} />
            </Form.Item>

            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input disabled={!!editingUser} />
            </Form.Item>

            <Form.Item
              label="显示名称"
              name="displayName"
              rules={[{ required: true, message: '请输入显示名称' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="角色"
              name="role"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select>
                <Option value="admin">管理员</Option>
                <Option value="editor">编辑者</Option>
                <Option value="viewer">查看者</Option>
              </Select>
            </Form.Item>

            {!editingUser && (
              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码长度至少为6位' },
                ]}
              >
                <Input.Password />
              </Form.Item>
            )}

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingUser ? '更新' : '创建'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  )
}

export default AdminDashboard