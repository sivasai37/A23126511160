const Log = require("../../logging-middleware/logger");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJtb2thcmFzaXZhc2FpLjIzLml0QGFuaXRzLmVkdS5pbiIsImV4cCI6MTc4MjE5NjcxMSwiaWF0IjoxNzgyMTk1ODExLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNzA5ZWVmYTAtMjg0Ni00MjkyLThiZjgtNWI4MzE4ODU5ZDJmIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoibW9rYXJhIHNpdmFzYWkiLCJzdWIiOiI5YjgyMWJlMi03NTkzLTQ5MDktYmMyOS1mMTI0NTdkNDg2YzkifSwiZW1haWwiOiJtb2thcmFzaXZhc2FpLjIzLml0QGFuaXRzLmVkdS5pbiIsIm5hbWUiOiJtb2thcmEgc2l2YXNhaSIsInJvbGxObyI6ImEyMzEyNjUxMTE2MCIsImFjY2Vzc0NvZGUiOiJNVHF4YXIiLCJjbGllbnRJRCI6IjliODIxYmUyLTc1OTMtNDkwOS1iYzI5LWYxMjQ1N2Q0ODZjOSIsImNsaWVudFNlY3JldCI6IlZRVVVoR3d6UkRCSkRGdXgifQ.-iAcp8MNkmTIa6C_n-FPoFt0IGauoEk5xb0Yt_0iZMQ";

async function getNotifications() {
  try {

    await Log(
      "backend",
      "info",
      "service",
      "Fetching notifications"
    );

    const response = await fetch(
      "http://4.224.186.213/evaluation-service/notifications",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${TOKEN}`
        }
      }
    );

    console.log("STATUS:", response.status);

    const data = await response.json();

    console.log("API RESPONSE:");
    console.log(JSON.stringify(data, null, 2));

    return data.notifications || [];

  } catch (error) {

    console.log("SERVICE ERROR:");
    console.log(error);

    throw error;
  }
}

module.exports = {
  getNotifications
};