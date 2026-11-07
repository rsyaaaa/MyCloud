#!/usr/bin/env bash
# MyCloud Management Script

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

export PATH="$HOME/.local/bin:$PATH"

case "$1" in
  start)
    echo "Starting MyCloud via systemd user service..."
    systemctl --user daemon-reload
    systemctl --user enable mycloud.service
    systemctl --user start mycloud.service
    sleep 2
    systemctl --user status mycloud.service --no-pager
    ;;
  stop)
    echo "Stopping MyCloud..."
    systemctl --user stop mycloud.service
    ;;
  restart)
    echo "Restarting MyCloud..."
    systemctl --user restart mycloud.service
    sleep 2
    systemctl --user status mycloud.service --no-pager
    ;;
  status)
    systemctl --user status mycloud.service --no-pager
    ;;
  logs)
    journalctl --user -u mycloud.service -f
    ;;
  docker-up)
    echo "Starting MyCloud via Docker Compose..."
    systemctl --user stop mycloud.service 2>/dev/null
    docker compose up -d
    ;;
  docker-down)
    echo "Stopping MyCloud Docker Compose..."
    docker compose down
    ;;
  *)
    echo "Usage: ./mycloud.sh {start|stop|restart|status|logs|docker-up|docker-down}"
    exit 1
    ;;
esac

