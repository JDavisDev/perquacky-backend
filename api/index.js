const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Express on Vercel");
});

app.get("/home", (req, res) => {
  res.status(200).json("Welcome home");
});

app.listen(4000, () => console.log("Server ready on port 4000."));
module.exports = app;
