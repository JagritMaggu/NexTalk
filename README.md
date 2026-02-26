# NexTalk — Premium Real-time Messaging

NexTalk is a high-performance, real-time chat application designed with a premium dark aesthetic. Built using the modern tech stack of Next.js, Convex, and Clerk.

## 🚀 Features

- **Real-time Messaging**: Instant message delivery using Convex subscriptions.
- **Secure Authentication**: Robust user management and auth via Clerk.
- **Group Chats**: Create and manage group conversations with ease.
- **Premium UI**: Sleek dark mode interface with glassmorphism and smooth animations.
- **Typing Indicators**: Real-time feedback when your friends are typing.
- **Online/Offline Status**: Track which users are currently active.
- **Message Reactions**: Express yourself with emoji reactions.
- **Unread Badges**: Never miss a message with high-contrast unread indicators.

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (React), [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Convex](https://www.convex.dev/) (Real-time Database & Functions)
- **Authentication**: [Clerk](https://clerk.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏁 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/JagritMaggu/NexTalk.git
cd NexTalk
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Environment Variables
Create a `.env.local` file in the root directory and add your Clerk and Convex keys:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CONVEX_URL=...
```

### 4. Run the development server
```bash
npm run dev
# and in a separate terminal
npx convex dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🌐 Deployment

The project is deployed on **Vercel** with the Convex backend synced via GitHub actions/integration.

---

Built with ❤️ by [Jagrit Maggu](https://github.com/JagritMaggu)
