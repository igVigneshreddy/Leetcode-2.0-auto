import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;

// Body parsing helper
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// HTTPS helpers
function makeHttpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(body);
    req.end();
  });
}

function makeHttpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
}

function makeHttpsPut(url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(body);
    req.end();
  });
}

function cleanGeneratedCode(code) {
  // Remove markdown code block markers like ```javascript, ```python, ```, etc.
  code = code.replace(/```[a-zA-Z0-9+#-]*[\r\n]*/g, '');
  code = code.replace(/```/g, '');
  return code.trim();
}

function getExtension(language) {
  const lang = language.toLowerCase();
  if (lang.includes('javascript')) return 'js';
  if (lang.includes('typescript')) return 'ts';
  if (lang.includes('python') || lang.includes('pandas')) return 'py';
  if (lang.includes('cpp') || lang.includes('c++')) return 'cpp';
  if (lang.includes('java')) return 'java';
  if (lang.includes('c#') || lang.includes('csharp')) return 'cs';
  if (lang.includes('go')) return 'go';
  if (lang.includes('rust')) return 'rs';
  if (lang.includes('ruby')) return 'rb';
  if (lang.includes('scala')) return 'scala';
  if (lang.includes('kotlin')) return 'kt';
  if (lang.includes('swift')) return 'swift';
  if (lang.includes('php')) return 'php';
  if (lang.includes('mysql') || lang.includes('sql') || lang.includes('oracle') || lang.includes('postgres')) return 'sql';
  if (lang.includes('bash')) return 'sh';
  if (lang.includes('racket')) return 'rkt';
  if (lang.includes('erlang')) return 'erl';
  if (lang.includes('elixir')) return 'ex';
  if (lang.includes('dart')) return 'dart';
  if (lang.includes('ocaml')) return 'ml';
  if (lang === 'c') return 'c';
  if (lang.includes('c')) return 'c';
  return 'txt';
}

