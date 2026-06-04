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
      "count.txt",
      "*.txt",
      "*.json",
      "*.log",
      ".test",
      ".git"
    ],
    env: {
      NODE_ENV: "production"
    }
  }]
};
