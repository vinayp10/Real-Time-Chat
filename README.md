# 💬 ChatApp

> A WhatsApp-inspired real-time chat application with end-to-end encryption

![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.io-black?style=flat&logo=socket.io&badgeColor=010101)

## ✨ Features

- 🔐 **End-to-End Encryption** (ECDH + AES-256-GCM)
- 💬 **Real-time messaging** with Socket.IO
- 👥 **One-to-one and group chats** (up to 50 members)
- 🔑 **Complete per-member group-key distribution and admin repair for older groups**
- 🔐 **Email/password, Google, and Firebase phone-test authentication**
- ✅ **Message delivery & read receipts**
- ⌨️ **Typing indicators**
- 🟢 **Online/last seen status**
- 📎 **Encrypted file & image sharing**
- 🔍 **User search** by username/email
- 📱 **Responsive WhatsApp-style UI**
- 🌙 **Dark mode support**
- 🔑 **Private key backup & restore**
- 🛡️ **Safety number verification**

## 📸 Screenshots

Screenshots are not currently stored in the repository. See the architecture and workflow diagrams below for the app's key flows.

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Frontend** | React, Vite, TailwindCSS, Zustand |
| **Backend** | Node.js, Express |
| **Database** | MongoDB Atlas, Mongoose |
| **Auth** | JWT, bcrypt |
| **Encryption** | Web Crypto API (SubtleCrypto) |
| **Real-time** | Socket.IO |
| **Deployment** | Vercel (Client), Render (Server) |

## 🏗️ Architecture

```mermaid
flowchart TD
   subgraph Client [Client: React + Web Crypto]
      UI[Chat UI]
      Crypto[Encrypt/decrypt text and media]
      Keys[Private key in IndexedDB]
    end

    subgraph Transport [Network Layer]
      REST[REST: session, conversations, ciphertext]
      WS[Socket.IO: live ciphertext events]
    end

   subgraph Server [Backend: Express + Socket.IO]
      API[Authenticated REST API]
      Relay[Authenticated realtime relay]
      Models[Mongoose models]
    end

    DB[(MongoDB Atlas)]

   UI <--> Crypto
   Crypto <--> Keys
   UI --> REST
   UI --> WS
   REST --> API
   WS --> Relay
   API --> Models
   Relay --> Models
   Models --> DB

    %% Emphasize that server doesn't see plaintext
    style Server fill:#f9f,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
```

The server stores message ciphertext and relays encrypted events. Encryption and decryption happen in the client. Conversation, sender, timing, delivery/read status, and attachment metadata remain visible to the server.

## 🔒 Encryption Flow

```mermaid
sequenceDiagram
    participant Alice
    participant Server
    participant Bob

   Alice->>Alice: Generate ECDH P-256 key pair; keep private key in IndexedDB
   Alice->>Server: Publish public key during registration/key enrollment
   Alice->>Alice: Derive shared key with Bob using ECDH + HKDF
   Alice->>Alice: Encrypt text or media bytes with AES-256-GCM and a fresh IV
   Alice->>Server: POST ciphertext and IV to authorized conversation
   Server->>Server: Store ciphertext and visible metadata
   Alice->>Server: Emit ciphertext message over authenticated Socket.IO
   Server-->>Bob: Relay event to participant rooms
   Bob->>Bob: Fetch missing history if needed
   Bob->>Bob: Derive matching key and decrypt locally

   Note over Alice, Bob: Group messages use one random AES key
   Alice->>Alice: Wrap group key separately for every member's public key
   Alice->>Server: Save encrypted group-key wraps
   Alice->>Alice: Encrypt group messages with the group key
   Bob->>Bob: Unwrap group key with device private key and decrypt
```

## ⚙️ Encryption Design

- **Key Pair Generation**: Each client generates an ECDH P-256 key pair using the Web Crypto API on first login or registration.
- **Shared Secret Derivation**: When chatting, clients use ECDH to derive a shared secret from their private key and the recipient's public key. The secret is passed through HKDF to derive symmetric encryption keys.
- **Message Encryption**: Messages are encrypted using AES-256-GCM with a fresh Initialization Vector (IV) for every message to ensure security and prevent replay attacks.
- **Group Key Management**: For group chats, the creator generates one random AES key and wraps it separately for every member, including the creator. The server rejects group creation if any participant or key wrap is missing. Group admins can repair missing wraps for existing groups if their own key is available.
- **Safety Numbers**: Users can verify each other's public keys using out-of-band safety numbers (hashes of combined public keys) to prevent Man-in-the-Middle (MitM) attacks.
- **Key Backup**: Private keys are encrypted using a key derived from a user's master password (via PBKDF2) before being stored on the server for device recovery.

