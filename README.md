# LeetCode Flow: AI Auto-Solver & GitHub Sync! ⚡🤖

Hey there! Welcome to **LeetCode Flow**, a cool automation tool built to make your LeetCode journey super smooth. This project was developed as a student assignment to combine chrome extensions, local backend servers, and Generative AI (LLMs) to automatically solve problems and back up the code directly to a GitHub repository!

---

## 🌟 What This Project Does
- **Scrapes problems:** Automatically reads the active LeetCode problem description, language, and template code.
- **AI-Powered Solver:** Uses OpenRouter (Gemini) to generate optimal solutions for your current problem.
- **Auto-Submits:** Injects the generated code directly into the editor and hits the "Submit" button for you!
- **GitHub Backups:** Once the submission is accepted, it saves the solution locally and pushes it to your GitHub repository automatically (either via local Git commands or direct GitHub API).

---

## 🛠️ How to Get Started

### Step 1: Clone the Repo and Install Dependencies
Open your terminal in this folder and run:
```bash
npm install
```

### Step 2: Start the Local Backend Server
Our Chrome Extension communicates with a local Node.js server to handle API calls and local Git commands. To start the server, run:
```bash
node server.js
```
The server will start running at `http://localhost:8080/`. Keep this terminal window open!

### Step 3: Load the Extension in Chrome
1. Open Google Chrome and go to `chrome://extensions/`.
2. Turn on **Developer mode** (the toggle switch in the top-right corner).
3. Click **Load unpacked** (top-left).
4. Select the **`dist`** folder from this project directory.
5. Pin the extension (**⚡ LeetCode Flow**) to your Chrome toolbar.

---

## ⚙️ Setting Up Your Keys
1. Click the **⚡ LeetCode Flow** icon in your toolbar.
2. Click the gear icon (**⚙️**) to open the Settings drawer.
3. **OpenRouter API Key:** Enter your OpenRouter key (you can generate one for free on [openrouter.ai](https://openrouter.ai/)).
4. **GitHub Push Method:** Select **Local Git (Zero Config)** to automatically use your local terminal's git authentication (no tokens needed!).
5. Click **Save Settings**.

---

## 🎯 How to Test It!
1. We have a built-in mock server for testing! Go to [http://localhost:8080/problems/two-sum/](http://localhost:8080/problems/two-sum/).
2. Open the extension popup and click **Auto Solve & Submit**.
3. Watch the magic happen! The extension will scrape the details, call Gemini, write the answer, click submit, and save it to a new `solutions/` folder in your workspace.
4. Once you see it working, go to a real LeetCode problem description page (e.g. `leetcode.com/problems/two-sum/description/`) and try it there!

*Note: Always make sure you are on the **Description** tab of the problem page so the AI can read the instructions!*

---

## 📚 Tech Stack Used
- **Frontend:** HTML, Vanilla CSS, TypeScript (bundled using Vite)
- **Backend:** Node.js (pure HTTP server with zero external dependencies!)
- **AI Integration:** OpenRouter API (Gemini-2.5-Flash model)
- **Automation:** Chrome Extension APIs (Manifest V3 Scripting & Content Worlds)
