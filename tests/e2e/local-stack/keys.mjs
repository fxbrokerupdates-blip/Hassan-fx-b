import crypto from "node:crypto";
const secret = "super-secret-jwt-token-with-at-least-32-characters-long";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (p) => { const h = b64({ alg: "HS256", typ: "JWT" }), b = b64(p); return `${h}.${b}.${crypto.createHmac("sha256", secret).update(`${h}.${b}`).digest("base64url")}`; };
const exp = Math.floor(Date.now() / 1000) + 3600 * 24 * 365;
console.log(`ANON=${sign({ role: "anon", iss: "supabase", exp })}`);
console.log(`SERVICE=${sign({ role: "service_role", iss: "supabase", exp })}`);
console.log(`SECRET=${secret}`);
