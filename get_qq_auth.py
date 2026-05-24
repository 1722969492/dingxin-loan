"""获取QQ邮箱SMTP授权码 - v4"""
from playwright.sync_api import sync_playwright
import time, re

AUTH_FILE = r"D:\鼎信助贷官网\email-config.js"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, channel='chrome', slow_mo=300)
    ctx = browser.new_context()
    page = ctx.new_page()
    
    print("[1] 打开QQ邮箱...")
    page.goto("https://mail.qq.com/")
    time.sleep(5)
    
    # 等待ptlogin框架出现
    print("[2] 等待登录页面加载...")
    pt_frame = None
    for attempt in range(15):
        for f in page.frames:
            if 'ptlogin2.qq.com' in f.url:
                pt_frame = f
                print(f"[+] 找到ptlogin iframe (attempt {attempt+1})")
                break
        if pt_frame:
            break
        time.sleep(1)
    
    if pt_frame:
        try:
            # 点击"密码登录"切换到密码输入模式
            try:
                pt_frame.locator("#switcher_plogin").click()
                print("[+] 点击【密码登录】切换")
                time.sleep(1)
            except:
                print("[!] 无需切换")
                pass
            
            # 点击用户名字段前先确保可见 - 用JS直接填
            pt_frame.evaluate("""() => {
                const u = document.getElementById('u');
                const p = document.getElementById('p');
                if(u) u.style.visibility = 'visible';
                if(p) p.style.visibility = 'visible';
            }""")
            time.sleep(1)
            
            pt_frame.locator("#u").fill("1722969492")
            print("[+] 已填QQ号")
            time.sleep(1)
            pt_frame.locator("#p").fill("w61018025")
            print("[+] 已填密码")
            time.sleep(1)
            
            # 按回车提交登录
            pt_frame.locator("#p").press('Enter')
            print("[+] 已提交登录，等待跳转...")
            time.sleep(10)
        except Exception as e:
            print(f"[!] 错误: {e}")
            page.screenshot(path=r"D:\鼎信助贷官网\login_error.png")
            input("手动登录后按Enter继续...")
    else:
        print("[!] 未找到ptlogin iframe")
        page.screenshot(path=r"D:\鼎信助贷官网\frames.png")
        for f in page.frames:
            print(f"  {f.url[:80]}")
        input("手动登录后按Enter继续...")
    
    # 跳转到设置页
    print(f"[3] 当前URL: {page.url[:100]}")
    if 'mail.qq.com' in page.url:
        print("[+] 登录成功!")
        time.sleep(3)
        
        # 用JS直接跳转到设置页
        print("[+] 正在跳转到设置页...")
        page.evaluate("location.href = '/cgi-bin/mail_setting?t=account'")
        time.sleep(5)
        print(f"   设置页URL: {page.url[:100]}")
        time.sleep(5)
        page.wait_for_load_state("networkidle")
        
        page.screenshot(path=r"D:\鼎信助贷官网\settings.png", full_page=True)
        print("[+] 已截图设置页")
        
        # 查找"生成授权码"
        try:
            # 可能在不同框架内
            gen_btn = page.get_by_text("生成授权码", exact=True)
            count = gen_btn.count()
            print(f"[+] 找到 {count} 个【生成授权码】按钮")
            
            if count > 0:
                gen_btn.first.click()
                print("[+] 已点击")
                time.sleep(4)
                page.screenshot(path=r"D:\鼎信助贷官网\auth_dialog.png")
                
                content = page.content()
                codes = re.findall(r'[A-Z0-9]{16}', content)
                print(f"[+] 找到可能授权码: {codes}")
                
                for c in codes:
                    if len(c) == 16 and c.isalnum():
                        print(f"\n[OK] 授权码: {c}")
                        with open(AUTH_FILE, 'r', encoding='utf-8') as f:
                            config = f.read()
                        config = config.replace("pass: ''", f"pass: '{c}'")
                        with open(AUTH_FILE, 'w', encoding='utf-8') as f:
                            f.write(config)
                        print(f"[OK] 已写入 {AUTH_FILE}")
                        break
                else:
                    print("[!] 未找到16位授权码")
                    input("手动检查后按Enter...")
            else:
                print("[!] 未找到按钮")
                # 试试其他文本匹配
                gen_text = page.locator("text=生成授权码").all_text_contents()
                print(f"  文本内容: {gen_text}")
                input("手动操作后按Enter...")
        except Exception as e:
            print(f"[!] 错误: {e}")
            page.screenshot(path=r"D:\鼎信助贷官网\error.png")
            input("按Enter退出...")
    else:
        print("[!] 登录失败，重新尝试...")
        page.screenshot(path=r"D:\鼎信助贷官网\login_fail.png")
        input("按Enter退出...")
    
    browser.close()
    print("[OK] 完成")
