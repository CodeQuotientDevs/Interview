# Use a small base image with Node 20
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE=1
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
ENV CI=true
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
	pnpm install --prod --frozen-lockfile

FROM base AS final
COPY --from=prod-deps /app/node_modules /app/node_modules
EXPOSE 80
CMD ["pnpm", "start"]
