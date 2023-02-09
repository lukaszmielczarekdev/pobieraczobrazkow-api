import { Request, Response } from "express";
import Image from "../models/ImageModel";
import mongoose from "mongoose";
import { config } from "../config/config";

import axios from "axios";

export const addImage = async (req: Request, res: Response) => {
  const { sourceUrl, addDate } = req.body;

  try {
    const raw = await axios.get(sourceUrl, {
      responseType: "arraybuffer",
    });

    let base64 = Buffer.from(raw.data, "binary").toString("base64");
    let image = `data:${raw.headers["content-type"]};base64,${base64}`;

    const id = new mongoose.Types.ObjectId();
    const newImage = new Image({
      _id: id,
      sourceUrl,
      addDate,
      file: image,
      downloadDate: new Date(),
    });

    await newImage.save();

    res.status(201).json({ image: newImage });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};

export const getImages = async (req: Request, res: Response) => {
  try {
    const images = await Image.find();

    if (images.length === 0) return res.status(404).send("Images not found.");

    res.status(200).json(images);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};

export const getImage = async (req: Request, res: Response) => {
  const { id: _id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(_id))
      return res.status(404).send("Image not found.");

    const image = await Image.findOne({ _id });

    if (!image) return res.status(404).json({ message: "Image not found." });

    res.status(200).json({
      ...image,
      databaseUrl: `${config.server.url}/images/${image._id}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};
