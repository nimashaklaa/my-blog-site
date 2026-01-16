import { IKImage } from "imagekitio-react";

interface ImageProps {
  src: string;
  className?: string;
  w?: number;
  h?: number;
  alt?: string;
}

const Image = ({ src, className, w, h, alt }: ImageProps) => {
  const urlEndpoint = import.meta.env.VITE_IK_URL_ENDPOINT;

  // Check if it's a local file (common local file extensions or paths)
  const isLocalFile = 
    !src.startsWith('http') && 
    !src.startsWith('https') &&
    (src.endsWith('.png') || 
     src.endsWith('.jpg') || 
     src.endsWith('.jpeg') || 
     src.endsWith('.svg') || 
     src.endsWith('.gif') ||
     src.includes('/public/') ||
     src.startsWith('/'));

  // Use regular img tag for local files or if ImageKit is not configured
  if (isLocalFile || !urlEndpoint) {
    // For local files in public folder, Vite serves them from root
    const imageSrc = src.startsWith('/') ? src : `/${src}`;
    
    return (
      <img
        src={imageSrc}
        className={className}
        alt={alt}
        width={w}
        height={h}
        loading="lazy"
      />
    );
  }

  // Use ImageKit for remote/ImageKit paths
  return (
    <IKImage
      urlEndpoint={urlEndpoint}
      path={src}
      className={className}
      loading="lazy"
      lqip={{ active: true, quality: 20 }}
      alt={alt}
      width={w}
      height={h}
      transformation={[
        {
          width: w,
          height: h,
        },
      ]}
    />
  );
};

export default Image;

