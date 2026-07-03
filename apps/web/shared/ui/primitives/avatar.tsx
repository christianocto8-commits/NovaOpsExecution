import { cn } from "@/lib/cn";

type AvatarProps = {
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({ name, imageUrl, size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#274733] font-bold text-white",
        sizeClass[size],
        className
      )}
      title={name}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}