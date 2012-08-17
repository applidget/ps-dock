var fs = require( 'fs' );
var Logger = function(options) {
  this.baseLogFile = options.baseLogFile;
  this.dropUnhandledLogs = options.dropUnhandledLogs;
  this.stream = fs.createWriteStream(returnlog(this.baseLogFile) , { flags: "a", encoding: "utf-8" });
  this.stopped = false;
}

exports.createFileLogger  = function(options){
  return new Logger(options);
};

function dateString(date){  
  function pad(number){ return number < 10 ? '0' + number : number}  
  return {
    "year": date.getFullYear(), "month": pad(date.getMonth() + 1), "date": pad(date.getDate()), "hours": pad(date.getHours()), "minutes": pad(date.getMinutes())
  };
}

function formatteddate(){
  var now = dateString(new Date());
  return now.year + now.month + now.date
}

function returnlog(fileName){
  var fileNameTokens = fileName.split('.log');
  var firstPart = fileNameTokens[0];
  return firstPart + "-" + formatteddate() + ".log";
}

Logger.prototype.drain = function() {
  var logger = this;
  this.stream.on('drain',function(){
    logger.outputStream.resume();
    logger.stopped = false;
  });
};

Logger.prototype.write = function(data){
  this.getStream().write(data);
};

Logger.prototype.getStream = function(){
  if (true) {
    return this.stream
  }
};

Logger.prototype.listenStream = function (stream) {
  var logger = this;
  this.drain();
  this.outputStream = stream;
  stream.on("data", function(data) {
    if (!logger.stopped) {
      writeOrPauseChildProcess(data, logger, stream);
    }
  }); 
};

var writeOrPauseChildProcess = function (data, logger){
  var succeded = logger.write(data);
  if (!succeded && !logger.dropUnhandledLogs) {
    logger.stopped = true;
    logger.outputStream.pause();
  }
};
