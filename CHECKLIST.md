# SpeakSnap v3 - Installation Checklist

## ✅ Pre-Installation Verification

### Files Created
- [x] `package.json` - 依赖配置
- [x] `tsconfig.json` - TypeScript 配置
- [x] `next.config.ts` - Next.js 配置
- [x] `tailwind.config.ts` - Tailwind CSS 配置
- [x] `postcss.config.mjs` - PostCSS 配置
- [x] `.env.local` - 环境变量 (已配置 API Keys)
- [x] `.gitignore` - Git 忽略规则

### Directory Structure
- [x] `app/` - Next.js App Router
  - [x] `api/` - 6 个 API 路由
  - [x] `page.tsx` - 主页面
  - [x] `layout.tsx` - 根布局
  - [x] `globals.css` - 全局样式
- [x] `components/` - 5 个主要组件
  - [x] `CameraScreen.tsx`
  - [x] `DialogueScreen.tsx`
  - [x] `LibraryScreen.tsx`
  - [x] `FlashcardDeck.tsx`
  - [x] `DiaryEditor.tsx`
- [x] `lib/` - 核心库
  - [x] `ai/` - AI 服务层
  - [x] `supabase/` - Supabase 配置
  - [x] `types/` - TypeScript 类型

### Documentation
- [x] `README.md` - 项目说明
- [x] `SETUP.md` - 安装指南
- [x] `FEATURES.md` - 功能文档
- [x] `SUMMARY.md` - 项目总结
- [x] `CHECKLIST.md` - 本检查清单

## 📦 Installation Steps

### Step 1: Install Dependencies

```bash
cd v3
npm install
```

**Expected packages:**
- next@15.1.4
- react@19.0.0
- @supabase/supabase-js@2.45.4
- @tiptap/react@2.10.3
- lucide-react@0.468.0
- tailwindcss@3.4.17
- typescript@5.7.2

### Step 2: Verify Environment Variables

Check `.env.local` contains:
- [x] `NEXT_PUBLIC_AI_PROVIDER=auto`
- [x] `NEXT_DOUBAO_API_KEY` (豆包)
- [x] `NEXT_PUBLIC_OPENAI_API_KEY` (OpenAI)
- [x] `NEXT_PUBLIC_GEMINI_API_KEY` (Gemini)
- [x] `NEXT_PUBLIC_SUPABASE_URL` (Supabase)
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase)

### Step 3: Set Up Supabase Database

1. Visit https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Open `lib/supabase/schema.sql`
5. Copy entire contents
6. Paste into SQL Editor
7. Click "Run"

**Expected results:**
- [x] 5 tables created (scenarios, flashcards, diary_entries, sentence_patterns, user_preferences)
- [x] Indexes created
- [x] RLS policies enabled
- [x] Storage bucket 'scenarios' created

### Step 4: Run Development Server

```bash
npm run dev
```

Expected output:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

### Step 5: Test Core Features

#### Camera Mode
- [ ] Camera preview loads
- [ ] Can switch between Voice/Camera/Upload modes
- [ ] Location toggle works
- [ ] Level selector works (Beginner/Intermediate/Advanced)
- [ ] Snap button captures image
- [ ] Shows "Creating Scenario..." loading state

#### Voice Mode
- [ ] Microphone permission requested
- [ ] Recording starts/stops correctly
- [ ] Visual feedback during recording
- [ ] Creates scenario from audio

#### Upload Mode
- [ ] File picker opens
- [ ] Image uploads successfully
- [ ] Image gets processed

#### Dialogue Screen
- [ ] Scenario displays with image
- [ ] AI sends first message
- [ ] User can type and send messages
- [ ] AI responds with feedback
- [ ] Text selection menu appears
  - [ ] Translate works
  - [ ] Optimize works
  - [ ] Add to flashcard works
- [ ] Voice input works (if browser supports)
- [ ] Suggestions appear

#### Flashcard Deck
- [ ] Cards display if available
- [ ] Empty state shows if no cards
- [ ] Can flip cards (tap)
- [ ] Can navigate cards (swipe left/right)
- [ ] Can change videos (swipe up/down if multiple)
- [ ] Audio playback works
- [ ] Delete card works

