export async function findEmail(domain: string, name: string) {
  const res = await fetch(
    `https://api.hunter.io/v2/email-finder?domain=${domain}&full_name=${encodeURIComponent(name)}&api_key=${process.env.HUNTER_API_KEY}`
  );
  return res.json();
}

export async function verifyEmail(email: string) {
  const res = await fetch(
    `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${process.env.HUNTER_API_KEY}`
  );
  return res.json();
}
