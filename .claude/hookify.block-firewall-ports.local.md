---
name: block-firewall-ports
enabled: true
event: bash
pattern: ufw\s+(allow|insert|route\s+allow)|iptables\s+(-A|-I)\s+INPUT|firewall-cmd\s+--(add-port|zone)
action: block
---

**Firewall port opening blocked.**

Do NOT open ports via UFW, iptables, or firewall-cmd. This homelab uses **Twingate** for all cross-network access.

**Instead of opening a port:**
- Add a Twingate resource for the target IP + port
- Configure the appropriate service account or client access

If you believe a port must be opened, stop and ask the user first.
