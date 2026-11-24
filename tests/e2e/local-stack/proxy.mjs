import http from "node:http";
const routes = [["/rest/v1", 3002], ["/auth/v1", 9999]];
http.createServer((req, res) => {
  const r = routes.find(([p]) => req.url.startsWith(p));
  if (!r) { res.writeHead(404); return res.end("not found"); }
  const path = req.url.slice(r[0].length) || "/";
  const headers = { ...req.headers, host: `localhost:${r[1]}` };
  const p = http.request({ host: "127.0.0.1", port: r[1], path, method: req.method, headers }, (pr) => { res.writeHead(pr.statusCode, pr.headers); pr.pipe(res); });
  p.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}).listen(54321, () => console.log("gateway on 54321"));
