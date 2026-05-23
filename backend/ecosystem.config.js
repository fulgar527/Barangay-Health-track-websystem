// PM2 process configuration for Hostinger Node.js VPS
module.exports = {
  apps: [
    {
      name: 'healthtrack',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      // `env` applies always (fallback), `env_production` overrides when --env production is passed
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      }
    }
  ]
};
