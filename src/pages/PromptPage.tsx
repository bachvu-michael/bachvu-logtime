import { useEffect, useState } from 'react';
import { Spin, Card, Alert, Tag, Space, Button, message } from 'antd';
import { CopyOutlined, FileMarkdownOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

export function PromptPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/PROMPT.md')
      .then(r => { if (!r.ok) throw new Error(); return r.text(); })
      .then(setContent)
      .catch(() => setError('Could not load PROMPT.md'))
      .finally(() => setLoading(false));
  }, []);

  function copyPrompt() {
    const match = content.match(/```\n([\s\S]*?)```/);
    navigator.clipboard
      .writeText(match ? match[1] : content)
      .then(() => message.success('Prompt copied to clipboard!'));
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">Reuse Prompt</h1>
          <p className="page-subtitle">Copy this prompt to build a similar app from scratch</p>
        </div>
        <Space>
          <Tag color="blue" icon={<FileMarkdownOutlined />}>PROMPT.md</Tag>
          <Button type="primary" icon={<CopyOutlined />} onClick={copyPrompt}>
            Copy prompt
          </Button>
        </Space>
      </div>

      {loading && <Spin style={{ display: 'block', textAlign: 'center', padding: 60 }} />}
      {error   && <Alert type="error" description={error} showIcon />}

      {content && (
        <Card>
          <div className="md-body">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </Card>
      )}
    </div>
  );
}
