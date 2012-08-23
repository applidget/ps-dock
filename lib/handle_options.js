var url = require('url')
, fs = require ('fs')
, util = require ('util')
, events = require("events")
, Properties = require ("properties");

var Handler = function(args){
  this.args = args;
  this.replaceVars(variables.array , variables.evalVar);
  var uri = process.env.WEB_HOOK_URL == undefined ? undefined : url.parse(process.env.WEB_HOOK_URL, true);
  this.options = {
    webHookUrl: uri == undefined ? undefined : (uri.protocol == undefined ? undefined : uri),
    bindPort: this.deleteOption("--bind-port", undefined),
    dropUnhandledLogs: this.deleteOption("--drop-unhandled-logs", undefined) ,
    logrotation: interpretRotation(this.deleteOption("--log-rotate", undefined)),
    stdout: this.deleteOption("--stdout", undefined),
    psPort: process.env.PS_PORT || process.env.PORT,
    timeout: this.deleteOption("--timeout", undefined),
    command: this.args.join(" ")
  }
  this.options.logging = this.parseStdout(this.options.stdout);
  var path;
  var handler = this;
  this.settings = this.searchConfigFiles(this.options, this.parseConfigFile);
}

util.inherits(Handler, events.EventEmitter);
exports.createHandler = function(args, callback){
  var handler = new Handler(args);

  handler.on('configFileParsed', function(){
    handler.launchCallback(callback);
  });
  if (handler.settings != null){
    handler.launchCallback(callback);
  }
}
Handler.prototype.launchCallback = function (callback){
  var handler = this;
  switch (handler.options.logging){
    case "socket":
      handler.logging = require('./tcp_logging');
      break;
    case "net":
      handler.logging = require('./tcp_logging');
      break;
    case "local":
      handler.logging = require('./logging');
      break;
    default:
      util.log('Unhandled stdout type. Process will quit.')
      process.exit(1);
  }
  callback(handler);
}
Handler.prototype.parseStdout = function (parameter){
  var handler = this;
  var components = parameter.split('/');
  switch (components[0]){
    case "socket:":
      handler.parseSocket(components);
      return "net";
    case "tls:":
      handler.parseSocket(components);
      return "tls";
    default:
      handler.options.baseLogFile = parameter
      return "local";
  }
}

Handler.prototype.parseSocket = function (parameters){
  try{
    this.options.distantSocket = parameters[2];
    if(parameters[3]){
      this.options.dataToSocket = parameters[3];
    }
  } catch (e){
    util.log("Wrong syntax in URL !")
    process.exit(1);
  }
}

Handler.prototype.parseConfigFile = function(properties, options, handler){
  keys = properties.keys();
  for (key in keys){
    if(keys[key].indexOf('.')>=0){
      var keyComp = keys[key].split('.');
      handler.parseKeysPath(keys, key, properties, options);
    } else {
      var currentKeyParsed = handler.parseKeysToLowCamlCase(keys[key]);
      if (keys[key] == "WEB_HOOK_URL") {
        if(!options[currentKeyParsed]) {
           options[currentKeyParsed] = url.parse(properties.get(keys[key]), true); 
        }
      }
      else {
        if(!options[currentKeyParsed]) {
           options[currentKeyParsed] = properties.get(keys[key]); 
        }
      }
    }
  }
  handler.emit('configFileParsed');
};

Handler.prototype.parseKeysToLowCamlCase = function (key){
  var finalKey = key.replace(/^([A-Z]+)/g, function(name){ return name.toLowerCase()});
  finalKey = finalKey.replace(/(_[A-Z]+)/g, function(name){
    var res = name.toLowerCase();
    var head = res.charAt(1).toUpperCase();
    return head+  res.slice(2);
  });
  return finalKey;
}

Handler.prototype.parseKeysPath = function (keys, key, properties, options){
  var handler = this;
  keyComponents = keys[key].split('.');
  var tab = options;
  for (var currentKey = 0; currentKey < keyComponents.length; currentKey++){
    var currentKeyParsed = handler.parseKeysToLowCamlCase(keyComponents[currentKey]);
    if(!tab[currentKeyParsed]){
      if (currentKey == keyComponents.length - 1){
        tab[currentKeyParsed] = properties.get(keys[key]);
      }
      else {
        tab[currentKeyParsed] = {};
        tab = tab[currentKeyParsed];
      }
    }
    else {
      tab = tab[currentKeyParsed];
    }
  }
};

Handler.prototype.searchConfigFiles = function(options, callback) {
  var handler = this;
  try{
    stat = fs.lstatSync(process.cwd() + '/.psdockrc');
    util.log('Config file in current directory')
    if(stat.isFile()){
      new Properties ().load (process.cwd() + '/.psdockrc', function (){
                callback(this, options, handler);
      });
      return 0;
    }
  }
  catch (e) {
    try {
      var stat = fs.lstatSync(process.env["HOME"] + '/.psdockrc');
      util.log('Config file in home')
      if(stat.isFile()){
        new Properties ().load (process.env["HOME"] + '/.psdockrc', function (){
          callback(this, options, handler);
        });
        return 0
      }
    }
    catch (e) {
      util.log("No config files found !");
      return 1;
    }
  }
};

var interpretRotation = function (string){
  switch (string) {
    case "daily" :
      return 24 * 3600;
    case "hourly" :
      return 3600;
    case "weekly" :
      return 24 * 3600 * 7
    case "secondly" :
      return 1
    case "minutely" :
      return 60
    default:
      return 24 * 3600
  }
}
Handler.prototype.deleteOption = function (optionName, defaultValue) {
  var keyIndex = -1
  var optionValue = "";
  for (var i = 0; i < this.args.length; i++) { 
    if(this.args[i] == optionName) {
      keyIndex = i;
      break;
    }
  }
  if (keyIndex == -1) return defaultValue;
  results = this.args.splice(keyIndex, 2);
  return results[1];
}

Handler.prototype.replaceVars = function (vars, evalVar) {
  for (var argument = 0; argument < this.args.length; argument++) {
    for(var variable in vars){
      if (this.args[argument] == vars[variable]) {
        this.args[argument] = evalVar(this.args[argument]);
        break;
      }
    }
  }
}

var variables = {
  array: [],
  evalVar: function(variable){
    return process.env[variable];
  }
};

for(var envVar in process.env){
  if(envVar.indexOf("PS_") >= 0){
    variables.array.push(envVar);
  }
}