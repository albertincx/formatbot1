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
    env: {
      NODE_ENV: "production"
    }
  }]
};
