const IMGBB_API_KEY = "81c24f30884ec6dda1dbd2b39739e0c9";

export async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST", body: formData
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || "ImgBB upload failed");
  return data.data.url;
}

export function extractCloudinaryVideoId(url) {
  if (!url) return null;
  return url;
}

export function extractYoutubeId(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
