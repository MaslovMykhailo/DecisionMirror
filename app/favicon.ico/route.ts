const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#111827"/>
  <path d="M8 16c2.4-4 5.1-6 8-6s5.6 2 8 6c-2.4 4-5.1 6-8 6s-5.6-2-8-6Z" fill="#f8fafc"/>
  <circle cx="16" cy="16" r="3.5" fill="#2563eb"/>
</svg>`;

export function GET() {
  return new Response(faviconSvg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
