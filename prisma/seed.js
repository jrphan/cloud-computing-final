const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

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

async function main() {
  //DELETE ALL DATA
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Web Development",
        slug: "web-development",
        description: "Tin tức và hướng dẫn về phát triển web",
      },
    }),
    prisma.category.create({
      data: {
        name: "Mobile Development",
        slug: "mobile-development",
        description: "Tin tức và hướng dẫn về phát triển ứng dụng di động",
      },
    }),
    prisma.category.create({
      data: {
        name: "DevOps & Cloud",
        slug: "devops-cloud",
        description: "Tin tức và hướng dẫn về DevOps và Cloud Computing",
      },
    }),
    prisma.category.create({
      data: {
        name: "AI & Machine Learning",
        slug: "ai-machine-learning",
        description: "Tin tức và hướng dẫn về AI và Machine Learning",
      },
    }),
    prisma.category.create({
      data: {
        name: "Programming Languages",
        slug: "programming-languages",
        description: "Tin tức và hướng dẫn về các ngôn ngữ lập trình",
      },
    }),
    prisma.category.create({
      data: {
        name: "Software Architecture",
        slug: "software-architecture",
        description: "Tin tức và hướng dẫn về kiến trúc phần mềm",
      },
    }),
  ]);

  // Create users
  const hashedPassword = await bcrypt.hash("123456x@X", 10);
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@gmail.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        name: "Martin Fowler",
        email: "martin@example.com",
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        name: "Kent Beck",
        email: "kent@example.com",
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        name: "Robert C. Martin",
        email: "unclebob@example.com",
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        name: "James Gosling",
        email: "james@example.com",
        password: hashedPassword,
      },
    }),
  ]);

  // Create posts
  const posts = await Promise.all([
    // Web Development posts
    prisma.post.create({
      data: {
        title: "Next.js 14: Những tính năng mới đáng chú ý",
        slug: "nextjs-14-nhung-tinh-nang-moi-dang-chu-y",
        content: `Next.js 14 đã được phát hành với nhiều cải tiến đáng chú ý. Phiên bản này tập trung vào việc cải thiện hiệu suất và trải nghiệm phát triển.

                Một trong những tính năng nổi bật nhất là Server Actions, cho phép bạn viết các hàm server-side trực tiếp trong components. Điều này giúp đơn giản hóa việc xử lý form và tương tác với database.

                Turbopack cũng đã được cải thiện đáng kể, mang lại tốc độ build và hot reload nhanh hơn. Ngoài ra, Partial Prerendering (PPR) là một tính năng mới cho phép bạn kết hợp static và dynamic rendering trong cùng một page.

                Với những cải tiến này, Next.js 14 tiếp tục khẳng định vị thế là một trong những framework React tốt nhất cho phát triển web hiện đại.`,
        thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c",
        published: true,
        authorId: users[0].id,
        categoryId: categories[0].id,
      },
    }),
    prisma.post.create({
      data: {
        title: "React Server Components: Tương lai của React",
        slug: "react-server-components-tuong-lai-cua-react",
        content: `React Server Components (RSC) là một trong những cải tiến quan trọng nhất của React trong những năm gần đây. RSC cho phép bạn viết components chạy trên server, giúp giảm kích thước bundle và cải thiện hiệu suất.

                Với RSC, bạn có thể truy cập trực tiếp database và filesystem từ components, đồng thời giữ được tính tương tác của client-side components. Điều này mở ra một kỷ nguyên mới cho việc phát triển ứng dụng React.

                Trong bài viết này, chúng ta sẽ tìm hiểu cách RSC hoạt động, cách tích hợp với Next.js, và những best practices khi sử dụng RSC trong dự án thực tế.`,
        thumbnail:
          "https://images.unsplash.com/photo-1633356122544-f134324a6cee",
        published: true,
        authorId: users[1].id,
        categoryId: categories[0].id,
      },
    }),

    // Mobile Development posts
    prisma.post.create({
      data: {
        title: "Flutter vs React Native: So sánh chi tiết",
        slug: "flutter-vs-react-native-so-sanh-chi-tiet",
        content: `Flutter và React Native là hai framework phổ biến nhất cho phát triển ứng dụng di động đa nền tảng. Mỗi framework đều có những ưu điểm và nhược điểm riêng.

                Flutter sử dụng Dart và có hiệu suất tốt hơn nhờ việc biên dịch trực tiếp sang native code. Trong khi đó, React Native cho phép bạn tái sử dụng kiến thức JavaScript/React và có cộng đồng lớn hơn.

                Bài viết sẽ phân tích chi tiết về hiệu suất, trải nghiệm phát triển, khả năng mở rộng, và các yếu tố khác để giúp bạn chọn framework phù hợp cho dự án của mình.`,
        thumbnail:
          "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c",
        published: true,
        authorId: users[2].id,
        categoryId: categories[1].id,
      },
    }),

    // DevOps & Cloud posts
    prisma.post.create({
      data: {
        title: "Docker và Kubernetes: Hướng dẫn từ cơ bản đến nâng cao",
        slug: "docker-va-kubernetes-huong-dan-tu-co-ban-den-nang-cao",
        content: `Docker và Kubernetes đã trở thành những công cụ không thể thiếu trong thế giới DevOps hiện đại. Docker giúp containerize ứng dụng, trong khi Kubernetes quản lý và tự động hóa việc triển khai các container.

                Bài viết sẽ hướng dẫn bạn từ những khái niệm cơ bản về container và orchestration, đến việc xây dựng một CI/CD pipeline hoàn chỉnh với Docker và Kubernetes.

                Chúng ta sẽ tìm hiểu về Dockerfile, Docker Compose, Kubernetes manifests, và cách triển khai ứng dụng microservices trên Kubernetes cluster.`,
        thumbnail:
          "https://images.unsplash.com/photo-1627398242454-45a1465c2479",
        published: true,
        authorId: users[3].id,
        categoryId: categories[2].id,
      },
    }),

    // AI & Machine Learning posts
    prisma.post.create({
      data: {
        title: "ChatGPT và tương lai của AI trong phát triển phần mềm",
        slug: "chatgpt-va-tuong-lai-cua-ai-trong-phat-trien-phan-mem",
        content: `ChatGPT và các mô hình AI tương tự đang thay đổi cách chúng ta phát triển phần mềm. Từ việc viết code, debug, đến tối ưu hóa hiệu suất, AI đang trở thành một công cụ không thể thiếu.

                Bài viết sẽ phân tích cách ChatGPT và các công cụ AI khác có thể hỗ trợ quá trình phát triển phần mềm, đồng thời thảo luận về những thách thức và cơ hội trong tương lai.

                Chúng ta cũng sẽ tìm hiểu về cách tích hợp AI vào workflow phát triển phần mềm hiện đại và những best practices khi sử dụng AI trong lập trình.`,
        thumbnail:
          "https://images.unsplash.com/photo-1677442136019-21780ecad995",
        published: true,
        authorId: users[4].id,
        categoryId: categories[3].id,
      },
    }),

    // Programming Languages posts
    prisma.post.create({
      data: {
        title: "Rust vs Go: So sánh hai ngôn ngữ lập trình hệ thống",
        slug: "rust-vs-go-so-sanh-hai-ngon-ngu-lap-trinh-he-thong",
        content: `Rust và Go là hai ngôn ngữ lập trình hệ thống hiện đại đang ngày càng phổ biến. Cả hai đều tập trung vào hiệu suất và tính đồng thời, nhưng có những cách tiếp cận khác nhau.

                Rust nổi bật với hệ thống ownership và borrowing, giúp đảm bảo an toàn bộ nhớ mà không cần garbage collector. Trong khi đó, Go đơn giản hóa việc lập trình đồng thời với goroutines và channels.

                Bài viết sẽ so sánh chi tiết về cú pháp, hiệu suất, khả năng mở rộng, và các use case phù hợp cho mỗi ngôn ngữ.`,
        thumbnail: "https://images.unsplash.com/photo-1556155092-490a1ba16284",
        published: true,
        authorId: users[0].id,
        categoryId: categories[4].id,
      },
    }),

    // Software Architecture posts
    prisma.post.create({
      data: {
        title: "Microservices vs Monolith: Khi nào nên chọn cái nào?",
        slug: "microservices-vs-monolith-khi-nao-nen-chon-cai-nao",
        content: `Việc lựa chọn giữa kiến trúc microservices và monolith là một quyết định quan trọng trong thiết kế hệ thống. Mỗi cách tiếp cận đều có những ưu điểm và nhược điểm riêng.

                Microservices cho phép đội ngũ phát triển độc lập và dễ dàng mở rộng, nhưng cũng đòi hỏi nhiều nỗ lực trong việc quản lý và vận hành. Monolith đơn giản hơn trong phát triển ban đầu nhưng có thể khó mở rộng.

                Bài viết sẽ phân tích các yếu tố cần xem xét khi lựa chọn kiến trúc, bao gồm quy mô dự án, đội ngũ phát triển, và yêu cầu về khả năng mở rộng.`,
        thumbnail:
          "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
        published: true,
        authorId: users[1].id,
        categoryId: categories[5].id,
      },
    }),

    // New Web Development post
    prisma.post.create({
      data: {
        title: "TypeScript 5.0: Những tính năng mới và cách sử dụng",
        slug: "typescript-5-0-nhung-tinh-nang-moi-va-cach-su-dung",
        content: `TypeScript 5.0 đã mang đến nhiều cải tiến đáng chú ý cho cộng đồng phát triển. Phiên bản này tập trung vào việc cải thiện hiệu suất và thêm các tính năng mới hữu ích.

                Một trong những tính năng nổi bật là Decorators, cho phép bạn thêm metadata và thay đổi hành vi của classes và methods. Ngoài ra, const type parameters giúp tối ưu hóa type inference và làm code TypeScript chặt chẽ hơn.

                Bài viết sẽ hướng dẫn chi tiết cách sử dụng các tính năng mới này trong dự án thực tế, cùng với các best practices và ví dụ cụ thể.`,
        thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea",
        published: true,
        authorId: users[2].id,
        categoryId: categories[0].id,
      },
    }),

    // New Mobile Development post
    prisma.post.create({
      data: {
        title: "SwiftUI vs UIKit: Lựa chọn nào cho iOS Development?",
        slug: "swiftui-vs-uikit-lua-chon-nao-cho-ios-development",
        content: `SwiftUI và UIKit là hai framework chính để phát triển ứng dụng iOS. Mỗi framework đều có những ưu điểm và trường hợp sử dụng riêng.

                SwiftUI mang đến cách tiếp cận declarative và modern, giúp phát triển UI nhanh hơn và dễ bảo trì. Trong khi đó, UIKit vẫn là lựa chọn tốt cho các ứng dụng phức tạp và cần tùy biến cao.

                Bài viết sẽ phân tích chi tiết về hiệu suất, khả năng tùy biến, và các yếu tố khác để giúp bạn chọn framework phù hợp cho dự án iOS của mình.`,
        thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c",
        published: true,
        authorId: users[3].id,
        categoryId: categories[1].id,
      },
    }),

    // New DevOps & Cloud post
    prisma.post.create({
      data: {
        title: "AWS Lambda và Serverless Architecture: Hướng dẫn thực hành",
        slug: "aws-lambda-va-serverless-architecture-huong-dan-thuc-hanh",
        content: `Serverless Architecture đang trở thành xu hướng trong phát triển ứng dụng hiện đại. AWS Lambda là một trong những dịch vụ serverless phổ biến nhất.

                Bài viết sẽ hướng dẫn bạn cách xây dựng ứng dụng serverless với AWS Lambda, từ việc setup môi trường đến triển khai và monitoring. Chúng ta sẽ tìm hiểu về các best practices, cách xử lý cold start, và tối ưu hóa chi phí.

                Ngoài ra, bài viết cũng sẽ đề cập đến việc tích hợp Lambda với các dịch vụ AWS khác như API Gateway, DynamoDB, và S3.`,
        thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479",
        published: true,
        authorId: users[4].id,
        categoryId: categories[2].id,
      },
    }),

    // New AI & Machine Learning post
    prisma.post.create({
      data: {
        title: "Machine Learning trong thực tế: Từ lý thuyết đến ứng dụng",
        slug: "machine-learning-trong-thuc-te-tu-ly-thuyet-den-ung-dung",
        content: `Machine Learning đang thay đổi cách chúng ta giải quyết các vấn đề trong thực tế. Từ việc dự đoán xu hướng đến phân tích dữ liệu, ML đang trở thành công cụ không thể thiếu.

                Bài viết sẽ hướng dẫn bạn cách áp dụng Machine Learning vào các bài toán thực tế, từ việc chuẩn bị dữ liệu đến triển khai model. Chúng ta sẽ tìm hiểu về các thuật toán phổ biến, cách đánh giá model, và các best practices trong ML.

                Ngoài ra, bài viết cũng sẽ đề cập đến các thách thức và giải pháp khi triển khai ML trong môi trường production.`,
        thumbnail: "https://images.unsplash.com/photo-1677442136019-21780ecad995",
        published: true,
        authorId: users[0].id,
        categoryId: categories[3].id,
      },
    }),
  ]);

  // Create comments
  await Promise.all([
    // Comments for Web Development posts
    prisma.comment.create({
      data: {
        content:
          "Next.js 14 thực sự là một bước tiến lớn! Server Actions giúp code của tôi gọn gàng hơn nhiều.",
        postId: posts[0].id,
        authorId: users[1].id,
      },
    }),
    prisma.comment.create({
      data: {
        content:
          "RSC là tương lai của React, nhưng vẫn cần thời gian để cộng đồng thích nghi với cách tiếp cận mới này.",
        postId: posts[1].id,
        authorId: users[2].id,
      },
    }),

    // Comments for Mobile Development posts
    prisma.comment.create({
      data: {
        content:
          "Tôi đã thử cả Flutter và React Native, và phải nói Flutter có hiệu suất tốt hơn đáng kể.",
        postId: posts[2].id,
        authorId: users[3].id,
      },
    }),

    // Comments for DevOps & Cloud posts
    prisma.comment.create({
      data: {
        content:
          "Docker và Kubernetes đã thay đổi hoàn toàn cách chúng ta triển khai ứng dụng. Bài viết rất hữu ích!",
        postId: posts[3].id,
        authorId: users[4].id,
      },
    }),

    // Comments for AI & Machine Learning posts
    prisma.comment.create({
      data: {
        content:
          "ChatGPT đã giúp tôi tiết kiệm rất nhiều thời gian trong việc viết code và debug.",
        postId: posts[4].id,
        authorId: users[0].id,
      },
    }),

    // Comments for Programming Languages posts
    prisma.comment.create({
      data: {
        content:
          "Rust có learning curve khá dốc, nhưng một khi đã quen, bạn sẽ thấy nó rất mạnh mẽ.",
        postId: posts[5].id,
        authorId: users[1].id,
      },
    }),

    // Comments for Software Architecture posts
    prisma.comment.create({
      data: {
        content:
          "Microservices không phải là giải pháp cho mọi vấn đề. Đôi khi monolith vẫn là lựa chọn tốt hơn.",
        postId: posts[6].id,
        authorId: users[2].id,
      },
    }),
  ]);

  console.log("Database has been seeded with programming blog data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
