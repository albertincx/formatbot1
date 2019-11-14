var cluster = require('cluster');
// Listen for dying workers
if (cluster.isMaster) {

  // Count the machine's CPUs
  var cpuCount = require('os').cpus().length;
  console.log(cpuCount);
  // Create a worker for each CPU
  /*for (var i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }*/

// Code to run if we're in a worker process
} else {

}
cluster.on('exit', function (worker) {

  // Replace the dead worker,
  // we're not sentimental
  console.log('Worker %d died :(', worker.id);
  // cluster.fork();

});

