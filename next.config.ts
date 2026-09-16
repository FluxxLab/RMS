import type { NextConfig } from "next";

// The dev server serves its own assets only to hosts listed here. Reaching it
// as anything other than localhost — over the WSL or Hyper-V virtual adapter,
// or from another machine on the LAN — needs that host allowed, so this covers
// the loopback and the three private IPv4 ranges. Development only: Next
// ignores this in production builds.
const privateNetworkHosts = [
  "127.0.0.1",
  "10.*.*.*",
  "192.168.*.*",
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: privateNetworkHosts,
};

export default nextConfig;
