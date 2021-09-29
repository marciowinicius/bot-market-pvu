#!/bin/bash

pm2 stop bot1

sleep 1

pm2 start bot1 --watch
