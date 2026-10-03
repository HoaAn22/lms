require('dotenv').config();
const http = require("http");
const fs = require("fs");
const path = require("path");

const authHandler = require("./netlify/functions/auth").handler;
const attendanceHandler = require("./netlify/functions/attendance").handler;
const PORT = Number(process.env.PORT || 8888);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const ROUTE_MAP = {
  "/": path.join(__dirname, "public", "templates", "index.html"),
  "/index.html": path.join(__dirname, "public", "templates", "index.html"),
  "/teacher": path.join(__dirname, "public", "templates", "teacher.html"),
  "/student": path.join(__dirname, "public", "templates", "student.html"),
  "/quiz": path.join(__dirname, "public", "templates", "quiz.html")
};

const FUNCTION_MAP = {
  "/.netlify/functions/auth": authHandler,
  "/.netlify/functions/attendance": attendanceHandler
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/.netlify/functions/")) {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      const event = {
        httpMethod: req.method,
        headers: req.headers,
        body,
        queryStringParameters: Object.fromEntries(url.searchParams)
      };

      const handler = FUNCTION_MAP[pathname];
      if (!handler) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Function not found");
      }

      try {
        const result = await handler(event);
        res.writeHead(result.statusCode || 200, result.headers || { "Content-Type": "application/json" });
        res.end(result.body || "");
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: err.message }));
      }
    });
    return;
  }

  const filePath = ROUTE_MAP[pathname] || path.join(__dirname, "public", pathname);

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
  console.log(`Server: http://localhost:${PORT}`);
});