# GreyHR Attendance Bot

Automated Sign In / Sign Out bot for GreyHR using Playwright + GitHub Actions (100% free).

---

## How It Works

1. GitHub Actions triggers the bot at **9:00 AM IST** (Sign In) and **6:30 PM IST** (Sign Out) every weekday
2. Bot checks if today is a weekend or public holiday — if yes, skips and emails you
3. If it's a working day, it logs into GreyHR and clicks the attendance button
4. You get a Gmail notification either way (success / skip / failure + screenshot)

---

## Setup Guide

### Step 1 — Fork / Push to GitHub
Push this repo to your own GitHub account (can be private).

### Step 2 — Add GitHub Secrets
Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

Add all 6 secrets:

| Secret Name       | Value                                      |
|-------------------|--------------------------------------------|
| `GREYHR_URL`      | `https://yourcompany.greythr.com`          |
| `GREYHR_USERNAME` | `your.email@yourcompany.com`               |
| `GREYHR_PASSWORD` | Your GreyHR password                       |
| `EMAIL_USER`      | `your.email@gmail.com`                     |
| `EMAIL_PASS`      | Gmail App Password (16-char, no spaces)    |
| `EMAIL_TO`        | Email to receive notifications             |

> ⚠️ **Gmail App Password** is NOT your Gmail login password.
> Get one at: https://myaccount.google.com/apppasswords
> (Requires 2-Step Verification to be enabled first)

### Step 3 — Test Before Going Live

Go to **Actions tab → 🧪 Run Tests → Run workflow**

Test in this order:

| Test            | What it checks                        | Secrets needed |
|-----------------|---------------------------------------|----------------|
| `holiday`       | Weekend + holiday skip logic          | None           |
| `browser`       | Playwright launches Chromium          | None           |
| `mailer`        | Gmail sends email to you              | EMAIL_*        |
| `login`         | GreyHR login works (no click)         | All            |
| `dry-run`       | Full flow without clicking button     | All            |
| `all`           | All of the above                      | All            |

### Step 4 — Enable Scheduled Workflows
GitHub disables scheduled workflows on new repos. To enable:
- Go to **Actions tab**
- Click **🟢 Sign In** → **Enable workflow**
- Click **🔴 Sign Out** → **Enable workflow**

That's it! The bot runs automatically from now on.

---

## Workflows

| Workflow        | Schedule                | Manual Trigger |
|-----------------|-------------------------|----------------|
| 🧪 Run Tests    | Never (manual only)     | ✅ Yes          |
| 🟢 Sign In      | 9:00 AM IST, Mon–Fri   | ✅ Yes          |
| 🔴 Sign Out     | 6:30 PM IST, Mon–Fri   | ✅ Yes          |

---

## Email Notifications

| Situation              | Subject                              |
|------------------------|--------------------------------------|
| Weekend / Holiday      | `GreyHR Skipped`                     |
| Signed in              | `GreyHR – Signed In Successful`      |
| Signed out             | `GreyHR – Signed Out Successful`     |
| Login failed           | `GreyHR – Attendance Failed ❌` + 📸  |
| Any error              | `GreyHR – Attendance Failed ❌` + 📸  |

---

## Project Structure

```
greyhr-bot/
├── .github/
│   └── workflows/
│       ├── test.yml        ← Manual test runner (run first!)
│       ├── signin.yml      ← 9:00 AM IST daily
│       └── signout.yml     ← 6:30 PM IST daily
├── src/
│   ├── actions/
│   │   └── run.js          ← Main entry point
│   ├── browser.js          ← Playwright browser setup
│   ├── greyhr.js           ← Login + attendance click
│   ├── holiday.js          ← Weekend/holiday check
│   ├── holidays.js         ← Holiday list (update yearly)
│   └── mailer.js           ← Gmail notifications
├── tests/
│   ├── test-mailer.js
│   ├── test-holiday.js
│   ├── test-browser.js
│   ├── test-greyhr-login.js
│   └── test-full-dry-run.js
├── .env.example
└── Dockerfile
```