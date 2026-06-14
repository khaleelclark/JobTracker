/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@job-tracker/shared"],
};

export default nextConfig;
