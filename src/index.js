require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const { PrismaClient } = require("@prisma/client");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const fs = require("fs");

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer S3 configuration
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `uploads/${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|avif|webp|svg)$/i)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(methodOverride("_method"));

// Session setup
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    },
  })
);

app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.user = req.session.user || null;
  next();
});

// Make categories available to all templates
app.use(async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.locals.categories = categories;
    next();
  } catch (error) {
    console.error("Error loading categories:", error);
    res.locals.categories = [];
    next();
  }
});

// Middleware xác thực dùng session
const authenticateToken = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error_msg", "Please login to access this resource");
    return res.redirect("/login");
  }
  req.user = req.session.user;
  next();
};

// Admin middleware
const isAdmin = async (req, res, next) => {
  if (!req.session.user) {
    req.flash("error", "Vui lòng đăng nhập để truy cập trang này");
    return res.redirect("/login");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.user.id },
    });

    if (!user || user.role !== "ADMIN") {
      req.flash("error", "Bạn không có quyền truy cập trang này");
      return res.redirect("/");
    }

    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    req.flash("error", "Có lỗi xảy ra khi kiểm tra quyền truy cập");
    res.redirect("/");
  }
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(400).json({ errors: errors.array() });
    }
    req.flash("error_msg", errors.array()[0].msg);
    return res.redirect("back");
  }
  next();
};

// Helper function to create slug
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/([^0-9a-z-\s])/g, "")
    .replace(/(\s+)/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Routes
app.get("/", async (req, res) => {
  try {
    const [posts, popularPosts, categories] = await Promise.all([
      prisma.post.findMany({
        include: {
          author: {
            select: { id: true, name: true },
          },
          category: true,
          _count: {
            select: { comments: true },
          },
        },
        take: 7,
        orderBy: { createdAt: "desc" },
      }),
      prisma.post.findMany({
        where: {
          published: true,
        },
        include: {
          author: {
            select: { id: true, name: true },
          },
          category: true,
          _count: {
            select: { comments: true },
          },
        },
        orderBy: [{ views: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      prisma.category.findMany({
        orderBy: { name: "asc" },
      }),
    ]);
    res.render("home", { posts, popularPosts, categories });
  } catch (error) {
    req.flash("error_msg", "Error loading posts");
    res.render("home", { posts: [], popularPosts: [], categories: [] });
  }
});

// Auth Routes
app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.render("auth/login");
});

app.get("/register", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.render("auth/register");
});

app.post(
  "/auth/register",
  [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("name").notEmpty().withMessage("Name is required"),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password, name } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });

      req.session.user = { id: user.id, email: user.email, role: user.role };
      req.flash("success_msg", "Registration successful!");
      res.redirect("/");
    } catch (error) {
      if (error.code === "P2002") {
        req.flash("error_msg", "Email already exists");
      } else {
        req.flash("error_msg", "Error during registration");
      }
      res.redirect("/register");
    }
  }
);

app.post(
  "/auth/login",
  [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password").exists().withMessage("Password is required"),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        req.flash("error_msg", "Invalid credentials");
        return res.redirect("/login");
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        req.flash("error_msg", "Invalid credentials");
        return res.redirect("/login");
      }

      req.session.user = { id: user.id, email: user.email, role: user.role };
      req.flash("success_msg", "Login successful!");
      res.redirect("/");
    } catch (error) {
      req.flash("error_msg", "Error during login");
      res.redirect("/login");
    }
  }
);

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Blog Routes
app.get("/posts/new", authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.render("posts/new", { categories });
  } catch (error) {
    req.flash("error_msg", "Error loading categories");
    res.redirect("/");
  }
});

// Add new route for managing user's posts
app.get("/my-posts", authenticateToken, async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: {
        authorId: req.user.id,
      },
      include: {
        category: true,
        _count: {
          select: { comments: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.render("posts/my-posts", { posts });
  } catch (error) {
    console.error("Error fetching user's posts:", error);
    req.flash("error_msg", "Error loading your posts");
    res.redirect("/");
  }
});

app.post(
  "/posts",
  authenticateToken,
  upload.none(),
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("content").notEmpty().withMessage("Content is required"),
    body("categoryId").isInt().withMessage("Category is required"),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, content, categoryId, published = false, thumbnailUrl } = req.body;
      const slug = createSlug(title);

      // Check if slug already exists
      const existingPost = await prisma.post.findUnique({
        where: { slug },
      });

      if (existingPost) {
        req.flash("error_msg", "A post with this title already exists");
        return res.redirect("/posts/new");
      }

      const thumbnail = thumbnailUrl || null;

      const post = await prisma.post.create({
        data: {
          title,
          slug,
          content,
          thumbnail,
          published,
          authorId: req.user.id,
          categoryId: parseInt(categoryId),
        },
      });

      req.flash("success_msg", "Post created successfully!");
      res.redirect(`/posts/${post.slug}`);
    } catch (error) {
      req.flash("error_msg", "Error creating post");
      res.redirect("/posts/new");
    }
  }
);

app.get("/posts", async (req, res) => {
  try {
    const { search = "", category = "", page = 1 } = req.query;
    const pageSize = 9  ;
    const pageNum = parseInt(page) || 1;
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    const where = {
      published: true,
    };
    if (search && search.trim() !== "") {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }
    if (category) {
      where.categoryId = parseInt(category);
    }
    const totalPosts = await prisma.post.count({ where });
    const totalPages = Math.ceil(totalPosts / pageSize);
    const posts = await prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        category: true,
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    });
    res.render("posts/index", {
      posts,
      categories,
      search,
      categoryId: category,
      page: pageNum,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    req.flash("error_msg", "Không thể tải danh sách bài viết");
    res.render("posts/index", {
      posts: [],
      categories: [],
      search: "",
      categoryId: "",
      page: 1,
      totalPages: 1,
    });
  }
});

app.get("/posts/:slug", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug },
      include: {
        author: true,
        category: true,
        comments: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    if (!post) {
      req.flash("error_msg", "Không tìm thấy bài viết");
      return res.redirect("/");
    }

    // Get related posts
    const posts = await prisma.post.findMany({
      where: {
        categoryId: post.categoryId,
        published: true,
      },
      include: {
        author: true,
        category: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    res.render("posts/show", {
      post,
      posts,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    req.flash("error_msg", "Có lỗi xảy ra khi tải bài viết");
    res.redirect("/");
  }
});

// Add new route for view count updates
app.post("/posts/:slug/view", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: { views: { increment: 1 } },
    });

    res.json({ views: updatedPost.views });
  } catch (error) {
    console.error("Error updating view count:", error);
    res.status(500).json({ error: "Error updating view count" });
  }
});

app.get("/posts/:slug/edit", authenticateToken, async (req, res) => {
  try {
    const [post, categories] = await Promise.all([
      prisma.post.findUnique({
        where: { slug: req.params.slug },
      }),
      prisma.category.findMany(),
    ]);

    if (!post) {
      req.flash("error_msg", "Post not found");
      return res.redirect("/");
    }

    if (post.authorId !== req.user.id) {
      req.flash("error_msg", "Not authorized");
      return res.redirect("/");
    }

    res.render("posts/edit", { post, categories });
  } catch (error) {
    req.flash("error_msg", "Error loading post");
    res.redirect("/");
  }
});

app.put(
  "/posts/:slug",
  authenticateToken,
  upload.none(),
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("content").notEmpty().withMessage("Content is required"),
    body("categoryId").isInt().withMessage("Category is required"),
  ],
  validate,
  async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await prisma.post.findUnique({
        where: { slug },
      });

      if (!post) {
        req.flash("error_msg", "Post not found");
        return res.redirect("/");
      }

      if (post.authorId !== req.user.id) {
        req.flash("error_msg", "Not authorized");
        return res.redirect("/");
      }

      const newSlug = createSlug(req.body.title);
      // Check if new slug already exists (excluding current post)
      if (newSlug !== slug) {
        const existingPost = await prisma.post.findUnique({
          where: { slug: newSlug },
        });

        if (existingPost) {
          req.flash("error_msg", "A post with this title already exists");
          return res.redirect(`/posts/${slug}/edit`);
        }
      }

      // Handle thumbnail update
      let thumbnail = post.thumbnail;
      if (req.body.thumbnailUrl) {
        thumbnail = req.body.thumbnailUrl;
      }

      const updatedPost = await prisma.post.update({
        where: { slug },
        data: {
          title: req.body.title,
          slug: newSlug,
          content: req.body.content,
          thumbnail,
          categoryId: parseInt(req.body.categoryId),
          published: req.body.published === "on",
        },
      });

      req.flash("success_msg", "Post updated successfully!");
      res.redirect(`/posts/${updatedPost.slug}`);
    } catch (error) {
      console.error("Update post error:", error);
      req.flash("error_msg", "Error updating post");
      res.redirect(`/posts/${req.params.slug}/edit`);
    }
  }
);

app.delete("/posts/:slug", authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await prisma.post.findUnique({
      where: { slug },
    });

    if (!post) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(404).json({ error: "Post not found" });
      }
      req.flash("error_msg", "Post not found");
      return res.redirect("/");
    }

    if (post.authorId !== req.user.id) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(403).json({ error: "Not authorized" });
      }
      req.flash("error_msg", "Not authorized");
      return res.redirect("/");
    }

    await prisma.post.delete({
      where: { slug },
    });

    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(204).send();
    }

    req.flash("success_msg", "Post deleted successfully!");
    res.redirect("/");
  } catch (error) {
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(500).json({ error: "Internal server error" });
    }
    req.flash("error_msg", "Error deleting post");
    res.redirect("/");
  }
});

// Comment Routes
app.post(
  "/posts/:slug/comments",
  authenticateToken,
  [body("content").notEmpty().withMessage("Comment content is required")],
  validate,
  async (req, res) => {
    try {
      const { slug } = req.params;
      const { content } = req.body;

      const post = await prisma.post.findUnique({
        where: { slug },
      });

      if (!post) {
        req.flash("error_msg", "Post not found");
        return res.redirect("/");
      }

      await prisma.comment.create({
        data: {
          content,
          postId: post.id,
          authorId: req.user.id,
        },
      });

      req.flash("success_msg", "Comment added successfully!");
      res.redirect(`/posts/${slug}`);
    } catch (error) {
      req.flash("error_msg", "Error adding comment");
      res.redirect(`/posts/${req.params.slug}`);
    }
  }
);

app.delete("/comments/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!comment) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(404).json({ error: "Comment not found" });
      }
      req.flash("error_msg", "Comment not found");
      return res.redirect("back");
    }

    if (comment.authorId !== req.user.id) {
      if (req.xhr || req.headers.accept.includes("application/json")) {
        return res.status(403).json({ error: "Not authorized" });
      }
      req.flash("error_msg", "Not authorized");
      return res.redirect("back");
    }

    await prisma.comment.delete({
      where: { id: parseInt(id) },
    });

    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(204).send();
    }

    req.flash("success_msg", "Comment deleted successfully!");
    res.redirect("back");
  } catch (error) {
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(500).json({ error: "Internal server error" });
    }
    req.flash("error_msg", "Error deleting comment");
    res.redirect("back");
  }
});

// Category routes
app.get("/categories/manage", isAdmin, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { name: "asc" },
    });
    res.render("categories/manage", { categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    req.flash("error", "Không thể tải danh sách chuyên mục");
    res.redirect("/");
  }
});

app.get("/categories/new", isAdmin, (req, res) => {
  res.render("categories/new");
});

app.post("/categories", isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const slug = createSlug(name);

    // Check if category with same slug exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      req.flash("error", "Chuyên mục với tên này đã tồn tại");
      return res.redirect("/categories/new");
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
      },
    });

    req.flash("success", "Đã tạo chuyên mục mới thành công");
    res.redirect("/categories/manage");
  } catch (error) {
    console.error("Error creating category:", error);
    req.flash("error", "Không thể tạo chuyên mục mới");
    res.redirect("/categories/new");
  }
});

app.get("/categories/:slug/edit", isAdmin, async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
    });

    if (!category) {
      req.flash("error", "Không tìm thấy chuyên mục");
      return res.redirect("/categories/manage");
    }

    res.render("categories/edit", { category });
  } catch (error) {
    console.error("Error fetching category:", error);
    req.flash("error", "Không thể tải thông tin chuyên mục");
    res.redirect("/categories/manage");
  }
});

app.put("/categories/:slug", isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const newSlug = createSlug(name);

    // Check if new slug conflicts with existing category
    if (newSlug !== req.params.slug) {
      const existingCategory = await prisma.category.findUnique({
        where: { slug: newSlug },
      });

      if (existingCategory) {
        req.flash("error", "Chuyên mục với tên này đã tồn tại");
        return res.redirect(`/categories/${req.params.slug}/edit`);
      }
    }

    const category = await prisma.category.update({
      where: { slug: req.params.slug },
      data: {
        name,
        slug: newSlug,
        description,
      },
    });

    req.flash("success", "Đã cập nhật chuyên mục thành công");
    res.redirect("/categories/manage");
  } catch (error) {
    console.error("Error updating category:", error);
    req.flash("error", "Không thể cập nhật chuyên mục");
    res.redirect(`/categories/${req.params.slug}/edit`);
  }
});

app.delete("/categories/:slug", isAdmin, async (req, res) => {
  try {
    // Check if category has posts
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!category) {
      req.flash("error", "Không tìm thấy chuyên mục");
      return res.redirect("/categories/manage");
    }

    if (category._count.posts > 0) {
      req.flash("error", "Không thể xóa chuyên mục có bài viết");
      return res.redirect("/categories/manage");
    }

    await prisma.category.delete({
      where: { slug: req.params.slug },
    });

    req.flash("success", "Đã xóa chuyên mục thành công");
    res.redirect("/categories/manage");
  } catch (error) {
    console.error("Error deleting category:", error);
    req.flash("error", "Không thể xóa chuyên mục");
    res.redirect("/categories/manage");
  }
});

// Image upload route for thumbnail (S3)
app.post("/upload-image", authenticateToken, upload.single("thumbnail"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({
      url: req.file.location,
      uploaded: true
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.xhr || req.headers.accept.includes("application/json")) {
    return res.status(500).json({ error: "Something broke!" });
  }
  req.flash("error_msg", "Something went wrong!");
  res.redirect("/");
});

// 404 handler
app.use((req, res) => {
  if (req.xhr || req.headers.accept?.includes("application/json")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.status(404).render("404");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
