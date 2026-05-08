import { type APIRoute } from 'astro';
import sharp from 'sharp';

export const GET: APIRoute = async ({ url }) => {
  const size = Number(url.searchParams.get('size') ?? 64);

  const png = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 32, g: 128, b: 200, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return new Response(png, {
    headers: { 'content-type': 'image/png' },
  });
};
