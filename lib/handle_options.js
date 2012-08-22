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
    baseLogFile: this.deleteOption("--log-file", undefined),
    dropUnhandledLogs: this.deleteOption("--drop-unhandled-logs", undefined) ,
    logrotation: interpretRotation(this.deleteOption("--log-rotate", undefined)),
    distantSocket: this.deleteOption("--socket-address", undefined), //Socket address formatted like : "adress:port"
    dataToSocket: this.deleteOption("--data-to-socket", undefined),
    psPort: process.env.PS_PORT || process.env.PORT,
    timeout: this.deleteOption("--timeout", undefined),
    command: this.args.join(" ")
  }
  var path;
  if (this.options.baseLogFile == undefined){
    console.log("--log-file has to be specified !");
    process.exit(1);
  }
  var handler = this;
  var settings = this.searchConfigFiles(function(properties, options){
    keys = properties.keys();
    for (key in keys){
      if(keys[key].indexOf('.')>=0){
        var keyComp = keys[key].split('.');
        if(keyComp[0] != 'webHookUrl'){
          handler.parseKeysPath(keys, key, properties, options);
        }
        else {
          handler.parseWebHookOptions(keys, key, properties, options);
        }
      } else {
        if (keys[key] == "webHookUrl") {
          if(!options[keys[key]]) {
             options[keys[key]] = url.parse(properties.get(keys[key]), true); 
          }
        }
        else {
          if(!options[keys[key]]) {
             options[keys[key]] = properties.get(keys[key]); 
          }
        }
      }
    }
    (path = handler.deleteOption("--web-hook-path", false)) ? (options.webHookUrl ? options.webHookUrl.pathName = path : '') : '';
    handler.emit('configFileParsed');
  }, this.options);
}

util.inherits(Handler, events.EventEmitter);
exports.createHandler = function(args, callback){
  var handler = new Handler(args);
  handler.on('configFileParsed', function(){
    callback(handler);
  });
}

Handler.prototype.parseKeysPath = function (keys, key, properties, options){
  keyComponents = keys[key].split('.');
  var tab = options;
  for (var currentKey = 0; currentKey < keyComponents.length; currentKey++){
    if(!tab[keyComponents[currentKey]]){
      if (currentKey == keyComponents.length - 1){
        tab[keyComponents[currentKey]] = properties.get(keys[key]);
      }
      else {
        tab[keyComponents[currentKey]] = {};
        tab = tab[keyComponents[currentKey]];
      }
    }
    else {
      tab = tab[keyComponents[currentKey]];
    }
  }
};

Handler.prototype.parseWebHookOptions = function (keys, key, properties, options){
  keyComponents = keys[key].split('.');
  if(keyComponents[1] == "path"){
    if (!options.webHookUrl) {
      options.webHookUrl = {};
    }
    if (!options.webHookUrl.pathName) {
      options.webHookUrl.pathName = properties.get(keys[key]);
    }
    return;
  }
  if (!options.webHookUrl) {
    options.webHookUrl = {};
  }
  if (!options.webHookUrl.query) {
    options.webHookUrl.query = {};
  }
  if (!options.webHookUrl.query[keys[key]]) {
    options.webHookUrl.query[keyComponents[1]] = properties.get(keys[key]);
  }
};

Handler.prototype.searchConfigFiles = function(callback, options) {
  try{
    stat = fs.lstatSync(process.cwd() + '/.config');
    if(stat.isFile()){
      return new Properties ().load (process.cwd() + '/.config', function (){
                callback(this, options);
      });
    }
  }
  catch (e) {
    try {
      var stat = fs.lstatSync(process.env["HOME"] + '/.config');

      if(stat.isFile()){
        return new Properties ().load (process.env["HOME"] + '/.config', function (){
          callback(this, options);
        });
      }
    }
    catch (e) {
      util.log("No config files found !");
      process.exit(1);
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
      return undefined
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