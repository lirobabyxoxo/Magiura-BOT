# Discord Verification Bot

## Overview
This is a Discord verification and welcome bot imported from GitHub (https://github.com/diwasatreya/Verification-Bot). The bot provides comprehensive Discord server management features including member verification, welcome messages, and administrative commands.

## Recent Changes
- **September 16, 2025**: Successfully imported and configured for Replit environment
  - Fixed syntax error in index_simple.js (removed stray 'z;' character)
  - Installed dependencies (discord.js v13.17.1, dotenv v10.0.0)
  - Added Discord bot token via Replit secrets
  - Created .gitignore file for proper version control
  - Configured workflow and deployment settings

## Project Architecture
- **Language**: Node.js with discord.js v13
- **Main files**:
  - `index.js`: Full-featured bot with verification and welcome systems
  - `index_simple.js`: Simplified version (has syntax issues, use main index.js)
  - `config.json`: Bot configuration (prefix, developer ID)
  - `database.json`: Simple JSON-based database for storing server settings
- **Database**: File-based JSON storage for simplicity
- **Keep-alive server**: Built-in HTTP server on port 5000 to keep bot running

## Features
### Verification System
- Set verification channels and roles
- Automatic role assignment/removal on verification
- Channel-specific verification commands
- Bulk verification reset capabilities

### Welcome System  
- Customizable welcome messages with embeds
- Automatic role assignment for new members
- Auto-delete functionality for welcome messages
- Welcome message testing and configuration panel

### Commands
- **Prefix**: `.` (dot)
- **Verification**: setverify, setrole, setrrole, verify, resetallverify
- **Welcome**: great, setwelcome, setwelcomerole, setautodelete, testwelcome, resetwelcome
- **Administrative**: Various aliases and shortcuts available

## Current State
- ✅ Bot is running successfully (logged in as magiura.#7009)
- ✅ All 25 commands loaded and functional
- ✅ Workflow configured for console output
- ✅ Deployment configured for VM target
- ✅ Dependencies installed and verified
- ✅ Environment properly configured with Discord token

## User Preferences
- Language: Portuguese (commands and responses in Portuguese)
- Commands use dot prefix (.)
- Casual/informal tone in some command responses