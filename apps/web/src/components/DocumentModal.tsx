import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Upload, Button, Space, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'

const { TextArea } = Input
const { Option } = Select

interface DocumentModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (values: any) => void
  initialValues?: any
  mode: 'add' | 'edit'
}

interface DocumentForm {
  title: string
  type: string
  content?: string
  source?: string
  tags?: string[]
  file?: any
}

export default function DocumentModal({ visible, onCancel, onSubmit, initialValues, mode }: DocumentModalProps) {
  const [form] = Form.useForm()
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<any[]>([])

  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues)
      if (initialValues.file) {
        setFileList([initialValues.file])
      }
    } else if (visible) {
      form.resetFields()
      setFileList([])
    }
  }, [visible, initialValues, form])

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isValidType = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown'].includes(file.type)
      if (!isValidType) {
        message.error('请上传 PDF、Word 或 Markdown 文件')
        return false
      }
      const isLt50M = file.size / 1024 / 1024 < 50
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB')
        return false
      }
      
      setFileList([file])
      form.setFieldsValue({ file })
      return false
    },
    fileList,
    onRemove: () => {
      setFileList([])
      form.setFieldsValue({ file: undefined })
    },
    maxCount: 1,
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      onSubmit(values)
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setFileList([])
    onCancel()
  }

  return (
    <Modal
      title={mode === 'add' ? '添加文档' : '编辑文档'}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      width={600}
      okText="保存"
      cancelText="取消"
      confirmLoading={uploading}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: 'markdown',
          tags: [],
        }}
      >
        <Form.Item
          label="文档标题"
          name="title"
          rules={[{ required: true, message: '请输入文档标题' }]}
        >
          <Input placeholder="请输入文档标题" />
        </Form.Item>

        <Form.Item
          label="文档类型"
          name="type"
          rules={[{ required: true, message: '请选择文档类型' }]}
        >
          <Select placeholder="请选择文档类型">
            <Option value="markdown">Markdown</Option>
            <Option value="pdf">PDF</Option>
            <Option value="word">Word</Option>
            <Option value="yuque">语雀</Option>
          </Select>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
        >
          {({ getFieldValue }) => {
            const type = getFieldValue('type')
            
            if (type === 'yuque') {
              return (
                <Form.Item
                  label="语雀链接"
                  name="source"
                  rules={[{ required: true, message: '请输入语雀文档链接' }]}
                >
                  <Input placeholder="https://yuque.example.com/team/book/doc" />
                </Form.Item>
              )
            }
            
            if (type === 'markdown') {
              return (
                <Form.Item
                  label="文档内容"
                  name="content"
                  rules={[{ required: true, message: '请输入文档内容' }]}
                >
                  <TextArea
                    rows={10}
                    placeholder="请输入 Markdown 格式的文档内容"
                  />
                </Form.Item>
              )
            }
            
            return (
              <Form.Item
                label="上传文件"
                name="file"
                rules={[{ required: true, message: '请上传文件' }]}
              >
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>选择文件</Button>
                </Upload>
              </Form.Item>
            )
          }}
        </Form.Item>

        <Form.Item
          label="标签"
          name="tags"
        >
          <Select
            mode="tags"
            placeholder="输入标签后按回车"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}