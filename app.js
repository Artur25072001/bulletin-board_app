import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Routes
app.get("/", async (req, res, next) => {
  // TODO: головна сторінка з пошуком, сортуванням, пагінацією
});

app.get("/announcements", (req, res, next) => {
  // TODO: форма створення
});

app.post("/announcements", async (req, res, next) => {
  // TODO: створити оголошення
});

app.get("/announcements/:id", async (req, res, next) => {
  // TODO: показати оголошення
});

app.delete("/announcements/:id", async (req, res, next) => {
  // TODO: видалити оголошення
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render("404");
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error");
});

app.listen(PORT, () => {
  console.log(`Server running: <http://localhost>:${PORT}`);
});
