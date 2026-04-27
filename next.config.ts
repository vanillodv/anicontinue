import type { NextConfig } from "next";

// Supabase project host — используется в CSP для connect-src и img-src
const SUPABASE_HOST = 'zafbjeslpkprdqaiynqs.supabase.co';

const csp = [
  "default-src 'self'",
  // Next.js использует inline-скрипты для hydration; 'unsafe-eval' нужен для dev-режима
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Inline-стили из JSX style={}, шрифты self-hosted через next/font
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // Картинки: MAL CDN (постеры), Google аватары, Supabase Storage
  `img-src 'self' data: blob: https://cdn.myanimelist.net https://myanimelist.net https://lh3.googleusercontent.com https://${SUPABASE_HOST}`,
  // XHR/fetch: Supabase (REST + realtime)
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  // Канонический домен — www. apex (anicontinue.ru) должен приходить
  // в Next через YC API Gateway/Cloud Function (см. docs/yc-apex-domain-attach.md);
  // тогда этот редирект сработает и снимет дубль контента в SEO.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'anicontinue.ru' }],
        destination: 'https://www.anicontinue.ru/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // CDN-кеш для каталога: содержимое меняется редко (раз в час
      // при revalidate), а YC API Gateway по умолчанию ставит no-store.
      // Явно объявляем public/s-maxage, чтобы edge-кеш брал на себя нагрузку.
      {
        source: '/catalog',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      // Главная и страница аниме — те же характеристики.
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/anime/:id',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'zafbjeslpkprdqaiynqs.supabase.co',
      },
    ],
  },
};

export default nextConfig;
