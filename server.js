/**
 * 默裕企服 - 表单接收服务
 * 接收网站表单提交 → 保存CSV → 创建 GitHub Issue 通知
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3456;
const CSV_FILE = path.join(__dirname, 'leads.csv');
const LOG_FILE = path.join(__dirname, 'server.log');

// 确保CSV文件存在
if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, '\uFEFF时间,姓名,手机,贷款类型,期望额度,补充说明\n', 'utf8');
}

function log(msg) {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const line = `[${time}] ${msg}`;
    console.log(line);
    try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf8'); } catch(e) {}
}

// 创建 GitHub Issue 通知（发送到邮箱）
function createGithubIssue(data) {
    const title = `[新客户] ${data.name} - ${data.phone}`;
    const body = `## 📩 新贷款客户咨询

| 项目 | 内容 |
|------|------|
| 👤 **姓名** | ${data.name} |
| 📱 **电话** | ${data.phone} |
| 🏷️ **类型** | ${data.loanType || '未选择'} |
| 💰 **额度** | ${data.amount || '未选择'} |
| 📝 **备注** | ${data.message || '无'} |
| ⏰ **时间** | ${new Date().toLocaleString('zh-CN')} |

> 该 Issue 由自动提交系统创建，回复将发送到您的 GitHub 绑定邮箱。
`;

    try {
        // 临时保存 body 到文件（避免命令行编码问题）
        const tmpFile = path.join(__dirname, '.tmp_issue_body.md');
        // 检测是否为 Windows，如果是则用 GBK 编码写入
        const isWin = process.platform === 'win32';
        
        let bodyContent = body;
        if (isWin) {
            // 用 GBK 编码写入
            const iconv = Buffer.from(body, 'utf8');
            fs.writeFileSync(tmpFile, iconv);
        } else {
            fs.writeFileSync(tmpFile, body, 'utf8');
        }
        
        const cmd = `gh issue create --repo 1722969492/dingxin-loan --title "${title.replace(/"/g, '\\"')}" --body-file "${tmpFile}"`;
        const output = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
        log(`GitHub Issue 已创建: ${output.trim()}`);
        
        // 清理临时文件
        fs.unlinkSync(tmpFile);
        return true;
    } catch (err) {
        log(`GitHub Issue 创建失败: ${err.message}`);
        return false;
    }
}

// 保存到CSV
function saveToCSV(data) {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const line = `${time},${data.name},${data.phone},${data.loanType || ''},${data.amount || ''},${(data.message || '').replace(/,/g, '，')}\n`;
    fs.appendFileSync(CSV_FILE, line, 'utf8');
}

// HTTP服务器
const server = http.createServer(async (req, res) => {
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
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (!data.name || !data.phone) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '姓名和手机号必填' }));
                    return;
                }

                saveToCSV(data);
                log(`新线索: ${data.name} / ${data.phone}`);

                // 创建 GitHub Issue 通知
                createGithubIssue(data);

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
        res.end(JSON.stringify({ status: 'ok' }));
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
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    log(`默裕企服 - 表单接收服务`);
    log(`http://localhost:${PORT}`);
    log(`CSV: ${CSV_FILE}`);
    log(`通知方式: GitHub Issue → QQ邮箱`);
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
});
