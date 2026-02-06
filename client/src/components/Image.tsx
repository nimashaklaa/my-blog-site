import { IKImage } from "imagekitio-react";

interface ImageProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  w?: number;
  h?: number;
  alt?: string;
}

const Image = ({ src, className, style, w, h, alt }: ImageProps) => {
  const urlEndpoint = import.meta.env.VITE_IK_URL_ENDPOINT;

  const isExternalUrl = src.startsWith("http://") || src.startsWith("https://");

  const isLocalAsset = !src.includes("/") || src.endsWith(".svg");

  if (isExternalUrl || isLocalAsset || !urlEndpoint) {
    const imageSrc = isExternalUrl
      ? src
      : src.startsWith("/")
        ? src
        : `/${src}`;
    return (
      <img
        src={imageSrc}
        className={className}
        style={style}
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
      style={style}
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
