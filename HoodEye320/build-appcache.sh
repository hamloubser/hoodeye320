#!/bin/bash
cfile=hoodeye.appcache
echo "CACHE MANIFEST" > $cfile
echo -n "# " >> $cfile
date >> $cfile
find . | sed 's/^\.\(.*\)/\1/' >> $cfile
