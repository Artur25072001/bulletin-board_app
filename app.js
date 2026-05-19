import express from "express";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.get("/", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const currentSort = req.query.sort || "newest";
    const prismaSort = currentSort === "oldest" ? "asc" : "desc";

    const queryOptions = {
      skip: (page - 1) * 10,
      take: 10,
      orderBy: { createdAt: prismaSort },
    };

    if (search) {
      queryOptions.where = {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
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
    res.render("new", { data: {}, errors: {} });
  } catch (error) {
    next(error);
  }
});

app.post("/announcements", async (req, res, next) => {
  try {
    console.log(req.body);
    const { title, description, contact, category, price } = req.body;
    let errors = {};

    if (!title || title.trim().length < 5) {
      errors.title = "Title is required and must be at least 5 characters long";
    }
    if (!description) {
      errors.description = "Description is required";
    }
    if (!contact) {
      errors.contact = "Contact information is required";
    }
    if (!category || !["sale", "service", "job", "other"].includes(category)) {
      errors.category = "Invalid category selected or category is required";
    }
    if (!price || isNaN(price) || Number(price) <= 0) {
      errors.price = "Valid price is required and must be a positive number";
    }
    console.log("Validation errors:", errors);
    console.log("Received data:", {
      title,
      description,
      contact,
      category,
      price,
    });

    if (Object.keys(errors).length > 0) {
      const announcements = await prisma.announcement.findMany();
      console.log("Announcements:", announcements);
      return res.render("announcement", {
        errors,
        announcement: req.body,
        announcements,
      });
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        description,
        contactInfo: contact,
        category,
        price: parseFloat(price),
      },
    });

    console.log("New announcement created:", newAnnouncement);

    res.redirect(`/announcements/${newAnnouncement.id}`);
  } catch (error) {
    next(error);
  }
});

app.get("/announcements/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await prisma.announcement.findUnique({
      where: { id: parseInt(id) },
    });
    res.render("announcement", { announcement });
  } catch (error) {
    next(error);
  }
});

app.delete("/announcements/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) {
      return res.status(400).send("Invalid announcement ID");
    }
    await prisma.announcement.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render("404");
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  const errorData = {
    message:
      err.message || (typeof err === "string" ? err : "Internal Server Error"),
  };

  res.status(500).render("error", { error: errorData });
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
