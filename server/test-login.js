const apiBase = (
  process.env.API_URL ||
  process.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");
const email = process.env.TEST_LOGIN_EMAIL;
const password = process.env.TEST_LOGIN_PASSWORD;

if (!email || !password) {
  console.error("Set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD to run this check.");
  process.exit(1);
}

async function main() {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    console.error(`Login failed with HTTP ${response.status}.`);
    process.exitCode = 1;
    return;
  }

  const session = await response.json();
  if (typeof session.token !== "string" || !session.token) {
    console.error("Login response did not contain a session token.");
    process.exitCode = 1;
    return;
  }

  const verification = await fetch(`${apiBase}/api/auth/verify`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });

  console.log(`Login status: ${response.status}`);
  console.log(`Token verification status: ${verification.status}`);
  if (!verification.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Login check could not reach the API: ${error.message}`);
  process.exitCode = 1;
});
