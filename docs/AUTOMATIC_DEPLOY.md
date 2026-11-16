# WAMS automatic VPS deployment

This optional systemd timer checks the public GitHub `main` branch about every two minutes. It stores no GitHub token or key. It is limited to the WAMS checkout at `/opt/nepal-wildlife` and its `docker-compose.vps.yml`. Both the installer and deploy helper fetch from the public GitHub HTTPS URL, so the VPS does not need an SSH key.

The helper verifies the checkout's GitHub origin and `main` branch, refuses tracked local edits or a non-fast-forward update, and leaves existing untracked VPS files alone. It saves a PostgreSQL dump and `/data/media` archive under `/root/wams-backups/nepal-wildlife/auto-deploy/` before a deployment. It builds and updates only the WAMS `api` and `web` services with `--no-deps`; it does not operate on the WAMS database, MediaMTX, Caddy, or any other project. Backups are retained without automatic cleanup.

## One-time install

Run as root on the VPS after the WAMS GitHub changes are pushed:

```sh
cd /opt/nepal-wildlife &&
test "$(git branch --show-current)" = main &&
git diff-index --quiet HEAD -- &&
git fetch https://github.com/bikash-ananda/Nepal-Wild--Life--Management--System.git main &&
git merge --ff-only FETCH_HEAD &&
test ! -e /usr/local/sbin/wams-auto-deploy &&
test ! -e /etc/systemd/system/wams-auto-deploy.service &&
test ! -e /etc/systemd/system/wams-auto-deploy.timer &&
install -o root -g root -m 700 infra/deploy/wams-auto-deploy.sh /usr/local/sbin/wams-auto-deploy &&
install -o root -g root -m 644 infra/deploy/wams-auto-deploy.service /etc/systemd/system/wams-auto-deploy.service &&
install -o root -g root -m 644 infra/deploy/wams-auto-deploy.timer /etc/systemd/system/wams-auto-deploy.timer &&
install -d -o root -g root -m 700 /var/lib/wams-auto-deploy &&
systemctl daemon-reload &&
/usr/local/sbin/wams-auto-deploy &&
systemctl enable --now wams-auto-deploy.timer &&
systemctl list-timers wams-auto-deploy.timer --no-pager &&
docker compose -f docker-compose.vps.yml ps api web
```

The first helper run reconciles the WAMS app services to the current GitHub commit and creates the first backups before building. If it stops, the timer is not enabled by the command above.

## Check logs or retry a failed commit

```sh
systemctl status wams-auto-deploy.timer --no-pager
journalctl -u wams-auto-deploy.service -n 80 --no-pager
wams-auto-deploy --retry
```

The helper records a failed commit and skips it on later timer ticks to avoid repeated builds or backups. Read the journal and fix the reported cause before using `--retry`. It does not automatically roll back application code or database migrations.
