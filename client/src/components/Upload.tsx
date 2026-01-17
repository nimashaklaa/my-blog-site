import { IKContext, IKUpload } from "imagekitio-react";
import { useRef, ReactNode } from "react";
import { toast } from "react-toastify";

interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  size: number;
  versionInfo?: {
    id: string;
    name: string;
  };
  filePath: string;
  url: string;
  thumbnailUrl?: string;
  height?: number;
  width?: number;
  fileType?: string;
  tags?: string[];
  AITags?: string[];
  customCoordinates?: string;
  customMetadata?: Record<string, unknown>;
}

interface UploadProgress {
  loaded: number;
  total: number;
}

interface UploadProps {
  children: ReactNode;
  type: string;
  setProgress: (progress: number) => void;
  setData: (data: ImageKitUploadResponse) => void;
}

const authenticator = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL;

    if (!apiUrl) {
      throw new Error(
        "VITE_API_URL is not configured. Please check your .env file."
      );
    }

    const response = await fetch(`${apiUrl}/posts/upload-auth`);

    if (!response.ok) {
      // Clone the response so we can read it multiple times if needed
      const clonedResponse = response.clone();
      const contentType = response.headers.get("content-type");

      let errorMessage = `Request failed with status ${response.status}`;

      // Try to extract error message from response
      try {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          // For non-JSON responses, read as text
          const errorText = await clonedResponse.text();
          if (errorText) {
            errorMessage = `${errorMessage}: ${errorText.substring(0, 200)}`;
          }
        }
      } catch (parseError) {
        // If parsing fails, use the status code
        console.error("Failed to parse error response:", parseError);
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const { signature, expire, token } = data;
    return { signature, expire, token };
  } catch (error: unknown) {
    console.error("ImageKit authentication error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Authentication request failed: ${errorMessage}`);
  }
};

const Upload = ({ children, type, setProgress, setData }: UploadProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const publicKey = import.meta.env.VITE_IK_PUBLIC_KEY;
  const urlEndpoint = import.meta.env.VITE_IK_URL_ENDPOINT;

  const onError = (err: Error) => {
    console.log(err);
    toast.error("Image upload failed!");
  };

  const onSuccess = (res: ImageKitUploadResponse) => {
    console.log(res);
    setData(res);
  };

  const onUploadProgress = (progress: UploadProgress) => {
    console.log(progress);
    setProgress(Math.round((progress.loaded / progress.total) * 100));
  };

  // Show warning if ImageKit is not configured
  if (!publicKey || !urlEndpoint) {
    return (
      <div className="text-red-500 text-sm">
        ImageKit not configured. Please add VITE_IK_PUBLIC_KEY and
        VITE_IK_URL_ENDPOINT to your .env file.
      </div>
    );
  }

  return (
    <IKContext
      publicKey={publicKey}
      urlEndpoint={urlEndpoint}
      authenticator={authenticator}
    >
      <IKUpload
        useUniqueFileName
        onError={onError}
        onSuccess={onSuccess}
        onUploadProgress={onUploadProgress}
        className="hidden"
        ref={ref}
        accept={`${type}/*`}
      />
      <div className="cursor-pointer" onClick={() => ref.current?.click()}>
        {children}
      </div>
    </IKContext>
  );
};

export default Upload;
