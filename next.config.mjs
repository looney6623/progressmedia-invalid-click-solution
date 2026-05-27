/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_PM_PROJECT_ENV: process.env.PM_PROJECT_ENV || "local"
  }
};

export default nextConfig;
