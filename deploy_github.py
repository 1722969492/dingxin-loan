#!/usr/bin/env python3
"""Create GitHub repo and push website code."""
import requests
import os
import subprocess
import json

USERNAME = "1722969492@qq.com"
PASSWORD = "w61018025"
REPO_NAME = "dingxin-loan"
WORK_DIR = r"D:\鼎信助贷官网"

# Step 1: Create repo via API
print("Creating GitHub repo...")
r = requests.post(
    "https://api.github.com/user/repos",
    auth=(USERNAME, PASSWORD),
    json={"name": REPO_NAME, "private": False, "auto_init": False, "description": "鼎信助贷官网"}
)
print(f"Status: {r.status_code} {r.reason}")
if r.status_code in (200, 201):
    repo_data = r.json()
    print(f"Repo created: {repo_data['html_url']}")
    clone_url = repo_data['clone_url']
elif r.status_code == 422:
    data = r.json()
    print(f"Repo may already exist: {data}")
    clone_url = f"https://github.com/{USERNAME.split('@')[0]}/{REPO_NAME}.git"
else:
    print(f"Error: {r.text[:500]}")
    exit(1)

# Step 2: Init git and push
os.chdir(WORK_DIR)
if not os.path.exists(os.path.join(WORK_DIR, ".git")):
    subprocess.run(["git", "init"], check=True)
    subprocess.run(["git", "branch", "-M", "main"], check=True)

# Configure git
subprocess.run(["git", "config", "user.email", "1722969492@qq.com"], check=True)
subprocess.run(["git", "config", "user.name", "dingxin-loan"], check=True)

# Remove .gitignore if exists to ensure all files are tracked
if os.path.exists(".gitignore"):
    os.remove(".gitignore")

# Add files
subprocess.run(["git", "add", "."], check=True)

# Commit
result = subprocess.run(["git", "commit", "-m", "Initial commit: 鼎信助贷官网"], capture_output=True, text=True)
print(result.stdout)
if result.returncode != 0:
    print(result.stderr)

# Set remote and push
subprocess.run(["git", "remote", "add", "origin", clone_url], check=False)
subprocess.run(["git", "remote", "set-url", "origin", clone_url], check=False)

print("Pushing to GitHub...")
# Use embedded credentials for push
push_url = clone_url.replace("https://", f"https://{USERNAME}:{PASSWORD}@")
result = subprocess.run(["git", "push", "-u", push_url, "main"], capture_output=True, text=True)
print(result.stdout)
if result.returncode != 0:
    print("Push error:", result.stderr)
else:
    print("Push successful!")

print("\nDone!")
