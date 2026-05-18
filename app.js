import express from "express";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const app = express();

const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const currentSort = req.query.sort || "latest";
    const prismaSort = currentSort === "oldest" ? "asc" : "desc";

    const queryOptions = {
      skip: (page - 1) * 10,
      take: 10,
      orderBy: { createdAt: prismaSort },
    };

    if (search) {
      queryOptions.where = {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ],
      };
    }
    const totalAnnouncements = await prisma.announcement.count({
      where: queryOptions.where || {},
    });
    const totalPages = Math.ceil(totalAnnouncements / 10) || 1;

    const announcements = await prisma.announcement.findMany(queryOptions);

    res.render("index", {
      announcements,
      currentPage: page,
      totalPages,
      search,
      currentSort,
    });
  } catch (error) {
    next(error);
  }
});
app.get("/announcements", async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany();
    res.render("announcement", { announcements, errors: {}, announcement: {} });
  } catch (error) {
    next(error);
  }
});

// POST Route Fixed
app.post("/announcements", async (req, res, next) => {
  try {
    const { title, content, author, category, price } = req.body;
    let errors = {};

    if (!title || title.trim().length < 5) {
      errors.title = "Title is required and must be at least 5 characters long";
    }
    if (!content) {
      errors.content = "Content is required";
    }
    if (!author) {
      errors.author = "Author is required";
    }
    if (!category || !["sale", "service", "job", "other"].includes(category)) {
      errors.category = "Invalid category selected or category is required";
    }
    if (!price || isNaN(price) || Number(price) <= 0) {
      errors.price = "Valid price is required and must be a positive number";
    }

    if (Object.keys(errors).length > 0) {
      const announcements = await prisma.announcement.findMany();
      return res.render("announcement", {
        errors,
        announcement: req.body,
        announcements,
      });
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        content,
        author,
        category,
        price: parseFloat(price),
      },
    });

    res.redirect(`/announcements/${newAnnouncement.id}`);
  } catch (error) {
    next(error);
  }
});

app.get("/announcements/:id", async (req, res, next) => {
  const { id } = req.params;
  const announcement = await prisma.announcement.findUnique({
    where: { id: parseInt(id) },
  });
  res.render("announcement", { announcement });
});

app.delete("/announcements/:id", async (req, res, next) => {
  const { id } = req.params;
  if (isNaN(id)) {
    return res.status(400).send("Invalid announcement ID");
  }
  await prisma.announcement.delete({
    where: { id: parseInt(id) },
  });

  res.status(204).end();
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
  console.log(`Server running: http://localhost:${PORT}`);
});
