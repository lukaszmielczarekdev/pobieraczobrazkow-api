import express from "express";
import { addImage, getImage, getImages } from "../controllers/Image";

const routes = express.Router();

routes.get("/get", getImages);
routes.get("/get/:id", getImage);
routes.post("/add", addImage);

export default routes;
