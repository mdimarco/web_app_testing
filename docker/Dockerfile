# Standard runtime for every generated frontend app in this repo.
#
# One image, three modes (see docker/entrypoint.sh):
#   dev     - vite dev server with HMR on :5173   (default)
#   build   - production build into /app/dist, then exit
#   preview - build + serve the production bundle on :4173
#
# The app source is bind-mounted at /app. node_modules lives in an anonymous
# volume so a host-side node_modules (or lack of one) never shadows the
# container's install.
FROM node:22-bookworm-slim

# git: some npm deps resolve git URLs. ca-certificates: TLS for the registry.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=development \
    CI=true \
    npm_config_fund=false \
    npm_config_audit=false

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 5173 4173

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["dev"]
