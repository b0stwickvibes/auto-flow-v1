#!/bin/bash
# AutoFlow Background Service Launcher
# This script will start all required backend and automation services for AutoFlow

# Start backend server (Node.js/Express)
nohup npm run start --prefix ./Lovable/auto-flow-v1/backend > ./Lovable/auto-flow-v1/backend/background.log 2>&1 &

# Start main automation workflow (replace with actual script/entrypoint)
nohup npm run automate --prefix ./Lovable/auto-flow-v1 > ./Lovable/auto-flow-v1/background.log 2>&1 &

# Add additional service launches here as needed for integrations, AI, etc.

# Print status
sleep 2
echo "AutoFlow background services started. Check logs for details."
