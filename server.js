require('dotenv').config();
const http = require("http");
const fs = require("fs");
const path = require("path");

// Nạp trực tiếp function handler
const authHandler = require("./netlify/functions/auth").handler;
const PORT = 8888;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // 1. Xử lý Function /.netlify/functions/auth (Giống hệt Netlify)
  if (pathname === "/.netlify/functions/auth") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      const event = {
        httpMethod: req.method,
        headers: req.headers,
        body: body
      };
      try {
        const result = await authHandler(event);
        res.writeHead(result.statusCode || 200, result.headers || {});
        res.end(result.body || "");
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: err.message }));
      }
    });
    return;
  }

  // 2. Định tuyến truy cập trang Templates (Giống file netlify.toml)
  let filePath = "";
  if (pathname === "/" || pathname === "/index.html") {
    filePath = path.join(__dirname, "public", "templates", "index.html");
  } else if (pathname === "/teacher") {
    filePath = path.join(__dirname, "public", "templates", "teacher.html");
  } else if (pathname === "/student") {
    filePath = path.join(__dirname, "public", "templates", "student.html");
  } else if (pathname === "/quiz") {
    filePath = path.join(__dirname, "public", "templates", "quiz.html");
  } else {
    // Trả file tĩnh (CSS, JS, ảnh chữ ký, JSON) đặt trong public/
    filePath = path.join(__dirname, "public", pathname);
  }

  // 3. Đọc file tĩnh và trả về duy nhất
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n=============================`);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`=============================\n`);
});