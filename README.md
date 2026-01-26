# SpeakSnap v3

A modern English learning app built with Next.js 15 and Supabase, featuring AI-powered conversation practice, flashcards, and diary writing.

## Features

- 📸 **Multi-Modal Input**: Capture photos, record voice, or upload images to create learning scenarios
- 💬 **AI Conversations**: Practice English with context-aware AI characters
- 🎴 **Smart Flashcards**: YouTube video-integrated flashcards with spaced repetition
- 📝 **Diary with Tiptap**: Write and improve your English with native rewrites
- 🎯 **Adaptive Learning**: Scenarios adapt to your proficiency level

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Storage, Auth)
- **AI**: Doubao (Primary), OpenAI (Fallback 1), Gemini (Fallback 2)
- **Editor**: Tiptap for rich text editing

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (see `.env.local`)

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
v3/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── page.tsx           # Main app
│   └── layout.tsx         # Root layout
├── components/            # React components
├── lib/                   # Utilities and services
│   ├── supabase/         # Supabase client
│   ├── ai/               # AI providers
│   └── types/            # TypeScript types
└── styles/               # Global styles
```

## Architecture Principles

- **Clean Code**: Modular, reusable components
- **Type Safety**: Full TypeScript coverage
- **Performance**: Optimized rendering and lazy loading
- **UX First**: Smooth animations and intuitive interactions
- **Resilient AI**: Multi-provider fallback system
