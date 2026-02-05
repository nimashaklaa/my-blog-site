import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const MainLayout = () => {
  return (
    <div className="w-full min-w-0 px-4 py-2 md:px-8 md:py-4 lg:px-16 xl:px-32 2xl:px-64 box-border">
      <Navbar />
      <Outlet />
    </div>
  );
};

export default MainLayout;
