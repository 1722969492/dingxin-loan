"""Connect to Chrome via CDP and get QQ auth code"""
from playwright.sync_api import sync_playwright
import time, re, subprocess

AUTH_FILE = r"D:\鼎信助贷官网\email-config.js"

# Kill existing Chrome
subprocess.run("taskkill /F /IM chrome.exe", shell=True, capture_output=True)
time.sleep(1)

# Launch Chrome with remote debugging
subprocess.Popen([
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "--remote-debugging-port=9222",
    "--no-first-run"
])
time.sleep(3)

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = browser.contexts[0]
    page = ctx.new_page()
    
    print("[1] Opening QQ mail...")
    page.goto("https://mail.qq.com/cgi-bin/mail_setting?t=account")
    time.sleep(10)
    print(f"    URL: {page.url[:100]}")
    
    page.screenshot(path=r"D:\鼎信助贷官网\cdp_settings.png", full_page=True)
    
    # Check if already logged in or need to login
    if "login" in page.url.lower():
        print("[!] Not logged in, need to login via browser")
        print("    Please login manually in the browser...")
        input("    Press Enter after logging in...")
        page.goto("https://mail.qq.com/cgi-bin/mail_setting?t=account")
        time.sleep(5)
    
    print("[2] Looking for auth code button...")
    gen_btn = page.get_by_text("生成授权码", exact=True)
    count = gen_btn.count()
    print(f"    Found {count} button(s)")
    
    if count > 0:
        gen_btn.first.click()
        time.sleep(3)
        page.screenshot(path=r"D:\鼎信助贷官网\cdp_auth.png")
        
        content = page.content()
        codes = re.findall(r"[A-Z0-9]{16}", content)
        print(f"    Codes: {codes}")
        
        for c in codes:
            if len(c) == 16 and c.isalnum():
                print(f"\n[OK] Auth code: {c}")
                with open(AUTH_FILE, "r", encoding="utf-8") as f:
                    config = f.read()
                config = config.replace("pass: ''", "pass: '" + c + "'")
                with open(AUTH_FILE, "w", encoding="utf-8") as f:
                    f.write(config)
                print("[OK] Written to config")
                break
        else:
            print("[!] No valid code found, screenshot saved")
            input("    Press Enter...")
    else:
        print("[!] Button not found")
        print("    Please manually click '生成授权码' in the browser")
        page.screenshot(path=r"D:\鼎信助贷官网\cdp_manual.png")
        input("    Press Enter after getting the code...")
        
        # Try to read code from page
        content = page.content()
        codes = re.findall(r"[A-Z0-9]{16}", content)
        if codes:
            print(f"[OK] Auth code: {codes[0]}")
            with open(AUTH_FILE, "r", encoding="utf-8") as f:
                config = f.read()
            config = config.replace("pass: ''", "pass: '" + codes[0] + "'")
            with open(AUTH_FILE, "w", encoding="utf-8") as f:
                f.write(config)
    
    print("[OK] Done")
    browser.close()
