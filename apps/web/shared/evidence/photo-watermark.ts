type WatermarkOptions = {
  timestamp: Date;
  timezone?: string;
  outletName?: string;
};

function formatWatermarkTimestamp(date: Date, timezone = "Asia/Jakarta") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const offsetLabel = timezone === "Asia/Jakarta" ? "WIB" : timezone;

  return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute} ${offsetLabel}`;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal membaca gambar untuk watermark."));
    };

    image.src = objectUrl;
  });
}

export async function applyPhotoWatermark(file: File, options: WatermarkOptions) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const timestampLine = formatWatermarkTimestamp(options.timestamp, options.timezone);
  const lines = [timestampLine];

  if (options.outletName?.trim()) {
    lines.push(options.outletName.trim());
  }

  const padding = Math.max(16, Math.round(canvas.width * 0.02));
  const fontSize = Math.max(18, Math.round(canvas.width * 0.028));
  context.font = `600 ${fontSize}px Arial, sans-serif`;
  context.textBaseline = "bottom";

  const lineHeight = fontSize + 8;
  const blockHeight = lines.length * lineHeight + padding;
  context.fillStyle = "rgba(0, 0, 0, 0.55)";
  context.fillRect(0, canvas.height - blockHeight, canvas.width, blockHeight);

  context.fillStyle = "#ffffff";
  lines.forEach((line, index) => {
    const y = canvas.height - padding - (lines.length - index - 1) * lineHeight;
    context.fillText(line, padding, y);
  });

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, file.type || "image/jpeg", 0.92);
  });

  if (!blob) {
    return file;
  }

  return new File([blob], file.name, { type: blob.type || file.type || "image/jpeg" });
}