async function handleSolveRequest(req, res) {
  try {
    const body = await getRequestBody(req);
    const { title, slug, difficulty, description, language, starterCode, apiKey } = body;
    
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.trim() === '') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'OpenRouter API Key is invalid or missing. Please open the settings (⚙️) in your extension and enter a valid OpenRouter API Key.' }));
      return;
    }

    const prompt = `You are an expert software engineer solving LeetCode problems.
Given the following details of a LeetCode problem, generate the correct and optimal solution code.

Problem Title: ${title}
Difficulty: ${difficulty}
Language: ${language}

Problem Description:
${description}

Starter Code template:
${starterCode}

Instructions:
1. Write a complete, optimal, and correct implementation that runs correctly within the LeetCode editor.
2. Return ONLY the raw code matching the requested language (${language}).
3. For Database/SQL problems (e.g., MySQL, MS SQL Server, Oracle, PostgreSQL), output the raw SQL query. Do NOT wrap it in a function or comments.
4. For Shell problems (e.g., Bash), output the raw bash script/commands. Do NOT wrap in comments.
5. For Algorithms, Concurrency, and Pandas problems, adhere strictly to the Starter Code template. Provide the implementation of the class/methods/functions as defined in the template. Do NOT modify the class or function names, arguments, or return types provided in the starter template.
6. Do NOT wrap your output in markdown code blocks like \`\`\`javascript or \`\`\`python. Just output the code directly.
7. Do NOT include any explanations, introduction, markdown headers, or footnotes. Only output the code.
8. Do NOT include any comments (like block comments, inline comments, docstrings, explanatory comments, or description comments) inside the generated code. The code must contain only pure executable statements.
9. Ensure the code is complete and fully functional. Do NOT use placeholders, TODO comments, or omit parts of the solution.
10. Ensure the code is syntactically valid and compiles perfectly in the target language (${language}).`;

    const requestBody = JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2048
    });

    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:8080',
      'X-Title': 'LeetCode Flow Extension'
    };
    const result = await makeHttpsPost(openRouterUrl, headers, requestBody);
    
    if (result.statusCode !== 200) {
      throw new Error(`OpenRouter API returned status ${result.statusCode}: ${result.data}`);
    }

    const responseJson = JSON.parse(result.data);
    if (!responseJson.choices || responseJson.choices.length === 0) {
      throw new Error(`No choices returned by OpenRouter: ${result.data}`);
    }
    
    let generatedText = responseJson.choices[0].message.content;
    const cleanCode = cleanGeneratedCode(generatedText);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, code: cleanCode }));
  } catch (err) {
    console.error('[Server] Solve error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
}

async function handlePushRequest(req, res) {
  try {
    const body = await getRequestBody(req);
    const { title, slug, difficulty, language, code, githubToken, githubRepo, githubPath } = body;

    const ext = getExtension(language);
    const fileName = `${slug}.${ext}`;
    
    // 1. Write the file locally in the solutions directory
    const solutionsDir = path.join(__dirname, 'solutions');
    if (!fs.existsSync(solutionsDir)) {
      fs.mkdirSync(solutionsDir);
    }
    const filePath = path.join(solutionsDir, fileName);
    const fileContent = code;
    fs.writeFileSync(filePath, fileContent);

    // 2. Commit and Push
    if (githubToken && githubRepo) {
      console.log(`[Server] Committing via GitHub API to ${githubRepo}...`);
      const apiPath = githubPath ? `${githubPath}/${fileName}` : fileName;
      
      const getUrl = `https://api.github.com/repos/${githubRepo}/contents/${apiPath}`;
      const headers = {
        'Authorization': `Bearer ${githubToken}`,
        'User-Agent': 'LeetCode-Flow-Extension',
        'Accept': 'application/vnd.github.v3+json'
      };
      
      let sha = undefined;
      try {
        const getRes = await makeHttpsGet(getUrl, headers);
        if (getRes.statusCode === 200) {
          const getJson = JSON.parse(getRes.data);
          sha = getJson.sha;
        }
      } catch (err) {
        console.log('[Server] File does not exist yet (can be ignored for new file commits)');
      }

      const putUrl = `https://api.github.com/repos/${githubRepo}/contents/${apiPath}`;
      const putBody = JSON.stringify({
        message: `Auto-solve: ${title} (${difficulty})`,
        content: Buffer.from(fileContent).toString('base64'),
        sha: sha
      });

      const putRes = await makeHttpsPut(putUrl, headers, putBody);
      if (putRes.statusCode !== 200 && putRes.statusCode !== 201) {
        throw new Error(`GitHub API commit failed with status ${putRes.statusCode}: ${putRes.data}`);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, method: 'github-api', message: `Successfully committed ${fileName} to GitHub via API.` }));
    } else {
      console.log('[Server] Committing using local Git...');
      await new Promise((resolve, reject) => {
        const relativePath = path.relative(__dirname, filePath);
        const commitMessage = `Auto-solve: ${title} (${difficulty})`;
        
        exec(`git add "${relativePath}"`, { cwd: __dirname }, (err) => {
          if (err) return reject(new Error(`git add failed: ${err.message}. Make sure this directory is inside a git repository.`));
          
          exec(`git commit -m "${commitMessage}"`, { cwd: __dirname }, (commitErr) => {
            // Continue even if commit reports no changes, to push if needed
            exec(`git push`, { cwd: __dirname }, (pushErr) => {
              if (pushErr) {
                return reject(new Error(`git push failed: ${pushErr.message}. Make sure remote origin is configured and authenticated.`));
              }
              resolve();
            });
          });
        });
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, method: 'local-git', message: `Successfully committed and pushed ${fileName} using local Git.` }));
    }
  } catch (err) {
    console.error('[Server] Push error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  console.log(`[Server] Request: ${req.method} ${pathname}`);

  // CORS Headers for Extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle API requests
  if (req.method === 'POST') {
    if (pathname === '/api/solve') {
      handleSolveRequest(req, res);
      return;
    }
    if (pathname === '/api/push') {
      handlePushRequest(req, res);
      return;
    }
  }

  // Serve static files from dist or root if requested directly
  if (pathname === '/content.js' || pathname === '/background.js' || pathname === '/popup.js' || pathname === '/popup.css' || pathname === '/popup.html' || pathname === '/manifest.json') {
    const filePath = path.join(__dirname, 'dist', pathname);
    if (fs.existsSync(filePath)) {
      let contentType = 'application/javascript';
      if (pathname.endsWith('.css')) contentType = 'text/css';
      if (pathname.endsWith('.html')) contentType = 'text/html';
      if (pathname.endsWith('.json')) contentType = 'application/json';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(fs.readFileSync(filePath));
      return;
    }
  }

  // Handle problems route
  if (pathname.startsWith('/problems/')) {
    const slug = pathname.split('/')[2] || 'two-sum';
    let title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    let difficulty = 'Easy';
    let diffClass = 'text-easy';

    if (slug.includes('3sum') || slug.includes('medium')) {
      difficulty = 'Medium';
      diffClass = 'text-medium';
    } else if (slug.includes('median') || slug.includes('hard')) {
      difficulty = 'Hard';
      diffClass = 'text-hard';
    }

    const htmlPath = path.join(__dirname, 'mock_leetcode.html');
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf8');
      html = html.replace(/{{TITLE}}/g, title);
      html = html.replace(/{{SLUG}}/g, slug);
      html = html.replace(/{{DIFFICULTY}}/g, difficulty);
      html = html.replace(/{{DIFF_CLASS}}/g, diffClass);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }
  }

  // Fallback: serve mock_leetcode.html for root
  const htmlPath = path.join(__dirname, 'mock_leetcode.html');
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/{{TITLE}}/g, 'Two Sum');
    html = html.replace(/{{SLUG}}/g, 'two-sum');
    html = html.replace(/{{DIFFICULTY}}/g, 'Easy');
    html = html.replace(/{{DIFF_CLASS}}/g, 'text-easy');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Mock LeetCode Server running at http://localhost:${PORT}`);
});

