/**
 * 默裕企服 - 表单接收服务
 * 接收网站表单提交，保存到CSV，并通过OpenClaw推送微信通知
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3456;
const CSV_FILE = path.join(__dirname, 'leads.csv');
const LOG_FILE = path.join(__dirname, 'server.log');

// 确保CSV文件存在且含表头
if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, '\uFEFF时间,姓名,手机,贷款类型,期望额度,补充说明\n', 'utf8');
}

function log(msg) {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const line = `[${time}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

// 发送微信通知 (通过OpenClaw本地API)
async function notifyWeChat(data) {
    try {
        const postData = JSON.stringify({
            message: `📩 新贷款咨询\n━━━━━━━━━━\n👤 姓名: ${data.name}\n📱 电话: ${data.phone}\n🏷️ 类型: ${data.loanType || '未选择'}\n💰 额度: ${data.amount || '未选择'}\n📝 备注: ${data.message || '无'}\n━━━━━━━━━━\n⏰ ${new Date().toLocaleString('zh-CN')}`
        });

        const options = {
            hostname: '127.0.0.1',
            port: 18789,
            path: '/api/sessions/current/send',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        return new Promise((resolve) => {
            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve(body));
            });
            req.on('error', (e) => {
                log(`微信推送失败: ${e.message}`);
                resolve(null);
            });
            req.write(postData);
            req.end();
        });
    } catch (e) {
        log(`微信通知异常: ${e.message}`);
    }
}

// 保存到CSV
function saveToCSV(data) {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const line = `${time},${data.name},${data.phone},${data.loanType || ''},${data.amount || ''},${(data.message || '').replace(/,/g, '，')}\n`;
    fs.appendFileSync(CSV_FILE, line, 'utf8');
    log(`新线索已保存: ${data.name} / ${data.phone}`);
}

// HTTP服务器
const server = http.createServer(async (req, res) => {
    // CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/submit') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);

                // 验证必填字段
                if (!data.name || !data.phone) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '姓名和手机号必填' }));
                    return;
                }

                // 保存CSV
                saveToCSV(data);
                
                // 推送微信通知 (异步，不阻塞响应)
                notifyWeChat(data);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: '提交成功' }));
            } catch (e) {
                log(`解析错误: ${e.message}`);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '数据格式错误' }));
            }
        });
        return;
    }

    // 健康检查
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
        return;
    }

    // 查看来电记录
    if (req.url === '/leads') {
        const csv = fs.readFileSync(CSV_FILE, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
        res.end(csv);
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    log(`📋 默裕企服 - 表单接收服务`);
    log(`📍 http://localhost:${PORT}`);
    log(`📁 线索保存: ${CSV_FILE}`);
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
});
