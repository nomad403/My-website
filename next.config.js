/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = { 
      ...(config.resolve.alias || {}), 
      three: require.resolve("three") 
    };
    return config;
  },
};

module.exports = nextConfig;

