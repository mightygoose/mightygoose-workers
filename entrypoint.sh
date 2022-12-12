#!/bin/sh
#
echo "starting the monitor"

mongroup -c $WORKDIR/mongroup.conf start
mongroup -c $WORKDIR/mongroup.conf logf
