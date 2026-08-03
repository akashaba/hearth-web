/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tell Next to tree-shake these barrel imports at bundle time. Cuts the
  // module graph dramatically because lucide-react (1000+ icons) and
  // date-fns (300+ helpers) otherwise get pulled in wholesale on any import.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
  },
}

export default nextConfig
