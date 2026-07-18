export async function createVideoThumbnailFile(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video tidak bisa dibaca."));
    });

    const seekTime = Math.min(0.5, Math.max((video.duration || 1) / 4, 0));
    video.currentTime = Number.isFinite(seekTime) ? seekTime : 0;

    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("Frame thumbnail gagal dibaca."));
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas thumbnail tidak tersedia.");
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
          return;
        }
        reject(new Error("Thumbnail video gagal dibuat."));
      }, "image/webp", 0.82);
    });

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-thumbnail.webp`, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
