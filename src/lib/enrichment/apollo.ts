const APOLLO_API = "https://api.apollo.io/v1";

export async function enrichPerson(input: { name?: string; email?: string; linkedin_url?: string }) {
  const res = await fetch(`${APOLLO_API}/people/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": process.env.APOLLO_API_KEY! },
    body: JSON.stringify(input),
  });
  return res.json();
}
