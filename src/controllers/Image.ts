import { Request, Response } from "express";
import axios, { AxiosError } from "axios";
import mongoose from "mongoose";
import async from "async";
import Image from "../models/ImageModel";
import QueueTask from "../models/QueueTaskModel";

interface Task {
  imageUrl: string;
  imageId: mongoose.Types.ObjectId;
  addDate: Date;
}

// 3. Pobiera, konwertuje, zapisuje obrazek w bazie danych i usuwa zadanie z bazy.
const downloadImage = async (
  sourceUrl: string,
  imageId: mongoose.Types.ObjectId,
  addDate: Date
) => {
  try {
    const downloadedImage = await axios.get(sourceUrl, {
      responseType: "arraybuffer",
    });

    let convertedToBase64 = Buffer.from(
      downloadedImage.data,
      "binary"
    ).toString("base64");
    let base64Image = `data:${downloadedImage.headers["content-type"]};base64,${convertedToBase64}`;

    const newImage = new Image({
      _id: imageId,
      sourceUrl,
      addDate,
      file: base64Image,
      downloadDate: new Date(),
    });

    await newImage.save();

    // po zapisaniu obrazka usuwa zakończone zadanie z bazy danych
    await QueueTask.findOneAndRemove({ imageId });
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      // jeśli obrazka nie ma pod danym adresem, zadanie jest usuwane z bazy
      error.code === "ENOTFOUND" &&
        (await QueueTask.findOneAndRemove({ imageId }));
    } else if (typeof error === "string") {
      console.log(error);
    }
  }
};

export const getImages = async (req: Request, res: Response) => {
  const { page } = req.query;
  const limit = 3;
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

    res.status(200).json({ ...image.toObject() });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};

// 2. Odpalają się zadania z kolejki (w tym przypadku jedno na raz).
// Jeśli nastąpi restart to tutaj system sprawdza czy są jakieś zadania w bazie
// i ewentualnie dodaje je do kolejki.
const queue = async.queue(async (task: Task, callback) => {
  await downloadImage(task.imageUrl, task.imageId, task.addDate);
  callback?.();
}, 1);

queue.drain(() => {
  console.log("All downloads finished.");
});

queue.error((error, task) => {
  console.log(error);
});

const checkForTasks = async (queue: async.QueueObject<Task>) => {
  const queueTasks = await QueueTask.find({});
  if (queueTasks.length > 0) {
    queueTasks.map((task) => {
      task.imageId &&
        queue.push({
          imageUrl: task.imageUrl,
          imageId: new mongoose.Types.ObjectId(task.imageId),
          addDate: task.addDate,
        });
    });
  }
};
checkForTasks(queue);

// 1. dodaje do bazy danych oraz do kolejki zadanie pobrania obrazka i zwraca id obrazka
// clientowi (na podstawie id client może pobrać później dane obrazka).
export const addDownloadToQueue = async (req: Request, res: Response) => {
  const { sourceUrl } = req.body;

  try {
    // -generuje id obrazka, będące również jego nazwą
    const imageId = new mongoose.Types.ObjectId();
    const addDate = new Date();

    // -dodaje zadanie do bazy danych (na wypadek restartu)
    const newQueueTask = new QueueTask({
      imageUrl: sourceUrl,
      imageId: imageId.toString(),
      addDate,
    });
    await newQueueTask.save();

    // -dodaje zadanie do kolejki
    queue.push({ imageUrl: sourceUrl, imageId, addDate });
    res.status(201).json({ imageId: imageId.toString() });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong." });
  }
};
