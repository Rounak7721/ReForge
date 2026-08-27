# syntax=docker/dockerfile:1

# Reforge — production image.
#
# The app talks to a HOSTED Supabase project and hosted model APIs. There is no
# database in this image and none in compose: Supabase Auth is GoTrue plus
# several other services, and running that stack locally is a different project
# from running this one. Bring your own Supabase project; see README.
#
# ## The one non-obvious thing: NEXT_PUBLIC_* are BUILD-time values
#
# Two separate mechanisms, both measured against this image rather than assumed:
#
# 1. Next.js replaces `process.env.NEXT_PUBLIC_*` with literal strings when it
#    builds. Verified: the Supabase project ref appears in 6 files under
#    .next/server in this image. A runtime override therefore does NOT change
#    behaviour — the compiled code no longer reads the variable.
#
# 2. `lib/env.ts` calls `publicSchema.parse(...)` at module load, and the
#    prerender pass loads it. Verified by building with .env moved aside: the
#    build fails with `NEXT_PUBLIC_SUPABASE_URL must be a valid URL`.
#
# So both vars are ARGs here. Every other variable — the service-role key, the
# model keys — is read lazily inside server code, thus those stay runtime-only
# and never enter an image layer.
#
# Consequence: changing either public value needs a REBUILD, not a restart.
#
# Note for the curious: in THIS app the two values do not reach the client
# bundle at all. Nothing imports `lib/supabase/browser.ts`; every consumer uses
# the server, middleware or admin client. That is a property of this app, not of
# Next.js — a client component that used the browser client would ship them.
#
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app


# --- dependencies -----------------------------------------------------------
# Copied separately from the source so that editing a component does not
# reinstall the dependency tree.
#
# pnpm-workspace.yaml is NOT optional here. It carries the `allowBuilds` block,
# and without it `pnpm install` exits 1 on the ignored install scripts and takes
# every later command with it. See docs/04-debugging-log.md entry 4.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    PNPM_HOME=/pnpm pnpm install --frozen-lockfile


# --- build ------------------------------------------------------------------
FROM base AS builder

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# No pre-flight check on the public vars. `lib/env.ts` already fails with
# `NEXT_PUBLIC_SUPABASE_URL must be a valid URL`, which names the variable —
# measured by building with .env absent. An explicit `test -n` guard added
# nothing except the key echoed into the build log, because BuildKit prints the
# RUN line with its arguments expanded.
RUN pnpm build


# --- runtime ----------------------------------------------------------------
# Only the standalone server, the static assets and public/. No pnpm, no
# lockfile, no dev dependencies, no source.
FROM base AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# `node` exists in the base image with uid 1000. Running as root in a container
# that executes model-generated nothing is still root in a container.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000

# Node 22 has global fetch, so this needs no curl and no busybox assumption.
# `/login` rather than `/`: it renders without a session and exercises the
# middleware, so a healthy answer means more than a static file served.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
