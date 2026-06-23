const express = require("express");

const app = express();

const notificationRoutes =
require("./routes/notificationRoutes");

app.use(express.json());

app.use("/", notificationRoutes);

app.listen(3000, () => {
  console.log(
    "Server running on port 3000"
  );
});