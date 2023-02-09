import express from "express";
import mongoose from "mongoose";
import http from "http";
import cors from "cors";
import { config } from "./config/config";
import imageRoutes from "./routes/Images";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

app.get("/", (req, res) => res.send("Pobieracz Obrazków - API :)"));

mongoose
  .connect(config.mongo.url)
  .then(() => {
    console.log("Connected");
  })
  .catch((error) => console.log(error.message));

// Routes
app.use("/images", imageRoutes);

// Health check
app.get("/health", (req, res, next) =>
  res.status(200).json({ message: "Healthy" })
);

// Error handling
app.use((req, res, next) => {
  const error = new Error("404 (Not found)");
  console.log(error);
  return res.status(404).send(error.message);
});

http.createServer(app).listen(config.server.port, () => {
  console.log("Server running on port:" + config.server.port);
});
