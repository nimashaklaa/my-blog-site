import { useState } from "react";
import Image from "./Image";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

const Navbar = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [postsOpen, setPostsOpen] = useState<boolean>(false);

  return (
    <div className="relative w-full min-w-0 h-16 md:h-20 flex items-center justify-between">
      {/* LOGO */}
      <Link to="/" className="flex items-center gap-4 text-2xl font-bold">
        <Image src="logo.png" alt="Lama Logo" w={32} h={32} />
        <span>lamalog</span>
      </Link>
      {/* MOBILE MENU */}
      <div className="md:hidden">
        <div
          className="cursor-pointer text-4xl"
          onClick={() => setOpen((prev) => !prev)}
        >
          <div className="flex flex-col gap-[5.4px]">
            <div
              className={`h-[3px] rounded-md w-6 bg-black origin-left transition-all ease-in-out ${
                open && "rotate-45"
              }`}
            ></div>
            <div
              className={`h-[3px] rounded-md w-6 bg-black transition-all ease-in-out ${
                open && "opacity-0"
              }`}
            ></div>
            <div
              className={`h-[3px] rounded-md w-6 bg-black origin-left transition-all ease-in-out ${
                open && "-rotate-45"
              }`}
            ></div>
          </div>
        </div>
        <div
          className={`fixed inset-0 top-16 left-0 w-full h-[calc(100vh-4rem)] bg-[#e6e6ff] flex flex-col items-center justify-center gap-8 font-medium text-lg z-30 transition-transform duration-300 ease-in-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <Link to="/" onClick={() => setOpen(false)}>
            Home
          </Link>
          <div className="flex flex-col items-center gap-4">
            <span className="text-gray-500 text-base">Posts</span>
            <div className="flex flex-col items-center gap-4 ">
              <Link to="/posts" onClick={() => setOpen(false)}>
                All posts
              </Link>
              <div className="flex flex-col items-center gap-4">
                <span className="text-gray-500 text-base">Posts</span>
                <div className="flex flex-col items-center gap-4 ">
                  <Link to="/posts" onClick={() => setOpen(false)}>
                    All posts
                  </Link>
                  <SignedIn>
                    <Link to="/saved" onClick={() => setOpen(false)}>
                      Saved
                    </Link>
                  </SignedIn>
                </div>
              </div>
              <SignedIn>
                <Link to="/saved" onClick={() => setOpen(false)}>
                  Saved
                </Link>
              </SignedIn>
            </div>
          </div>
          <Link to="/" onClick={() => setOpen(false)}>
            About
          </Link>
          <SignedOut>
            <Link to="/login" onClick={() => setOpen(false)}>
              <button className="py-2 px-4 rounded-3xl bg-blue-800 text-white">
                Login 👋
              </button>
            </Link>
          </SignedOut>
          <SignedIn>
            <div onClick={() => setOpen(false)}>
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </div>
      {/* DESKTOP MENU */}
      <div className="hidden md:flex items-center gap-8 xl:gap-12 font-medium">
        <Link to="/">Home</Link>
        <div
          className="relative"
          onMouseEnter={() => setPostsOpen(true)}
          onMouseLeave={() => setPostsOpen(false)}
        >
          <button
            type="button"
            className="flex items-center gap-1"
            aria-expanded={postsOpen}
            aria-haspopup="true"
          >
            Posts
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 transition-transform ${postsOpen ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {postsOpen && (
            <div className="absolute left-0 top-full pt-1">
              <div className="bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[140px]">
                <Link
                  to="/posts"
                  className="block px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
                  onClick={() => setPostsOpen(false)}
                >
                  All posts
                </Link>
                <SignedIn>
                  <Link
                    to="/saved"
                    className="block px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg"
                    onClick={() => setPostsOpen(false)}
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
