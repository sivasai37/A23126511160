export async function fetchNotifications() {
  const response = await fetch(
    "http://localhost:3000/priority"
  );

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return await response.json();
}