import dotenv from "dotenv";

dotenv.config();

const API_URL = process.env.API_URL || "http://localhost:5000";
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || "";
const CONNECTION_URL = `mongodb+srv://lukaszmielczarekdev:${DATABASE_PASSWORD}@pobieraczobrazkow.7xtizdz.mongodb.net/?retryWrites=true&w=majority`;
const PORT = process.env.PORT || 5000;

export const config = {
  mongo: {
    url: CONNECTION_URL,
  },
  server: {
    port: PORT,
    url: API_URL,
  },
};
