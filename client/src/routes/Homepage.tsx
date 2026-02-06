import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import MainCategories from "../components/MainCategories";
import FeaturedPosts from "../components/FeaturedPosts";
import PostList from "../components/PostList";

const Homepage = () => {
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata?.role as string) === "admin" || false;

  return (
    <div className="flex flex-col gap-16 w-full min-w-0 overflow-hidden">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 px-6 sm:px-10 py-14 sm:py-20">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Text content */}
          <div className="flex-1 max-w-2xl">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-blue-300 text-xs font-medium tracking-wide uppercase mb-4">
              Welcome
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
              Ideas, stories &<br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                things I build
              </span>
            </h1>
            <p className="mt-5 text-gray-300 text-base sm:text-lg max-w-lg leading-relaxed">
              A personal space for thoughts on web development, design, and
              everything in between.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/posts"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-colors shadow-lg shadow-white/10"
              >
                Browse posts
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
              {isAdmin && (
                <Link
                  to="/write"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                  New post
                </Link>
              )}
            </div>
          </div>

          {/* Hero illustration */}
          <div className="hidden lg:block flex-shrink-0 w-80 xl:w-96">
            <div className="relative">
              {/* Browser window mockup */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                {/* Browser header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/50 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-gray-700/50 rounded-md px-3 py-1 text-xs text-gray-400 text-center">
                      myblog.dev
                    </div>
                  </div>
                </div>
                {/* Content area */}
                <div className="p-5 space-y-4">
                  {/* Article preview cards */}
                  <div className="bg-white/5 rounded-lg p-3 space-y-2">
                    <div className="h-2 w-3/4 bg-blue-400/40 rounded" />
                    <div className="h-2 w-full bg-white/20 rounded" />
                    <div className="h-2 w-5/6 bg-white/20 rounded" />
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 space-y-2">
                    <div className="h-2 w-2/3 bg-cyan-400/40 rounded" />
                    <div className="h-2 w-full bg-white/20 rounded" />
                    <div className="h-2 w-4/5 bg-white/20 rounded" />
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 space-y-2">
                    <div className="h-2 w-1/2 bg-indigo-400/40 rounded" />
                    <div className="h-2 w-full bg-white/20 rounded" />
                  </div>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl rotate-12 opacity-80 blur-sm" />
              <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-lg -rotate-12 opacity-80 blur-sm" />
            </div>
          </div>
        </div>
      </header>

      {/* Categories + search */}
      <MainCategories />

      {/* Featured */}
      <FeaturedPosts />

      {/* Latest posts */}
      <section className="overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Latest</h2>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <PostList />
      </section>
    </div>
  );
};

export default Homepage;
