var fs = require( 'fs' )
, util = require ('util')
, events = require("events")
, spawn = require('child_process').spawn;

var Logger = function(options) {
  this.baseLogFile = options.baseLogFile;
  this.dropUnhandledLogs = options.dropUnhandledLogs;
  this.nameOfLog = this.updateLogDate();
  this.newStream(this.pathAndDate(this.baseLogFile), true);
  this.stopped = false;
  this.rotation = options.logrotation;
  this.isChangingLogs = false;
  this.buffer = '';
}

util.inherits(Logger, events.EventEmitter);

exports.createFileLogger  = function(options) {
  var logger = new Logger(options);
  logger.on('newStream', function() {
    if(!logger.work) {
      var data = logger.pathAndDate(logger.baseLogFile);
      if(logger.logHasToBeRotated(data.logDate)) {
        logger.isChangingLogs = true;
        logger.newStream(data, false);
      }
    }
  });
  logger.on('logRotateFinished', function() {
    logger.isChangingLogs = false;
  });
  return logger;
};

function dateString(date) {  
  function pad(number) { return number < 10 ? '0' + number : number}  
  return {
    "year": date.getFullYear(), "month": pad(date.getMonth() + 1), "date": pad(date.getDate()), "day": date.getDay(), "hours": pad(date.getHours()), "minutes": pad(date.getMinutes()), "seconds": pad(date.getSeconds())
  };
}

Logger.prototype.formattedddate = function() {
  this.lastDateRequest = dateString(new Date());
  return this.lastDateRequest.year + this.lastDateRequest.month + this.lastDateRequest.date + this.lastDateRequest.hours + this.lastDateRequest.minutes + this.lastDateRequest.seconds;
};

Logger.prototype.updateLogDate = function () {
  var logger = this;
  var data = logger.pathAndDate(logger.baseLogFile)
  logger.logDate = data.logDate;
  return data.firstPart + "-" + data.logDate + ".log";
};

Logger.prototype.logHasToBeRotated = function (logDate) {
  var logger = this;
  var date = parseInt(logDate);
  var datePrevious = parseInt(logger.logDate);
  var diffDate = date - datePrevious;
  if(diffDate > 0) {
    if(diffDate >= logger.rotation || diffDate == 0) {
      return true;
    }
    if (logger.rotation == 7 * 24 * 3600) {
      if (logDate.day < logger.logDate.day) {
        return true;
      }
    }
  }
  return false;
};

var changeLog = function (logger) {
  var data =logger.pathAndDate(logger.baseLogFile);
  if(logger.logHasToBeRotated(data.logDate)) {
    logger.newStream(data, setNewStream);
  }
  return logger.stream;
};

Logger.prototype.pathAndDate = function (fileName) {
  var logger = this;
  var fileNameTokens = fileName.split('.log');
  var firstPart = fileNameTokens[0];
  var logDate = logger.formattedddate();
  var data = {
    firstPart: firstPart,
    logDate: logDate
  }
  return data;
};

Logger.prototype.addDrainListener = function() {
  var logger = this;
  var drainCallback = function () {
    logger.outputStream.resume();
    logger.emit('logOpen')
  }
  logger.stream.on('drain', drainCallback);
  var removeDrain =  function() {
    logger.stream.removeListener('drain', drainCallback);
    logger.removeListener('closeStream', removeDrain)
  };
  logger.on('closeStream', removeDrain);
};

Logger.prototype.write = function(data) {
  return this.getStream().write(data);
};

Logger.prototype.getNumberLogs = function(logContext, callback, sync) {
  //Function to get list of files in log directory
  var logger = this;
  var path = logContext.firstPart.match(/^\/.*/) ? '/' : '' ;
  logContext.newLogName = logContext.firstPart + "-" + logContext.logDate + ".log";
  var baseLogFileComponents = logContext.firstPart.split('/');
  logContext.nameOfLog = baseLogFileComponents[baseLogFileComponents.length - 1];
  baseLogFileComponents.splice(baseLogFileComponents.length - 1, 1)
  path += baseLogFileComponents.join('/');
  path = path.length == 0 ? '.' : path;
  var numberFiles = 0;
  logger.basedir = path;
  //logger.basedir is the directory specified, where we put logs
  if(!sync) {
    fs.readdir(logger.basedir, function(err,files) {
      callback(logContext, files);
    });
  } else {
    //If synchronous call, then synchronous use of callback : that should be for the first call of new stream
    return callback(logContext, fs.readdirSync(logger.basedir));
  }
  return;
};