## Message and Media Types

| Type | Client send/receive behavior | Server-stored payload |
|---|---|---|
| Text | AES-GCM encrypt before send; decrypt after fetch/relay | Ciphertext + IV |
| Image | Encrypt file bytes; decrypt into a browser blob for display | Ciphertext + IV + MIME type/name/size |
| File | Encrypt file bytes; decrypt into a browser blob download | Ciphertext + IV + MIME type/name/size |
| Audio | Record in the browser, encrypt bytes, decrypt into an audio blob | Ciphertext + IV + MIME type/name/size |

The composer accepts images, PDF, DOC, DOCX, TXT, and ZIP files up to 10 MB. Audio is recorded through the browser microphone. Message attachments use the same encrypted message endpoint as text; the legacy plaintext upload endpoint is not exposed.

## ⚠️ Security Model & Limitations

### ✅ What IS Protected
- Text and attachment bytes sent through the chat composer
- Group messages encrypted with a shared key wrapped for each member

### ⚠️ What is NOT Protected (Metadata)
- Who talks to whom (Social Graph)
- When messages are sent
- Message sizes and frequencies
- File names, MIME types, and sizes
- Typing, online, and delivery/read status

### ❌ Limitations
- **No Forward Secrecy**: Unlike the Signal Protocol (Double Ratchet), compromising a private key compromises past messages.
- **Lost Device = Lost Keys**: If a user loses their device and hasn't set up key backup, they lose access to their chat history.
- **Web App Vulnerabilities**: As a web application, the server could theoretically serve malicious JavaScript to exfiltrate keys (Trust the deployment).
- **Endpoint Security**: No protection if the client device itself is compromised with malware or spyware.
- **Calls**: Call signaling is implemented, but this project does not implement an audited end-to-end media encryption protocol for call streams. Do not assume call media has the same protection as chat messages.
- **Development database**: Without a configured MongoDB URI, local development uses a disk-backed MongoMemoryServer database. Its files persist at `CHATAPP_MONGO_DB_PATH`; use a backed-up MongoDB URI for production and multi-instance deployments.

*Note: This architecture provides a simplified E2EE model suitable for educational purposes and standard security needs, but does not offer the advanced metadata protection or forward secrecy of applications like Signal.*

## 📂 Folder Structure

```
chat-app/
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── stores/        # Zustand state management
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Crypto & API utilities
│   │   └── ...
│   └── ...
├── server/                # Express backend
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── models/        # Mongoose models
│   │   ├── middleware/    # Auth, validation, upload
│   │   ├── routes/        # API routes
│   │   ├── socket/        # Socket.IO handlers
│   │   ├── validators/    # Zod schemas
│   │   └── ...
│   └── ...
├── README.md
├── LICENSE
└── .gitignore
```

## 🌍 Environment Variables

| Variable | Location | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | `client/.env` | Backend API URL | `http://localhost:5000` |
| `VITE_SOCKET_URL` | `client/.env` | Socket.IO server URL | `http://localhost:5000` |
| `VITE_FIREBASE_*` | `client/.env` | Firebase web app config for Google and phone sign-in | Firebase project settings |
| `VITE_FIREBASE_TEST_PHONE_NUMBERS` | `client/.env` | Comma-separated fictional Firebase test numbers allowed to request test codes | `+15555550123` |
| `VITE_FIREBASE_ALLOW_REAL_PHONE_SMS` | `client/.env` | Explicitly allow potentially billable real SMS; defaults to `false` | `false` |
| `PORT` | `server/.env` | Port for the backend server | `5000` |
| `MONGODB_URI` | `server/.env` | Optional MongoDB connection string for a shared/production database | `mongodb+srv://user:pass@cluster.mongodb.net/chat-app` |
| `CHATAPP_MONGO_DB_PATH` | `server/.env` | Disk directory for the local WiredTiger fallback when no usable Mongo URI is set | `./data/chatapp-mongodb` |
| `JWT_SECRET` | `server/.env` | Secret for signing JWTs | `supersecretjwtkey123!` |
| `FIREBASE_PROJECT_ID` | `server/.env` | Firebase project used to verify ID tokens | Firebase project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | `server/.env` | Path to Firebase Admin service-account JSON | `./service-account.json` |
| `NODE_ENV` | `server/.env` | Environment (development/production) | `development` |
| `CLIENT_ORIGIN` | `server/.env` | Alternate allowed client origin (also supports local Vite ports in development) | `http://localhost:5173` |

