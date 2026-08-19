/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isPages ? "/rb-grade-book" : "",
  images: { unoptimized: true },
};

module.exports = nextConfig;
