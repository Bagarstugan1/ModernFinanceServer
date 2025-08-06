#!/bin/bash
cd "/Users/arthurehrnrooth/ModernFinance Server/modernfinance-server"
git add -A
git commit -m "Fix circular reference error in logger

- Add safe stringify function to handle circular references
- Prevent TLSSocket objects from being logged
- Clean up error logging in agent service"
git push