Copy the `.env.example` files to `.env` and keep real secrets out of source control. The supplied Firebase web config is public client configuration; the server `FIREBASE_PROJECT_ID` must match it. Enable Google and Phone under Firebase Authentication. Google OAuth must allow the Firebase auth domain and the local app domain.

For free local phone testing, add a fictional phone number and code in Firebase Authentication's **Phone numbers for testing** settings and put that exact number in `VITE_FIREBASE_TEST_PHONE_NUMBERS`. Firebase does not send SMS for configured fictional numbers. The application blocks every other number by default. Leave `VITE_FIREBASE_ALLOW_REAL_PHONE_SMS=false`; enabling real SMS can consume the project's daily quota and may incur charges. Real phone SMS requires a supported hosted domain; use a fictional test number on localhost.

Firebase Admin service-account credentials are not required for ID-token verification when `FIREBASE_PROJECT_ID` is configured. Do not commit service-account JSON files.

## 💻 Local Development Setup

1. **Prerequisites**: Install Node.js 18 or newer. MongoDB is optional for local development; if no usable Mongo URI is set, the server runs WiredTiger at `CHATAPP_MONGO_DB_PATH` (or the OS temporary directory by default). Choose a stable directory to keep local messages across backend restarts.
2. **Open the repository directory** in a terminal.
3. **Install dependencies**:
   ```bash
   npm run install:all
   ```
4. **Configure the backend**: Copy `server/.env.example` to `server/.env`. For a shared or production database, set `MONGODB_URI` and a strong `JWT_SECRET`. For local development, set `CHATAPP_MONGO_DB_PATH` to a stable disk directory. If `JWT_SECRET` is unset, a temporary one is generated and users must sign in again after each backend restart.
5. **Configure Firebase (optional)**: Copy `client/.env.example` to `client/.env`, add the Firebase web settings and matching `FIREBASE_PROJECT_ID`. Enable Google and Phone providers in the Firebase Console. Add a fictional phone test number/code if testing phone auth without SMS.
6. **Optionally seed demo accounts** (requires a persistent MongoDB URI):
   ```bash
   npm run seed
   ```
   Seeding is idempotent and does not delete existing collections. It creates five demo users and two empty private conversations; it does not seed messages or groups because those require client-generated encryption keys.
7. **Start the client and server**:
   ```bash
   npm run dev
   ```
8. **Open the URL printed by Vite**, normally `http://localhost:5173`. The backend defaults to `http://localhost:5000`.
9. **Build and lint the entire project**:
   ```bash
   npm run check
   ```

## 🎭 Demo Accounts

If you ran the seed script against a persistent database, use these local demo accounts (password for all: `password123`):

| Username | Email |
|---|---|
| `alice` | `alice@example.com` |
| `bob` | `bob@example.com` |
| `charlie` | `charlie@example.com` |
| `dave` | `dave@example.com` |
| `eve` | `eve@example.com` |

Each demo account must sign in at least once on the device that will send/receive encrypted messages. This creates that device's private key locally and publishes its public key. Create groups in the app after all intended members have logged in.

## 🚀 Free Deployment Guide

