const https = require("https");

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || "GET",
      headers: options.headers || {}
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log("1. Logging in as admin...");
  const loginRes = await request("https://broiler-farm-backend-3g4r-aag-d348.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { username: "admin", password: "admin123" });
  console.log("Login response status:", loginRes.status);
  const loginData = JSON.parse(loginRes.body);
  console.log("User data:", loginData.data?.user);
  const token = loginData.data?.accessToken;

  console.log("\n2. Fetching /api/sheds with admin token...");
  const shedsRes = await request("https://broiler-farm-backend-3g4r-aag-d348.vercel.app/api/sheds", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Sheds status:", shedsRes.status);
  console.log("Sheds body:", shedsRes.body);

  console.log("\n3. Fetching /api/auth/users with admin token...");
  const usersRes = await request("https://broiler-farm-backend-3g4r-aag-d348.vercel.app/api/auth/users", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Users status:", usersRes.status);
  console.log("Users body:", usersRes.body);
}

test().catch(console.error);
