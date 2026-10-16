import express from "express";
// import http from "http";

// const server = http.createServer((req, res) => {
//   res.writeHead(200, { "Content-Type": "text/plain" });
//   res.end("Hello, World!");
// });

// server.listen(4000, () => {
//   console.log("Server is running on port 3000");
// });

const app = express();
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});