### MongoDB Atlas (Free M0)
1. Create an account at [mongodb.com](https://www.mongodb.com/).
2. Create a free M0 cluster.
3. Create a database user under "Database Access".
4. Whitelist `0.0.0.0/0` under "Network Access".
5. Click "Connect", select "Drivers", and copy your connection string.

### Backend on Render (Free)
1. Push your code to a GitHub repository.
2. Sign in to [Render](https://render.com/) and click "New Web Service".
3. Connect your GitHub repository.
4. Set the Root Directory to `server`.
5. Set Build Command to `npm install` and Start Command to `npm start`.
6. Add environment variables (`MONGODB_URI`, a strong `JWT_SECRET`, `CLIENT_URL`, and `NODE_ENV=production`).
7. Deploy and note the assigned Render URL (e.g., `https://chat-app-api.onrender.com`).

### Frontend on Vercel (Free)
1. Sign in to [Vercel](https://vercel.com/) and click "Add New... Project".
2. Import your GitHub repository.
3. Set the Root Directory to `client`.
4. Ensure the Framework Preset is set to `Vite`.
5. Add `VITE_API_URL` and `VITE_SOCKET_URL` pointing to the backend URL. Configure Firebase web settings and matching server project ID if using Google/phone auth.
6. Deploy.

## API Endpoints

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Email/password login and session cookie | No |
| `POST` | `/api/auth/firebase` | Verify Google/phone Firebase ID token and establish session | No |
| `POST` | `/api/auth/google` | Backward-compatible alias for Firebase sign-in | No |
| `GET` | `/api/auth/session` | Check the current session; returns `user: null` when signed out | No |
| `POST` | `/api/auth/logout` | Clear the session and update online status | Yes |
| `GET` | `/api/auth/me` | Get current user profile | Yes |
| `GET` | `/api/users/search?q=...` | Search users by username, email, or phone number | Yes |
| `GET` | `/api/users/:id` | Get a user profile | Yes |
| `PUT` | `/api/users/profile` | Update profile fields and avatar | Yes |
| `PUT` | `/api/users/public-key` | Publish device public key | Yes |
| `GET` | `/api/users/:id/public-key` | Fetch a user's public key | Yes |
| `GET` | `/api/conversations` | List conversations for the signed-in user | Yes |
| `POST` | `/api/conversations/private` | Find or create a private conversation | Yes |
| `POST` | `/api/conversations/group` | Create a group with a key wrap for every member | Yes |
| `PUT` | `/api/conversations/group/:id` | Update group name/avatar (admin only) | Yes |
| `POST` | `/api/conversations/group/:id/members` | Add members with encrypted group-key wraps (admin only) | Yes |
| `DELETE` | `/api/conversations/group/:id/members/:userId` | Remove a group member (admin only) | Yes |
| `POST` | `/api/conversations/group/:id/leave` | Leave a group | Yes |
| `PUT` | `/api/conversations/group/:id/keys` | Replace/repair complete group key wraps (admin only) | Yes |
| `GET` | `/api/conversations/:id` | Fetch a conversation and encrypted key wraps | Yes |
| `GET` | `/api/messages/:conversationId?page=1` | Fetch paginated ciphertext history | Yes |
| `POST` | `/api/messages/:conversationId` | Store encrypted text or media with IV/metadata | Yes |
| `DELETE` | `/api/messages/:id/me` | Hide a message for the current user | Yes |
| `DELETE` | `/api/messages/:id/everyone` | Delete own message for everyone within one hour | Yes |

The raw plaintext file-upload endpoint is intentionally not exposed. The client encrypts file bytes and sends them through `POST /api/messages/:conversationId`.

## Full-Project Validation

Run the repository check command after changes:

```bash
npm run check
```

This runs the Vite production build and ESLint for both client and server. There is no automated test-runner script in this repository; use this manual integration checklist as well:

1. Start the project with `npm run dev` and create two test accounts in separate browser profiles.
2. Sign each account in once on its device so each has a local private key and a published public key.
3. From one account, create a private chat and send text. Confirm the second account receives/decrypts it and that the message API/database only contains ciphertext and IV.
4. Create a group with both keyed accounts. Send text, an image, a PDF/document, and recorded audio. Confirm each recipient sees decrypted text, a rendered image, a downloadable file, and an audio player.
5. Keep the receiver connected while sending a new message to verify Socket.IO delivery; reload the conversation to verify REST history.
6. For a legacy group missing a key wrap, open it as its admin on the device holding the admin private key. The client repairs wraps without changing the group key. If that private key is lost, restore its backup or create a new group.
7. For free phone testing, use only the configured fictional Firebase number/code. The app blocks all unlisted numbers unless billable real SMS is explicitly enabled.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments
- **WhatsApp** for the UI/UX inspiration.
- **Signal Protocol** for the underlying concepts of modern end-to-end encryption.
- **Web Crypto API** for enabling robust cryptographic operations directly in the browser.
