#!/usr/bin/env bash
set -euo pipefail

export ROCR_VISIBLE_DEVICES="-1"
ollama serve
