# Codebase Migration Studio (CCAK)

National membership and association platform for the **Coffee Champions Association of Kenya**.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://codebase-migration-studio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bf2d016a-4949-4243-a5cc-c9149b8b72cd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
cp .env.example .env   # then fill in values from Lovable Cloud / Supabase
npm i
npm run dev
```

## Security

See [SECURITY.md](./SECURITY.md) for environment handling, authorization model, rate limiting, headers, and production checklist.

**Important**: Never commit a real `.env` file. The service-role key must remain server-only.

## Key docs

- `AGENTS.md` – membership backend constraints
- `roadmap.md` – current activation stages
- `backend-stage-report.md` / `real-forms-stage-report.md` – implementation status
