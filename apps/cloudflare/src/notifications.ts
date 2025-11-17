// SMTP 配置接口
export interface SMTPConfig {
  host: string          // SMTP 服务器地址
  port: number         // SMTP 端口 (25, 465, 587, 2525)
  secure?: boolean     // 是否使用 SSL/TLS (port 465 通常为 true)
  user: string         // SMTP 用户名
  pass: string         // SMTP 密码或应用专用密码
  from: string         // 发件人邮箱
  to: string           // 收件人邮箱
  tls?: boolean        // 是否启用 STARTTLS (port 587 通常为 true)
}

// 通用 SMTP 邮件发送功能 (使用 Cloudflare Workers TCP Socket API)
export async function sendSMTPNotification(
  smtpConfig: SMTPConfig,
  title: string,
  content: string
): Promise<void> {
  try {
    console.log(`[SMTP] 开始发送邮件到 ${smtpConfig.to}`)
    
    // 导入 Cloudflare Workers TCP Socket API
    const { connect } = await import('cloudflare:sockets')
    
    // 创建 TCP 连接
    const socket = connect({
      hostname: smtpConfig.host,
      port: smtpConfig.port
    }, {
      secureTransport: smtpConfig.secure ? 'on' : (smtpConfig.tls ? 'starttls' : 'off'),
      allowHalfOpen: false
    })

    const writer = socket.writable.getWriter()
    const reader = socket.readable.getReader()
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    // SMTP 通信函数
    async function writeCommand(command: string) {
      console.log(`[SMTP] 发送: ${command.trim()}`)
      await writer.write(encoder.encode(command))
    }

    async function readResponse(): Promise<string> {
      const { value } = await reader.read()
      const response = decoder.decode(value)
      console.log(`[SMTP] 接收: ${response.trim()}`)
      return response
    }

    try {
      // 等待服务器欢迎消息
      await readResponse()

      // EHLO 命令
      await writeCommand(`EHLO ${smtpConfig.host}\r\n`)
      await readResponse()

      // 如果需要 StartTLS
      if (smtpConfig.tls && !smtpConfig.secure) {
        await writeCommand('STARTTLS\r\n')
        await readResponse()
        // 升级到 TLS
        const tlsSocket = socket.startTls()
        // 重新获取 writer 和 reader
        const tlsWriter = tlsSocket.writable.getWriter()
        const tlsReader = tlsSocket.readable.getReader()
        
        // 重新 EHLO
        await tlsWriter.write(encoder.encode(`EHLO ${smtpConfig.host}\r\n`))
        const { value } = await tlsReader.read()
        console.log(`[SMTP] TLS 握手后: ${decoder.decode(value).trim()}`)
        
        // 更新 writer 和 reader
        await writer.close()
        await reader.cancel()
        Object.assign(writer, tlsWriter)
        Object.assign(reader, tlsReader)
      }

      // AUTH LOGIN
      await writeCommand('AUTH LOGIN\r\n')
      await readResponse()

      // 发送用户名 (base64编码)
      const username = btoa(smtpConfig.user)
      await writeCommand(`${username}\r\n`)
      await readResponse()

      // 发送密码 (base64编码)
      const password = btoa(smtpConfig.pass)
      await writeCommand(`${password}\r\n`)
      await readResponse()

      // MAIL FROM
      await writeCommand(`MAIL FROM:<${smtpConfig.from}>\r\n`)
      await readResponse()

      // RCPT TO
      await writeCommand(`RCPT TO:<${smtpConfig.to}>\r\n`)
      await readResponse()

      // DATA
      await writeCommand('DATA\r\n')
      await readResponse()

      // 构建邮件内容
      const emailContent = [
        `From: ${smtpConfig.from}`,
        `To: ${smtpConfig.to}`,
        `Subject: =?UTF-8?B?${btoa(title)}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        btoa(createEmailHTML(title, content)),
        '\r\n.\r\n'
      ].join('\r\n')

      await writeCommand(emailContent)
      await readResponse()

      // QUIT
      await writeCommand('QUIT\r\n')
      await readResponse()

      console.log('[SMTP] 邮件发送成功')

    } finally {
      await writer.close()
      await reader.cancel()
      await socket.close()
    }
    
  } catch (error) {
    console.error('[SMTP] 发送邮件时出错:', error)
    throw error
  }
}

// 创建邮件 HTML 内容
function createEmailHTML(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: normal;
        }
        .content {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 0 0 8px 8px;
            border: 1px solid #dee2e6;
            border-top: none;
        }
        .message {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #007bff;
            margin: 10px 0;
        }
        pre {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 14px;
            line-height: 1.4;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 12px;
        }
        .timestamp {
            background: #e9ecef;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            color: #495057;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 ${title}</h1>
    </div>
    <div class="content">
        <div class="message">
            <pre>${content}</pre>
        </div>
        <div class="footer">
            <div class="timestamp">
                发送时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
            </div>
            <p>此邮件由森空岛自动签到系统发送</p>
        </div>
    </div>
</body>
</html>`
}



// Webhook 通知功能
export async function sendWebhookNotification(
  webhookUrl: string,
  title: string,
  content: string,
  format: 'json' | 'form' = 'json'
): Promise<void> {
  try {
    let body: string
    let headers: Record<string, string>

    if (format === 'json') {
      headers = { 'Content-Type': 'application/json' }
      body = JSON.stringify({
        title,
        content,
        timestamp: new Date().toISOString(),
        source: 'skland-daily-attendance'
      })
    } else {
      headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
      const params = new URLSearchParams({
        title,
        content,
        timestamp: new Date().toISOString(),
        source: 'skland-daily-attendance'
      })
      body = params.toString()
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body
    })

    if (response.ok) {
      console.log('[Webhook] 通知发送成功')
    } else {
      console.error('[Webhook] 通知发送失败:', response.status, await response.text())
    }
  } catch (error) {
    console.error('[Webhook] 发送 Webhook 通知时出错:', error)
  }
}

// 钉钉机器人 Webhook
export async function sendDingTalkNotification(
  webhookUrl: string,
  title: string,
  content: string
): Promise<void> {
  try {
    const payload = {
      msgtype: 'markdown',
      markdown: {
        title,
        text: `## ${title}\n\n\`\`\`\n${content}\n\`\`\`\n\n> 发送时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      const result = await response.json() as { errcode: number; errmsg?: string }
      if (result.errcode === 0) {
        console.log('[DingTalk] 钉钉消息发送成功')
      } else {
        console.error('[DingTalk] 钉钉消息发送失败:', result)
      }
    } else {
      console.error('[DingTalk] 请求失败:', response.status)
    }
  } catch (error) {
    console.error('[DingTalk] 发送钉钉通知时出错:', error)
  }
}

// 企业微信机器人 Webhook  
export async function sendWeChatWorkNotification(
  webhookUrl: string,
  title: string,
  content: string
): Promise<void> {
  try {
    const payload = {
      msgtype: 'markdown',
      markdown: {
        content: `## ${title}\n\`\`\`\n${content}\n\`\`\`\n\n<font color=\"info\">发送时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</font>`
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      const result = await response.json() as { errcode: number; errmsg?: string }
      if (result.errcode === 0) {
        console.log('[WeChat Work] 企业微信消息发送成功')
      } else {
        console.error('[WeChat Work] 企业微信消息发送失败:', result)
      }
    } else {
      console.error('[WeChat Work] 请求失败:', response.status)
    }
  } catch (error) {
    console.error('[WeChat Work] 发送企业微信通知时出错:', error)
  }
}

// Slack Webhook
export async function sendSlackNotification(
  webhookUrl: string,
  title: string,
  content: string
): Promise<void> {
  try {
    const payload = {
      text: title,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: title
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`\n${content}\n\`\`\``
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `发送时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
            }
          ]
        }
      ]
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      console.log('[Slack] Slack 消息发送成功')
    } else {
      console.error('[Slack] Slack 消息发送失败:', await response.text())
    }
  } catch (error) {
    console.error('[Slack] 发送 Slack 通知时出错:', error)
  }
}