const path = require('path');

module.exports = {
  apps: [{
    name: "Format",
    cwd: __dirname,
    script: "./src/index.js",
    watch: false,
    // Ignore files and directories that change at runtime to prevent restart loops
    ignore_watch: [
      "node_modules",
      "logs",
      ".conf",
      ".docs",
      "count.txt",
      "*.txt",
      "*.json",
      "*.log",
      "*.pdf",
      ".test",
      ".git"
    ],
    max_memory_restart: '350M',
    node_args: `--env-file=${path.join(__dirname, '.env')} --max-old-space-size=256`, // Caps the V8 heap at 256MB
    env: {
      NODE_ENV: "production"
    }
  }]
};
