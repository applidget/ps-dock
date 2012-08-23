Ps-dock
=======

Very simple and uncrashable process monitoring tool

Installation
------------
It can be installed with npm.

    npm install ps-dock -g
  
#Usage
###Basic
Ps-dock can launch a process very simply, in this way:

    ps-dock ls --stdout test.log
###Config
Config file can be specified in this way :

    ps-dock bash --stdout test.log --config-file /home/config
By default, ps-dock will search for a file name .psdockrc in current home or current directory. To specify an other directory, you can use --config option:

    ps-dock bash --stdout test.log --config /home
Here is an example of .psdockrc :

    WEB_HOOK_URL=http://localhost:3000
    LOGROTATION=daily
    BIND_PORT=true
    DROP_UNHANDLED_LOGS=true
    DISTANT_SOCKET= 
    DATA_TO_SOCKET=Hello World
    TIMEOUT=30000
###Stdout
Three types of stdout can be specified :

* Logfile

    For instance, you can specify a file name test.log to ps-dock. then it handles logrotation : by defaults, log files are rotated every day, but you can tell to ps-dock to rotate logs every second, every minute, every hour, every day, or every week in this way:
    
        ps-dock bash --stdout test.log --log-rotate hourly

* TCP Socket
    A distant socket to which send datas from process. Process input is plugged to this socket...

        ps-dock bash --stdout socket://localhost:666
    Data can be sent on connection to the distant socket in this way:

        ps-dock bash --stdout socket://localhost:666/hello_world
* TLS Socket

        ps-dock bash --stdout tls://localhost:666
        
###Web Hook
A web hook can be specified as an environment variable:

    WEB_HOOK_URL="http://localhost:666/hello_alice?name=boris" ps-dock bash --stdout test.log
Or in config file as specified before.
It will send informations about status of process launched by ps-dock to the web hook. Body of datas sent are formatted likethis :

    {ps: { status: stat}}
###BindPort
If bind-port is set to true then ps-dock will wait that process open port specified in environment variable to inform Web Hook that process status is up.

    export PORT=2000
    WEB_HOOK_URL="https://localhost:666/hi?who=world" ps-dock bash --stdout test.log --bind-port true
###DropUnhandledLogs
Sometimes, process emits too many logs. Trying to redirect them all to a file or a socket could slow the process. So, by default, if there is too many logs, they are dropped.

    ps-dock bash --drop-unhandled-logs true