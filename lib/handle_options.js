var url = require('url')
, fs = require ('fs')
, util = require ('util')
, events = require("events")
, Properties = require ("properties");

var configPaths = [process.env["HOME"], process.cwd()];

var Handler = function(args){
  this.args = args;
  this.replaceVars(variables.array , variables.evalVar);
  this.options = {
    config: this.deleteOption("--config", undefined),
    configFile: this.deleteOption("--config-file", undefined)
  };
  if(this.options.config){
    configPaths.push(this.options.config)
  }
  var uri = process.env.WEB_HOOK_URL == undefined ? undefined : url.parse(process.env.WEB_HOOK_URL, true);
  var path;
  var handler = this;
  hash = readEnvOptions(args);
  handler.options.env = hash.configVars;
  this.args = hash.newArgs;
  this.settings = this.searchConfigFiles(this.parseConfigFile, function(){
    handler.options.webHookUrl = handler.options.webHookUrl == undefined ? (uri == undefined ? undefined : (uri.protocol == undefined ? undefined : uri)) : handler.options.webHookUrl,
    handler.options.bindPort = handler.deleteOption("--bind-port", handler.optionsDefaultValue(handler, (handler.options.bindPort == "true"), false)) == "true",
    handler.options.dropUnhandledLogs = handler.deleteOption("--drop-unhandled-logs", handler.optionsDefaultValue(handler, handler.options.dropUnhandledLogs == "true", true)),
    handler.options.logrotation = interpretRotation(handler.deleteOption("--log-rotate", handler.optionsDefaultValue(handler, handler.options.logrotation, "daily"))),
    handler.options.stdout = handler.deleteOption("--stdout", handler.optionsDefaultValue(handler, handler.options.stdout, undefined)),
    handler.options.logPrefix = handler.deleteOption("--log-prefix", null);
    handler.options.logPrefixColor = handler.deleteOption("--log-prefix-color", null);
    handler.options.psPort = handler.optionsDefaultValue(handler, parseInt(handler.options.psPort), process.env.PS_PORT || process.env.PORT),
    handler.options.timeout = handler.deleteOption("--timeout", handler.optionsDefaultValue(handler, parseInt(handler.options.timeout), 30000)),
    handler.options.command = handler.args[0].split(' ').length > 1 ? handler.args[0] : handler.args.join(" ");
    handler.options.logging = handler.options.stdout ? handler.parseStdout(handler.options.stdout) : undefined;

    return 1;
  });
}

var readEnvOptions = function(args) {
  var configVars = {};
  var newArgs = [];
  for(i = 0; i < args.length; i++) {
    if (args[i] == "-D" || args[i].indexOf("-D") == 0) {
      var pair = "";
      if(args[i].length > 2) {
        //-DVAR=VALUE
        pair = args[i].replace("-D", "");
      } else {
        //-D VAR=VALUE
        pair = args[i+1];
        i++
      }
      var evar = pair.split(/=(.+)?/); //split only after the first '=' sign
      configVars[evar[0]] = evar[1];
    } else {
      newArgs.push(args[i]);
    }
  }
  var res = {
    configVars: configVars,
    newArgs: newArgs
  }
  return res;
}

util.inherits(Handler, events.EventEmitter);

exports.createHandler = function(args, callback){
  var handler = new Handler(args);
  handler.on('configFileParsed', function(){
    handler.launchCallback(callback);
  });
  if (handler.settings != 0){
    handler.launchCallback(callback);
  }
}

Handler.prototype.optionsDefaultValue = function (handler, option, defaultValue){
  return option ? option : defaultValue;
};

Handler.prototype.launchCallback = function (callback){
  var handler = this;
  switch (handler.options.logging){
    case "tls":
      handler.logging = require('./tcp_logging');
      break;
    case "net":
      handler.logging = require('./tcp_logging');
      break;
    case "syslog":
      handler.logging = require('./sys_logging');
      break;
    case "local":
      handler.logging = require('./logging');
      break;
    default:
      util.log('Unhandled stdout type. Process will quit.')
      process.exit(1);
  }
  callback(handler);
};

Handler.prototype.parseStdout = function (parameter){
  var handler = this;
  var components = url.parse(parameter);
  switch (components.protocol){
    case "socket:":
      handler.parseSocket(components);
      return "net";
    case "tls:":
      handler.parseSocket(components);
      return "tls";
    default:
      if(parameter == 'SYSLOG'){
        return 'syslog';
      } else {
        handler.options.baseLogFile = parameter;
        return "local";
      }
  }
}

Handler.prototype.parseSocket = function (parameters){
  try{
    this.options.distantSocket = parameters.host;
    var path = parameters.path;
    if(path){
      pathSplitted = path.slice(1);
      this.options.dataToSocket = pathSplitted;
    }
  } catch (e){
    util.log("Wrong syntax in URL !")
    process.exit(1);
  }
}

Handler.prototype.parseConfigFile = function(properties, handler, callback){
  keys = properties.keys();
  for (key in keys){
    if(keys[key].indexOf('.')>=0){
      var keyComp = keys[key].split('.');
      handler.parseKeysPath(keys, key, properties, options);
    } else {
      var currentKeyParsed = handler.parseKeysToLowCamlCase(keys[key]);
      if (keys[key] == "WEB_HOOK_URL") {
        handler.options[currentKeyParsed] = url.parse(properties.get(keys[key]), true);
      }
      else {
        handler.options[currentKeyParsed] = properties.get(keys[key]);
      }
    }
  }
  callback(handler);
  handler.emit('configFileParsed');
};

Handler.prototype.parseKeysToLowCamlCase = function (key){
  var finalKey = key.replace(/^([A-Z]+)/g, function(name){ return name.toLowerCase()});
  finalKey = finalKey.replace(/(_[A-Z]+)/g, function(name){
    var res = name.toLowerCase();
    var head = res.charAt(1).toUpperCase();
    return head + res.slice(2);
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

Handler.prototype.searchConfigFiles = function(callback, arg) {
  var handler = this;
  try{
    var dir = handler.options.configFile ? '' : configPaths.pop();
    if (dir == undefined){
      util.log("No config files found !");
      return arg(handler);
    }
    stat = fs.lstatSync(handler.options.configFile ? handler.options.configFile : (dir + '/.psdockrc'));
    if(stat.isFile()){
      new Properties ().load (handler.options.configFile ? handler.options.configFile : (dir + '/.psdockrc'), function (){
          callback(this, handler, arg);
      });
      return 0;
    }
  }
  catch (e) {
    handler.options.configFile ? handler.options.configFile = undefined : '';
    return handler.searchConfigFiles(callback, arg)
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