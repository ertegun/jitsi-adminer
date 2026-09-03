#!/bin/bash
echo "=== Checking Jitsi Prosody Configuration ==="

# SSH to Coolify server and check Prosody container
# Replace with your actual SSH details
SERVER="your-server"

echo "1. Checking Prosody logs for lobby-related errors..."
# docker logs <prosody-container> 2>&1 | grep -iE "(lobby|affiliation|guest)" | tail -20

echo "2. Checking Prosody loaded modules..."
# docker exec <prosody-container> prosodyctl about | grep -A 20 "Modules"

echo "3. Checking MUC configuration..."
# docker exec <prosody-container> cat /config/prosody.cfg.lua | grep -A 5 "muc_lobby"

