import { useSearchParams } from "react-router-dom";
import Search from "./Search";
import { ChangeEvent } from "react";
import { CATEGORIES } from "../constants/categories";

const SideMenu = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (searchParams.get("sort") !== e.target.value) {
      setSearchParams({
        ...Object.fromEntries(searchParams.entries()),
        sort: e.target.value,
      });
    }
  };

  const handleCategoryChange = (category: string) => {
    const current = searchParams.get("cat") ?? "";
    if (current === category) return;
    const next = new URLSearchParams(searchParams);
    if (category) next.set("cat", category);
    else next.delete("cat");
    setSearchParams(next);
  };

  return (
    <div className="px-4 h-max sticky top-8">
      <h1 className="mb-4 text-sm font-medium">Search</h1>
      <Search />
      <h1 className="mt-8 mb-4 text-sm font-medium">Filter</h1>
      <div className="flex flex-col gap-2 text-sm">
        <label htmlFor="" className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="sort"
            onChange={handleFilterChange}
            value="newest"
            className="appearance-none w-4 h-4 border-[1.5px] border-blue-800 cursor-pointer rounded-sm bg-white checked:bg-blue-800"
          />
          Newest
        </label>
        <label htmlFor="" className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="sort"
            onChange={handleFilterChange}
            value="oldest"
            className="appearance-none w-4 h-4 border-[1.5px] border-blue-800 cursor-pointer rounded-sm bg-white checked:bg-blue-800"
          />
          Oldest
        </label>
      </div>
      <h1 className="mt-8 mb-4 text-sm font-medium">Categories</h1>
      <div className="flex flex-col gap-2 text-sm">
        <span
          className="underline cursor-pointer"
          onClick={() => handleCategoryChange("")}
          role="button"
        >
          All
        </span>
        {CATEGORIES.map(({ value, label }) => (
          <span
            key={value}
            role="button"
            className="underline cursor-pointer"
            onClick={() => handleCategoryChange(value)}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SideMenu;
