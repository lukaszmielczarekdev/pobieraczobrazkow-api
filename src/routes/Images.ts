import express from "express";
import { addDownloadToQueue, getImage, getImages } from "../controllers/Image";

const routes = express.Router();

routes.get("/get", getImages);
routes.get("/get/:id", getImage);
routes.post("/add", addDownloadToQueue);

export default routes;
