// 极简 HTTPS 静态服务器 —— 仅用于本地/局域网真机测试陀螺仪（需要安全上下文）
// 用法: node server.js  然后手机访问 https://<电脑局域网IP>:8443
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 8443;
const ROOT = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const options = {
  key: fs.readFileSync(path.join(ROOT, "key.pem")),
  cert: fs.readFileSync(path.join(ROOT, "cert.pem")),
};

https.createServer(options, (req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(ROOT, urlPath);
  // 防目录穿越
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("403"); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("404 Not Found"); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, "0.0.0.0", () => {
  console.log(`HTTPS 服务已启动: https://0.0.0.0:${PORT}`);
  console.log(`手机访问: https://100.82.237.213:${PORT} （首次会提示证书不安全，选“仍然访问/继续”）`);
});
