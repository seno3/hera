import { ArrowRight } from "lucide-react";

const articlesData = [
  {
    category: "BRANDING",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam et lacinia mi.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop",
    publishDate: "Dec 22, 2025",
    readMoreLink: "#",
    title: "A Beginner's Guide to Webflow to Development",
  },
  {
    category: "ARTDIRECTION",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam et lacinia mi.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop",
    publishDate: "Nov 11, 2025",
    readMoreLink: "#",
    title: "The Ultimate Checklist for SEO Performance",
  },
  {
    category: "DESIGNSYSTEM",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam et lacinia mi.",
    image:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&auto=format&fit=crop",
    publishDate: "Oct 9, 2025",
    readMoreLink: "#",
    title: "The Evolution of Design: From Past to Present",
  },
];

export default function Blogs() {
  return (
    <section id="news" className="bg-black px-4 py-12 sm:py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center sm:mb-12">
          <p className="mb-3 font-medium text-white/50 text-xs uppercase tracking-wider sm:mb-4">
            CAPTION
          </p>
          <h2 className="font-serif font-normal text-2xl text-white tracking-tight sm:text-3xl md:text-5xl">
            Blog Articles
          </h2>
        </div>
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articlesData.map((article, index) => (
            <div
              className="cursor-pointer border border-white/10 bg-white/5 shadow-none backdrop-blur-sm transition-shadow hover:shadow-md"
              key={index}
            >
              <div className="p-0">
                <div className="relative mb-4 sm:mb-6">
                  <img
                    alt={article.title}
                    className="aspect-square h-64 w-full object-cover sm:h-72 md:h-80"
                    src={article.image}
                  />
                  <p className="absolute top-0 left-0 rounded-none border-0 bg-pink px-2 py-0.5 font-medium text-[10px] text-white uppercase backdrop-blur-sm sm:-top-0.5 sm:-left-0.5 sm:px-3 sm:py-1 sm:text-xs">
                    #{article.category}
                  </p>
                </div>
                <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                  <h3 className="mb-2 font-normal text-base text-white tracking-tight sm:mb-2 sm:text-lg md:text-2xl">
                    {article.title}
                  </h3>
                  <p className="mb-4 text-white/50 text-xs leading-relaxed sm:mb-6 sm:text-sm">
                    {article.description}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <a
                      className="group relative flex items-center overflow-hidden font-medium text-white text-xs transition-colors hover:text-white/80 sm:text-sm"
                      href={article.readMoreLink}
                    >
                      <span className="mr-2 overflow-hidden rounded-none border border-white/20 p-2 transition-colors duration-300 ease-in group-hover:bg-white group-hover:text-black sm:p-3">
                        <ArrowRight className="h-3 w-3 translate-x-0 opacity-100 transition-all duration-500 ease-in group-hover:translate-x-8 group-hover:opacity-0 sm:h-4 sm:w-4" />
                        <ArrowRight className="absolute top-1/2 -left-4 h-4 w-4 -translate-y-1/2 opacity-0 transition-all duration-500 ease-in-out group-hover:left-2 group-hover:opacity-100 sm:-left-5 sm:h-4 sm:w-4 sm:group-hover:left-3" />
                      </span>
                      Read more
                    </a>
                    <span className="flex items-center gap-2 text-[10px] text-white/40 sm:gap-3 sm:text-xs">
                      {article.publishDate}
                      <span className="w-6 border-white/20 border-t sm:w-16" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
