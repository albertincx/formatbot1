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
    max_memory_restart: '250M',
    node_args: "--env-file=.env --max-old-space-size=192", // Caps the V8 heap at 192MB
    env: {
      NODE_ENV: "production"
    }
  }]
};