Logger.prototype.setNewStream = function(sync) {
  var logger = this;
  var logContext = logger.logContext;
  logger.logDate = logContext.logDate;
  logger.nameOfLog = logContext.firstPart + "-" + logContext.logDate + ".log";
  if(sync) {
    logger.stream = fs.createWriteStream(logContext.newLogName , { flags: "a", encoding: "utf-8" });
    logger.addDrainListener();
    logger.emit('logOpen')
    return;
  }
  logger.emit('closeStream');
  logger.stopLogger();
  logger.outputStream.pause();
  logger.stream.on('close',function() {
    logger.stream = fs.createWriteStream(logContext.newLogName , { flags: "a", encoding: "utf-8" });
    logger.addDrainListener();
    logger.outputStream.resume();
    logger.emit('logOpen')
  });
  logger.stream.end();
}

Logger.prototype.removeLogs = function (callback) {
  var logger = this;
  var logContext = logger.logContext;
  var files = logger.logContext.files;
  if(logContext.file >= 5) {
    fs.unlink(logger.basedir + (logger.basedir == '/' ? '' : '/')  + files[logContext.count], function(err) {
      logger.removeAndCreateLogs(callback);
    });
    return true;
  }
  else{
    return false;
  }
}
Logger.prototype.tarLogs = function(callback) {
  var logger = this;
  var logContext = logger.logContext;
  var files = logger.logContext.files;
  var basedir = logger.basedir + (logger.basedir == '/' ? '' : '/');
  var tar = spawn('tar', ['czf', basedir + files[logContext.count] + '.tar.gz', "-C", logger.basedir, files[logContext.count]]);
  tar.on('exit',function(code) {
    fs.unlink(logger.basedir + (logger.basedir == '/' ? '' : '/')  + files[logContext.count], function(err) {
      logger.removeAndCreateLogs(callback);
    });
  });
}
Logger.prototype.removeAndCreateLogs = function(callback) {
  var logger = this;
  var logContext = logger.logContext;
  var files = logger.logContext.files;
  logContext.count--;
  if (logContext.count < 0) {
    if(callback != undefined) {
      callback(logContext, logger); 
    }
    logger.emit('logRotateFinished');
  } else {
    if(files[logContext.count].match(logContext.regexForLogs)) {
      logContext.file++
      if(!logger.removeLogs(callback)) {
        logger.removeAndCreateLogs(callback);
      }
    } else if (files[logContext.count].match(logContext.regexForLogsToTar)) {
      logContext.file++
      if (logContext.file >= 0 && !logger.removeLogs(callback)) {
        logger.tarLogs(callback);
      }
    }
    else{
      logger.removeAndCreateLogs(callback);
    }
  }
}

Logger.prototype.newStream = function(data, sync) {
  var logger = this;
  var firstPart = data.firstPart;
  var logDate = data.logDate;
  logger.logContext = {
    logger: logger,
    logDate: logDate,
    firstPart: firstPart,
    nameOfLog: '',
    file: -1,
    count: -1
  }
  var rotateLogs = function(logContext, files) {
    logger.logContext.regexForLogs = new RegExp("^" + logContext.nameOfLog + "-[0-9]\{14\}(\.log\.tar\.gz)$","g");
    logger.logContext.regexForLogsToTar = new RegExp("^" + logContext.nameOfLog + "-[0-9]\{14\}(\.log)$","g");
    logger.logContext.count = files.length;
    logger.logContext.files = files;
    var cleanAfterLogCreate = function() {
      logger.removeAndCreateLogs();
      logger.removeListener('logOpen', cleanAfterLogCreate);
    }
    logger.on('logOpen', cleanAfterLogCreate);
    logger.setNewStream(sync);
  }
  return logger.getNumberLogs(logger.logContext, rotateLogs, sync);
};

Logger.prototype.getStream = function() {
  var logger = this;
  logger.emit('newStream');
  return logger.stream;
};

Logger.prototype.listenStream = function (stream) {
  var logger = this;
  logger.outputStream = stream;
  stream.on("data", function(data) {
    if (!logger.stopped) {
      writeOrPauseChildProcess(logger.buffer + data, logger);
    }
  }); 
};
Logger.prototype.stopLogger = function() {
  var logger = this;
  if(!logger.stopped) {
    logger.stopped = true;
    var recCall = function() {
      logger.stopped = false;
      logger.buffer = '';
      logger.removeListener('logOpen', recCall);
    }
    logger.on('logOpen', recCall);    
  }
}
var writeOrPauseChildProcess = function (data, logger) {
  var succeded = logger.write(data);
  if (!succeded && !logger.dropUnhandledLogs) {
    logger.stopLogger();
    logger.outputStream.pause();
  }
};