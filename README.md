Ps-dock
=======

Very simple and uncrashable process monitoring tool

Installation
------------
It can be installed with npm.

    npm install ps-dock -g
  
#Usage
###Basic
Ps-dock can be launched very simply, in this way, to launch any command :

    ps-dock ls --stdout test.log
###Config
Config file can be specified in this way :

    ps-dock bash --stdout test.log --config-file /home/config
By default, ps-dock will search for a file name .psdockrc in current home or current directory. To specify an other directory, you can use --config option :

    ps-dock bash --stdout test.log --config /home

