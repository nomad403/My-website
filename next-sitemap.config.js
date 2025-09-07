/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: 'https://nomad403.com',
    generateRobotsTxt: true,        
    changefreq: 'weekly',
    priority: 0.7,
    sitemapSize: 5000,              
    exclude: ['/404'],
    additionalPaths: async (config) => [
      await config.transform(config, '/projects'),
      await config.transform(config, '/specialist'),
      await config.transform(config, '/contact'),
    ],
  }
  