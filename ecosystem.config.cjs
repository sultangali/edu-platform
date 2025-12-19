module.exports = {
  apps: [
    {
      name: 'edu-platform',
      script: './server/index.js',
      cwd: '/var/www/edu-platform',
      instances: 1, // Use 1 instance for stability (can increase later)
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/pm2/edu-platform-error.log',
      out_file: '/var/log/pm2/edu-platform-out.log',
      log_file: '/var/log/pm2/edu-platform-combined.log',
      time: true,
      merge_logs: true,
    },
  ],
};

