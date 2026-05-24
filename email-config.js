/**
 * SMTP 邮件配置
 * QQ邮箱需要开启SMTP服务获取授权码
 */
module.exports = {
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
        user: '1722969492@qq.com',
        pass: '' // ← 请填写QQ邮箱授权码
    },
    from: '默裕企服 <1722969492@qq.com>',
    to: '1722969492@qq.com',
    subject: '📩 默裕企服 - 新贷款咨询'
};
