import express from "express";
import mongoose from "mongoose";
import http from "http";
import { config } from "./config/config";

const app = express();
app.get("/", (req, res) => res.send("Pobieracz Obrazków API :)"));

app.listen(config.server.port, () => {
  console.log("Server running on port:" + config.server.port);
});

mongoose
  .connect(config.mongo.url)
  .then(() => {
    console.log("Connected");
  })
  .catch((error) => console.log(error.message));
