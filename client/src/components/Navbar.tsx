import Image from "./Image";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useAppStore } from "../store";

const Navbar = () => {
  const mobileNavOpen = useAppStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const postsMenuOpen = useAppStore((s) => s.postsMenuOpen);
  const setPostsMenuOpen = useAppStore((s) => s.setPostsMenuOpen);

  return (
    <div className="relative w-full min-w-0 h-16 md:h-20 flex items-center justify-between mb-4">
      {/* LOGO */}
      <Link to="/" className="flex items-center gap-4 text-2xl font-bold">
        <Image src="logo.png" alt="Aniblog Logo" w={50} h={40} />
        <span>aniblog</span>
      </Link>
      {/* MOBILE MENU */}
      <div className="md:hidden">
        <div
          className="cursor-pointer text-4xl"
          onClick={() => setMobileNavOpen((prev) => !prev)}
        >
          <div className="flex flex-col gap-[5.4px]">
            <div
              className={`h-[3px] rounded-md w-6 bg-black origin-left transition-all ease-in-out ${
                mobileNavOpen && "rotate-45"
              }`}
            ></div>
            <div
              className={`h-[3px] rounded-md w-6 bg-black transition-all ease-in-out ${
                mobileNavOpen && "opacity-0"
              }`}
            ></div>
            <div
              className={`h-[3px] rounded-md w-6 bg-black origin-left transition-all ease-in-out ${
                mobileNavOpen && "-rotate-45"
              }`}
            ></div>
          </div>
        </div>
        {/* Mobile Menu Overlay */}
        <div
          className={`fixed inset-0 top-16 left-0 w-full h-[calc(100vh-4rem)] bg-white z-30 flex flex-col items-center justify-center gap-8 font-medium text-lg transition-transform duration-300 ease-in-out ${
            mobileNavOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <Link to="/" onClick={() => setMobileNavOpen(false)}>
            Home
          </Link>
          <Link to="/posts" onClick={() => setMobileNavOpen(false)}>
            All Posts
          </Link>
          <SignedIn>
            <Link to="/saved" onClick={() => setMobileNavOpen(false)}>
              Saved
            </Link>
          </SignedIn>
          <Link to="/" onClick={() => setMobileNavOpen(false)}>
            About
          </Link>
          <SignedOut>
            <Link to="/login" onClick={() => setMobileNavOpen(false)}>
              <button className="py-2 px-4 rounded-3xl bg-blue-800 text-white">
                Login 👋
              </button>
            </Link>
          </SignedOut>
          <SignedIn>
            <div onClick={() => setMobileNavOpen(false)}>
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </div>
      {/* DESKTOP MENU */}
      <div className="hidden md:flex items-center gap-8 xl:gap-12 font-medium">
        <Link to="/">Home</Link>
        <div
          className="relative z-[200]"
          onMouseEnter={() => setPostsMenuOpen(true)}
          onMouseLeave={() => setPostsMenuOpen(false)}
        >
          <button
            type="button"
            className="flex items-center gap-1"
            aria-expanded={postsMenuOpen}
            aria-haspopup="true"
          >
            Posts
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 transition-transform ${postsMenuOpen ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {postsMenuOpen && (
            <div className="absolute left-0 top-full pt-1 z-[200]">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] shadow-xl">
                <Link
                  to="/posts"
                  className="block px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
                  onClick={() => setPostsMenuOpen(false)}
                >
                  All posts
                </Link>
                <SignedIn>
                  <Link
                    to="/saved"
                    className="block px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg"
                    onClick={() => setPostsMenuOpen(false)}
                  >
                    Saved
                  </Link>
                </SignedIn>
              </div>
            </div>
          )}
        </div>
        <Link to="/">About</Link>
        <SignedOut>
          <Link to="/login">
            <button className="py-2 px-4 rounded-3xl bg-blue-800 text-white">
              Login 👋
            </button>
          </Link>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </div>
  );
};

export default Navbar;
