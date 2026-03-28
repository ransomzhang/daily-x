const fs = require('fs');
const tweets = JSON.parse(fs.readFileSync('tweets_filtered.json', 'utf8'));

// Sort by engagement (retweets + likes)
tweets.sort((a, b) => (b.retweets + b.likes) - (a.retweets + a.likes));

const date = new Date().toISOString().split('T')[0];
const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Twitter 日报 - ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f2f5;
      padding: 20px;
      line-height: 1.5;
    }
    .container { max-width: 600px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #1da1f2, #0d8ecf);
      color: white;
      padding: 20px;
      border-radius: 12px 12px 0 0;
      text-align: center;
    }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .tweets { background: white; border-radius: 0 0 12px 12px; }
    .tweet {
      padding: 16px;
      border-bottom: 1px solid #eee;
      transition: background 0.2s;
    }
    .tweet:hover { background: #f7f9fa; }
    .tweet:last-child { border-bottom: none; }
    .tweet-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .author { font-weight: 600; color: #14171a; }
    .handle { color: #536471; margin-left: 8px; font-size: 14px; }
    .tweet-content {
      color: #14171a;
      margin-bottom: 8px;
      font-size: 15px;
    }
    .tweet-content a { color: #1da1f2; text-decoration: none; }
    .tweet-stats {
      display: flex;
      gap: 16px;
      color: #536471;
      font-size: 13px;
    }
    .stat { display: flex; align-items: center; gap: 4px; }
    .engagement { 
      background: #e8f5fd;
      border-left: 3px solid #1da1f2;
    }
    .engagement .tweet-content { font-weight: 500; }
    .hot { 
      background: #fff3e0;
      border-left: 3px solid #ff9800;
    }
    .footer {
      text-align: center;
      padding: 16px;
      color: #536471;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐦 Twitter 日报</h1>
      <p>${date} ${time} · 精选 ${tweets.length} 条</p>
    </div>
    <div class="tweets">
      ` + tweets.map((t, i) => {
        const engagement = t.retweets + t.likes;
        const isHot = engagement >= 50;
        const isEngagement = engagement >= 20;
        const cardClass = isHot ? 'hot' : (isEngagement ? 'engagement' : '');
        return `
          <div class="tweet ${cardClass}">
            <div class="tweet-header">
              <span class="author">${t.authorName}</span>
              <span class="handle">${t.authorHandle}</span>
            </div>
            <div class="tweet-content">${t.content}</div>
            <div class="tweet-stats">
              <span class="stat">💬 ${t.replies}</span>
              <span class="stat">🔁 ${t.retweets}</span>
              <span class="stat">❤️ ${t.likes}</span>
              <a href="${t.url}" target="_blank" style="margin-left: auto;">查看原文 →</a>
            </div>
          </div>
        `;
      }).join('') + `
    </div>
    <div class="footer">
      由 AI 自动生成 · 数据来源: Twitter Lists
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('public/index.html', html);
console.log('Generated index.html');