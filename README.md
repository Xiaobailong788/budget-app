# 记账软件 · Budget App v1.1.0

> Personal Budget Tracker — Zero-dependency single-page HTML app. Fully offline, runs entirely in your browser.

![Language](https://img.shields.io/badge/language-Chinese-red) ![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen) ![Platform](https://img.shields.io/badge/platform-browser-orange) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## 📸 Screenshots

> Screenshots coming soon. Open `money-wise-v1.1.0.html` in your browser to see the app in action.

---

## 📖 Brief Description

**记账软件 · Budget App** is a personal budget tracking tool designed for everyday use. It stores all your records, categories, budgets, and savings targets entirely in your browser's localStorage — no server, no sign-up, no data leaving your machine. Packaged as a single offline HTML file with zero external dependencies, it is ready to run the moment you open it in a modern browser.

---

## 🤖 AI 生成声明

本项目的全部代码（HTML / CSS / JavaScript）均由 **AI Agent（大型语言模型）生成、审查、修改和完善**。

**作者（即仓库所有者）的角色仅限于：**
- 整体功能设计与规划
- 功能验证与测试
- UI 与交互审美的反馈和决策
- 项目方向把控

作者不具备专业软件开发背景，本项目为**个人学习和日常使用目的**而创建。公开此项目的目的是分享设计思路和展示 AI 辅助开发的可行性，而非提供专业级软件解决方案。

---

## ⚠️ 免责声明

> **请在使用本软件前仔细阅读以下条款。使用即表示您理解并同意以下内容。**

### 1. AI 生成代码风险
本软件的全部代码由 AI Agent 自动生成，**未经传统人工安全审计和专业代码审查**。可能存在但不限于以下问题：
- 未知的软件缺陷或逻辑错误
- 安全漏洞或数据泄露风险
- 边界情况（edge case）未覆盖
- 代码风格不一致或潜在的性能问题

请在使用前**自行评估风险**，尤其涉及重要数据时须谨慎。

### 2. 计算准确性不担保
本软件中的所有数学计算（包括但不限于预算汇总、储蓄预测、预算使用率、统计图表数据、月度报告等）**均不保证绝对真实性和准确性**。所有数据仅供个人参考，不应作为任何财务决策的唯一依据。

### 3. 非财务建议
本软件**不构成任何形式的财务、税务或投资建议**。如有专业财务管理需求，请咨询持牌财务顾问、会计师或相关专业人士。

### 4. 不合规声明
本项目**不符合任何财务 / 会计行业合规标准、审计标准或监管要求**。不适用于需要合规认证的业务场景。

### 5. 数据存储安全
- 所有数据以**明文形式**存储在浏览器 `localStorage` 中，**不提供加密保护**
- 虽然设计上以本地存储为框架且经过了 AI Agent 的代码审查，但因代码由 AI 生成，**仍不保证数据绝对不外泄**
- **请勿在本软件中保存任何关键、敏感或涉密信息**

### 6. 数据丢失风险
- 清除浏览器缓存、Cookie、站点数据或历史记录将**永久删除所有记录与设置**，且**无法恢复**
- 数据**仅存在于单一设备**上，**不支持跨设备同步**
- **用户须自行定期通过「设置」页面的 JSON 导出功能备份数据**

### 7. 无担保
本软件按「**原样**」（AS IS）提供，作者**不作任何明示或默示的担保**，包括但不限于适销性、特定用途适用性和不侵权的担保。

### 8. 责任限制
在**任何情况下**，作者均不对因使用或无法使用本软件而产生的**任何数据丢失或财务损失**承担责任，即使已被告知此类损失的可能性。

### 9. 使用者责任
- 使用者应**自行评估风险**
- 使用者对自身的**数据安全和财务决策负全部责任**
- 使用者应**自行验证所有计算结果**

---

## ✨ Features

### 📊 总览 Overview
Monthly spending summary with budget and savings progress rings rendered on Canvas. Includes a 7-day spending sparkline, top 5 spending categories, overspend warnings, and a savings prediction engine that supports dual daily limit calculations.

### ✏️ 记账 Add Record
Quick expense entry with automatic RM currency prefix, a tree-based category picker (emoji + color), date/time fields, and notes. Input validation with shake animation feedback.

### 📋 流水 Records
Advanced multi-filter system supporting keyword, category, date range, amount range, and overspent-only filters. Toggle between compact and card views. Batch operations for delete and recategorization. Soft delete with a 5-second undo window.

### 🗂️ 分类 Categories
Infinite nesting tree with accordion UI. Set per-category budgets in RM or percentage. Inline budget editing with parent-child budget validation. Merge categories, move nodes with cycle detection, pick from 14 preset colors, and choose emoji icons.

### 📈 统计 Statistics
Interactive Canvas charts — elastic animated pie chart with hover pop-out and full drill-down, animated line chart, bar chart with drill-down, and a calendar heatmap with 6-color gradient. Month-over-month comparison, 6-month trends, and a dedicated savings chart. All charts downloadable as PNG. Custom date range analysis included.

### 📄 月度报告 Report
Print-optimized monthly summary featuring budget and savings rings, a category breakdown table, a spending sparkline, and natural language savings prediction.

### ⚙️ 设置 Settings
Dark/light mode toggle, monthly budget configuration, 3-mode savings target (fixed amount, percentage, or both). Export and import data via JSON (replace or merge), CSV, or Excel (XML Spreadsheet 2003 with 5 sheets and live formulas). Clear all data option available.

### 📱 手机版 Mobile Companion
轻量级手机专用版本 `money-wise-mobile.html`，支持完整的记账增删改查、分类管理、JSON 导入导出。
适合在手机上快速记录，导出 JSON 后在主应用导入。单 HTML 文件，零依赖。

---

### 🔥 Highlights

- **Zero external dependencies** — Pure HTML, CSS, and JavaScript. No CDN, no frameworks, no libraries.
- **Elastic animated pie chart** — Smooth hover pop-out effects and full drill-down navigation.
- **Calendar heatmap** — Spending ratio visualized with a 6-color gradient across the month.
- **Soft delete with 5-second undo** — Accidentally deleted a record? Undo it within 5 seconds.
- **Native Excel export** — Generates real XML SpreadsheetML 2003 with SUM, AVERAGE, and IF formulas — no library required.
- **Responsive design** — Desktop sidebar layout with a mobile bottom tab navigation bar, including safe-area support.
- **Dark mode throughout** — All Canvas charts, UI elements, and exports adapt automatically.
- **CSP & XSS protection** — Content Security Policy headers and HTML injection sanitization (`escHtml`) built in.

---

## 🚀 Quick Start

1. Download `money-wise-v1.1.0.html` (主应用) 或 `money-wise-mobile.html` (手机版)
2. 主应用在电脑浏览器打开，手机版在手机浏览器打开
3. Start tracking your expenses — everything is saved automatically in your browser

No installation, no server, no internet connection required after download.

---

## 📝 Usage Guide

**总览 (Overview)** — Your landing dashboard. Review monthly totals, check your budget ring and savings ring, view the 7-day trend line, and see which categories are overspent.

**记账 (Add Record)** — Log a new expense by entering an amount, picking a category from the nested tree, setting a date and time, and optionally adding notes. The form validates your input and shakes on error.

**流水 (Records)** — Browse, search, and filter all your past expenses. Use the advanced filters to narrow results, switch between compact and card views, select multiple records for batch operations, or delete with a 5-second undo.

**分类 (Categories)** — Organize your spending categories in an infinitely nestable tree. Assign budgets per category, choose colors and emoji icons, merge duplicates, and move items with automatic cycle detection.

**统计 (Statistics)** — Explore your spending visually. Drill into pie chart slices, view trends on the line and bar charts, check your monthly heatmap, and export any chart as a PNG image.

**月度报告 (Report)** — Generate a print-friendly summary of any month. Use it for personal review or archiving.

**设置 (Settings)** — Configure your monthly budget, choose a savings target mode, toggle dark mode, and manage your data through JSON, CSV, or Excel export/import.

---

## 🛠 Tech Stack

- **Language**: Pure HTML5 / CSS3 / JavaScript (ES2020+)
- **UI**: Native DOM API, CSS Custom Properties, Flexbox, Grid
- **Charts**: Canvas 2D API with requestAnimationFrame
- **Storage**: Browser localStorage
- **Export**: Native JSON, CSV, XML Spreadsheet 2003 (SpreadsheetML)
- **Dependencies**: None — zero external libraries

---

## 📁 Project Structure

```
budget-app/
├── money-wise-v1.1.0.html   # 主应用：完整记账功能 (~6,759 lines)
├── money-wise-mobile.html   # 手机版：轻量记账，支持导入导出JSON (~1,384 lines)
├── features/                # Feature documentation
├── technical/               # Technical development logs (local only)
├── user/                    # User-facing changelogs (local only)
├── logs/                    # Consolidated project logs (local only)
└── README.md                # This file
```

---

## 🌐 Browser Support

| Browser        | Support     |
|----------------|-------------|
| Chrome         | ✅ Full     |
| Firefox        | ✅ Full     |
| Edge           | ✅ Full     |
| Safari         | ✅ Full     |
| Internet Explorer | ❌ Not supported |

Requires ES2020+ support. Modern browsers only.

---

## 📄 License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
