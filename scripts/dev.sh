#!/bin/bash
# KnowForge 开发启动脚本
set -e

echo "🔥 Starting KnowForge development environment..."
echo ""

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Install: npm install -g pnpm"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
    echo ""
fi

echo "🚀 Starting server (http://localhost:4000) and web (http://localhost:3000)..."
echo ""
pnpm dev