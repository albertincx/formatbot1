module.exports = {
  apps: [{
    name: "Format",
    script: "./src/index.js",
    watch: true,
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
    max_memory_restart: '400M',
    node_args: "--max-old-space-size=300", // Caps the V8 heap at 300MB
    env: {
      NODE_ENV: "production"
    }
  }]
};
