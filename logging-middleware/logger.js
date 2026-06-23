const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJtb2thcmFzaXZhc2FpLjIzLml0QGFuaXRzLmVkdS5pbiIsImV4cCI6MTc4MjE5NjcxMSwiaWF0IjoxNzgyMTk1ODExLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNzA5ZWVmYTAtMjg0Ni00MjkyLThiZjgtNWI4MzE4ODU5ZDJmIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoibW9rYXJhIHNpdmFzYWkiLCJzdWIiOiI5YjgyMWJlMi03NTkzLTQ5MDktYmMyOS1mMTI0NTdkNDg2YzkifSwiZW1haWwiOiJtb2thcmFzaXZhc2FpLjIzLml0QGFuaXRzLmVkdS5pbiIsIm5hbWUiOiJtb2thcmEgc2l2YXNhaSIsInJvbGxObyI6ImEyMzEyNjUxMTE2MCIsImFjY2Vzc0NvZGUiOiJNVHF4YXIiLCJjbGllbnRJRCI6IjliODIxYmUyLTc1OTMtNDkwOS1iYzI5LWYxMjQ1N2Q0ODZjOSIsImNsaWVudFNlY3JldCI6IlZRVVVoR3d6UkRCSkRGdXgifQ.-iAcp8MNkmTIa6C_n-FPoFt0IGauoEk5xb0Yt_0iZMQ";

async function Log(
  stack,
  level,
  packageName,
  message
) {
  try {
    const response = await fetch(
      "http://4.224.186.213/evaluation-service/logs",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          stack,
          level,
          package: packageName,
          message
        })
      }
    );

    const data = await response.json();

    return data;

  } catch (error) {
    console.log(error.message);
  }
}

module.exports = Log;