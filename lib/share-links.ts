export function getServiceShareUrl(serviceId: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const fallbackUrl = `${origin}/services/${serviceId}`;
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");

  if (!botUsername) {
    return fallbackUrl;
  }

  return `https://t.me/${botUsername}?startapp=${encodeURIComponent(`service_${serviceId}`)}`;
}

export async function shareService(input: { id: string; title: string }) {
  const url = getServiceShareUrl(input.id);

  if (navigator.share) {
    await navigator.share({
      title: input.title,
      text: `Lihat ${input.title} di Tikep`,
      url,
    });
    return url;
  }

  await navigator.clipboard.writeText(url);
  return url;
}

export function getMediaShareUrl(mediaId: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const fallbackUrl = `${origin}/media/${mediaId}`;
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");

  if (!botUsername) {
    return fallbackUrl;
  }

  return `https://t.me/${botUsername}?startapp=${encodeURIComponent(`media_${mediaId}`)}`;
}

export async function shareMedia(input: { id: string }) {
  const url = getMediaShareUrl(input.id);

  if (navigator.share) {
    await navigator.share({
      title: "Media Tikep",
      text: "Lihat media ini di Tikep",
      url,
    });
    return url;
  }

  await navigator.clipboard.writeText(url);
  return url;
}
