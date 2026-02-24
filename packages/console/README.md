# Worlds

The official web dashboard for [Worlds API™](https://jsr.io/@fartlabs/worlds).

<img width="1490" height="1006" alt="Connect via SDK screen" src="https://github.com/user-attachments/assets/575c866d-72ec-4dec-b8a7-5dc4ed0aca6f" />

## Design

This project is built with modern web technologies to provide a premium user
experience:

- **[Worlds API SDK](https://jsr.io/@fartlabs/worlds)**: Powered by the official
  Worlds API SDK.
- **[Next.js](https://nextjs.org)**: The React framework for the web.
- **[WorkOS AuthKit](https://workos.com/docs/authkit)**: Secure and seamless
  authentication.
- **[Tailwind CSS](https://tailwindcss.com)**: Utility-first CSS framework for
  rapid UI development.
- **[Nuqs](https://nuqs.47ng.com)**: Type-safe search params state management.
- **Local-first by design**: Polymorphic architecture that works seamlessly
  with a local implementation of WorkOS features, enabling a self-hostable
  subset of functionality for offline development and faster feedback loops.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/EthanThatOneKid/worlds.git
   cd ./packages/console
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   Copy the example environment file and configure the required keys (e.g.,
   WorkOS credentials).

   ```bash
   cp .env.example .env
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
result.

## Development

- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **Type Check**: `npm run check`

For more information on the background, research, and glossary, please visit the
[Worlds API repository](https://github.com/FartLabs/worlds). Official
documentation: <https://github.com/wazootech/docs>.

---

Developed with 🧪 [**@wazootech**](https://github.com/wazootech)
