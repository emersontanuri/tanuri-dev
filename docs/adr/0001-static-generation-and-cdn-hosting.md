# Static generation on a CDN

tanuri.dev is built to static files and served from a CDN, rather than rendered per request or self-hosted.

The site has no server-side state, no authentication and no dynamic data, so a server would add uptime risk and operational cost for no capability. Self-hosting on the owner's homelab was considered and rejected even though the owner is skilled at it: a professional front door must not depend on home power and uptime. The trade-off is real — a homelab deployment would have demonstrated infrastructure competence, which is one of the things the site is meant to convey. That demonstration belongs in the Infraestrutura project, not in the site's own delivery path.
