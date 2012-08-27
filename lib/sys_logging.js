var SysLogger = function(options) {
  this.Syslog = require('node-syslog');
  this.Syslog.init("node-syslog", this.Syslog.LOG_PID | this.Syslog.LOG_ODELAY, this.Syslog.LOG_LOCAL0);
}

exports.createLogger  = function(options) {
  var sysLogger = new SysLogger(options);
  return sysLogger;
};

SysLogger.prototype.close = function(callback){
  var sysLogger = this;
  sysLogger.Syslog.close();
  if(callback != undefined){
    callback();
  }
}
SysLogger.prototype.listenStream = function(stream){
  var sysLogger = this;
  sysLogger.outputStream = stream.output;
  sysLogger.outputStream.on('data', function(data){
    sysLogger.Syslog.log(sysLogger.Syslog.LOG_INFO, '' + data);
  });
}