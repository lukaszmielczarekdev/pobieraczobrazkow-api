import { Request, Response } from "express";
import axios from "axios";
import mongoose from "mongoose";
import Image from "../models/ImageModel";
import { config } from "../config/config";

export const addImage = async (req: Request, res: Response) => {
  const { sourceUrl, addDate } = req.body;

  try {
    const raw = await axios.get(sourceUrl, {
      responseType: "arraybuffer",
    });

    let convertedToBase64 = Buffer.from(raw.data, "binary").toString("base64");
    let base64Image = `data:${raw.headers["content-type"]};base64,${convertedToBase64}`;

    const id = new mongoose.Types.ObjectId();
    const newImage = new Image({
      _id: id,
      sourceUrl,
      addDate,
      file: base64Image,
      downloadDate: new Date().toLocaleString("en-GB"),
    });
    await newImage.save();

    res.status(201).json({
      ...newImage.toObject(),
      databaseUrl: `${config.server.url}/images/get/${newImage._id}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};

export const getImages = async (req: Request, res: Response) => {
  const { page } = req.query;
  const limit = 5;
  const skip = (Number(page) - 1) * limit;

  try {
    const images = await Image.find({ ...req.query })
      .limit(limit)
      .skip(skip);

    if (images.length === 0) return res.status(404).send("Images not found.");
    const count = await Image.estimatedDocumentCount({});

    res.status(200).json({
      images,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};

export const getImage = async (req: Request, res: Response) => {
  const { id: _id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(_id))
      return res.status(404).send("Image not found.");

    const image = await Image.findOne({ _id }).select({
      _id: 0,
      updatedAt: 0,
      createdAt: 0,
    });

    if (!image) return res.status(404).json({ message: "Image not found." });

    const [fileInfo, fileData] = image.file.split(",");
    const contentType = fileInfo.split(";")[0].replace("data:", "");

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", fileData.length);

    res.send(Buffer.from(fileData, "base64"));
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};
