import { Request, Response } from "express";
import axios, { AxiosError } from "axios";
import mongoose from "mongoose";
import Image from "../models/ImageModel";
import { config } from "../config/config";
import async from "async";
import FS from "fs";
import path from "path";

// 3. Pobiera, konwertuje i zapisuje obrazek w bazie danych.
const downloadImage = async (
  sourceUrl: string,
  imageId: mongoose.Types.ObjectId
) => {
  try {
    const extension = path.extname(sourceUrl);

    const response = await axios.get(sourceUrl, {
      responseType: "stream",
    });

    await response.data.pipe(
      FS.createWriteStream(`./public/images/${imageId.toString()}${extension}`)
    );

    // zapisuje do bazy danych
    const addDate = new Date().toLocaleString("en-GB");
    const raw = await axios.get(sourceUrl, {
      responseType: "arraybuffer",
    });

    let convertedToBase64 = Buffer.from(raw.data, "binary").toString("base64");
    let base64Image = `data:${raw.headers["content-type"]};base64,${convertedToBase64}`;

    const newImage = new Image({
      _id: imageId,
      sourceUrl,
      addDate,
      file: base64Image,
      downloadDate: new Date().toLocaleString("en-GB"),
    });

    await newImage.save();
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.log(error.response?.data.message);
    } else if (typeof error === "string") {
      console.log(error);
    }
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

type Task = {
  imageUrl: string;
  imageId: mongoose.Types.ObjectId;
};

// 2. Serwer odpala zadanie z kolejki (w tym przypadku jedno na raz).
const queue = async.queue(async (task: Task, callback) => {
  await downloadImage(task.imageUrl, task.imageId);
  callback?.();
}, 1);

queue.drain(() => {
  console.log("All downloads finished.");
});

queue.error((error, task) => {
  console.log(error);
});

// 1. dodaje zadanie pobrania obrazka do kolejki i zwraca url obrazka.
export const addDownloadToQueue = (req: Request, res: Response) => {
  const { sourceUrl } = req.body;
  // generuje id obrazka, będące również jego nazwą (potrzebne do szukania obrazka w bazie danych)
  const imageId = new mongoose.Types.ObjectId();

  const extension = path.extname(sourceUrl);

  try {
    queue.push({ imageUrl: sourceUrl, imageId });
    res.status(201).json({
      url: `${config.server.url}/images/${imageId.toString()}${extension}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};
