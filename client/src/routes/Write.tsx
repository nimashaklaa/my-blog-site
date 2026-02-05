import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Upload from "../components/Upload";
import Image from "../components/Image";
import Editor from "../components/Editor";

interface UploadData {
  filePath?: string;
  url?: string;
}

const Write = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [value, setValue] = useState<string>("");
  const [cover, setCover] = useState<UploadData>({});
  const [progress, setProgress] = useState<number>(0);

  const isAdmin = (user?.publicMetadata?.role as string) === "admin" || false;

  // Redirect non-admin users
  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isAdmin)) {
      toast.error("Only admins can create posts!");
      navigate("/");
    }
  }, [isLoaded, isSignedIn, isAdmin, navigate]);

  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (newPost: {
      img: string;
      title: string;
      category: string;
      desc: string;
      content: string;
    }) => {
      const token = await getToken();
      return axios.post(`${import.meta.env.VITE_API_URL}/posts`, newPost, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: (res) => {
      toast.success("Post has been created");
      navigate(`/${res.data.slug}`);
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<
        | string
        | { error?: string; message?: string; details?: string | string[] }
      >;
      console.error("Error creating post:", axiosError);
      console.error("Error response:", axiosError.response?.data);

      let errorMessage = "Failed to create post. Please try again.";

      if (axiosError.response?.data) {
        const responseData = axiosError.response.data;
        // Try to get the error message from the response
        if (typeof responseData === "string") {
          errorMessage = responseData;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.details) {
          errorMessage = Array.isArray(responseData.details)
            ? responseData.details.join(", ")
            : responseData.details;
        }
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }

      toast.error(errorMessage);
    },
  });

  if (!isLoaded) {
    return <div className="">Loading...</div>;
  }

  if (isLoaded && !isSignedIn) {
    return <div className="">You should login!</div>;
  }

  if (isLoaded && isSignedIn && !isAdmin) {
    return <div className="">Only admins can create posts!</div>;
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const data = {
      img: cover.filePath || "",
      title: formData.get("title") as string,
      category: formData.get("category") as string,
      desc: formData.get("desc") as string,
      content: value,
    };

    console.log(data);

    mutation.mutate(data);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-80px)] flex flex-col gap-6">
      <h1 className="text-cl font-light">Create a New Post</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 mb-6">
        <div className="flex flex-col gap-2">
          {cover.url ? (
            <div className="relative rounded-xl overflow-hidden bg-gray-100 max-h-64 w-full">
              <Image
                src={cover.url}
                alt="Cover preview"
                className="w-full h-full object-cover max-h-64"
              />
              <Upload type="image" setProgress={setProgress} setData={setCover}>
                <button
                  type="button"
                  className="absolute bottom-2 right-2 p-2 shadow-md rounded-lg text-sm text-gray-600 bg-white/90 hover:bg-white"
                >
                  Change cover
                </button>
              </Upload>
            </div>
          ) : (
            <Upload type="image" setProgress={setProgress} setData={setCover}>
              <button
                type="button"
                className="w-max p-2 shadow-md rounded-xl text-sm text-gray-500 bg-white"
              >
                Add a cover image
              </button>
            </Upload>
          )}
        </div>
        <input
          className="text-4xl font-semibold bg-transparent outline-none"
          type="text"
          placeholder="My Awesome Story"
          name="title"
        />
        <div className="flex items-center gap-4">
          <label htmlFor="category" className="text-sm">
            Choose a category:
          </label>
          <select
            name="category"
            id="category"
            className="p-2 rounded-xl bg-white shadow-md"
          >
            <option value="general">General</option>
            <option value="web-design">Web Design</option>
            <option value="development">Development</option>
            <option value="databases">Databases</option>
            <option value="seo">Search Engines</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>
        <textarea
          className="p-4 rounded-xl bg-white shadow-md"
          name="desc"
          placeholder="A Short Description"
        />
        <div className="min-h-[500px] rounded-xl bg-white shadow-md">
          <Editor
            onChange={setValue}
            editable={progress === 0 || progress >= 100}
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending || (0 < progress && progress < 100)}
          className="bg-blue-800 text-white font-medium rounded-xl mt-4 p-2 w-36 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? "Loading..." : "Send"}
        </button>
        <div>{"Progress:" + progress}</div>
      </form>
    </div>
  );
};

export default Write;