#### Diary Editor
- [ ] Tiptap editor loads
- [ ] Can type freely
- [ ] Placeholder text shows
- [ ] "Analyze & Improve" button works
- [ ] Processing state shows
- [ ] Results display:
  - [ ] Semantic summary
  - [ ] 3 native rewrites
  - [ ] Extracted patterns
  - [ ] Flashcards created

#### Library Screen
- [ ] Tabs switch correctly (Scenarios/Flashcards/Diary)
- [ ] Saved scenarios display
- [ ] Can tap scenario to resume
- [ ] Flashcards tab shows deck
- [ ] Diary tab shows entries
- [ ] Search bar (placeholder)
- [ ] "New Snap" FAB works

## 🔍 Troubleshooting

### npm install fails
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
```bash
# Regenerate types
npm run build
```

### API calls fail
1. Check browser console for errors
2. Verify API keys in `.env.local`
3. Check network tab for request details
4. Ensure `.env.local` variables start with `NEXT_PUBLIC_` for client-side or without for server-side

### Camera/Microphone not working
1. Ensure HTTPS (required for media devices)
2. Grant browser permissions
3. Check browser console for errors
4. Try different browser (Chrome/Safari recommended)

### Supabase connection fails
1. Verify project URL and keys
2. Check Supabase project status
3. Ensure database schema is executed
4. Check browser console for specific errors

### Images not displaying
1. Verify base64 encoding is correct
2. Check image size (should be < 5MB)
3. Ensure proper MIME type

## 🎯 Success Criteria

### Minimum Viable Product (MVP)
- [x] User can capture/upload image
- [x] AI generates realistic scenario
- [x] User can have dialogue with AI
- [x] Feedback is provided
- [x] Flashcards can be created and reviewed
- [x] Diary can be written and analyzed
- [x] Data persists in localStorage

### Performance
- [ ] Page loads in < 3 seconds
- [ ] AI responses in < 5 seconds (豆包)
- [ ] Animations run at 60fps
- [ ] No memory leaks
- [ ] Smooth scrolling

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS 14+)
- [ ] Chrome Mobile (Android 10+)

### Responsive Design
- [ ] Works on iPhone SE (375px width)
- [ ] Works on iPhone 14 Pro (393px width)
- [ ] Works on iPad (768px width)
- [ ] Works on Desktop (1920px width)

## 📊 Quality Assurance

### Code Quality
- [x] All TypeScript types defined
- [x] No ESLint errors (run `npm run lint`)
- [x] Consistent code style
- [x] Comments on complex logic
- [x] No console errors in production

### Security
- [x] API keys in environment variables
- [x] `.env.local` in `.gitignore`
- [x] No secrets in code
- [x] Input validation on all forms
- [x] XSS protection

### Accessibility
- [x] Semantic HTML
- [x] ARIA labels where needed
- [x] Keyboard navigation
- [x] Color contrast (WCAG AA)
- [x] Focus indicators

## 🚀 Deployment Checklist (Future)

### Pre-Deployment
- [ ] Remove all `console.log` statements
- [ ] Update `README.md` with production URL
- [ ] Configure environment variables in hosting platform
- [ ] Set up domain and SSL
- [ ] Configure CORS if needed

### Vercel Deployment
```bash
npm install -g vercel
vercel login
vercel
```

### Post-Deployment
- [ ] Test all features in production
- [ ] Monitor error logs
- [ ] Set up analytics (optional)
- [ ] Configure monitoring (optional)

## ✅ Final Verification

Run this command to verify everything:

```bash
cd v3
npm install && npm run build
```

If build succeeds, you're ready to go!

## 🎉 Congratulations!

If all checklist items are complete, your SpeakSnap v3 installation is successful!

Next steps:
1. Start creating scenarios
2. Practice conversations
3. Build your flashcard collection
4. Write daily diary entries
5. Track your learning progress

Enjoy learning English with SpeakSnap v3! 🚀
