# Blog API Server

A complete RESTful API server for a blog system built with Express.js, Prisma, and MySQL.

## Features

- User authentication (register/login)
- CRUD operations for blog posts
- Category management
- Comment system
- Role-based access control
- Input validation
- Error handling
- JWT authentication

## Prerequisites

- Node.js (v14 or higher)
- MySQL database
- npm or yarn package manager

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd blog-api-server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
DATABASE_URL="mysql://user:password@localhost:3306/blog_db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3000
NODE_ENV="development"
```

4. Update the DATABASE_URL with your MySQL credentials and create the database:
```sql
CREATE DATABASE blog_db;
```

5. Run Prisma migrations:
```bash
npx prisma migrate dev
```

6. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
  - Body: `{ "email": "user@example.com", "password": "password123", "name": "John Doe" }`

- `POST /api/auth/login` - Login user
  - Body: `{ "email": "user@example.com", "password": "password123" }`

### Posts

- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get a specific post
- `POST /api/posts` - Create a new post (requires authentication)
  - Body: `{ "title": "Post Title", "content": "Post content", "categoryId": 1, "published": false }`
- `PUT /api/posts/:id` - Update a post (requires authentication)
- `DELETE /api/posts/:id` - Delete a post (requires authentication)

### Categories

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a new category (requires authentication)
  - Body: `{ "name": "Category Name", "description": "Category description" }`

### Comments

- `POST /api/posts/:postId/comments` - Add a comment to a post (requires authentication)
  - Body: `{ "content": "Comment content" }`
- `DELETE /api/comments/:id` - Delete a comment (requires authentication)

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Error Handling

The API uses standard HTTP status codes:

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Development

To run the server in development mode with hot reloading:

```bash
npm run dev
```

## Database Migrations

To create a new migration after modifying the schema:

```bash
npx prisma migrate dev
```

To apply migrations in production:

```bash
npx prisma migrate deploy
```

## License

MIT 