# Cloudflare Workers 通知配置

现在 Cloudflare Workers 版本支持多种通知方式，你可以根据需要配置以下环境变量：

## 环境变量配置

### 基础配置
- `SKLAND_TOKEN`: 森空岛登录令牌（必需）

### 通知配置（可选）
- `SERVERCHAN_SENDKEY`: ServerChan 推送的 SendKey

### SMTP 邮件配置
- `SMTP_HOST`: SMTP 服务器地址
- `SMTP_PORT`: SMTP 端口 (默认587)
- `SMTP_SECURE`: 是否使用 SSL (true/false)
- `SMTP_TLS`: 是否启用 TLS (默认true)
- `SMTP_USER`: SMTP 用户名或 API Key
- `SMTP_PASS`: SMTP 密码或 API Key
- `EMAIL_FROM`: 发件人邮箱
- `EMAIL_TO`: 收件人邮箱

### Webhook 通知配置
- `WEBHOOK_URL`: 通用 Webhook URL
- `DINGTALK_WEBHOOK`: 钉钉机器人 Webhook URL
- `WECHAT_WORK_WEBHOOK`: 企业微信机器人 Webhook URL
- `SLACK_WEBHOOK`: Slack Webhook URL

## 配置示例

### 1. ServerChan 通知
```
SERVERCHAN_SENDKEY=
```

### 2. SMTP 邮件通知

```
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_TLS=true
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_TO=
```

### 3. 钉钉机器人通知
```
DINGTALK_WEBHOOK=
```

### 4. 企业微信机器人通知
```
WECHAT_WORK_WEBHOOK=
```

### 5. Slack 通知
```
SLACK_WEBHOOK=
```

### 6. 通用 Webhook 通知
```
WEBHOOK_URL=
```

## 通知内容格式

### JSON Webhook 格式
```json
{
  "title": "【森空岛每日签到】",
  "content": "签到详细信息...",
  "timestamp": "2025-11-17T12:56:52.000Z",
  "source": "skland-daily-attendance"
}
```

### 钉钉/企业微信格式
消息采用 Markdown 格式，包含：
- 签到结果汇总
- 每个角色的签到详情
- 错误信息（如有）
- 发送时间

## 部署步骤

1. **设置环境变量**：在 Cloudflare Pages 的 Functions 环境变量中添加所需配置
2. **重新部署**：推送代码变更或手动触发重新部署
3. **测试通知**：手动触发一次 scheduled 事件测试通知功能

## SMTP 邮件服务说明

由于 Cloudflare Workers 不支持直接的 SMTP 连接，邮件通知需要通过 HTTP API 发送。你需要：

1. **在你的邮箱服务器上部署一个 HTTP-to-SMTP 代理服务**
2. **或者使用支持 HTTP API 的邮件服务商**

### HTTP-to-SMTP 代理服务示例

代理服务应该接受以下格式的 POST 请求：

```json
{
  "smtp": {
    "host": "your-smtp-server.com",
    "port": 587,
    "secure": false,
    "user": "username",
    "pass": "password",
    "tls": true
  },
  "email": {
    "from": "sender@yourdomain.com",
    "to": "recipient@example.com",
    "subject": "邮件主题",
    "html": "HTML邮件内容",
    "text": "纯文本邮件内容"
  }
}
```

## 注意事项

- 所有通知配置都是可选的，不配置则不发送对应通知
- 可以同时配置多种通知方式
- SMTP 邮件通知需要你的邮箱服务器支持 HTTP 代理发送
- Webhook 通知支持自定义接收端点
- 邮件发送失败不会影响签到功能

## 故障排查

如果通知没有发送成功，请检查：
1. 环境变量配置是否正确
2. Webhook URL 是否可访问
3. 查看 Worker 运行日志中的错误信息
4. 验证对应平台的 Token/URL 是否有效